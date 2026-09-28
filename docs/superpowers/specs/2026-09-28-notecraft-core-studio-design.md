# Notecraft Core Mosaic Studio & Printable Assembly Map Specification

## 1. Overview & Vision
Notecraft is a web application that enables users to design sticky note mosaics for large surfaces (such as office windows, walls, and glass partitions) using real commercial palettes of 3M Post-it notes.

The platform's monetization model is built around Amazon Associate referral commissions: Notecraft aggregates real 3M Post-it multi-packs available on Amazon, matches reference photos to these specific commercial palettes, computes the exact count of pads and packs required, and provides direct "Buy Now on Amazon" links.

For physical assembly, Notecraft generates a modular multi-sheet "Floor Assembly Packet." Large mosaics are broken down into tiled printable grid sheets (Letter/A4) with alignment marks and coordinate grids, allowing users to tape or lay out the sheets side-by-side on the floor as a 1:1 blueprint.

---

## 2. Project Phasing & Roadmap

- **Sub-project 1 (This Specification): Core Mosaic Studio, Amazon Bundle Catalog & Floor Assembly Packet**
  - Interactive dual design surfaces (Reference Image + 8-bit Sticky Note Grid).
  - Target surface scaling (inches/cm or note count with aspect ratio lock).
  - Built-in Amazon 3M Post-it bundle catalog with instant one-click palette switching.
  - Perceptual CIELAB ($\Delta E$) color quantization with optional Floyd-Steinberg dithering.
  - Bill of materials (BOM) calculator with direct "Buy Now on Amazon" affiliate purchase links.
  - Printable multi-sheet floor assembly packet with cover sheet, floor matrix, symbols, and ink-saver mode.
  - Local project persistence (JSON export/import and browser `localStorage`).

- **Sub-project 2: Authentication & Cloud Project Persistence**
  - Social OAuth supporting: Google, Microsoft, Apple, Facebook, and **Amazon Login**.
  - Database persistence for user accounts and saved projects (PostgreSQL / Supabase / Prisma).

- **Sub-project 3: Community Showcase & Shared Public Library**
  - Public project gallery, search, tags, and "Fork / Remix this Mosaic" capability.

- **Future Extensibility:**
  - Decoupled mosaic color grid format allowing export for other merchandise (t-shirts, art prints, stickers).
  - Manual note-by-note paint and color replacement tools.

---

## 3. Technology Stack

- **Framework:** Next.js 15 (App Router), React 19, TypeScript (strict mode).
- **Styling:** Tailwind CSS with Lucide React icons.
- **Client-Side Image Engine:** HTML5 Canvas API + Web Audio/TypedArrays for zero-latency, client-side CIELAB perceptual quantization.
- **Print Engine:** CSS `@media print` multi-page paged media rules + dynamic SVG/HTML grid rendering.
- **Testing:** Vitest / React Testing Library for color math, packing algorithms, and grid generation.

---

## 4. Domain Data Models

```typescript
export interface StickyColor {
  id: string;
  name: string;        // e.g., "Aqua Splash"
  hex: string;         // e.g., "#00B4D8"
  lab: [number, number, number]; // [L*, a*, b*] CIE coordinates
  symbol: string;      // Single character/symbol for print guide (e.g., "A", "B", "1")
  packId: string;      // ID of the Amazon bundle it belongs to
}

export interface AmazonStickyBundle {
  id: string;
  name: string;        // e.g., "Post-it Super Sticky Notes, Miami Collection"
  asin: string;        // Amazon Standard Identification Number
  amazonUrl: string;   // URL with associate referral tag
  packDescription: string;
  notesPerPad: number; // e.g., 90
  padsPerPack: number; // e.g., 5
  colors: StickyColor[];
}

export interface MosaicDimensions {
  unit: 'inches' | 'cm' | 'notes';
  surfaceWidth: number;   // Physical surface width (or note count)
  surfaceHeight: number;  // Physical surface height (or note count)
  noteWidth: number;      // e.g., 3.0 inches (7.62 cm)
  noteHeight: number;     // e.g., 3.0 inches (7.62 cm)
  cols: number;           // Resulting sticky notes horizontal count
  rows: number;           // Resulting sticky notes vertical count
  lockAspectRatio: boolean;
}

export interface MosaicCell {
  row: number;
  col: number;
  color: StickyColor;
  originalRgb: [number, number, number];
}

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

export interface PrintSettings {
  paperSize: 'letter' | 'a4';
  orientation: 'portrait' | 'landscape';
  tileRowsPerPage: number; // e.g., 20 rows per sheet
  tileColsPerPage: number; // e.g., 25 cols per sheet
  inkSaver: boolean;       // High-contrast B&W outlines with symbols vs light color tint
  includeCutGuides: boolean;
}
```

---

## 5. Amazon Bundle Catalog & Fast-Flip Palette Engine

### 5.1 Curated Initial 3M Post-it Bundles
1. **Miami Collection:** Aqua Splash, Poppy, Neon Orange, Flamingo, Vital Orange.
2. **Rio de Janeiro Collection:** Mediterranean Blue, Limeade, Neon Yellow, Neon Orange, Marrakesh.
3. **Marseille Collection:** French Blue, Pastel Pink, Limeade, Sunburst Yellow.
4. **Energy Collection:** Ultra Yellow, Neon Pink, Ultra Orange, Neon Blue, Electric Lime.
5. **Classic Canary Yellow:** Single-tone classic yellow.
6. **Pastel / Soft Meadow Collection:** Pastel Mint, Lilac, Soft Peach, Buttercup.
7. **Monochrome / High-Contrast:** Grayscale / contrast tones.

