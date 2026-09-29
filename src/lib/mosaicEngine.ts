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
  colorAlgorithmOrEnableDither: ColorMatchAlgorithm | boolean = 'ciede2000',
  ditherAlgorithm: DitherAlgorithm = 'floyd-steinberg',
  ditherStrength: number = 0.8
): MosaicCell[][] {
  if (cols <= 0 || rows <= 0 || imgWidth <= 0 || imgHeight <= 0) return [];

  let effectiveColorAlgorithm: ColorMatchAlgorithm = 'ciede2000';
  let effectiveDitherAlgorithm: DitherAlgorithm = ditherAlgorithm;
  let effectiveStrength: number = ditherStrength;

  if (typeof colorAlgorithmOrEnableDither === 'boolean') {
    effectiveColorAlgorithm = 'cie76';
    effectiveDitherAlgorithm = colorAlgorithmOrEnableDither ? 'floyd-steinberg' : 'none';
    effectiveStrength = typeof ditherAlgorithm === 'number' ? (ditherAlgorithm as unknown as number) : 0.8;
  } else {
    effectiveColorAlgorithm = colorAlgorithmOrEnableDither;
  }

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

  // Pre-cache hexToRgb and Oklab for palette colors
  const paletteRgbMap = new Map<string, [number, number, number]>();
  for (const color of palette) {
    if (!color.oklab) {
      const rgb = hexToRgb(color.hex);
      color.oklab = rgbToOklab(rgb[0], rgb[1], rgb[2]);
    }
    paletteRgbMap.set(color.id, hexToRgb(color.hex));
  }

  // Bayer Ordered Dithering (Matrix Thresholding)
  if (effectiveDitherAlgorithm === 'bayer' && effectiveStrength > 0) {
    const grid: MosaicCell[][] = [];
    const bayerScale = 255 * effectiveStrength * 0.5;

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

        const matchedColor = findClosestColor(adjustedRgb, palette, effectiveColorAlgorithm);
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

      const matchedColor = findClosestColor(clampedRgb, palette, effectiveColorAlgorithm);
      const originalRgb = sampledRgb[r][c];

      grid[r][c] = {
        row: r,
        col: c,
        color: matchedColor,
        originalRgb,
      };

      if (effectiveDitherAlgorithm !== 'none' && effectiveStrength > 0) {
        const matchedRgb = paletteRgbMap.get(matchedColor.id) || hexToRgb(matchedColor.hex);
        const errR = (clampedRgb[0] - matchedRgb[0]) * effectiveStrength;
        const errG = (clampedRgb[1] - matchedRgb[1]) * effectiveStrength;
        const errB = (clampedRgb[2] - matchedRgb[2]) * effectiveStrength;

        if (effectiveDitherAlgorithm === 'floyd-steinberg') {
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
        } else if (effectiveDitherAlgorithm === 'atkinson') {
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
