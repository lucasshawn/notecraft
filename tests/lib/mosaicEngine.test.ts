import { describe, it, expect } from 'vitest';
import { generateMosaicGrid } from '@/lib/mosaicEngine';
import { AMAZON_STICKY_BUNDLES } from '@/data/amazonBundles';
import { StickyColor } from '@/types/mosaic';
import { rgbToLab } from '@/lib/colorScience';

describe('Mosaic Quantization Engine', () => {
  const miamiPalette = AMAZON_STICKY_BUNDLES.find((b) => b.id === 'miami')!.colors;

  it('generates a grid of exact rows and columns matching palette colors', () => {
    const cols = 4;
    const rows = 3;
    // Create a 4x3 red image (RGBA)
    const imgWidth = 4;
    const imgHeight = 3;
    const buffer = new Uint8ClampedArray(imgWidth * imgHeight * 4);
    for (let i = 0; i < buffer.length; i += 4) {
      buffer[i] = 230;     // R
      buffer[i + 1] = 50;  // G
      buffer[i + 2] = 50;  // B
      buffer[i + 3] = 255; // A
    }

    const grid = generateMosaicGrid(buffer, imgWidth, imgHeight, cols, rows, miamiPalette, false);

    expect(grid.length).toBe(rows);
    expect(grid[0].length).toBe(cols);
    // Reddish pixel should map to Poppy
    expect(grid[0][0].color.id).toBe('poppy');
    expect(grid[rows - 1][cols - 1].color.symbol).toBe('P');
    expect(grid[0][0].row).toBe(0);
    expect(grid[0][0].col).toBe(0);
    expect(grid[0][0].originalRgb).toEqual([230, 50, 50]);
  });

  it('handles empty or zero-dimension grids gracefully', () => {
    const buffer = new Uint8ClampedArray(16);
    expect(generateMosaicGrid(buffer, 2, 2, 0, 5, miamiPalette)).toEqual([]);
    expect(generateMosaicGrid(buffer, 2, 2, 5, 0, miamiPalette)).toEqual([]);
    expect(generateMosaicGrid(buffer, 2, 2, -1, -1, miamiPalette)).toEqual([]);
  });

  it('handles zero or negative image dimensions gracefully', () => {
    const buffer = new Uint8ClampedArray(16);
    expect(generateMosaicGrid(buffer, 0, 2, 5, 5, miamiPalette)).toEqual([]);
    expect(generateMosaicGrid(buffer, 2, 0, 5, 5, miamiPalette)).toEqual([]);
    expect(generateMosaicGrid(buffer, -1, 2, 5, 5, miamiPalette)).toEqual([]);
    expect(generateMosaicGrid(buffer, 2, -1, 5, 5, miamiPalette)).toEqual([]);
    expect(generateMosaicGrid(buffer, 0, 0, 5, 5, miamiPalette)).toEqual([]);
  });

  it('applies Floyd-Steinberg error diffusion dithering', () => {
    // 2x2 image with colors that fall midway between palette colors
    const imgWidth = 2;
    const imgHeight = 2;
    const buffer = new Uint8ClampedArray(imgWidth * imgHeight * 4);
    for (let i = 0; i < buffer.length; i += 4) {
      buffer[i] = 200;
      buffer[i + 1] = 160;
      buffer[i + 2] = 120;
      buffer[i + 3] = 255;
    }

    const gridNoDither = generateMosaicGrid(buffer, imgWidth, imgHeight, 2, 2, miamiPalette, false);
    const gridDithered = generateMosaicGrid(buffer, imgWidth, imgHeight, 2, 2, miamiPalette, true, 1.0);

    // Without dithering, all cells should be identical
    expect(gridNoDither[0][0].color.id).toBe(gridNoDither[0][1].color.id);
    expect(gridNoDither[0][0].color.id).toBe(gridNoDither[1][0].color.id);
    expect(gridNoDither[0][0].color.id).toBe(gridNoDither[1][1].color.id);

    // Dither strength > 0 should diffuse error
    expect(gridDithered.length).toBe(2);
    expect(gridDithered[0].length).toBe(2);
    const gridZeroStrength = generateMosaicGrid(buffer, imgWidth, imgHeight, 2, 2, miamiPalette, true, 0);
    const zeroStrengthColorIds = gridZeroStrength.flatMap((row) => row.map((cell) => cell.color.id));
    const noDitherColorIds = gridNoDither.flatMap((row) => row.map((cell) => cell.color.id));
    expect(zeroStrengthColorIds).toEqual(noDitherColorIds);
  });

  it('meets client performance requirement: recalculates 60x60 grid in under 25ms', () => {
    const cols = 60;
    const rows = 60;
    const imgWidth = 60;
    const imgHeight = 60;
    const buffer = new Uint8ClampedArray(imgWidth * imgHeight * 4);

    // Populate with gradient
    for (let y = 0; y < imgHeight; y++) {
      for (let x = 0; x < imgWidth; x++) {
        const idx = (y * imgWidth + x) * 4;
        buffer[idx] = Math.floor((x / imgWidth) * 255);
        buffer[idx + 1] = Math.floor((y / imgHeight) * 255);
        buffer[idx + 2] = 128;
        buffer[idx + 3] = 255;
      }
    }

    // Warm-up JIT
    generateMosaicGrid(buffer, imgWidth, imgHeight, 10, 10, miamiPalette, true, 0.8);

    const start = performance.now();
    const grid = generateMosaicGrid(buffer, imgWidth, imgHeight, cols, rows, miamiPalette, true, 0.8);
    const duration = performance.now() - start;

    expect(grid.length).toBe(rows);
    expect(grid[0].length).toBe(cols);
    expect(duration).toBeLessThan(25);
  });
});

describe('Advanced Dither Algorithms (Atkinson, Bayer 4x4, None)', () => {
  const TEST_PALETTE: StickyColor[] = [
    { id: 'black', name: 'Black', hex: '#000000', lab: rgbToLab(0, 0, 0), symbol: 'K', packId: 'p' },
    { id: 'white', name: 'White', hex: '#FFFFFF', lab: rgbToLab(255, 255, 255), symbol: 'W', packId: 'p' },
  ];

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
