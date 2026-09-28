import { describe, it, expect } from 'vitest';
import { partitionGridIntoSheets, generateFloorMatrix, AssemblySheet } from '@/lib/floorTiling';
import { MosaicCell } from '@/types/mosaic';
import { AMAZON_STICKY_BUNDLES } from '@/data/amazonBundles';

describe('Floor Assembly Tiling Engine', () => {
  const sampleColor = AMAZON_STICKY_BUNDLES[0].colors[0];

  function createMockGrid(rows: number, cols: number): MosaicCell[][] {
    const grid: MosaicCell[][] = [];
    for (let r = 0; r < rows; r++) {
      grid[r] = [];
      for (let c = 0; c < cols; c++) {
        grid[r][c] = {
          row: r,
          col: c,
          color: sampleColor,
          originalRgb: [100, 150, 200],
        };
      }
    }
    return grid;
  }

  describe('partitionGridIntoSheets', () => {
    it('correctly partitions a large mosaic grid into tiled printable sheets', () => {
      const totalRows = 45;
      const totalCols = 55;
      const mockGrid = createMockGrid(totalRows, totalCols);

      // Partition with 20 rows per sheet, 25 cols per sheet
      // Rows: 45 / 20 => 3 sheet rows (ceil)
      // Cols: 55 / 25 => 3 sheet cols (ceil)
      // Total sheets: 3 * 3 = 9 sheets
      const sheets = partitionGridIntoSheets(mockGrid, 20, 25);
      expect(sheets.length).toBe(9);

      // First sheet (A1)
      const sheet1 = sheets[0];
      expect(sheet1.sheetIndex).toBe(1);
      expect(sheet1.totalSheets).toBe(9);
      expect(sheet1.sheetRowIndex).toBe(0);
      expect(sheet1.sheetColIndex).toBe(0);
      expect(sheet1.sectionCode).toBe('A1');
      expect(sheet1.startRow).toBe(0);
      expect(sheet1.endRow).toBe(19);
      expect(sheet1.startCol).toBe(0);
      expect(sheet1.endCol).toBe(24);
      expect(sheet1.cells.length).toBe(20);
      expect(sheet1.cells[0].length).toBe(25);

      // Edge sheet (C3) - last sheet with remaining remainder cells
      const sheet9 = sheets[8];
      expect(sheet9.sheetIndex).toBe(9);
      expect(sheet9.totalSheets).toBe(9);
      expect(sheet9.sheetRowIndex).toBe(2);
      expect(sheet9.sheetColIndex).toBe(2);
      expect(sheet9.sectionCode).toBe('C3');
      expect(sheet9.startRow).toBe(40);
      expect(sheet9.endRow).toBe(44);
      expect(sheet9.startCol).toBe(50);
      expect(sheet9.endCol).toBe(54);
      expect(sheet9.cells.length).toBe(5);
      expect(sheet9.cells[0].length).toBe(5);
    });

    it('returns empty array when given an empty grid', () => {
      expect(partitionGridIntoSheets([])).toEqual([]);
      expect(partitionGridIntoSheets([[]])).toEqual([]);
    });

    it('uses default tileRows=20 and tileCols=25 when omitted', () => {
      const mockGrid = createMockGrid(20, 25);
      const sheets = partitionGridIntoSheets(mockGrid);
      expect(sheets.length).toBe(1);
      expect(sheets[0].sectionCode).toBe('A1');
      expect(sheets[0].cells.length).toBe(20);
      expect(sheets[0].cells[0].length).toBe(25);
    });

    it('handles exact grid dimensions matching tile size', () => {
      const mockGrid = createMockGrid(40, 50);
      const sheets = partitionGridIntoSheets(mockGrid, 20, 25);
      expect(sheets.length).toBe(4);
      expect(sheets.map((s) => s.sectionCode)).toEqual(['A1', 'A2', 'B1', 'B2']);
      sheets.forEach((s) => {
        expect(s.cells.length).toBe(20);
        expect(s.cells[0].length).toBe(25);
      });
    });
  });

  describe('generateFloorMatrix', () => {
    it('generates a floor matrix from sheet row/col counts and flat sheet list', () => {
      const mockGrid = createMockGrid(45, 55);
      const sheets = partitionGridIntoSheets(mockGrid, 20, 25);
      const matrix = generateFloorMatrix(3, 3, sheets);

      expect(matrix.matrixRows).toBe(3);
      expect(matrix.matrixCols).toBe(3);
      expect(matrix.sheetLayout.length).toBe(3);
      expect(matrix.sheetLayout[0].length).toBe(3);

      expect(matrix.sheetLayout[0][0]).toEqual({ sectionCode: 'A1', sheetIndex: 1 });
      expect(matrix.sheetLayout[0][1]).toEqual({ sectionCode: 'A2', sheetIndex: 2 });
      expect(matrix.sheetLayout[0][2]).toEqual({ sectionCode: 'A3', sheetIndex: 3 });
      expect(matrix.sheetLayout[1][0]).toEqual({ sectionCode: 'B1', sheetIndex: 4 });
      expect(matrix.sheetLayout[2][2]).toEqual({ sectionCode: 'C3', sheetIndex: 9 });
    });

    it('generates a floor matrix when passed a 2D sheetGrid array', () => {
      const mockGrid = createMockGrid(40, 50);
      const sheets = partitionGridIntoSheets(mockGrid, 20, 25);
      // Group into 2x2 grid
      const sheetGrid: AssemblySheet[][] = [
        [sheets[0], sheets[1]],
        [sheets[2], sheets[3]],
      ];

      const matrix = generateFloorMatrix(sheetGrid);
      expect(matrix.matrixRows).toBe(2);
      expect(matrix.matrixCols).toBe(2);
      expect(matrix.sheetLayout[0][0]).toEqual({ sectionCode: 'A1', sheetIndex: 1 });
      expect(matrix.sheetLayout[1][1]).toEqual({ sectionCode: 'B2', sheetIndex: 4 });
    });

    it('handles missing sheets gracefully in sparse matrices', () => {
      const sheets: AssemblySheet[] = [];
      const matrix = generateFloorMatrix(2, 2, sheets);
      expect(matrix.matrixRows).toBe(2);
      expect(matrix.matrixCols).toBe(2);
      expect(matrix.sheetLayout[0][0]).toEqual({ sectionCode: '', sheetIndex: 0 });
    });
  });
});
