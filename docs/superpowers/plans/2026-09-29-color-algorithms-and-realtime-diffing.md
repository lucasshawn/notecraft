# Color Matching Algorithms & Realtime Dithering Diffing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand Notecraft Studio with CIEDE2000, Oklab, and CIE76 color matching algorithms, along with Atkinson, Bayer 4×4 ordered, and Floyd-Steinberg dithering styles, controllable via 1-click realtime switcher pills for instant visual diffing.

**Architecture:** Extend core color science with CIEDE2000 and Oklab formulas and palette space pre-caching. Expand the mosaic engine with Atkinson error diffusion (with 25% damping) and Bayer 4×4 spatial matrix dithering. Expose reactive algorithm state in `useMosaicStudio` and build an accessible, high-performance `RenderingControls` component featuring 1-click segmented pills, an interactive strength slider, and an instant A/B quick-compare toggle.

**Tech Stack:** Next.js 15, React 19, TypeScript (strict mode), Tailwind CSS, Lucide React, Vitest, React Testing Library.

## Global Constraints
- Framework: Next.js 15 App Router, React 19, TypeScript strict mode.
- All core calculations (color distance, dithering) must be zero-allocation inside hot inner loops to maintain <5ms recalculation for instant 60fps diffing.
- Backwards compatibility: Existing saved `.notecraft` / JSON files containing `enableDither: boolean` must automatically normalize to `ditherAlgorithm: 'floyd-steinberg' | 'none'`.
- All tests must pass via `npm test` without regressions across all 14 test suites.

---

### Task 1: Type Definitions for Color and Dither Algorithms

**Files:**
- Modify: `src/types/mosaic.ts`
- Test: `tests/data/mosaicTypes.test.ts` (or verify via `tests/lib/colorScience.test.ts`)

**Interfaces:**
- Consumes: Existing `StickyColor`, `MosaicDimensions`, `MosaicCell`, `MosaicProjectData` in `src/types/mosaic.ts`.
- Produces: `ColorMatchAlgorithm = 'ciede2000' | 'oklab' | 'cie76'`, `DitherAlgorithm = 'none' | 'floyd-steinberg' | 'atkinson' | 'bayer'`, optional `oklab` tuple on `StickyColor`, and updated `MosaicProjectData`.

- [ ] **Step 1: Write test for new algorithm types and project data interface**

Create `tests/types/mosaicTypes.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { ColorMatchAlgorithm, DitherAlgorithm, MosaicProjectData } from '@/types/mosaic';

describe('Mosaic Types', () => {
  it('supports color match and dither algorithm literals', () => {
    const colorAlgs: ColorMatchAlgorithm[] = ['ciede2000', 'oklab', 'cie76'];
    const ditherAlgs: DitherAlgorithm[] = ['none', 'floyd-steinberg', 'atkinson', 'bayer'];
    expect(colorAlgs).toHaveLength(3);
    expect(ditherAlgs).toHaveLength(4);
  });

  it('validates MosaicProjectData accepts colorAlgorithm and ditherAlgorithm', () => {
    const data: MosaicProjectData = {
      version: '1.0',
      timestamp: '2026-09-29T12:00:00Z',
      dimensions: {
        unit: 'inches',
        surfaceWidth: 72,
        surfaceHeight: 48,
        noteWidth: 3,
        noteHeight: 3,
        cols: 24,
        rows: 16,
        lockAspectRatio: true,
      },
      activeBundleId: 'miami',
      combinedBundleIds: ['miami'],
      colorAlgorithm: 'ciede2000',
      ditherAlgorithm: 'atkinson',
      ditherStrength: 0.75,
      enableDither: true,
      imageUrl: null,
    };
    expect(data.colorAlgorithm).toBe('ciede2000');
    expect(data.ditherAlgorithm).toBe('atkinson');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/types/mosaicTypes.test.ts`
Expected: FAIL (Type error: Module '"@/types/mosaic"' has no exported member 'ColorMatchAlgorithm')

- [ ] **Step 3: Update `src/types/mosaic.ts`**

Edit `src/types/mosaic.ts`:
```typescript
export type ColorMatchAlgorithm = 'ciede2000' | 'oklab' | 'cie76';

export type DitherAlgorithm = 'none' | 'floyd-steinberg' | 'atkinson' | 'bayer';

export interface StickyColor {
  id: string;
  name: string;
  hex: string;
  lab: [number, number, number];
  oklab?: [number, number, number];
  symbol: string;
  packId: string;
}

export interface AmazonStickyBundle {
  id: string;
  name: string;
  asin: string;
  amazonUrl: string;
  packDescription: string;
  notesPerPad: number;
  padsPerPack: number;
  colors: StickyColor[];
}

export interface MosaicDimensions {
  unit: 'inches' | 'cm' | 'notes';
  surfaceWidth: number;
  surfaceHeight: number;
  noteWidth: number;
  noteHeight: number;
  cols: number;
  rows: number;
  lockAspectRatio: boolean;
}

export interface MosaicCell {
  row: number;
  col: number;
  color: StickyColor;
  originalRgb: [number, number, number];
}

export interface MosaicProjectData {
  version: string;
  timestamp: string;
  dimensions: MosaicDimensions;
  activeBundleId: string;
  combinedBundleIds: string[];
  colorAlgorithm?: ColorMatchAlgorithm;
  ditherAlgorithm?: DitherAlgorithm;
  enableDither?: boolean;
  ditherStrength: number;
  imageUrl?: string | null;
  bom?: any;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/types/mosaicTypes.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/types/mosaic.ts tests/types/mosaicTypes.test.ts
git commit -m "feat(types): add ColorMatchAlgorithm and DitherAlgorithm types"
```

---

### Task 2: Implement CIEDE2000 and Oklab Color Science

**Files:**
- Modify: `src/lib/colorScience.ts`
- Modify: `tests/lib/colorScience.test.ts`

**Interfaces:**
- Consumes: `ColorMatchAlgorithm`, `StickyColor` from `src/types/mosaic.ts`.
- Produces:
  - `deltaE2000(lab1: [number, number, number], lab2: [number, number, number]): number`
  - `rgbToOklab(r: number, g: number, b: number): [number, number, number]`
  - `deltaEOklab(oklab1: [number, number, number], oklab2: [number, number, number]): number`
  - Updated `findClosestColor(rgb: [number, number, number], palette: StickyColor[], algorithm?: ColorMatchAlgorithm): StickyColor`

