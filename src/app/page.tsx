'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Layers, Printer, Download, FolderOpen } from 'lucide-react';
import { useMosaicStudio } from '@/hooks/useMosaicStudio';
import { ReferenceSurface } from '@/components/studio/ReferenceSurface';
import { MosaicSurface } from '@/components/studio/MosaicSurface';
import { DimensionControls } from '@/components/studio/DimensionControls';
import { PaletteRibbon } from '@/components/studio/PaletteRibbon';
import { RenderingControls } from '@/components/studio/RenderingControls';
import { BuyNowBar } from '@/components/studio/BuyNowBar';
import { FloorAssemblyModal } from '@/components/print/FloorAssemblyModal';
import { SAMPLE_IMAGES } from '@/data/sampleImages';

export default function NotecraftStudio() {
  const {
    dimensions,
    setPhysicalDimensions,
    setGridCounts,
    activeBundleId,
    combinedBundleIds,
    selectSingleBundle,
    toggleCombinedBundle,
    colorAlgorithm,
    setColorAlgorithm,
    quickCompareColorAlgorithm,
    ditherAlgorithm,
    setDitherAlgorithm,
    ditherStrength,
    setDitherStrength,
    imageUrl,
    loadPixelBuffer,
    clearImage,
    grid,
    bom,
    importProject,
  } = useMosaicStudio();

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const isRestoredRef = useRef(false);

  const loadSample = useCallback((url: string) => {
    if (typeof window === 'undefined') return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, img.width, img.height);
        loadPixelBuffer(data.data, img.width, img.height, url);
      }
    };
    img.onerror = () => {
      console.warn(`Failed to load sample image from: ${url}`);
    };
    img.src = url;
  }, [loadPixelBuffer]);

  // Restore saved project from localStorage on initial load
  useEffect(() => {
    if (isRestoredRef.current) return;
    isRestoredRef.current = true;

    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('notecraft_project');
        if (saved) {
          const data = JSON.parse(saved);
          importProject(data);
          if (data.imageUrl) {
            loadSample(data.imageUrl);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load project from localStorage', e);
    }
  }, [importProject, loadSample]);

  const exportProjectJson = () => {
    const projectData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      dimensions,
      activeBundleId,
      combinedBundleIds,
      colorAlgorithm,
      ditherAlgorithm,
      enableDither: ditherAlgorithm !== 'none',
      ditherStrength,
      imageUrl,
      bom,
    };
    const serialized = JSON.stringify(projectData, null, 2);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('notecraft_project', serialized);
      }
    } catch (e) {
      console.warn('Failed to save to localStorage', e);
    }
    const blob = new Blob([serialized], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notecraft-mosaic-${Date.now()}.notecraft`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        importProject(data);
        if (data.imageUrl) {
          loadSample(data.imageUrl);
        }
        if (typeof window !== 'undefined') {
          localStorage.setItem('notecraft_project', JSON.stringify(data));
        }
      } catch (err) {
        console.error('Failed to parse project file', err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header Bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-amber-400 to-orange-500 rounded-xl text-slate-950 font-black shadow-lg">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight bg-gradient-to-r from-amber-300 via-orange-400 to-pink-500 bg-clip-text text-transparent">
              NOTECRAFT
            </h1>
            <p className="text-[10px] text-slate-400">Sticky Note Mosaic Studio for Large Surfaces</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={importFileInputRef}
            onChange={handleImportJson}
            accept=".notecraft,.json,application/json"
            className="hidden"
            aria-label="Upload Project File"
            data-testid="project-file-input"
          />
          <button
            type="button"
            onClick={() => importFileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Open Project</span>
          </button>
          <button
            type="button"
            onClick={exportProjectJson}
            disabled={grid.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-lg text-xs font-semibold transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Save Project</span>
          </button>
          <button
            type="button"
            onClick={() => setIsPrintModalOpen(true)}
            disabled={grid.length === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition shadow"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Assembly Map</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Amazon Palette Ribbon */}
        <PaletteRibbon
          activeBundleId={activeBundleId}
          combinedBundleIds={combinedBundleIds}
          onSelectBundle={selectSingleBundle}
          onToggleBundle={toggleCombinedBundle}
        />

        {/* Dimension & Surface Controls */}
        <DimensionControls
          dimensions={dimensions}
          onPhysicalChange={setPhysicalDimensions}
          onGridCountChange={setGridCounts}
        />

        {/* Dual Design Surfaces */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span>Surface 1: Reference Picture</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-[10px]">Try sample:</span>
                {SAMPLE_IMAGES.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => loadSample(sample.url)}
                    className="text-[10px] text-blue-400 hover:text-blue-300 underline cursor-pointer"
                  >
                    {sample.name}
                  </button>
                ))}
              </div>
            </div>
            <ReferenceSurface
              imageUrl={imageUrl}
              onImageLoaded={loadPixelBuffer}
              onClear={clearImage}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span>Surface 2: 8-Bit Sticky Note Mosaic</span>
            </div>
            <RenderingControls
              colorAlgorithm={colorAlgorithm}
              onSelectColorAlgorithm={setColorAlgorithm}
              onQuickCompare={quickCompareColorAlgorithm}
              ditherAlgorithm={ditherAlgorithm}
              onSelectDitherAlgorithm={setDitherAlgorithm}
              ditherStrength={ditherStrength}
              onDitherStrengthChange={setDitherStrength}
            />
            <MosaicSurface grid={grid} noteSizeInches={dimensions.noteWidth} />
          </div>
        </div>

        {/* Amazon Affiliate Buy Now Bar */}
        <BuyNowBar bom={bom} />
      </div>

      {/* Floor Assembly Modal */}
      <FloorAssemblyModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        grid={grid}
        bom={bom}
        dimensions={dimensions}
      />
    </main>
  );
}
