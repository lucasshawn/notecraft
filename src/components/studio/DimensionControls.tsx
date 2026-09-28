'use client';

import React from 'react';
import { MosaicDimensions } from '@/types/mosaic';

export interface DimensionControlsProps {
  dimensions: MosaicDimensions;
  onPhysicalChange: (w: number, h: number, noteW: number, noteH: number) => void;
  onGridCountChange: (cols: number, rows: number) => void;
}

export function DimensionControls({ dimensions, onPhysicalChange, onGridCountChange }: DimensionControlsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200">
      <div>
        <label htmlFor="dim-surface-width" className="block text-slate-400 mb-1">
          Surface Width ({dimensions.unit})
        </label>
        <input
          id="dim-surface-width"
          type="number"
          value={dimensions.surfaceWidth}
          onChange={(e) =>
            onPhysicalChange(Number(e.target.value), dimensions.surfaceHeight, dimensions.noteWidth, dimensions.noteHeight)
          }
          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-white"
        />
      </div>
      <div>
        <label htmlFor="dim-surface-height" className="block text-slate-400 mb-1">
          Surface Height ({dimensions.unit})
        </label>
        <input
          id="dim-surface-height"
          type="number"
          value={dimensions.surfaceHeight}
          onChange={(e) =>
            onPhysicalChange(dimensions.surfaceWidth, Number(e.target.value), dimensions.noteWidth, dimensions.noteHeight)
          }
          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-white"
        />
      </div>
      <div>
        <label htmlFor="dim-grid-cols" className="block text-slate-400 mb-1">
          Grid Notes Wide ({dimensions.cols})
        </label>
        <input
          id="dim-grid-cols"
          type="range"
          min="10"
          max="80"
          value={dimensions.cols}
          onChange={(e) => onGridCountChange(Number(e.target.value), dimensions.rows)}
          className="w-full accent-blue-500"
        />
      </div>
      <div>
        <label htmlFor="dim-grid-rows" className="block text-slate-400 mb-1">
          Grid Notes High ({dimensions.rows})
        </label>
        <input
          id="dim-grid-rows"
          type="range"
          min="10"
          max="60"
          value={dimensions.rows}
          onChange={(e) => onGridCountChange(dimensions.cols, Number(e.target.value))}
          className="w-full accent-blue-500"
        />
      </div>
    </div>
  );
}