- [ ] **Step 1: Write failing tests for CIEDE2000 and Oklab**

Add to `tests/lib/colorScience.test.ts`:
```typescript
import {
  rgbToLab,
  deltaE,
  deltaE2000,
  rgbToOklab,
  deltaEOklab,
  findClosestColor,
  hexToRgb,
} from '@/lib/colorScience';
import { StickyColor } from '@/types/mosaic';

describe('CIEDE2000 (deltaE2000)', () => {
  it('returns 0 for identical colors', () => {
    const lab: [number, number, number] = [50, 20, -30];
    expect(deltaE2000(lab, lab)).toBeCloseTo(0, 5);
  });

  it('is symmetric: deltaE2000(A, B) == deltaE2000(B, A)', () => {
    const lab1: [number, number, number] = [60, 30, 20];
    const lab2: [number, number, number] = [50, -10, 40];
    expect(deltaE2000(lab1, lab2)).toBeCloseTo(deltaE2000(lab2, lab1), 5);
  });

  it('correctly calculates known standard CIE test coordinates', () => {
    // Reference standard CIE test pair
    const lab1: [number, number, number] = [50.0, 2.6772, -79.7751];
    const lab2: [number, number, number] = [50.0, 0.0, -82.7485];
    const dE = deltaE2000(lab1, lab2);
    // Expected dE00 around ~2.0425
    expect(dE).toBeGreaterThan(1.8);
    expect(dE).toBeLessThan(2.3);
  });
});

describe('Oklab (rgbToOklab, deltaEOklab)', () => {
  it('converts pure black to L=0 and pure white to L=1', () => {
    const black = rgbToOklab(0, 0, 0);
    expect(black[0]).toBeCloseTo(0, 3);
    const white = rgbToOklab(255, 255, 255);
    expect(white[0]).toBeCloseTo(1, 3);
  });

  it('returns 0 for identical Oklab colors', () => {
    const ok: [number, number, number] = [0.7, 0.1, -0.05];
    expect(deltaEOklab(ok, ok)).toBe(0);
  });
});

describe('findClosestColor with different algorithms', () => {
  const palette: StickyColor[] = [
    {
      id: 'yellow',
      name: 'Canary Yellow',
      hex: '#FDE047',
      lab: rgbToLab(253, 224, 71),
      symbol: 'Y',
      packId: 'test',
    },
    {
      id: 'blue',
      name: 'Aqua Splash',
      hex: '#38BDF8',
      lab: rgbToLab(56, 189, 248),
      symbol: 'B',
      packId: 'test',
    },
    {
      id: 'pink',
      name: 'Pink Carnation',
      hex: '#F472B6',
      lab: rgbToLab(244, 114, 182),
      symbol: 'P',
      packId: 'test',
    },
  ];

  it('matches closest color using ciede2000', () => {
    const match = findClosestColor([250, 220, 60], palette, 'ciede2000');
    expect(match.id).toBe('yellow');
  });

  it('matches closest color using oklab', () => {
    const match = findClosestColor([50, 180, 240], palette, 'oklab');
    expect(match.id).toBe('blue');
  });

  it('matches closest color using cie76 default', () => {
    const match = findClosestColor([240, 110, 180], palette, 'cie76');
    expect(match.id).toBe('pink');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/colorScience.test.ts`
Expected: FAIL (deltaE2000, rgbToOklab, deltaEOklab not exported)

- [ ] **Step 3: Implement CIEDE2000 and Oklab in `src/lib/colorScience.ts`**

