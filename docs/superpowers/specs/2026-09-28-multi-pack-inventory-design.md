# Notecraft Multi-Pack Pooling, All-Black Pack & Home Inventory Tracking Specification

## 1. Overview & Goals
This specification enhances the Notecraft Core Mosaic Studio with three interconnected features:
1. **Multi-Pack Palette Pooling**: Users can select multiple commercial 3M Post-it packs simultaneously. The available color pool dynamically aggregates all unique colors from all selected packs. The canvas algorithm recalculates the mosaic using the expanded gamut, allowing users to combine multi-color packs and solid single-color packs.
2. **All-Black Post-it Pack**: Adds an official 3M Post-it Super Sticky Notes Onyx Black pack (`#111111`, CIELAB `[4.2, 0.0, 0.0]`, symbol `'K'`) to the bundle catalog. This enables accurate dark cartoon line art, character eyes, text, and high-contrast borders.
3. **Home Inventory & Run-Out Alerting**: Users can declare sticky notes they already have at home (both full-pack presets and per-color pad/note quantities). Notecraft alerts users in real time if they will run out of any color during physical assembly and automatically recalculates the Amazon Bill of Materials (BOM) to only order the required deficit.

---

## 2. Domain Data Models

### 2.1 All-Black Pack Addition (`src/data/amazonBundles.ts`)
```typescript
export const ONYX_BLACK_BUNDLE: AmazonStickyBundle = {
  id: 'black-onyx',
  name: 'Post-it Super Sticky Notes, Onyx Black',
  asin: 'B008PAIAYQ',
  amazonUrl: getAffiliateUrl('B008PAIAYQ'),
  packDescription: 'Solid Onyx Black notes for outlines, text, and high-contrast accents',
  notesPerPad: 90,
  padsPerPack: 5,
  colors: [
    {
      id: 'onyx-black',
      name: 'Onyx Black',
      hex: '#111111',
      lab: [4.2, 0.0, 0.0],
      symbol: 'K', // Printing industry standard key/black
      packId: 'black-onyx',
    },
  ],
};
```

### 2.2 Inventory Data Models (`src/types/mosaic.ts`)
```typescript
export interface UserInventory {
  // Pack IDs marked as owned in full at home (defaults to 1 standard pack: notesPerPad sheets per color)
  ownedPackIds: string[];
  // Specific note count on hand per color ID: { [colorId]: count }
  colorOnHand: Record<string, number>;
}

export interface ColorDeficitItem {
  color: StickyColor;
  packName: string;
  bundleId: string;
  notesNeeded: number;
  notesOnHand: number;
  netDeficit: number; // Math.max(0, notesNeeded - notesOnHand)
  isDeficit: boolean; // notesNeeded > notesOnHand
  surplusNotes: number; // Math.max(0, notesOnHand - notesNeeded)
}

export interface DeficitPackRequirement {
  bundle: AmazonStickyBundle;
  packsNeeded: number; // Calculated strictly from netDeficit across bundle colors
  isFullyCoveredByHome: boolean; // true if netDeficit is 0 for all colors in this pack
  affiliateUrl: string;
}

export interface DeficitBOMReport {
  totalNotes: number;
  items: ColorDeficitItem[];
  packRequirements: DeficitPackRequirement[];
  hasShortfallAlert: boolean;
  shortfallColors: ColorDeficitItem[];
}
```

---

## 3. UI & Interaction Design

### 3.1 Palette Ribbon & Multi-Pack Pooling (`src/components/studio/PaletteRibbon.tsx`)
- **Card Selection**:
  - Each pack card displays a clear toggle button: **"In Mosaic"** (highlighted blue ring, checkmark) vs. **"+ Add"** (slate border, muted).
  - Clicking a card adds or removes that pack from `combinedBundleIds`.
  - At least one pack must remain active (preventing an empty color palette).
- **Header Summary & Actions**:
  - Counter displays: `Available Colors: X colors (from Y packs)`.
  - Quick action: **"Select All"** (enables all packs for maximum fidelity).
  - Quick action: **"Reset (Miami)"** (resets to default single pack).
- **Home Inventory Pack Toggle**:
  - Each card includes a home icon toggle: *"I have this at home"*.
  - Toggling automatically registers 1 standard pack of sheets (e.g. 90 notes per color) in `userInventory`.

