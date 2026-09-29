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

// CIEDE2000 (ΔE00) perceptual difference (Sharma, Wu, Dalal 2005)
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

// Convert sRGB to Oklab (Björn Ottosson)
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
