import { describe, it, expect } from 'vitest';
import { calculateBOM } from '@/lib/bomCalculator';
import { AMAZON_STICKY_BUNDLES } from '@/data/amazonBundles';
import { MosaicCell } from '@/types/mosaic';

describe('BOM & Amazon Pack Calculator', () => {
  it('correctly aggregates sticky note counts and calculates required packs', () => {
    const miami = AMAZON_STICKY_BUNDLES.find((b) => b.id === 'miami')!;
    const aquaColor = miami.colors[0]; // 90 notes per pad, 5 pads per pack (1 pad of aqua per pack)

    // Mock a grid with 120 aqua notes
    const mockGrid: MosaicCell[][] = [];
    const row: MosaicCell[] = [];
    for (let c = 0; c < 120; c++) {
      row.push({
        row: 0,
        col: c,
        color: aquaColor,
        originalRgb: [0, 180, 216],
      });
    }
    mockGrid.push(row);

    const bom = calculateBOM(mockGrid, [miami]);
    expect(bom.totalNotes).toBe(120);

    const aquaItem = bom.colorCounts.find((item) => item.color.id === 'aqua-splash');
    expect(aquaItem).toBeDefined();
    expect(aquaItem?.notesNeeded).toBe(120);
    expect(aquaItem?.padsNeeded).toBe(2); // 120 notes / 90 per pad = 2 pads needed

    const miamiReq = bom.packRequirements.find((p) => p.bundle.id === 'miami');
    expect(miamiReq).toBeDefined();
    // Since 2 pads of aqua are needed and 1 pack contains 1 pad of aqua, user needs 2 packs
    expect(miamiReq?.packsNeeded).toBe(2);
    expect(miamiReq?.affiliateUrl).toContain('amazon.com/dp/B00006JN88');
  });

  it('calculates pack requirements when multiple colors from the same bundle are used', () => {
    const miami = AMAZON_STICKY_BUNDLES.find((b) => b.id === 'miami')!;
    const aquaColor = miami.colors.find((c) => c.id === 'aqua-splash')!;
    const poppyColor = miami.colors.find((c) => c.id === 'poppy')!;

    // 100 aqua notes -> 2 pads needed (100 / 90 -> 2 pads)
    // 200 poppy notes -> 3 pads needed (200 / 90 -> 3 pads)
    const mockGrid: MosaicCell[][] = [
      Array.from({ length: 100 }, (_, i) => ({
        row: 0,
        col: i,
        color: aquaColor,
        originalRgb: [0, 180, 216],
      })),
      Array.from({ length: 200 }, (_, i) => ({
        row: 1,
        col: i,
        color: poppyColor,
        originalRgb: [230, 57, 70],
      })),
    ];

    const bom = calculateBOM(mockGrid, [miami]);
    expect(bom.totalNotes).toBe(300);

    // Sorted descending by notesNeeded
    expect(bom.colorCounts[0].color.id).toBe('poppy');
    expect(bom.colorCounts[0].notesNeeded).toBe(200);
    expect(bom.colorCounts[0].padsNeeded).toBe(3);

    expect(bom.colorCounts[1].color.id).toBe('aqua-splash');
    expect(bom.colorCounts[1].notesNeeded).toBe(100);
    expect(bom.colorCounts[1].padsNeeded).toBe(2);

    // Pack requirement should be max pads needed across colors (3 packs)
    const miamiReq = bom.packRequirements.find((p) => p.bundle.id === 'miami');
    expect(miamiReq).toBeDefined();
    expect(miamiReq?.packsNeeded).toBe(3);
  });

  it('correctly handles multi-bundle mosaic requirements', () => {
    const miami = AMAZON_STICKY_BUNDLES.find((b) => b.id === 'miami')!;
    const rio = AMAZON_STICKY_BUNDLES.find((b) => b.id === 'rio')!;
    const aqua = miami.colors[0];
    const medBlue = rio.colors[0];

    const mockGrid: MosaicCell[][] = [
      [
        { row: 0, col: 0, color: aqua, originalRgb: [0, 180, 216] },
        { row: 0, col: 1, color: medBlue, originalRgb: [0, 119, 182] },
      ],
    ];

    const bom = calculateBOM(mockGrid, [miami, rio]);
    expect(bom.totalNotes).toBe(2);
    expect(bom.packRequirements).toHaveLength(2);

    const miamiReq = bom.packRequirements.find((p) => p.bundle.id === 'miami');
    const rioReq = bom.packRequirements.find((p) => p.bundle.id === 'rio');
    expect(miamiReq?.packsNeeded).toBe(1);
    expect(rioReq?.packsNeeded).toBe(1);
  });

  it('correctly computes required packs for single-color bulk packs like Canary Yellow', () => {
    const canary = AMAZON_STICKY_BUNDLES.find((b) => b.id === 'canary')!;
    // Canary: 100 notes per pad, 12 pads per pack
    const canaryColor = canary.colors[0];

    // 150 notes -> 2 pads needed -> 1 pack of 12 pads covers it
    const smallGrid: MosaicCell[][] = [
      Array.from({ length: 150 }, (_, i) => ({
        row: 0,
        col: i,
        color: canaryColor,
        originalRgb: [253, 240, 2],
      })),
    ];
    const smallBom = calculateBOM(smallGrid, [canary]);
    expect(smallBom.colorCounts[0].padsNeeded).toBe(2);
    expect(smallBom.packRequirements[0].packsNeeded).toBe(1);

    // 1300 notes -> 13 pads needed -> 2 packs of 12 pads needed
    const largeGrid: MosaicCell[][] = [
      Array.from({ length: 1300 }, (_, i) => ({
        row: 0,
        col: i,
        color: canaryColor,
        originalRgb: [253, 240, 2],
      })),
    ];
    const largeBom = calculateBOM(largeGrid, [canary]);
    expect(largeBom.colorCounts[0].padsNeeded).toBe(13);
    expect(largeBom.packRequirements[0].packsNeeded).toBe(2);
  });

  it('supports custom Amazon affiliate referral tag override', () => {
    const miami = AMAZON_STICKY_BUNDLES.find((b) => b.id === 'miami')!;
    const aquaColor = miami.colors[0];

    const mockGrid: MosaicCell[][] = [
      [{ row: 0, col: 0, color: aquaColor, originalRgb: [0, 180, 216] }],
    ];

    const bom = calculateBOM(mockGrid, [miami], 'custompartner-20');
    expect(bom.packRequirements[0].affiliateUrl).toContain('tag=custompartner-20');
  });

  it('handles empty grid gracefully', () => {
    const bom = calculateBOM([], AMAZON_STICKY_BUNDLES);
    expect(bom.totalNotes).toBe(0);
    expect(bom.colorCounts).toEqual([]);
    expect(bom.packRequirements).toEqual([]);
  });
});