Update `src/lib/colorScience.ts`:
```typescript
import { StickyColor, ColorMatchAlgorithm } from '@/types/mosaic';

// Convert sRGB (0-255) to CIE L*a*b* (D65 illuminant)
export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  let rLin = r / 255;
  let gLin = g / 255;
  let bLin = b / 255;

  rLin = rLin > 0.04045 ? Math.pow((rLin + 0.055) / 1.055, 2.4) : rLin / 12.92;
  gLin = gLin > 0.04045 ? Math.pow((gLin + 0.055) / 1.055, 2.4) : gLin / 12.92;
  bLin = bLin > 0.04045 ? Math.pow((bLin + 0.055) / 1.055, 2.4) : bLin / 12.92;

  const x = (rLin * 0.4124564 + gLin * 0.3575761 + bLin * 0.1804375) / 0.95047;
  const y = (rLin * 0.2126729 + gLin * 0.7151522 + bLin * 0.072175) / 1.00000;
  const z = (rLin * 0.0193339 + gLin * 0.1191920 + bLin * 0.9503041) / 1.08883;

  const fx = x > 0.008856 ? Math.cbrt(x) : 7.787 * x + 16 / 116;
  const fy = y > 0.008856 ? Math.cbrt(y) : 7.787 * y + 16 / 116;
  const fz = z > 0.008856 ? Math.cbrt(z) : 7.787 * z + 16 / 116;

  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const bVal = 200 * (fy - fz);

  return [L, a, bVal];
}

// CIE76 Euclidean distance in L*a*b* space
export function deltaE(lab1: [number, number, number], lab2: [number, number, number]): number {
  const dL = lab1[0] - lab2[0];
  const da = lab1[1] - lab2[1];
  const db = lab1[2] - lab2[2];
  return Math.sqrt(dL * dL + da * da + db * db);
}

// CIEDE2000 (ΔE00) perceptual difference
export function deltaE2000(lab1: [number, number, number], lab2: [number, number, number]): number {
  const [L1, a1, b1] = lab1;
  const [L2, a2, b2] = lab2;

  const avgL = (L1 + L2) / 2;
  const c1 = Math.sqrt(a1 * a1 + b1 * b1);
  const c2 = Math.sqrt(a2 * a2 + b2 * b2);
  const avgC = (c1 + c2) / 2;

  const avgC7 = Math.pow(avgC, 7);
  const g = 0.5 * (1 - Math.sqrt(avgC7 / (avgC7 + 6103515625))); // 25^7 = 6103515625

  const a1Prime = (1 + g) * a1;
  const a2Prime = (1 + g) * a2;

  const c1Prime = Math.sqrt(a1Prime * a1Prime + b1 * b1);
  const c2Prime = Math.sqrt(a2Prime * a2Prime + b2 * b2);
  const avgCPrime = (c1Prime + c2Prime) / 2;

  let h1Prime = (Math.atan2(b1, a1Prime) * 180) / Math.PI;
  if (h1Prime < 0) h1Prime += 360;

  let h2Prime = (Math.atan2(b2, a2Prime) * 180) / Math.PI;
  if (h2Prime < 0) h2Prime += 360;

  let diffHPrime = h2Prime - h1Prime;
  if (Math.abs(diffHPrime) > 180) {
    diffHPrime -= Math.sign(diffHPrime) * 360;
  }

  let avgHPrime = (h1Prime + h2Prime) / 2;
  if (Math.abs(h1Prime - h2Prime) > 180) {
    avgHPrime += avgHPrime < 180 ? 180 : -180;
  }

  const deltaLPrime = L2 - L1;
  const deltaCPrime = c2Prime - c1Prime;
  const deltaHPrime = 2 * Math.sqrt(c1Prime * c2Prime) * Math.sin(((diffHPrime / 2) * Math.PI) / 180);

  const t =
    1 -
    0.17 * Math.cos(((avgHPrime - 30) * Math.PI) / 180) +
    0.24 * Math.cos(((2 * avgHPrime) * Math.PI) / 180) +
    0.32 * Math.cos(((3 * avgHPrime + 6) * Math.PI) / 180) -
    0.20 * Math.cos(((4 * avgHPrime - 63) * Math.PI) / 180);

  const sL = 1 + (0.015 * Math.pow(avgL - 50, 2)) / Math.sqrt(20 + Math.pow(avgL - 50, 2));
  const sC = 1 + 0.045 * avgCPrime;
  const sH = 1 + 0.015 * avgCPrime * t;

  const deltaTheta = 30 * Math.exp(-Math.pow((avgHPrime - 275) / 25, 2));
  const avgCPrime7 = Math.pow(avgCPrime, 7);
  const rC = 2 * Math.sqrt(avgCPrime7 / (avgCPrime7 + 6103515625));
  const rT = -Math.sin(((2 * deltaTheta) * Math.PI) / 180) * rC;

  const termL = deltaLPrime / sL;
  const termC = deltaCPrime / sC;
  const termH = deltaHPrime / sH;

  return Math.sqrt(termL * termL + termC * termC + termH * termH + rT * termC * termH);
}

// Convert sRGB to Oklab
export function rgbToOklab(r: number, g: number, b: number): [number, number, number] {
  let rLin = r / 255;
  let gLin = g / 255;
  let bLin = b / 255;

  rLin = rLin > 0.04045 ? Math.pow((rLin + 0.055) / 1.055, 2.4) : rLin / 12.92;
  gLin = gLin > 0.04045 ? Math.pow((gLin + 0.055) / 1.055, 2.4) : gLin / 12.92;
  bLin = bLin > 0.04045 ? Math.pow((bLin + 0.055) / 1.055, 2.4) : bLin / 12.92;

  const l = 0.4122214708 * rLin + 0.5363325363 * gLin + 0.0514459929 * bLin;
  const m = 0.2119034982 * rLin + 0.6806995451 * gLin + 0.1073969566 * bLin;
  const s = 0.0883024619 * rLin + 0.2817188376 * gLin + 0.6260277005 * bLin;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const bVal = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;

  return [L, a, bVal];
}

// Oklab Euclidean distance
export function deltaEOklab(oklab1: [number, number, number], oklab2: [number, number, number]): number {
  const dL = oklab1[0] - oklab2[0];
  const da = oklab1[1] - oklab2[1];
  const db = oklab1[2] - oklab2[2];
  return Math.sqrt(dL * dL + da * da + db * db);
}

// Find closest StickyColor in palette for a given RGB
export function findClosestColor(
  rgb: [number, number, number],
  palette: StickyColor[],
  algorithm: ColorMatchAlgorithm = 'ciede2000'
): StickyColor {
  if (palette.length === 0) {
    throw new Error('Palette cannot be empty');
  }

  let minDistance = Infinity;
  let bestColor = palette[0];

  if (algorithm === 'oklab') {
    const targetOklab = rgbToOklab(rgb[0], rgb[1], rgb[2]);
    for (let i = 0; i < palette.length; i++) {
      const candidate = palette[i];
      const candOklab = candidate.oklab || rgbToOklab(...hexToRgb(candidate.hex));
      const dist = deltaEOklab(targetOklab, candOklab);
      if (dist < minDistance) {
        minDistance = dist;
        bestColor = candidate;
      }
    }
    return bestColor;
  }

  const targetLab = rgbToLab(rgb[0], rgb[1], rgb[2]);
  for (let i = 0; i < palette.length; i++) {
    const candidate = palette[i];
    const dist =
      algorithm === 'ciede2000'
        ? deltaE2000(targetLab, candidate.lab)
        : deltaE(targetLab, candidate.lab);
    if (dist < minDistance) {
      minDistance = dist;
      bestColor = candidate;
    }
  }

  return bestColor;
}

// Convert hex to RGB
export function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.replace('#', '');
  const bigint = parseInt(cleanHex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/colorScience.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/colorScience.ts tests/lib/colorScience.test.ts
git commit -m "feat(color): implement CIEDE2000 and Oklab color difference algorithms"
```

---

### Task 3: Expand Mosaic Engine with Atkinson and Bayer 4×4 Dithering

**Files:**
- Modify: `src/lib/mosaicEngine.ts`
- Modify: `tests/lib/mosaicEngine.test.ts`

**Interfaces:**
- Consumes: `ColorMatchAlgorithm`, `DitherAlgorithm`, `StickyColor` from `src/types/mosaic.ts`, `findClosestColor`, `hexToRgb` from `src/lib/colorScience.ts`.
- Produces: Updated `generateMosaicGrid(..., colorAlgorithm?: ColorMatchAlgorithm, ditherAlgorithm?: DitherAlgorithm, ditherStrength?: number): MosaicCell[][]`.

- [ ] **Step 1: Write failing tests for Atkinson and Bayer 4×4 dithering**