### 3.2 Inventory Drawer & Run-Out Alerts (`src/components/studio/InventoryManager.tsx`)
- **Run-Out Warning Banner**:
  - Displayed prominently in the studio if `hasShortfallAlert === true`.
  - E.g.: `⚠️ Run-Out Warning: You need 140 Canary Yellow notes, but only have 90 at home. You will be short by 50 notes. 1 replacement pack has been added to your Amazon order.`
- **Inventory Popover / Drawer**:
  - Expandable from the BOM bar via a button: **"Desk Inventory (X on hand)"**.
  - Lists each color in the active mosaic:
    - **Color Swatch & Name**
    - **Required for Mosaic**: `140 notes`
    - **On Hand**: Editable input number defaulting to user's stock (e.g., `90`)
    - **Status Badge**:
      - 🟢 `✓ Covered (+45 left over)`
      - 🔴 `⚠️ Short by 50 notes`

### 3.3 Dynamic Amazon Buy Now Bar (`src/components/studio/BuyNowBar.tsx`)
- Displays two sections:
  1. **Order from Amazon**: Packs that have a net deficit, showing exact packs needed with "Buy on Amazon" buttons.
  2. **Covered by Home Inventory**: Packs where on-hand notes completely satisfy the mosaic, tagged with a green checkmark badge so users know they don't need to spend extra money.

---

## 4. Algorithms & Business Logic

### 4.1 Color Pooling (`src/hooks/useMosaicStudio.ts`)
```typescript
const activePalette = useMemo<StickyColor[]>(() => {
  const palette: StickyColor[] = [];
  for (const bId of combinedBundleIds) {
    const bundle = AMAZON_STICKY_BUNDLES.find((b) => b.id === bId);
    if (bundle) {
      for (const color of bundle.colors) {
        if (!palette.some((existing) => existing.id === color.id)) {
          palette.push(color);
        }
      }
    }
  }
  return palette.length > 0 ? palette : AMAZON_STICKY_BUNDLES[0].colors;
}, [combinedBundleIds]);
```

### 4.2 Deficit & Shortfall Calculation (`src/lib/bomCalculator.ts`)
```typescript
export function calculateDeficitBOM(
  grid: MosaicCell[][],
  activeBundles: AmazonStickyBundle[],
  inventory: UserInventory,
  affiliateTag?: string
): DeficitBOMReport
```
1. Count total occurrences of each `color.id` in `grid`.
2. For each color $c$:
   $$\text{onHand} = \text{inventory.colorOnHand}[c.\text{id}] \mathrel{?} \dots : (\text{inventory.ownedPackIds.includes}(c.\text{packId}) ? \text{notesPerPad} : 0)$$
   $$\text{netDeficit} = \max(0, \text{needed} - \text{onHand})$$
   $$\text{isDeficit} = \text{needed} > \text{onHand}$$
3. For each active bundle:
   - Calculate maximum packs required to satisfy all net deficits:
     $$\text{packsNeeded} = \max_{c \in \text{bundle.colors}} \left\lceil \frac{\text{netDeficit}(c)}{\text{notesPerPad}} \right\rceil$$
   - If $\text{packsNeeded} > 0$, create a purchase requirement.
   - If $\text{packsNeeded} === 0$ and notes are used, mark as fully covered by home inventory.

---

## 5. Persistence & State Sync
- `localStorage` key `'notecraft_inventory'` persists the user's `UserInventory` across browser sessions.
- Project JSON export/import includes `userInventory` so exported designs preserve inventory calculations.

---

## 6. Testing Strategy
- **Unit Tests**:
  - `tests/data/amazonBundles.test.ts`: Verify `black-onyx` bundle, color values, CIELAB bounds, and unique print symbols.
  - `tests/lib/bomCalculator.test.ts`: Test deficit math: full coverage, partial coverage, run-out alerts, zero on hand, and affiliate link generation.
  - `tests/lib/mosaicEngine.test.ts`: Test that dark reference pixels match to `onyx-black` with low $\Delta E$ distance when black bundle is active.
- **Component Tests**:
  - `tests/components/PaletteRibbon.test.tsx`: Test multi-pack toggling, "Select All", "Reset", and "I have this at home" quick check.
  - `tests/components/BuyNowBar.test.tsx`: Test deficit warnings, covered packs, and purchase links.
  - `tests/components/InventoryManager.test.tsx`: Test editing notes on hand, status badge updates, and alert banner display.
- **Integration Tests**:
  - `tests/integration/studioPage.test.tsx`: End-to-end flow: load reference image $\rightarrow$ toggle Onyx Black $\rightarrow$ verify grid uses black notes $\rightarrow$ set home inventory $\rightarrow$ verify alert banner and deficit shopping list.
