import { StickyColor } from '@/types/mosaic';

// Convert sRGB (0-255) to CIE L*a*b* (D65 illuminant)
export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  // 1. Convert sRGB to linear RGB
  let rLin = r / 255;
  let gLin = g / 255;
  let bLin = b / 255;

  rLin = rLin > 0.04045 ? Math.pow((rLin + 0.055) / 1.055, 2.4) : rLin / 12.92;
  gLin = gLin > 0.04045 ? Math.pow((gLin + 0.055) / 1.055, 2.4) : gLin / 12.92;
  bLin = bLin > 0.04045 ? Math.pow((bLin + 0.055) / 1.055, 2.4) : bLin / 12.92;

  // 2. Linear RGB to XYZ (D65 standard observer matrix)
  const x = (rLin * 0.4124564 + gLin * 0.3575761 + bLin * 0.1804375) / 0.95047;
  const y = (rLin * 0.2126729 + gLin * 0.7151522 + bLin * 0.072175) / 1.00000;
  const z = (rLin * 0.0193339 + gLin * 0.1191920 + bLin * 0.9503041) / 1.08883;

  // 3. XYZ to CIELAB
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

// Find closest StickyColor in palette for a given RGB
export function findClosestColor(rgb: [number, number, number], palette: StickyColor[]): StickyColor {
  if (palette.length === 0) {
    throw new Error('Palette cannot be empty');
  }

  const targetLab = rgbToLab(rgb[0], rgb[1], rgb[2]);
  let minDistance = Infinity;
  let bestColor = palette[0];

  for (let i = 0; i < palette.length; i++) {
    const candidate = palette[i];
    const dist = deltaE(targetLab, candidate.lab);
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