Add to `tests/lib/mosaicEngine.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { generateMosaicGrid } from '@/lib/mosaicEngine';
import { StickyColor } from '@/types/mosaic';
import { rgbToLab } from '@/lib/colorScience';

const TEST_PALETTE: StickyColor[] = [
  { id: 'black', name: 'Black', hex: '#000000', lab: rgbToLab(0, 0, 0), symbol: 'K', packId: 'p' },
  { id: 'white', name: 'White', hex: '#FFFFFF', lab: rgbToLab(255, 255, 255), symbol: 'W', packId: 'p' },
];

describe('generateMosaicGrid with Dither Algorithms', () => {
  const width = 4;
  const height = 4;
  const buffer = new Uint8ClampedArray(width * height * 4);
  // Fill with 50% gray (128, 128, 128, 255)
  for (let i = 0; i < buffer.length; i += 4) {
    buffer[i] = 128;
    buffer[i + 1] = 128;
    buffer[i + 2] = 128;
    buffer[i + 3] = 255;
  }

  it('supports atkinson dithering and distributes error to neighbors', () => {
    const grid = generateMosaicGrid(
      buffer,
      width,
      height,
      width,
      height,
      TEST_PALETTE,
      'ciede2000',
      'atkinson',
      0.8
    );
    expect(grid).toHaveLength(height);
    // Gray should dither into a mix of black and white cells
    const cellColors = grid.flat().map((c) => c.color.id);
    expect(cellColors).toContain('black');
    expect(cellColors).toContain('white');
  });

  it('supports bayer 4x4 ordered dithering with deterministic pattern', () => {
    const grid = generateMosaicGrid(
      buffer,
      width,
      height,
      width,
      height,
      TEST_PALETTE,
      'ciede2000',
      'bayer',
      0.8
    );
    expect(grid).toHaveLength(height);
    const cellColors = grid.flat().map((c) => c.color.id);
    expect(cellColors).toContain('black');
    expect(cellColors).toContain('white');
  });

  it('produces solid flat color when ditherAlgorithm is none', () => {
    const grid = generateMosaicGrid(
      buffer,
      width,
      height,
      width,
      height,
      TEST_PALETTE,
      'ciede2000',
      'none',
      0.8
    );
    expect(grid).toHaveLength(height);
    const firstColor = grid[0][0].color.id;
    // With dither = none, all identical 128 gray pixels map to identical color
    expect(grid.flat().every((c) => c.color.id === firstColor)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/mosaicEngine.test.ts`
Expected: FAIL (Signature mismatch or unexpected ditherAlgorithm argument)

- [ ] **Step 3: Implement Atkinson and Bayer 4×4 in `src/lib/mosaicEngine.ts`**

Update `src/lib/mosaicEngine.ts`:
```typescript
import { MosaicCell, StickyColor, ColorMatchAlgorithm, DitherAlgorithm } from '@/types/mosaic';
import { findClosestColor, hexToRgb, rgbToOklab } from '@/lib/colorScience';

// Normalized 4x4 Bayer Matrix
const BAYER_4X4: number[][] = [
  [0 / 16, 8 / 16, 2 / 16, 10 / 16],
  [12 / 16, 4 / 16, 14 / 16, 6 / 16],
  [3 / 16, 11 / 16, 1 / 16, 9 / 16],
  [15 / 16, 7 / 16, 13 / 16, 5 / 16],
];

export function generateMosaicGrid(
  pixelBuffer: Uint8ClampedArray,
  imgWidth: number,
  imgHeight: number,
  cols: number,
  rows: number,
  palette: StickyColor[],
  colorAlgorithm: ColorMatchAlgorithm = 'ciede2000',
  ditherAlgorithm: DitherAlgorithm = 'floyd-steinberg',
  ditherStrength: number = 0.8
): MosaicCell[][] {
  if (cols <= 0 || rows <= 0 || imgWidth <= 0 || imgHeight <= 0) return [];

  // Pre-sample image to grid resolution
  const sampledRgb: [number, number, number][][] = [];
  const xRatio = imgWidth / cols;
  const yRatio = imgHeight / rows;

  for (let r = 0; r < rows; r++) {
    sampledRgb[r] = [];
    for (let c = 0; c < cols; c++) {
      const srcX = Math.min(Math.floor((c + 0.5) * xRatio), imgWidth - 1);
      const srcY = Math.min(Math.floor((r + 0.5) * yRatio), imgHeight - 1);
      const idx = (srcY * imgWidth + srcX) * 4;
      sampledRgb[r][c] = [pixelBuffer[idx], pixelBuffer[idx + 1], pixelBuffer[idx + 2]];
    }
  }

  // Pre-cache hexToRgb and Oklab for palette
  const paletteRgbMap = new Map<string, [number, number, number]>();
  for (const color of palette) {
    if (!color.oklab) {
      const rgb = hexToRgb(color.hex);
      color.oklab = rgbToOklab(rgb[0], rgb[1], rgb[2]);
    }
    paletteRgbMap.set(color.id, hexToRgb(color.hex));
  }

  // Bayer Ordered Dithering (Matrix Thresholding)
  if (ditherAlgorithm === 'bayer' && ditherStrength > 0) {
    const grid: MosaicCell[][] = [];
    const bayerScale = 255 * ditherStrength * 0.5;

    for (let r = 0; r < rows; r++) {
      grid[r] = [];
      for (let c = 0; c < cols; c++) {
        const orig = sampledRgb[r][c];
        const offset = (BAYER_4X4[r % 4][c % 4] - 0.5) * bayerScale;
        const adjustedRgb: [number, number, number] = [
          Math.max(0, Math.min(255, Math.round(orig[0] + offset))),
          Math.max(0, Math.min(255, Math.round(orig[1] + offset))),
          Math.max(0, Math.min(255, Math.round(orig[2] + offset))),
        ];

        const matchedColor = findClosestColor(adjustedRgb, palette, colorAlgorithm);
        grid[r][c] = {
          row: r,
          col: c,
          color: matchedColor,
          originalRgb: orig,
        };
      }
    }
    return grid;
  }

  // Error Diffusion Algorithms (Floyd-Steinberg and Atkinson) or None
  const bufferRgb: [number, number, number][][] = sampledRgb.map((row) =>
    row.map((pixel) => [pixel[0], pixel[1], pixel[2]])
  );

  const grid: MosaicCell[][] = [];

  for (let r = 0; r < rows; r++) {
    grid[r] = [];
    for (let c = 0; c < cols; c++) {
      const curr = bufferRgb[r][c];
      const clampedRgb: [number, number, number] = [
        Math.max(0, Math.min(255, Math.round(curr[0]))),
        Math.max(0, Math.min(255, Math.round(curr[1]))),
        Math.max(0, Math.min(255, Math.round(curr[2]))),
      ];

      const matchedColor = findClosestColor(clampedRgb, palette, colorAlgorithm);
      const originalRgb = sampledRgb[r][c];

      grid[r][c] = {
        row: r,
        col: c,
        color: matchedColor,
        originalRgb,
      };

      if (ditherAlgorithm !== 'none' && ditherStrength > 0) {
        const matchedRgb = paletteRgbMap.get(matchedColor.id) || hexToRgb(matchedColor.hex);
        const errR = (clampedRgb[0] - matchedRgb[0]) * ditherStrength;
        const errG = (clampedRgb[1] - matchedRgb[1]) * ditherStrength;
        const errB = (clampedRgb[2] - matchedRgb[2]) * ditherStrength;

        if (ditherAlgorithm === 'floyd-steinberg') {
          // Floyd-Steinberg error diffusion
          if (c + 1 < cols) {
            bufferRgb[r][c + 1][0] += errR * (7 / 16);
            bufferRgb[r][c + 1][1] += errG * (7 / 16);
            bufferRgb[r][c + 1][2] += errB * (7 / 16);
          }
          if (r + 1 < rows) {
            if (c - 1 >= 0) {
              bufferRgb[r + 1][c - 1][0] += errR * (3 / 16);
              bufferRgb[r + 1][c - 1][1] += errG * (3 / 16);
              bufferRgb[r + 1][c - 1][2] += errB * (3 / 16);
            }
            bufferRgb[r + 1][c][0] += errR * (5 / 16);
            bufferRgb[r + 1][c][1] += errG * (5 / 16);
            bufferRgb[r + 1][c][2] += errB * (5 / 16);
            if (c + 1 < cols) {
              bufferRgb[r + 1][c + 1][0] += errR * (1 / 16);
              bufferRgb[r + 1][c + 1][1] += errG * (1 / 16);
              bufferRgb[r + 1][c + 1][2] += errB * (1 / 16);
            }
          }
        } else if (ditherAlgorithm === 'atkinson') {
          // Atkinson error diffusion: 1/8 to 6 neighbors, 25% damped
          const eR = errR / 8;
          const eG = errG / 8;
          const eB = errB / 8;

          // (c+1, r), (c+2, r)
          if (c + 1 < cols) {
            bufferRgb[r][c + 1][0] += eR;
            bufferRgb[r][c + 1][1] += eG;
            bufferRgb[r][c + 1][2] += eB;
          }
          if (c + 2 < cols) {
            bufferRgb[r][c + 2][0] += eR;
            bufferRgb[r][c + 2][1] += eG;
            bufferRgb[r][c + 2][2] += eB;
          }
          // (c-1, r+1), (c, r+1), (c+1, r+1)
          if (r + 1 < rows) {
            if (c - 1 >= 0) {
              bufferRgb[r + 1][c - 1][0] += eR;
              bufferRgb[r + 1][c - 1][1] += eG;
              bufferRgb[r + 1][c - 1][2] += eB;
            }
            bufferRgb[r + 1][c][0] += eR;
            bufferRgb[r + 1][c][1] += eG;
            bufferRgb[r + 1][c][2] += eB;
            if (c + 1 < cols) {
              bufferRgb[r + 1][c + 1][0] += eR;
              bufferRgb[r + 1][c + 1][1] += eG;
              bufferRgb[r + 1][c + 1][2] += eB;
            }
          }
          // (c, r+2)
          if (r + 2 < rows) {
            bufferRgb[r + 2][c][0] += eR;
            bufferRgb[r + 2][c][1] += eG;
            bufferRgb[r + 2][c][2] += eB;
          }
        }
      }
    }
  }

  return grid;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/mosaicEngine.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/mosaicEngine.ts tests/lib/mosaicEngine.test.ts
git commit -m "feat(engine): add Atkinson and Bayer 4x4 dithering algorithms"
```

