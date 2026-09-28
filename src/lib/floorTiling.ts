import { MosaicCell } from '@/types/mosaic';

export interface AssemblySheet {
  sheetIndex: number;
  totalSheets: number;
  sheetRowIndex: number;
  sheetColIndex: number;
  sectionCode: string; // e.g., "A1", "B2"
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
  cells: MosaicCell[][];
}

export interface FloorMatrix {
  matrixRows: number;
  matrixCols: number;
  sheetLayout: { sectionCode: string; sheetIndex: number }[][];
}

/**
 * Returns a spreadsheet-style row code letter ('A', 'B', ... 'Z', 'AA', etc.)
 */
function getRowCode(rowIndex: number): string {
  let code = '';
  let r = rowIndex;
  while (r >= 0) {
    code = String.fromCharCode(65 + (r % 26)) + code;
    r = Math.floor(r / 26) - 1;
  }
  return code;
}

/**
 * Partitions a mosaic cell grid into printable sheets (tiles).
 * Default tile dimensions are 20 rows by 25 columns.
 */
export function partitionGridIntoSheets(
  grid: MosaicCell[][],
  tileRows: number = 20,
  tileCols: number = 25
): AssemblySheet[] {
  if (!grid || grid.length === 0 || grid[0].length === 0) {
    return [];
  }

  const totalRows = grid.length;
  const totalCols = grid[0].length;
  const numSheetRows = Math.ceil(totalRows / tileRows);
  const numSheetCols = Math.ceil(totalCols / tileCols);
  const totalSheets = numSheetRows * numSheetCols;

  const sheets: AssemblySheet[] = [];
  let sheetIndex = 1;

  for (let sR = 0; sR < numSheetRows; sR++) {
    const rowChar = getRowCode(sR);
    for (let sC = 0; sC < numSheetCols; sC++) {
      const colNum = sC + 1;
      const sectionCode = `${rowChar}${colNum}`;

      const startRow = sR * tileRows;
      const endRow = Math.min(startRow + tileRows - 1, totalRows - 1);
      const startCol = sC * tileCols;
      const endCol = Math.min(startCol + tileCols - 1, totalCols - 1);

      const sheetCells: MosaicCell[][] = [];
      for (let r = startRow; r <= endRow; r++) {
        const rowCells: MosaicCell[] = [];
        for (let c = startCol; c <= endCol; c++) {
          rowCells.push(grid[r][c]);
        }
        sheetCells.push(rowCells);
      }

      sheets.push({
        sheetIndex,
        totalSheets,
        sheetRowIndex: sR,
        sheetColIndex: sC,
        sectionCode,
        startRow,
        endRow,
        startCol,
        endCol,
        cells: sheetCells,
      });

      sheetIndex++;
    }
  }

  return sheets;
}

/**
 * Generates an overarching floor layout schematic matrix mapping section codes and sheet indexes.
 */
export function generateFloorMatrix(sheetGrid: AssemblySheet[][]): FloorMatrix;
export function generateFloorMatrix(
  numSheetRows: number,
  numSheetCols: number,
  sheets: AssemblySheet[]
): FloorMatrix;
export function generateFloorMatrix(
  arg1: number | AssemblySheet[][],
  arg2?: number,
  arg3?: AssemblySheet[]
): FloorMatrix {
  if (Array.isArray(arg1)) {
    const sheetGrid = arg1;
    const matrixRows = sheetGrid.length;
    const matrixCols = sheetGrid[0]?.length || 0;
    const sheetLayout = sheetGrid.map((row) =>
      row.map((sheet) => ({
        sectionCode: sheet?.sectionCode ?? '',
        sheetIndex: sheet?.sheetIndex ?? 0,
      }))
    );

    return {
      matrixRows,
      matrixCols,
      sheetLayout,
    };
  }

  const numSheetRows = arg1;
  const numSheetCols = arg2 ?? 0;
  const sheets = arg3 ?? [];
  const layout: { sectionCode: string; sheetIndex: number }[][] = [];

  for (let r = 0; r < numSheetRows; r++) {
    layout[r] = [];
    for (let c = 0; c < numSheetCols; c++) {
      const sheet = sheets.find((s) => s.sheetRowIndex === r && s.sheetColIndex === c);
      layout[r][c] = {
        sectionCode: sheet ? sheet.sectionCode : '',
        sheetIndex: sheet ? sheet.sheetIndex : 0,
      };
    }
  }

  return {
    matrixRows: numSheetRows,
    matrixCols: numSheetCols,
    sheetLayout: layout,
  };
}
