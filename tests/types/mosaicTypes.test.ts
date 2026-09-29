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