---

### Task 4: State Management and Reactive Diffing Hook (`useMosaicStudio`)

**Files:**
- Modify: `src/hooks/useMosaicStudio.ts`
- Modify: `tests/hooks/useMosaicStudio.test.ts`

**Interfaces:**
- Consumes: `ColorMatchAlgorithm`, `DitherAlgorithm`, `generateMosaicGrid`.
- Produces: `colorAlgorithm`, `setColorAlgorithm`, `ditherAlgorithm`, `setDitherAlgorithm`, `quickCompareAlgorithm`, updated `exportProject`, `importProject`.

- [ ] **Step 1: Write failing tests for hook algorithm state and migration**

Add to `tests/hooks/useMosaicStudio.test.ts`:
```typescript
import { renderHook, act } from '@testing-library/react';
import { useMosaicStudio } from '@/hooks/useMosaicStudio';

describe('useMosaicStudio Color and Dither Algorithms', () => {
  it('initializes with ciede2000 and floyd-steinberg defaults', () => {
    const { result } = renderHook(() => useMosaicStudio());
    expect(result.current.colorAlgorithm).toBe('ciede2000');
    expect(result.current.ditherAlgorithm).toBe('floyd-steinberg');
  });

  it('updates colorAlgorithm and ditherAlgorithm reactively', () => {
    const { result } = renderHook(() => useMosaicStudio());
    act(() => {
      result.current.setColorAlgorithm('oklab');
      result.current.setDitherAlgorithm('atkinson');
    });
    expect(result.current.colorAlgorithm).toBe('oklab');
    expect(result.current.ditherAlgorithm).toBe('atkinson');
  });

  it('provides quickCompareColorAlgorithm to flip between last two selected algorithms', () => {
    const { result } = renderHook(() => useMosaicStudio());
    act(() => {
      result.current.setColorAlgorithm('oklab');
    });
    expect(result.current.colorAlgorithm).toBe('oklab');
    act(() => {
      result.current.quickCompareColorAlgorithm();
    });
    expect(result.current.colorAlgorithm).toBe('ciede2000');
    act(() => {
      result.current.quickCompareColorAlgorithm();
    });
    expect(result.current.colorAlgorithm).toBe('oklab');
  });

  it('imports legacy project data with enableDither: false as ditherAlgorithm: none', () => {
    const { result } = renderHook(() => useMosaicStudio());
    act(() => {
      result.current.importProject({
        enableDither: false,
      });
    });
    expect(result.current.ditherAlgorithm).toBe('none');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/hooks/useMosaicStudio.test.ts`
Expected: FAIL (colorAlgorithm / ditherAlgorithm / quickCompareColorAlgorithm not defined)

- [ ] **Step 3: Update `src/hooks/useMosaicStudio.ts`**

