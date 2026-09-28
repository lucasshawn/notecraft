import { MosaicCell, StickyColor } from '@/types/mosaic';
import { findClosestColor, hexToRgb } from '@/lib/colorScience';

export function generateMosaicGrid(
  pixelBuffer: Uint8ClampedArray,
  imgWidth: number,
  imgHeight: number,
  cols: number,
  rows: number,
  palette: StickyColor[],
  enableDither: boolean = false,
  ditherStrength: number = 0.8
): MosaicCell[][] {
  if (cols <= 0 || rows <= 0) {
    return [];
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

  // Work on a mutable copy for Floyd-Steinberg error diffusion
  const bufferRgb: [number, number, number][][] = sampledRgb.map((row) =>
    row.map((pixel) => [pixel[0], pixel[1], pixel[2]])
  );

  // Pre-cache hexToRgb for palette colors to avoid repeated string parsing during dithering
  const paletteRgbMap = new Map<string, [number, number, number]>();
  for (const color of palette) {
    paletteRgbMap.set(color.id, hexToRgb(color.hex));
  }

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

      const matchedColor = findClosestColor(clampedRgb, palette);
      const originalRgb = sampledRgb[r][c];

      grid[r][c] = {
        row: r,
        col: c,
        color: matchedColor,
        originalRgb,
      };

      if (enableDither && ditherStrength > 0) {
        const matchedRgb = paletteRgbMap.get(matchedColor.id) || hexToRgb(matchedColor.hex);
        const errR = (clampedRgb[0] - matchedRgb[0]) * ditherStrength;
        const errG = (clampedRgb[1] - matchedRgb[1]) * ditherStrength;
        const errB = (clampedRgb[2] - matchedRgb[2]) * ditherStrength;

        // Diffuse to neighbors using Floyd-Steinberg distribution
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
      }
    }
  }

  return grid;
}
