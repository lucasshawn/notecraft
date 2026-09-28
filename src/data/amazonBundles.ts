import { AmazonStickyBundle } from '@/types/mosaic';

const DEFAULT_AFFILIATE_TAG = 'notecraft-20';

export function getAffiliateUrl(asin: string, affiliateTag?: string): string {
  const tag = affiliateTag || process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG || DEFAULT_AFFILIATE_TAG;
  return `https://www.amazon.com/dp/${asin}?tag=${encodeURIComponent(tag)}`;
}

export const AMAZON_STICKY_BUNDLES: AmazonStickyBundle[] = [
  {
    id: 'miami',
    name: 'Post-it Miami Collection',
    asin: 'B00006JN88',
    amazonUrl: getAffiliateUrl('B00006JN88'),
    packDescription: 'Super Sticky Notes, Miami vibrant color collection',
    notesPerPad: 90,
    padsPerPack: 5,
    colors: [
      { id: 'aqua-splash', name: 'Aqua Splash', hex: '#00B4D8', lab: [67.8, -22.3, -31.4], symbol: 'A', packId: 'miami' },
      { id: 'poppy', name: 'Poppy', hex: '#E63946', lab: [51.2, 66.8, 38.9], symbol: 'P', packId: 'miami' },
      { id: 'flamingo', name: 'Flamingo', hex: '#FF758F', lab: [64.5, 56.7, 13.8], symbol: 'F', packId: 'miami' },
      { id: 'neon-orange', name: 'Neon Orange', hex: '#FF7B00', lab: [63.2, 46.9, 71.5], symbol: 'O', packId: 'miami' },
      { id: 'vital-lime', name: 'Vital Lime', hex: '#70E000', lab: [80.1, -54.7, 76.2], symbol: 'L', packId: 'miami' },
    ],
  },
  {
    id: 'rio',
    name: 'Post-it Rio de Janeiro Collection',
    asin: 'B00006JNB9',
    amazonUrl: getAffiliateUrl('B00006JNB9'),
    packDescription: 'Super Sticky Notes, Rio de Janeiro expressive palette',
    notesPerPad: 90,
    padsPerPack: 5,
    colors: [
      { id: 'med-blue', name: 'Mediterranean Blue', hex: '#0077B6', lab: [47.5, -2.4, -46.2], symbol: 'M', packId: 'rio' },
      { id: 'limeade', name: 'Limeade', hex: '#9EF01A', lab: [87.4, -49.6, 78.1], symbol: 'E', packId: 'rio' },
      { id: 'neon-yellow', name: 'Neon Yellow', hex: '#FFFF3F', lab: [97.3, -19.4, 82.5], symbol: 'Y', packId: 'rio' },
      { id: 'marrakesh', name: 'Marrakesh Clay', hex: '#C85A17', lab: [49.8, 41.2, 49.3], symbol: 'K', packId: 'rio' },
      { id: 'carnival-pink', name: 'Carnival Pink', hex: '#E01E5A', lab: [49.6, 73.1, 23.4], symbol: 'C', packId: 'rio' },
    ],
  },
  {
    id: 'marseille',
    name: 'Post-it Marseille Collection',
    asin: 'B0017DEX90',
    amazonUrl: getAffiliateUrl('B0017DEX90'),
    packDescription: 'Marseille pastel & tranquil hues',
    notesPerPad: 90,
    padsPerPack: 5,
    colors: [
      { id: 'french-blue', name: 'French Blue', hex: '#48CAE4', lab: [75.6, -21.8, -26.9], symbol: 'B', packId: 'marseille' },
      { id: 'pastel-pink', name: 'Pastel Pink', hex: '#FFB3C6', lab: [79.2, 31.8, 4.5], symbol: 'S', packId: 'marseille' },
      { id: 'sunburst-yellow', name: 'Sunburst Yellow', hex: '#FFEE32', lab: [93.1, -12.3, 79.4], symbol: 'U', packId: 'marseille' },
      { id: 'soft-mint', name: 'Soft Mint', hex: '#A7C957', lab: [76.9, -29.2, 45.6], symbol: 'T', packId: 'marseille' },
    ],
  },
  {
    id: 'energy',
    name: 'Post-it Energy Collection',
    asin: 'B00004Z5X8',
    amazonUrl: getAffiliateUrl('B00004Z5X8'),
    packDescription: 'High-visibility neon energy notes',
    notesPerPad: 90,
    padsPerPack: 5,
    colors: [
      { id: 'electric-blue', name: 'Electric Blue', hex: '#0096C7', lab: [58.4, -9.1, -43.2], symbol: '1', packId: 'energy' },
      { id: 'electric-lime', name: 'Electric Lime', hex: '#52B788', lab: [67.8, -44.1, 21.3], symbol: '2', packId: 'energy' },
      { id: 'ultra-yellow', name: 'Ultra Yellow', hex: '#FFD60A', lab: [86.7, 3.4, 85.9], symbol: '3', packId: 'energy' },
      { id: 'neon-magenta', name: 'Neon Magenta', hex: '#D00000', lab: [44.2, 69.1, 52.8], symbol: '4', packId: 'energy' },
    ],
  },
  {
    id: 'canary',
    name: 'Post-it Classic Canary Yellow',
    asin: 'B00000JFOV',
    amazonUrl: getAffiliateUrl('B00000JFOV'),
    packDescription: 'The original iconic Canary Yellow sticky note',
    notesPerPad: 100,
    padsPerPack: 12,
    colors: [
      { id: 'canary-yellow', name: 'Canary Yellow', hex: '#FDF002', lab: [92.8, -13.2, 85.7], symbol: 'Y', packId: 'canary' },
    ],
  },
  {
    id: 'monochrome',
    name: 'Post-it Greyscale / High-Contrast',
    asin: 'B07M6TGR99',
    amazonUrl: getAffiliateUrl('B07M6TGR99'),
    packDescription: 'White, stone gray, and carbon notes for high-contrast mosaics',
    notesPerPad: 90,
    padsPerPack: 4,
    colors: [
      { id: 'clean-white', name: 'Crisp White', hex: '#F8F9FA', lab: [98.1, -0.4, 0.2], symbol: 'W', packId: 'monochrome' },
      { id: 'stone-gray', name: 'Stone Gray', hex: '#ADB5BD', lab: [73.5, -0.5, -0.8], symbol: 'G', packId: 'monochrome' },
      { id: 'dark-slate', name: 'Dark Slate', hex: '#343A40', lab: [25.4, 0.2, -1.5], symbol: 'D', packId: 'monochrome' },
    ],
  },
];