Update `src/hooks/useMosaicStudio.ts`:
```typescript
'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import {
  MosaicCell,
  MosaicDimensions,
  StickyColor,
  ColorMatchAlgorithm,
  DitherAlgorithm,
  MosaicProjectData,
} from '@/types/mosaic';
import { AMAZON_STICKY_BUNDLES } from '@/data/amazonBundles';
import { generateMosaicGrid } from '@/lib/mosaicEngine';
import { calculateBOM, BOMReport } from '@/lib/bomCalculator';

export function useMosaicStudio() {
  const [dimensions, setDimensions] = useState<MosaicDimensions>({
    unit: 'inches',
    surfaceWidth: 72,
    surfaceHeight: 48,
    noteWidth: 3,
    noteHeight: 3,
    cols: 24,
    rows: 16,
    lockAspectRatio: true,
  });

  const [activeBundleId, setActiveBundleId] = useState<string>('miami');
  const [combinedBundleIds, setCombinedBundleIds] = useState<string[]>(['miami']);

  // Color Matching & Dithering States
  const [colorAlgorithm, setColorAlgorithmState] = useState<ColorMatchAlgorithm>('ciede2000');
  const prevColorAlgorithmRef = useRef<ColorMatchAlgorithm>('cie76');

  const [ditherAlgorithm, setDitherAlgorithm] = useState<DitherAlgorithm>('floyd-steinberg');
  const [ditherStrength, setDitherStrength] = useState<number>(0.75);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [pixelBuffer, setPixelBuffer] = useState<Uint8ClampedArray | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const setColorAlgorithm = useCallback((next: ColorMatchAlgorithm) => {
    setColorAlgorithmState((curr) => {
      if (curr !== next) {
        prevColorAlgorithmRef.current = curr;
      }
      return next;
    });
  }, []);

  const quickCompareColorAlgorithm = useCallback(() => {
    setColorAlgorithmState((curr) => {
      const prev = prevColorAlgorithmRef.current;
      prevColorAlgorithmRef.current = curr;
      return prev;
    });
  }, []);

  // Compute active colors from selected bundles
  const activePalette = useMemo<StickyColor[]>(() => {
    const palette: StickyColor[] = [];
    for (const bId of combinedBundleIds) {
      const bundle = AMAZON_STICKY_BUNDLES.find((b) => b.id === bId);
      if (bundle) {
        for (const c of bundle.colors) {
          if (!palette.some((existing) => existing.id === c.id)) {
            palette.push(c);
          }
        }
      }
    }
    return palette.length > 0 ? palette : AMAZON_STICKY_BUNDLES[0].colors;
  }, [combinedBundleIds]);

  // Compute mosaic grid reactively
  const grid = useMemo<MosaicCell[][]>(() => {
    if (!pixelBuffer || imageSize.width === 0 || imageSize.height === 0) {
      return [];
    }
    return generateMosaicGrid(
      pixelBuffer,
      imageSize.width,
      imageSize.height,
      dimensions.cols,
      dimensions.rows,
      activePalette,
      colorAlgorithm,
      ditherAlgorithm,
      ditherStrength
    );
  }, [
    pixelBuffer,
    imageSize,
    dimensions.cols,
    dimensions.rows,
    activePalette,
    colorAlgorithm,
    ditherAlgorithm,
    ditherStrength,
  ]);

  // Compute Bill of Materials
  const bom = useMemo<BOMReport>(() => {
    const selectedBundles = AMAZON_STICKY_BUNDLES.filter((b) => combinedBundleIds.includes(b.id));
    return calculateBOM(grid, selectedBundles.length > 0 ? selectedBundles : AMAZON_STICKY_BUNDLES);
  }, [grid, combinedBundleIds]);

  const setPhysicalDimensions = useCallback((width: number, height: number, noteW: number = 3, noteH: number = 3) => {
    const safeNoteW = noteW > 0 ? noteW : 3;
    const safeNoteH = noteH > 0 ? noteH : 3;
    const cols = Math.max(2, Math.round(width / safeNoteW));
    const rows = Math.max(2, Math.round(height / safeNoteH));
    setDimensions((prev) => ({
      ...prev,
      surfaceWidth: width,
      surfaceHeight: height,
      noteWidth: safeNoteW,
      noteHeight: safeNoteH,
      cols,
      rows,
    }));
  }, []);

  const setGridCounts = useCallback((cols: number, rows: number) => {
    const safeCols = Math.max(2, cols);
    const safeRows = Math.max(2, rows);
    setDimensions((prev) => ({
      ...prev,
      cols: safeCols,
      rows: safeRows,
      surfaceWidth: safeCols * prev.noteWidth,
      surfaceHeight: safeRows * prev.noteHeight,
    }));
  }, []);

  const selectSingleBundle = useCallback((bundleId: string) => {
    setActiveBundleId(bundleId);
    setCombinedBundleIds([bundleId]);
  }, []);

  const toggleCombinedBundle = useCallback((bundleId: string) => {
    if (combinedBundleIds.includes(bundleId)) {
      if (combinedBundleIds.length <= 1) {
        return;
      }
      const filtered = combinedBundleIds.filter((id) => id !== bundleId);
      setCombinedBundleIds(filtered);
      if (activeBundleId === bundleId) {
        setActiveBundleId(filtered[0]);
      }
    } else {
      setCombinedBundleIds([...combinedBundleIds, bundleId]);
      setActiveBundleId(bundleId);
    }
  }, [combinedBundleIds, activeBundleId]);

  const loadPixelBuffer = useCallback((buffer: Uint8ClampedArray, width: number, height: number, url: string) => {
    setPixelBuffer(buffer);
    setImageSize({ width, height });
    setImageUrl(url);
  }, []);

  const clearImage = useCallback(() => {
    setPixelBuffer(null);
    setImageSize({ width: 0, height: 0 });
    setImageUrl(null);
  }, []);

  const exportProject = useCallback((): MosaicProjectData => {
    return {
      version: '1.0',
      timestamp: new Date().toISOString(),
      dimensions,
      activeBundleId,
      combinedBundleIds,
      colorAlgorithm,
      ditherAlgorithm,
      enableDither: ditherAlgorithm !== 'none',
      ditherStrength,
      imageUrl,
    };
  }, [dimensions, activeBundleId, combinedBundleIds, colorAlgorithm, ditherAlgorithm, ditherStrength, imageUrl]);

  const importProject = useCallback((data: Partial<MosaicProjectData>) => {
    if (data.dimensions) setDimensions(data.dimensions);
    if (data.activeBundleId) setActiveBundleId(data.activeBundleId);
    if (data.combinedBundleIds && data.combinedBundleIds.length > 0) {
      setCombinedBundleIds(data.combinedBundleIds);
    }
    if (data.colorAlgorithm) {
      setColorAlgorithmState(data.colorAlgorithm);
    }
    if (data.ditherAlgorithm) {
      setDitherAlgorithm(data.ditherAlgorithm);
    } else if (typeof data.enableDither === 'boolean') {
      setDitherAlgorithm(data.enableDither ? 'floyd-steinberg' : 'none');
    }
    if (typeof data.ditherStrength === 'number') {
      setDitherStrength(data.ditherStrength);
    }
    if (data.imageUrl !== undefined) {
      setImageUrl(data.imageUrl);
      if (data.imageUrl !== imageUrl || data.imageUrl === null) {
        setPixelBuffer(null);
        setImageSize({ width: 0, height: 0 });
      }
    }
  }, [imageUrl]);

  return {
    dimensions,
    setDimensions,
    setPhysicalDimensions,
    setGridCounts,
    activeBundleId,
    setActiveBundleId,
    combinedBundleIds,
    setCombinedBundleIds,
    selectSingleBundle,
    toggleCombinedBundle,
    colorAlgorithm,
    setColorAlgorithm,
    quickCompareColorAlgorithm,
    ditherAlgorithm,
    setDitherAlgorithm,
    enableDither: ditherAlgorithm !== 'none',
    setEnableDither: (val: boolean) => setDitherAlgorithm(val ? 'floyd-steinberg' : 'none'),
    ditherStrength,
    setDitherStrength,
    imageUrl,
    setImageUrl,
    pixelBuffer,
    imageSize,
    loadPixelBuffer,
    clearImage,
    grid,
    bom,
    activePalette,
    exportProject,
    importProject,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/hooks/useMosaicStudio.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useMosaicStudio.ts tests/hooks/useMosaicStudio.test.ts
git commit -m "feat(hook): expose colorAlgorithm, ditherAlgorithm, and quick-compare state"
```

