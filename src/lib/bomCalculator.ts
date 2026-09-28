import { AmazonStickyBundle, MosaicCell, StickyColor } from '@/types/mosaic';
import { getAffiliateUrl } from '@/data/amazonBundles';

export interface BillOfMaterialsItem {
  color: StickyColor;
  notesNeeded: number;
  padsNeeded: number;
  packName: string;
  bundleId: string;
}

export interface PackPurchaseRequirement {
  bundle: AmazonStickyBundle;
  packsNeeded: number;
  affiliateUrl: string;
}

export interface BOMReport {
  totalNotes: number;
  colorCounts: BillOfMaterialsItem[];
  packRequirements: PackPurchaseRequirement[];
}

/**
 * Calculates the Bill of Materials (BOM) and required Amazon purchase packs for a given mosaic grid.
 *
 * @param grid - 2D matrix of mosaic cells
 * @param activeBundles - List of Amazon sticky note bundles available for selection
 * @param affiliateTag - Optional custom Amazon Associate referral tag override
 * @returns BOMReport containing total notes, color counts, and pack purchase requirements
 */
export function calculateBOM(
  grid: MosaicCell[][],
  activeBundles: AmazonStickyBundle[],
  affiliateTag?: string
): BOMReport {
  const countsMap = new Map<string, { color: StickyColor; count: number }>();
  let totalNotes = 0;

  for (let r = 0; r < grid.length; r++) {
    const row = grid[r];
    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      totalNotes++;
      const current = countsMap.get(cell.color.id);
      if (current) {
        current.count++;
      } else {
        countsMap.set(cell.color.id, { color: cell.color, count: 1 });
      }
    }
  }

  const bundleMap = new Map<string, AmazonStickyBundle>();
  for (const b of activeBundles) {
    bundleMap.set(b.id, b);
  }

  const colorCounts: BillOfMaterialsItem[] = [];
  const bundleMaxPacksNeeded = new Map<string, number>();

  countsMap.forEach(({ color, count }) => {
    const bundle = bundleMap.get(color.packId);
    const notesPerPad = bundle ? bundle.notesPerPad : 90;
    const padsNeeded = Math.ceil(count / notesPerPad);

    colorCounts.push({
      color,
      notesNeeded: count,
      padsNeeded,
      packName: bundle ? bundle.name : 'Unknown Pack',
      bundleId: color.packId,
    });

    // In a multi-color pack, each color typically has 1 pad (e.g. 5 pads / 5 colors).
    // In a single-color pack (e.g. Canary Yellow), the entire pack contains pads of that color (12 pads / 1 color).
    const padsPerColorInPack = bundle
      ? Math.max(1, Math.floor(bundle.padsPerPack / (bundle.colors.length || 1)))
      : 1;
    const packsNeededForColor = Math.ceil(padsNeeded / padsPerColorInPack);

    const currentMaxPacks = bundleMaxPacksNeeded.get(color.packId) || 0;
    if (packsNeededForColor > currentMaxPacks) {
      bundleMaxPacksNeeded.set(color.packId, packsNeededForColor);
    }
  });

  // Sort color counts descending by number of notes needed
  colorCounts.sort((a, b) => b.notesNeeded - a.notesNeeded);

  const packRequirements: PackPurchaseRequirement[] = [];
  bundleMaxPacksNeeded.forEach((maxPacks, bundleId) => {
    const bundle = bundleMap.get(bundleId);
    if (bundle) {
      const affiliateUrl = affiliateTag
        ? getAffiliateUrl(bundle.asin, affiliateTag)
        : (bundle.amazonUrl || getAffiliateUrl(bundle.asin));

      packRequirements.push({
        bundle,
        packsNeeded: maxPacks,
        affiliateUrl,
      });
    }
  });

  return {
    totalNotes,
    colorCounts,
    packRequirements,
  };
}
