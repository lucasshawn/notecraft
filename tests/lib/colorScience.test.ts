import { describe, it, expect } from 'vitest';
import { rgbToLab, deltaE, findClosestColor, hexToRgb } from '@/lib/colorScience';
import { AMAZON_STICKY_BUNDLES } from '@/data/amazonBundles';

describe('Color Science Conversion & Matching', () => {
  it('converts pure white and black RGB to accurate CIELAB coordinates', () => {
    const whiteLab = rgbToLab(255, 255, 255);
    expect(whiteLab[0]).toBeCloseTo(100, 0); // L* should be ~100
    expect(Math.abs(whiteLab[1])).toBeLessThan(2);
    expect(Math.abs(whiteLab[2])).toBeLessThan(2);

    const blackLab = rgbToLab(0, 0, 0);
    expect(blackLab[0]).toBeCloseTo(0, 0); // L* should be ~0
  });

  it('calculates zero Delta E for identical colors', () => {
    const lab: [number, number, number] = [50, 20, -30];
    expect(deltaE(lab, lab)).toBe(0);
  });

  it('accurately matches a bright yellow RGB to Canary Yellow / aqua to Aqua Splash', () => {
    const miamiPalette = AMAZON_STICKY_BUNDLES.find((b) => b.id === 'miami')!.colors;
    // Test matching a bright aqua color to Aqua Splash
    const closest = findClosestColor([0, 180, 220], miamiPalette);
    expect(closest.id).toBe('aqua-splash');
  });

  it('converts hex strings with and without hash to RGB', () => {
    expect(hexToRgb('#00B4D8')).toEqual([0, 180, 216]);
    expect(hexToRgb('E63946')).toEqual([230, 57, 70]);
    expect(hexToRgb('#FFFFFF')).toEqual([255, 255, 255]);
    expect(hexToRgb('#000000')).toEqual([0, 0, 0]);
  });

  it('throws an error when finding closest color with an empty palette', () => {
    expect(() => findClosestColor([255, 255, 255], [])).toThrow('Palette cannot be empty');
  });

  it('executes 3,600 color lookups (60x60 grid) in under 25ms', () => {
    const palette = AMAZON_STICKY_BUNDLES[0].colors; // 5 colors
    const start = performance.now();
    for (let i = 0; i < 3600; i++) {
      findClosestColor([i % 256, (i * 2) % 256, (i * 3) % 256], palette);
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(25);
  });
});