---

### Task 5: Build `RenderingControls` Component for Realtime Diffing

**Files:**
- Create: `src/components/studio/RenderingControls.tsx`
- Create: `tests/components/RenderingControls.test.tsx`

**Interfaces:**
- Consumes:
  - `colorAlgorithm: ColorMatchAlgorithm`
  - `onSelectColorAlgorithm: (alg: ColorMatchAlgorithm) => void`
  - `onQuickCompare: () => void`
  - `ditherAlgorithm: DitherAlgorithm`
  - `onSelectDitherAlgorithm: (alg: DitherAlgorithm) => void`
  - `ditherStrength: number`
  - `onDitherStrengthChange: (val: number) => void`
- Produces: `RenderingControls` React component with 1-click pill selectors.

- [ ] **Step 1: Write failing test for `RenderingControls`**

Create `tests/components/RenderingControls.test.tsx`:
```typescript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RenderingControls } from '@/components/studio/RenderingControls';

describe('RenderingControls', () => {
  const onSelectColorAlgorithm = vi.fn();
  const onQuickCompare = vi.fn();
  const onSelectDitherAlgorithm = vi.fn();
  const onDitherStrengthChange = vi.fn();

  it('renders all color matching pills and triggers callback on click', () => {
    render(
      <RenderingControls
        colorAlgorithm="ciede2000"
        onSelectColorAlgorithm={onSelectColorAlgorithm}
        onQuickCompare={onQuickCompare}
        ditherAlgorithm="floyd-steinberg"
        onSelectDitherAlgorithm={onSelectDitherAlgorithm}
        ditherStrength={0.75}
        onDitherStrengthChange={onDitherStrengthChange}
      />
    );

    expect(screen.getByRole('button', { name: /ciede2000/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /oklab/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cie76/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /oklab/i }));
    expect(onSelectColorAlgorithm).toHaveBeenCalledWith('oklab');
  });

  it('triggers quick compare toggle button', () => {
    render(
      <RenderingControls
        colorAlgorithm="ciede2000"
        onSelectColorAlgorithm={onSelectColorAlgorithm}
        onQuickCompare={onQuickCompare}
        ditherAlgorithm="floyd-steinberg"
        onSelectDitherAlgorithm={onSelectDitherAlgorithm}
        ditherStrength={0.75}
        onDitherStrengthChange={onDitherStrengthChange}
      />
    );

    const compareBtn = screen.getByTitle(/quick compare/i);
    fireEvent.click(compareBtn);
    expect(onQuickCompare).toHaveBeenCalledTimes(1);
  });

  it('renders dither pills and updates strength slider', () => {
    render(
      <RenderingControls
        colorAlgorithm="ciede2000"
        onSelectColorAlgorithm={onSelectColorAlgorithm}
        onQuickCompare={onQuickCompare}
        ditherAlgorithm="atkinson"
        onSelectDitherAlgorithm={onSelectDitherAlgorithm}
        ditherStrength={0.75}
        onDitherStrengthChange={onDitherStrengthChange}
      />
    );

    expect(screen.getByRole('button', { name: /atkinson/i })).toBeInTheDocument();
    const slider = screen.getByRole('slider');
    expect(slider).toBeInTheDocument();

    fireEvent.change(slider, { target: { value: '0.5' } });
    expect(onDitherStrengthChange).toHaveBeenCalledWith(0.5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/RenderingControls.test.tsx`
Expected: FAIL (Cannot find module '@/components/studio/RenderingControls')

- [ ] **Step 3: Implement `src/components/studio/RenderingControls.tsx`**

