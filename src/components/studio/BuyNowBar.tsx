'use client';

import React from 'react';
import { ShoppingCart, ExternalLink } from 'lucide-react';
import { BOMReport } from '@/lib/bomCalculator';

interface BuyNowBarProps {
  bom: BOMReport;
}

export function BuyNowBar({ bom }: BuyNowBarProps) {
  if (!bom || bom.totalNotes === 0) return null;

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-gradient-to-r from-blue-950/70 to-indigo-950/70 border border-blue-800/60 rounded-xl shadow-lg">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-blue-600 rounded-xl text-white shadow">
          <ShoppingCart className="w-6 h-6" />
        </div>
        <div>
          <h4 className="font-semibold text-slate-100 text-sm">
            Bill of Materials: {bom.totalNotes} Sticky Notes Required
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            {bom.packRequirements.map((p) => `${p.packsNeeded}x ${p.bundle.name}`).join(' + ')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {bom.packRequirements.map((req) => (
          <a
            key={req.bundle.id}
            href={req.affiliateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-sm transition shadow-md hover:shadow-lg"
          >
            <span>Buy {req.bundle.name.replace('Post-it ', '')} on Amazon</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        ))}
      </div>
    </div>
  );
}
