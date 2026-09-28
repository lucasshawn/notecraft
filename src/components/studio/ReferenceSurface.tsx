'use client';

import React, { useRef } from 'react';
import { Upload } from 'lucide-react';

export interface ReferenceSurfaceProps {
  imageUrl: string | null;
  onImageLoaded: (buffer: Uint8ClampedArray, width: number, height: number, url: string) => void;
  onClear?: () => void;
}

export function ReferenceSurface({ imageUrl, onImageLoaded, onClear }: ReferenceSurfaceProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, img.width, img.height);
        onImageLoaded(imgData.data, img.width, img.height, url);
      }
    };
    img.src = url;
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      className="relative flex flex-col items-center justify-center w-full h-[460px] bg-slate-900 border-2 border-dashed border-slate-700 rounded-xl overflow-hidden shadow-inner"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {imageUrl ? (
        <div className="relative w-full h-full flex items-center justify-center group">
          <img src={imageUrl} alt="Reference Preview" className="w-full h-full object-contain" />
          <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 text-xs font-medium text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-slate-600 shadow backdrop-blur transition"
            >
              Change Photo
            </button>
            {onClear && (
              <button
                type="button"
                onClick={onClear}
                className="px-3 py-1.5 text-xs font-medium text-red-200 bg-red-900/60 hover:bg-red-800/80 rounded-lg border border-red-700 shadow backdrop-blur transition"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 p-6 text-center text-slate-400">
          <Upload className="w-12 h-12 text-blue-500 animate-pulse" />
          <p className="font-semibold text-slate-200">Drag & Drop Reference Picture</p>
          <p className="text-xs text-slate-500">Supports PNG, JPG, WebP</p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 mt-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition shadow"
          >
            Browse Photo
          </button>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
      />
    </div>
  );
}
