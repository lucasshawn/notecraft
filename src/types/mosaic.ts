export type ColorMatchAlgorithm = 'ciede2000' | 'oklab' | 'cie76';

export type DitherAlgorithm = 'none' | 'floyd-steinberg' | 'atkinson' | 'bayer';

export interface StickyColor {
  id: string;
  name: string;
  hex: string;
  lab: [number, number, number];
  oklab?: [number, number, number];
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

export interface MosaicProjectData {
  version: string;
  timestamp: string;
  dimensions: MosaicDimensions;
  activeBundleId: string;
  combinedBundleIds: string[];
  colorAlgorithm?: ColorMatchAlgorithm;
  ditherAlgorithm?: DitherAlgorithm;
  enableDither?: boolean;
  ditherStrength: number;
  imageUrl?: string | null;
  bom?: any;
}
