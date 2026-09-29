import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMosaicStudio } from '@/hooks/useMosaicStudio';
import { AMAZON_STICKY_BUNDLES } from '@/data/amazonBundles';

describe('useMosaicStudio Hook', () => {
  it('initializes with default dimensions and active Miami bundle', () => {
    const { result } = renderHook(() => useMosaicStudio());
    expect(result.current.dimensions.cols).toBe(24);
    expect(result.current.dimensions.rows).toBe(16);
    expect(result.current.dimensions.surfaceWidth).toBe(72);
    expect(result.current.dimensions.surfaceHeight).toBe(48);
    expect(result.current.dimensions.noteWidth).toBe(3);
    expect(result.current.dimensions.noteHeight).toBe(3);
    expect(result.current.dimensions.unit).toBe('inches');
    expect(result.current.dimensions.lockAspectRatio).toBe(true);

    expect(result.current.activeBundleId).toBe('miami');
    expect(result.current.combinedBundleIds).toEqual(['miami']);
    expect(result.current.activePalette.length).toBe(5);

    expect(result.current.colorAlgorithm).toBe('ciede2000');
    expect(result.current.ditherAlgorithm).toBe('floyd-steinberg');
    expect(result.current.enableDither).toBe(true);
    expect(result.current.ditherStrength).toBe(0.75);
    expect(result.current.imageUrl).toBeNull();
    expect(result.current.grid).toEqual([]);
    expect(result.current.bom.totalNotes).toBe(0);
  });

  it('updates grid size when physical dimensions change with 3x3 inch sticky notes', () => {
    const { result } = renderHook(() => useMosaicStudio());
    act(() => {
      // 72" wide, 48" high window with 3" notes => 24 cols, 16 rows
      result.current.setPhysicalDimensions(72, 48, 3, 3);
    });
    expect(result.current.dimensions.cols).toBe(24);
    expect(result.current.dimensions.rows).toBe(16);

    act(() => {
      // 120" wide, 60" high wall with 3" notes => 40 cols, 20 rows
      result.current.setPhysicalDimensions(120, 60, 3, 3);
    });
    expect(result.current.dimensions.cols).toBe(40);
    expect(result.current.dimensions.rows).toBe(20);
    expect(result.current.dimensions.surfaceWidth).toBe(120);
    expect(result.current.dimensions.surfaceHeight).toBe(60);
  });

  it('clamps minimum physical dimensions to at least 2 columns and 2 rows', () => {
    const { result } = renderHook(() => useMosaicStudio());
    act(() => {
      result.current.setPhysicalDimensions(1, 1, 3, 3);
    });
    expect(result.current.dimensions.cols).toBe(2);
    expect(result.current.dimensions.rows).toBe(2);
  });

  it('updates dimensions when setting explicit grid counts', () => {
    const { result } = renderHook(() => useMosaicStudio());
    act(() => {
      result.current.setGridCounts(30, 20);
    });
    expect(result.current.dimensions.cols).toBe(30);
    expect(result.current.dimensions.rows).toBe(20);
    expect(result.current.dimensions.surfaceWidth).toBe(90); // 30 * 3
    expect(result.current.dimensions.surfaceHeight).toBe(60); // 20 * 3
  });

  it('clamps minimum grid counts to at least 2 columns and 2 rows', () => {
    const { result } = renderHook(() => useMosaicStudio());
    act(() => {
      result.current.setGridCounts(0, -5);
    });
    expect(result.current.dimensions.cols).toBe(2);
    expect(result.current.dimensions.rows).toBe(2);
  });

  it('manages single and combined bundle selections and palette aggregation', () => {
    const { result } = renderHook(() => useMosaicStudio());

    // Switch to Rio de Janeiro bundle
    act(() => {
      result.current.selectSingleBundle('rio');
    });
    expect(result.current.activeBundleId).toBe('rio');
    expect(result.current.combinedBundleIds).toEqual(['rio']);
    expect(result.current.activePalette.length).toBe(5);
    expect(result.current.activePalette.map((c) => c.packId)).toContain('rio');

    // Combine with Monochrome bundle
    act(() => {
      result.current.toggleCombinedBundle('monochrome');
    });
    expect(result.current.combinedBundleIds).toEqual(['rio', 'monochrome']);
    // Rio (5) + Monochrome (3) = 8 colors
    expect(result.current.activePalette.length).toBe(8);

    // Toggle off Rio bundle
    act(() => {
      result.current.toggleCombinedBundle('rio');
    });
    expect(result.current.combinedBundleIds).toEqual(['monochrome']);
    expect(result.current.activeBundleId).toBe('monochrome');
    expect(result.current.activePalette.length).toBe(3);

    // Cannot remove the only remaining bundle
    act(() => {
      result.current.toggleCombinedBundle('monochrome');
    });
    expect(result.current.combinedBundleIds).toEqual(['monochrome']);
  });

  it('toggles dithering and updates dither strength', () => {
    const { result } = renderHook(() => useMosaicStudio());

    act(() => {
      result.current.setEnableDither(false);
      result.current.setDitherStrength(0.5);
    });
    expect(result.current.enableDither).toBe(false);
    expect(result.current.ditherAlgorithm).toBe('none');
    expect(result.current.ditherStrength).toBe(0.5);
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

  it('generates mosaic grid and calculates BOM when pixel buffer is loaded', () => {
    const { result } = renderHook(() => useMosaicStudio());

    // Set 4x3 grid
    act(() => {
      result.current.setGridCounts(4, 3);
    });

    // Create 4x3 blue pixel buffer (RGBA)
    const imgWidth = 4;
    const imgHeight = 3;
    const buffer = new Uint8ClampedArray(imgWidth * imgHeight * 4);
    for (let i = 0; i < buffer.length; i += 4) {
      buffer[i] = 0;       // R
      buffer[i + 1] = 180; // G
      buffer[i + 2] = 216; // B
      buffer[i + 3] = 255; // A
    }

    act(() => {
      result.current.loadPixelBuffer(buffer, imgWidth, imgHeight, 'blob:test-image');
    });

    expect(result.current.imageUrl).toBe('blob:test-image');
    expect(result.current.grid.length).toBe(3); // 3 rows
    expect(result.current.grid[0].length).toBe(4); // 4 cols

    // BOM should reflect 12 total notes
    expect(result.current.bom.totalNotes).toBe(12);
    expect(result.current.bom.colorCounts.length).toBeGreaterThan(0);
    expect(result.current.bom.packRequirements.length).toBeGreaterThan(0);
  });

  it('clears image state and resets grid', () => {
    const { result } = renderHook(() => useMosaicStudio());

    act(() => {
      result.current.setGridCounts(4, 3);
      const buffer = new Uint8ClampedArray(4 * 3 * 4);
      result.current.loadPixelBuffer(buffer, 4, 3, 'blob:test');
    });
    expect(result.current.grid.length).toBe(3);

    act(() => {
      result.current.clearImage();
    });
    expect(result.current.imageUrl).toBeNull();
    expect(result.current.grid).toEqual([]);
    expect(result.current.bom.totalNotes).toBe(0);
  });

  it('supports exporting and importing project state', () => {
    const { result } = renderHook(() => useMosaicStudio());

    act(() => {
      result.current.setPhysicalDimensions(90, 60, 3, 3);
      result.current.selectSingleBundle('energy');
      result.current.setColorAlgorithm('oklab');
      result.current.setDitherAlgorithm('bayer');
      result.current.setDitherStrength(0.4);
    });

    const exported = result.current.exportProject();
    expect(exported.version).toBe('1.0');
    expect(exported.dimensions.cols).toBe(30);
    expect(exported.dimensions.rows).toBe(20);
    expect(exported.activeBundleId).toBe('energy');
    expect(exported.combinedBundleIds).toEqual(['energy']);
    expect(exported.colorAlgorithm).toBe('oklab');
    expect(exported.ditherAlgorithm).toBe('bayer');
    expect(exported.enableDither).toBe(true);
    expect(exported.ditherStrength).toBe(0.4);

    // Import into a new hook instance
    const { result: newHook } = renderHook(() => useMosaicStudio());
    act(() => {
      newHook.current.importProject(exported);
    });

    expect(newHook.current.dimensions.cols).toBe(30);
    expect(newHook.current.dimensions.rows).toBe(20);
    expect(newHook.current.activeBundleId).toBe('energy');
    expect(newHook.current.combinedBundleIds).toEqual(['energy']);
    expect(newHook.current.colorAlgorithm).toBe('oklab');
    expect(newHook.current.ditherAlgorithm).toBe('bayer');
    expect(newHook.current.ditherStrength).toBe(0.4);
  });

  it('resets pixel buffer and image size during importProject when imageUrl changes or is null', () => {
    const { result } = renderHook(() => useMosaicStudio());

    // Load an image
    act(() => {
      const buffer = new Uint8ClampedArray(4 * 3 * 4);
      result.current.loadPixelBuffer(buffer, 4, 3, 'blob:initial-image');
    });
    expect(result.current.grid.length).toBe(16); // default rows
    expect(result.current.pixelBuffer).not.toBeNull();
    expect(result.current.imageSize).toEqual({ width: 4, height: 3 });

    // Import project with a different image URL
    act(() => {
      result.current.importProject({
        imageUrl: 'blob:new-image',
      });
    });
    expect(result.current.imageUrl).toBe('blob:new-image');
    expect(result.current.pixelBuffer).toBeNull();
    expect(result.current.imageSize).toEqual({ width: 0, height: 0 });
    expect(result.current.grid).toEqual([]);

    // Reload image
    act(() => {
      const buffer = new Uint8ClampedArray(4 * 3 * 4);
      result.current.loadPixelBuffer(buffer, 4, 3, 'blob:new-image');
    });
    expect(result.current.pixelBuffer).not.toBeNull();

    // Import project with null image URL
    act(() => {
      result.current.importProject({
        imageUrl: null,
      });
    });
    expect(result.current.imageUrl).toBeNull();
    expect(result.current.pixelBuffer).toBeNull();
    expect(result.current.imageSize).toEqual({ width: 0, height: 0 });
    expect(result.current.grid).toEqual([]);
  });
});
