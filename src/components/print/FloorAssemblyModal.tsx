'use client';

import React, { useState, useMemo } from 'react';
import { Printer, X, FileText } from 'lucide-react';
import { MosaicCell, MosaicDimensions } from '@/types/mosaic';
import { BOMReport } from '@/lib/bomCalculator';
import { partitionGridIntoSheets, generateFloorMatrix } from '@/lib/floorTiling';

interface FloorAssemblyModalProps {
  isOpen: boolean;
  onClose: () => void;
  grid: MosaicCell[][];
  bom: BOMReport;
  dimensions: MosaicDimensions;
}

export function FloorAssemblyModal({
  isOpen,
  onClose,
  grid,
  bom,
  dimensions,
}: FloorAssemblyModalProps) {
  const [inkSaver, setInkSaver] = useState<boolean>(false);
  const [tileRows] = useState<number>(20);
  const [tileCols] = useState<number>(25);

  const sheets = useMemo(() => {
    return partitionGridIntoSheets(grid, tileRows, tileCols);
  }, [grid, tileRows, tileCols]);

  const numSheetRows = Math.ceil((grid.length || 1) / tileRows);
  const numSheetCols = Math.ceil(((grid[0] && grid[0].length) || 1) / tileCols);

  const floorMatrix = useMemo(() => {
    return generateFloorMatrix(numSheetRows, numSheetCols, sheets);
  }, [numSheetRows, numSheetCols, sheets]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-bold text-slate-100">Printable Floor Assembly Packet</h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-1 text-slate-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Print Configuration Controls */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-800 text-xs text-slate-300">
          <div className="flex items-center gap-6">
            <span>
              Total Sheets: <strong>{sheets.length + 1}</strong> (1 Cover + {sheets.length} Grid Tiles)
            </span>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={inkSaver}
                onChange={(e) => setInkSaver(e.target.checked)}
                className="rounded text-blue-500"
              />
              <span>Ink-Saver Mode (B&W Outlines)</span>
            </label>
          </div>
        </div>

        {/* Printable Content Area */}
        <div id="printable-packet" className="p-6 overflow-y-auto space-y-8 bg-slate-950">
          {/* Page 1: Cover Sheet */}
          <div className="print-page bg-white text-black p-8 rounded-xl shadow-lg border border-slate-200">
            <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black tracking-tight">NOTECRAFT MOSAIC BLUEPRINT</h1>
                <p className="text-sm text-gray-600 mt-1">Floor Assembly Guide & Bill of Materials</p>
              </div>
              <div className="text-right text-xs">
                <p className="font-bold">
                  Surface: {dimensions.surfaceWidth}″ × {dimensions.surfaceHeight}″
                </p>
                <p>
                  {dimensions.cols} × {dimensions.rows} Notes ({bom.totalNotes} total)
                </p>
              </div>
            </div>

            {/* Floor Matrix Schematic */}
            <div className="mb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                Floor Tile Layout Guide (Tape or Lay Side-by-Side):
              </h4>
              <div
                className="grid gap-2 border border-gray-300 p-3 rounded bg-gray-50 inline-grid"
                style={{ gridTemplateColumns: `repeat(${floorMatrix.matrixCols}, minmax(60px, 1fr))` }}
              >
                {floorMatrix.sheetLayout.map((row, rIdx) =>
                  row.map((tile, cIdx) => (
                    <div
                      key={`${rIdx}-${cIdx}`}
                      className="border-2 border-dashed border-gray-400 bg-white p-2 text-center rounded text-xs"
                    >
                      <div className="font-black text-blue-600">Sheet {tile.sheetIndex}</div>
                      <div className="text-[10px] text-gray-500 font-bold">Sec {tile.sectionCode}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Color Legend & Symbol Table */}
            <div className="mb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                Color Symbol Legend:
              </h4>
              <table className="w-full text-xs border border-gray-300">
                <thead className="bg-gray-100 border-b border-gray-300">
                  <tr>
                    <th className="p-1.5 text-left">Symbol</th>
                    <th className="p-1.5 text-left">Color</th>
                    <th className="p-1.5 text-right">Notes</th>
                    <th className="p-1.5 text-right">Pads</th>
                    <th className="p-1.5 text-left">Pack</th>
                  </tr>
                </thead>
                <tbody>
                  {bom.colorCounts.map((item) => (
                    <tr key={item.color.id} className="border-b border-gray-200">
                      <td className="p-1.5 font-bold">{item.color.symbol}</td>
                      <td className="p-1.5 flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full border border-gray-400"
                          style={{ backgroundColor: item.color.hex }}
                        />
                        <span>{item.color.name}</span>
                      </td>
                      <td className="p-1.5 text-right font-semibold">{item.notesNeeded}</td>
                      <td className="p-1.5 text-right">{item.padsNeeded}</td>
                      <td className="p-1.5 text-gray-600">{item.packName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pages 2..N: Tiled Grid Sheets */}
          {sheets.map((sheet) => (
            <div
              key={sheet.sheetIndex}
              className="print-page bg-white text-black p-6 rounded-xl shadow-lg border border-slate-200 page-break"
            >
              <div className="flex justify-between items-center border-b border-gray-300 pb-2 mb-4 text-xs">
                <div>
                  <span className="font-bold">
                    Sheet {sheet.sheetIndex} of {sheets.length}
                  </span>{' '}
                  — Section {sheet.sectionCode}
                </div>
                <div className="text-gray-500">
                  Rows {sheet.startRow + 1}–{sheet.endRow + 1}, Cols {sheet.startCol + 1}–{sheet.endCol + 1}
                </div>
              </div>

              {/* Grid with coordinate numbers */}
              <div
                className="grid gap-[1px] bg-gray-300 p-[1px] border border-gray-400"
                style={{
                  gridTemplateColumns: `repeat(${sheet.cells[0]?.length || 1}, minmax(18px, 1fr))`,
                }}
              >
                {sheet.cells.map((row, r) =>
                  row.map((cell, c) => (
                    <div
                      key={`${r}-${c}`}
                      className={`aspect-square flex items-center justify-center font-bold text-[10px] ${
                        inkSaver ? 'bg-white text-black' : ''
                      }`}
                      style={{
                        backgroundColor: inkSaver ? '#FFFFFF' : cell.color.hex,
                        color: inkSaver ? '#000000' : '#000000',
                      }}
                    >
                      {cell.color.symbol}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