### 5.2 Fast-Flip Palette Selector
- Horizontally scrollable bundle ribbon featuring visual swatch chips.
- Selecting any bundle updates the mosaic grid in under 15ms.
- **Multi-Bundle Selection:** Option to enable multiple bundles simultaneously (e.g., Miami + Rio) so the color matching algorithm pools both sets.
- **Affiliate Link Builder:** A helper function appends the environment affiliate tag:
  `https://www.amazon.com/dp/${asin}?tag=${affiliateTag}`.

---

## 6. Color Matching & Grid Processing Engine

### 6.1 Color Science: RGB to CIELAB & Delta E
Standard Euclidean RGB distance creates muddy, poor color matches for sticky notes because human perception weighs lightness and chrominance non-linearly.
1. Convert sRGB pixel values to linear RGB.
2. Transform linear RGB to CIE XYZ space (D65 standard illuminant).
3. Transform CIE XYZ to CIE $L^*a^*b^*$ coordinates.
4. Perceptual distance formula ($\Delta E_{\text{CIE76}}$ or $\Delta E_{94}$):
   $$\Delta E = \sqrt{(L_1 - L_2)^2 + (a_1 - a_2)^2 + (b_1 - b_2)^2}$$
5. Pick the `StickyColor` in the active palette with the minimum $\Delta E$.

### 6.2 Floyd-Steinberg Error Diffusion Dithering
- Optional toggle with an intensity slider (0% to 100%).
- For each cell, quantization error $(R_{err}, G_{err}, B_{err})$ is diffused to neighboring unprocessed cells:
  - Right: $+ \frac{7}{16} \times err$
  - Bottom-Left: $+ \frac{3}{16} \times err$
  - Bottom: $+ \frac{5}{16} \times err$
  - Bottom-Right: $+ \frac{1}{16} \times err$
- Allows vibrant, smooth transitions even with a small 4- or 5-color Amazon pack.

---

## 7. Dual Design Surfaces UI

1. **Left Surface: Reference Picture**
   - Drag & drop upload, paste from clipboard, or sample image gallery.
   - Interactive zoom, pan, and framing crop.
   - Sizing controls:
     - Physical surface inputs (Width, Height in inches/cm, Note Size 3"x3").
     - Direct grid dimension sliders (Columns & Rows) with aspect ratio lock.
     - Image adjustments (Brightness, Contrast, Saturation).

2. **Right Surface: 8-Bit Sticky Note Mosaic**
   - High-performance canvas/SVG renderer.
   - Realistic sticky note effect (paper shadow & texture) with flat pixel-art toggle.
   - Hover inspection: displays cell coordinate `(R14, C22)`, color name, symbol, and Amazon pack.
   - Live Bill of Materials card directly underneath with total sticky notes, packs needed, and the **"Buy Now on Amazon"** button.

---

## 8. Multi-Sheet Floor Assembly Packet

### 8.1 Sheet Breakdown
- **Sheet 1: Cover & Assembly Index**
  - Full-color thumbnail of the finished mosaic.
  - Project summary: total notes, dimensions, grid count ($W \times H$).
  - **Floor Tile Matrix:** A schematic diagram showing how sheets connect (e.g., $2 \times 3$ page grid: Sheet 1 = A1, Sheet 2 = A2, Sheet 3 = A3, Sheet 4 = B1, Sheet 5 = B2, Sheet 6 = B3) with overlap taping instructions.
  - **Color Symbol Key / Legend:** Table of Symbol, Color Name, Swatch, Total Notes Needed, Amazon Pack Name.
  - **Order Summary:** Amazon packs required with clickable affiliate links and QR codes.
- **Sheets 2 through N: Tiled Grid Sheets**
  - Section Header: `Sheet X of Y — Section (Row R1–R2, Col C1–C2)`.
  - Border coordinate markers: row numbers along the sides, column numbers along top and bottom.
  - Floor registration/alignment crosshairs at sheet corners.
  - Cells contain centered high-contrast symbols (`A`, `B`, `C`...) with light color tint (or black/white outline in ink-saver mode).

### 8.2 Printing & PDF Export
- Dedicated print media stylesheet with `@page { size: auto; margin: 10mm; }` and page breaks (`page-break-after: always`).
- Responsive preview modal enabling users to flip through sheets before printing or saving to PDF via `window.print()`.

---

## 9. Verification & Testing Plan
- **Color Conversion & Quantization Tests:**
  - Verify RGB $\to$ CIELAB transformation against known standard values.
  - Verify Delta E matching selects correct 3M Post-it colors.
  - Verify Floyd-Steinberg error diffusion preserves image luminosity.
- **BOM & Packing Algorithm Tests:**
  - Verify note count aggregation per color.
  - Verify pad and pack ceiling calculations ($ceil(\text{pads} / \text{padsPerPack})$).
  - Verify Amazon affiliate URL construction includes correct tag and ASIN.
- **Grid Tiling & Floor Assembly Tests:**
  - Verify mosaic tiling partitions arbitrary $M \times N$ grids into exact integer sheets without missing cells or duplicate indices.
  - Verify edge registration coordinates match adjacent sheets.
- **UI & Browser Verification:**
  - Test responsive layout on desktop and tablet viewports.
  - Test print preview and `@media print` layout rendering.
