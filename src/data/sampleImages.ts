export interface SampleImage {
  id: string;
  name: string;
  url: string;
}

export const SAMPLE_IMAGES: SampleImage[] = [
  {
    id: 'flower',
    name: 'Vibrant Sunflower',
    url: 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?w=400&q=80',
  },
  {
    id: 'sunset',
    name: 'Ocean Sunset',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80',
  },
];
