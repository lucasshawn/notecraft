'use client';

import React from 'react';
import { AMAZON_STICKY_BUNDLES } from '@/data/amazonBundles';

interface PaletteRibbonProps {
  activeBundleId: string;
  combinedBundleIds: string[];
  onSelectBundle: (bundleId: string) => void;
  onToggleBundle: (bundleId: string) => void;
}

export function PaletteRibbon({
  activeBundleId,
  combinedBundleIds,
  onSelectBundle,
  onToggleBundle,
}: PaletteRibbonProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="font-semibold text-slate-200">Amazon 3M Post-it Palettes (Instant Flip):</span>
        <span>Click to preview palette (Shift+Click to combine)</span>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {AMAZON_STICKY_BUNDLES.map((bundle) => {
          const isSelected = combinedBundleIds.includes(bundle.id);
          const isActive = activeBundleId === bundle.id;

          return (
            <div
              key={bundle.id}
              data-testid={`bundle-card-${bundle.id}`}
              className={`flex-shrink-0 flex flex-col p-2.5 rounded-lg border text-left transition ${
                isSelected
                  ? isActive
                    ? 'bg-blue-950/70 border-blue-400 shadow-md ring-2 ring-blue-500'
                    : 'bg-blue-950/50 border-blue-500 shadow-md ring-1 ring-blue-500'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    if (e.shiftKey || e.ctrlKey || e.metaKey) {
                      onToggleBundle(bundle.id);
                    } else {
                      onSelectBundle(bundle.id);
                    }
                  }}
                  className="text-xs font-semibold text-slate-200 truncate max-w-[125px] hover:text-blue-400 text-left focus:outline-none"
                  title={`${bundle.name} (Click to select)`}
                >
                  {bundle.name.replace('Post-it ', '')}
                </button>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400">{bundle.colors.length} colors</span>
                  <button
                    type="button"
                    aria-label={`Toggle ${bundle.name.replace('Post-it ', '')} in palette`}
                    title={isSelected ? 'Remove from combination' : 'Add to combination'}
                    onClick={() => onToggleBundle(bundle.id)}
                    className={`text-[10px] px-1.5 py-0.5 rounded border transition font-medium ${
                      isSelected
                        ? 'bg-blue-600 border-blue-400 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {isSelected ? '✓ In mix' : '+ Mix'}
                  </button>
                </div>
              </div>

              {/* Swatch row */}
              <div
                role="button"
                tabIndex={0}
                aria-label={`Preview swatches for ${bundle.name}`}
                onClick={(e) => {
                  if (e.shiftKey || e.ctrlKey || e.metaKey) {
                    onToggleBundle(bundle.id);
                  } else {
                    onSelectBundle(bundle.id);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (e.shiftKey) {
                      onToggleBundle(bundle.id);
                    } else {
                      onSelectBundle(bundle.id);
                    }
                  }
                }}
                className="flex items-center gap-1 cursor-pointer focus:outline-none"
              >
                {bundle.colors.map((c) => (
                  <span
                    key={c.id}
                    title={`${c.name} (${c.symbol})`}
                    className="w-4 h-4 rounded-sm border border-black/20 shadow-sm"
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
