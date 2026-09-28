export interface StickyColor {
  id: string;
  name: string;
  hex: string;
  lab: [number, number, number];
  symbol: string;
  packId: string;
}

export interface AmazonStickyBundle {
  id: string;
  name: string;
  asin: string;
  amazonUrl: string;
  packDescription: string;
  notesPerPad: number;
  padsPerPack: number;
  colors: StickyColor[];
}

export interface MosaicDimensions {
  unit: 'inches' | 'cm' | 'notes';
  surfaceWidth: number;
  surfaceHeight: number;
  noteWidth: number;
  noteHeight: number;
  cols: number;
  rows: number;
  lockAspectRatio: boolean;
}

export interface MosaicCell {
  row: number;
  col: number;
  color: StickyColor;
  originalRgb: [number, number, number];
}
