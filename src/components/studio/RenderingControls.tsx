'use client';

import React from 'react';
import { ColorMatchAlgorithm, DitherAlgorithm } from '@/types/mosaic';
import { ArrowLeftRight, Sparkles, Sliders } from 'lucide-react';

interface RenderingControlsProps {
  colorAlgorithm: ColorMatchAlgorithm;
  onSelectColorAlgorithm: (alg: ColorMatchAlgorithm) => void;
  onQuickCompare: () => void;
  ditherAlgorithm: DitherAlgorithm;
  onSelectDitherAlgorithm: (alg: DitherAlgorithm) => void;
  ditherStrength: number;
  onDitherStrengthChange: (val: number) => void;
}

const COLOR_ALGORITHMS: { id: ColorMatchAlgorithm; label: string; desc: string }[] = [
  { id: 'ciede2000', label: 'CIEDE2000', desc: 'Perceptual standard (ΔE₀₀)' },
  { id: 'oklab', label: 'Oklab', desc: 'Linear hue & lightness' },
  { id: 'cie76', label: 'CIE76', desc: 'Classic Euclidean (ΔE₇₆)' },
];

const DITHER_ALGORITHMS: { id: DitherAlgorithm; label: string; desc: string }[] = [
  { id: 'none', label: 'Off', desc: 'Clean solid blocks' },
  { id: 'floyd-steinberg', label: 'Floyd-Steinberg', desc: 'Smooth error diffusion' },
  { id: 'atkinson', label: 'Atkinson', desc: 'High-contrast 75% diffusion' },
  { id: 'bayer', label: 'Bayer 4×4', desc: 'Retro halftone crosshatch' },
];

export const RenderingControls: React.FC<RenderingControlsProps> = ({
  colorAlgorithm,
  onSelectColorAlgorithm,
  onQuickCompare,
  ditherAlgorithm,
  onSelectDitherAlgorithm,
  ditherStrength,
  onDitherStrengthChange,
}) => {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 shadow-md backdrop-blur flex flex-col gap-3">
      {/* Top row: Color Algorithm and Quick Compare */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Color Distance:</span>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            {COLOR_ALGORITHMS.map((alg) => {
              const isActive = colorAlgorithm === alg.id;
              return (
                <button
                  key={alg.id}
                  type="button"
                  onClick={() => onSelectColorAlgorithm(alg.id)}
                  title={alg.desc}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white font-bold shadow-sm ring-1 ring-blue-400/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {alg.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onQuickCompare}
            title="Quick Compare: flip between last two selected color algorithms"
            className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition cursor-pointer border border-slate-700/60 active:scale-95"
          >
            <ArrowLeftRight className="w-3 h-3 text-blue-400" />
            <span className="hidden sm:inline">Flip</span>
          </button>
        </div>
      </div>

      {/* Bottom row: Dithering style and strength */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
          <Sliders className="w-3.5 h-3.5 text-blue-400" />
          <span>Dithering:</span>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            {DITHER_ALGORITHMS.map((alg) => {
              const isActive = ditherAlgorithm === alg.id;
              return (
                <button
                  key={alg.id}
                  type="button"
                  onClick={() => onSelectDitherAlgorithm(alg.id)}
                  title={alg.desc}
                  className={`px-2 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white font-bold shadow-sm ring-1 ring-indigo-400/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {alg.label}
                </button>
              );
            })}
          </div>

          {ditherAlgorithm !== 'none' && (
            <div className="flex items-center gap-2 bg-slate-950/70 px-2.5 py-1 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 font-medium">Strength:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={ditherStrength}
                onChange={(e) => onDitherStrengthChange(parseFloat(e.target.value))}
                className="w-16 sm:w-20 accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                aria-label="Dither Strength"
              />
              <span className="text-[10px] font-mono text-slate-300 w-7 text-right">
                {Math.round(ditherStrength * 100)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
