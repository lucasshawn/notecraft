'use client';

import { useState, useCallback, useMemo } from 'react';
import { MosaicCell, MosaicDimensions, StickyColor } from '@/types/mosaic';
import { AMAZON_STICKY_BUNDLES } from '@/data/amazonBundles';
import { generateMosaicGrid } from '@/lib/mosaicEngine';
import { calculateBOM, BOMReport } from '@/lib/bomCalculator';

export interface MosaicProjectData {
  version: string;
  timestamp: string;
  dimensions: MosaicDimensions;
  activeBundleId: string;
  combinedBundleIds: string[];
  enableDither: boolean;
  ditherStrength: number;
  imageUrl?: string | null;
}

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
  const [enableDither, setEnableDither] = useState<boolean>(true);
  const [ditherStrength, setDitherStrength] = useState<number>(0.75);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [pixelBuffer, setPixelBuffer] = useState<Uint8ClampedArray | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

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

  // Compute mosaic grid
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
      enableDither,
      ditherStrength
    );
  }, [pixelBuffer, imageSize, dimensions.cols, dimensions.rows, activePalette, enableDither, ditherStrength]);

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
      enableDither,
      ditherStrength,
      imageUrl,
    };
  }, [dimensions, activeBundleId, combinedBundleIds, enableDither, ditherStrength, imageUrl]);

  const importProject = useCallback((data: Partial<MosaicProjectData>) => {
    if (data.dimensions) setDimensions(data.dimensions);
    if (data.activeBundleId) setActiveBundleId(data.activeBundleId);
    if (data.combinedBundleIds && data.combinedBundleIds.length > 0) {
      setCombinedBundleIds(data.combinedBundleIds);
    }
    if (typeof data.enableDither === 'boolean') setEnableDither(data.enableDither);
    if (typeof data.ditherStrength === 'number') setDitherStrength(data.ditherStrength);
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
    enableDither,
    setEnableDither,
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