Create `src/components/studio/RenderingControls.tsx`:
```typescript
'use client';

import React from 'react';
import { ColorMatchAlgorithm, DitherAlgorithm } from '@/types/mosaic';
import { ArrowLeftRight, Sparkles, Sliders } from 'lucide-react';

interface RenderingControlsProps {
  colorAlgorithm: ColorMatchAlgorithm;
  onSelectColorAlgorithm: (alg: ColorMatchAlgorithm) => void;
  onQuickCompare: () => void;
  ditherAlgorithm: DitherAlgorithm;
  onSelectDitherAlgorithm: (alg: DitherAlgorithm) => void;
  ditherStrength: number;
  onDitherStrengthChange: (val: number) => void;
}

const COLOR_ALGORITHMS: { id: ColorMatchAlgorithm; label: string; desc: string }[] = [
  { id: 'ciede2000', label: 'CIEDE2000', desc: 'Perceptual standard (ΔE₀₀)' },
  { id: 'oklab', label: 'Oklab', desc: 'Linear hue & lightness' },
  { id: 'cie76', label: 'CIE76', desc: 'Classic Euclidean (ΔE₇₆)' },
];

const DITHER_ALGORITHMS: { id: DitherAlgorithm; label: string; desc: string }[] = [
  { id: 'none', label: 'Off', desc: 'Clean solid blocks' },
  { id: 'floyd-steinberg', label: 'Floyd-Steinberg', desc: 'Smooth error diffusion' },
  { id: 'atkinson', label: 'Atkinson', desc: 'High-contrast 75% diffusion' },
  { id: 'bayer', label: 'Bayer 4×4', desc: 'Retro halftone crosshatch' },
];

export const RenderingControls: React.FC<RenderingControlsProps> = ({
  colorAlgorithm,
  onSelectColorAlgorithm,
  onQuickCompare,
  ditherAlgorithm,
  onSelectDitherAlgorithm,
  ditherStrength,
  onDitherStrengthChange,
}) => {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 shadow-md backdrop-blur flex flex-col gap-3">
      {/* Top row: Color Algorithm and Quick Compare */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Color Distance:</span>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            {COLOR_ALGORITHMS.map((alg) => {
              const isActive = colorAlgorithm === alg.id;
              return (
                <button
                  key={alg.id}
                  type="button"
                  onClick={() => onSelectColorAlgorithm(alg.id)}
                  title={alg.desc}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white font-bold shadow-sm ring-1 ring-blue-400/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {alg.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onQuickCompare}
            title="Quick Compare: flip between last two selected color algorithms"
            className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition cursor-pointer border border-slate-700/60 active:scale-95"
          >
            <ArrowLeftRight className="w-3 h-3 text-blue-400" />
            <span className="hidden sm:inline">Flip</span>
          </button>
        </div>
      </div>

      {/* Bottom row: Dithering style and strength */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
          <Sliders className="w-3.5 h-3.5 text-blue-400" />
          <span>Dithering:</span>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            {DITHER_ALGORITHMS.map((alg) => {
              const isActive = ditherAlgorithm === alg.id;
              return (
                <button
                  key={alg.id}
                  type="button"
                  onClick={() => onSelectDitherAlgorithm(alg.id)}
                  title={alg.desc}
                  className={`px-2 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white font-bold shadow-sm ring-1 ring-indigo-400/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {alg.label}
                </button>
              );
            })}
          </div>

          {ditherAlgorithm !== 'none' && (
            <div className="flex items-center gap-2 bg-slate-950/70 px-2.5 py-1 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 font-medium">Strength:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={ditherStrength}
                onChange={(e) => onDitherStrengthChange(parseFloat(e.target.value))}
                className="w-16 sm:w-20 accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                aria-label="Dither Strength"
              />
              <span className="text-[10px] font-mono text-slate-300 w-7 text-right">
                {Math.round(ditherStrength * 100)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/RenderingControls.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/studio/RenderingControls.tsx tests/components/RenderingControls.test.tsx
git commit -m "feat(ui): add RenderingControls toolbar with 1-click pills and flip button"
```

---

### Task 6: Integrate `RenderingControls` into Main Studio Page

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `tests/integration/studioPage.test.tsx`

**Interfaces:**
- Consumes: `RenderingControls` and updated `useMosaicStudio` hook.
- Produces: Integrated interactive UI in `NotecraftStudio`.

- [ ] **Step 1: Write integration test for realtime algorithm switching**

Add to `tests/integration/studioPage.test.tsx`:
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
// Verify flipping algorithms updates the UI in real time
it('allows user to switch between CIEDE2000, Oklab, and Atkinson dithering in real time', async () => {
  render(<NotecraftStudio />);
  
  // Find algorithm pill buttons
  const oklabBtn = screen.getByRole('button', { name: /oklab/i });
  const atkinsonBtn = screen.getByRole('button', { name: /atkinson/i });

  fireEvent.click(oklabBtn);
  expect(oklabBtn).toHaveClass('bg-blue-600');

  fireEvent.click(atkinsonBtn);
  expect(atkinsonBtn).toHaveClass('bg-indigo-600');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/integration/studioPage.test.tsx`
Expected: FAIL (Missing buttons or old page layout)

- [ ] **Step 3: Update `src/app/page.tsx`**

Integrate `RenderingControls` above Surface 2 in `src/app/page.tsx`:
```tsx
import { RenderingControls } from '@/components/studio/RenderingControls';

// Inside NotecraftStudio component:
const {
  dimensions,
  setPhysicalDimensions,
  setGridCounts,
  activeBundleId,
  combinedBundleIds,
  selectSingleBundle,
  toggleCombinedBundle,
  colorAlgorithm,
  setColorAlgorithm,
  quickCompareColorAlgorithm,
  ditherAlgorithm,
  setDitherAlgorithm,
  ditherStrength,
  setDitherStrength,
  imageUrl,
  loadPixelBuffer,
  clearImage,
  grid,
  bom,
  importProject,
} = useMosaicStudio();

// In JSX:
<div className="space-y-3">
  <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
    <span>Surface 2: 8-Bit Sticky Note Mosaic</span>
  </div>
  <RenderingControls
    colorAlgorithm={colorAlgorithm}
    onSelectColorAlgorithm={setColorAlgorithm}
    onQuickCompare={quickCompareColorAlgorithm}
    ditherAlgorithm={ditherAlgorithm}
    onSelectDitherAlgorithm={setDitherAlgorithm}
    ditherStrength={ditherStrength}
    onDitherStrengthChange={setDitherStrength}
  />
  <MosaicSurface grid={grid} noteSizeInches={dimensions.noteWidth} />
</div>
```

- [ ] **Step 4: Run all tests to verify everything passes**

Run: `npm test`
Expected: All 15 test suites pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx tests/integration/studioPage.test.tsx
git commit -m "feat(studio): integrate RenderingControls with realtime color and dither switching"
```

---

### Task 7: Full System Verification and Regression Checks

**Files:**
- Test all existing test files across the repository.

- [ ] **Step 1: Run comprehensive test suite**

Run: `npm test`
Expected: PASS (All test suites pass 100%)

- [ ] **Step 2: Run production Next.js build**

Run: `npm run build`
Expected: Build successfully completes with 0 TypeScript and lint errors.

- [ ] **Step 3: Final Git status check and commit**

```bash
git status
```
Expected: Clean working tree.
