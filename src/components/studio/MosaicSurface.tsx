'use client';

import React, { useState } from 'react';
import { MosaicCell } from '@/types/mosaic';

export interface MosaicSurfaceProps {
  grid: MosaicCell[][];
  noteSizeInches?: number;
}

export function MosaicSurface({ grid, noteSizeInches = 3 }: MosaicSurfaceProps) {
  const [hoveredCell, setHoveredCell] = useState<MosaicCell | null>(null);
  const [paperRealism, setPaperRealism] = useState<boolean>(true);

  if (!grid || grid.length === 0 || grid[0].length === 0) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-[460px] bg-slate-950 border border-slate-800 rounded-xl text-slate-500">
        <p className="text-sm">Upload a reference picture to generate your sticky note mosaic</p>
      </div>
    );
  }

  const rows = grid.length;
  const cols = grid[0].length;

  return (
    <div className="flex flex-col w-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs text-slate-300">
        <span>
          Mosaic: <strong>{cols}</strong> &times; <strong>{rows}</strong> notes ({cols * rows} total)
        </span>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={paperRealism}
            onChange={(e) => setPaperRealism(e.target.checked)}
            className="rounded text-blue-500"
          />
          <span>Paper Realism</span>
        </label>
      </div>

      <div className="relative flex items-center justify-center p-4 overflow-auto max-h-[460px]">
        <div
          className="grid gap-[2px] bg-slate-900 p-2 rounded shadow-2xl"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(10px, 24px))`,
          }}
        >
          {grid.map((row, rIdx) =>
            row.map((cell, cIdx) => (
              <div
                key={`${rIdx}-${cIdx}`}
                data-testid="mosaic-cell"
                onMouseEnter={() => setHoveredCell(cell)}
                onMouseLeave={() => setHoveredCell(null)}
                className={`aspect-square transition-transform hover:scale-125 hover:z-20 cursor-pointer flex items-center justify-center ${
                  paperRealism ? 'rounded-[2px] shadow-sm' : ''
                }`}
                style={{
                  backgroundColor: cell.color.hex,
                }}
              >
                <span className="text-[8px] font-bold text-black/60 select-none pointer-events-none opacity-0 hover:opacity-100">
                  {cell.color.symbol}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Hover Inspector Tooltip */}
        {hoveredCell && (
          <div className="absolute bottom-4 right-4 bg-slate-900/95 border border-slate-700 px-3 py-2 rounded-lg shadow-xl text-xs text-slate-200 pointer-events-none z-30">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full border border-white/20"
                style={{ backgroundColor: hoveredCell.color.hex }}
              />
              <span className="font-bold">{hoveredCell.color.name}</span>
              <span className="text-slate-400">({hoveredCell.color.symbol})</span>
            </div>
            <div className="text-slate-400 mt-1">
              Row {hoveredCell.row + 1}, Col {hoveredCell.col + 1}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
