import { describe, it, expect } from 'vitest';
import {
  rgbToLab,
  deltaE,
  deltaE2000,
  rgbToOklab,
  deltaEOklab,
  findClosestColor,
  hexToRgb,
} from '@/lib/colorScience';
import { AMAZON_STICKY_BUNDLES } from '@/data/amazonBundles';
import { StickyColor } from '@/types/mosaic';

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

  it('matches closest color using cie76 default or explicit', () => {
    const match = findClosestColor([240, 110, 180], palette, 'cie76');
    expect(match.id).toBe('pink');
  });
});
