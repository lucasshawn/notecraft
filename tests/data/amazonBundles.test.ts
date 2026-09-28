import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AMAZON_STICKY_BUNDLES, getAffiliateUrl } from '@/data/amazonBundles';

describe('Amazon Sticky Bundles Catalog', () => {
  it('loads predefined 3M Post-it bundles with required metadata', () => {
    expect(AMAZON_STICKY_BUNDLES.length).toBeGreaterThanOrEqual(5);
    const miami = AMAZON_STICKY_BUNDLES.find((b) => b.id === 'miami');
    expect(miami).toBeDefined();
    expect(miami?.colors.length).toBeGreaterThanOrEqual(4);
    expect(miami?.colors[0].lab).toHaveLength(3);
    expect(miami?.colors[0].symbol).toBeTruthy();
  });

  it('builds Amazon Associate affiliate URLs with referral tag', () => {
    const url = getAffiliateUrl('B00006JN88', 'notecraft-20');
    expect(url).toContain('amazon.com/dp/B00006JN88');
    expect(url).toContain('tag=notecraft-20');
  });

  it('uses default affiliate tag when not specified', () => {
    const defaultUrl = getAffiliateUrl('B00006JN88');
    expect(defaultUrl).toContain('amazon.com/dp/B00006JN88');
    expect(defaultUrl).toContain('tag=notecraft-20');
  });

  it('validates structure of all bundles and their colors', () => {
    for (const bundle of AMAZON_STICKY_BUNDLES) {
      expect(bundle.id).toBeTruthy();
      expect(bundle.name).toBeTruthy();
      expect(bundle.asin).toBeTruthy();
      expect(bundle.amazonUrl).toContain(bundle.asin);
      expect(bundle.packDescription).toBeTruthy();
      expect(bundle.notesPerPad).toBeGreaterThan(0);
      expect(bundle.padsPerPack).toBeGreaterThan(0);
      expect(bundle.colors.length).toBeGreaterThan(0);

      for (const color of bundle.colors) {
        expect(color.id).toBeTruthy();
        expect(color.name).toBeTruthy();
        expect(color.hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(color.lab).toHaveLength(3);
        expect(color.symbol).toBeTruthy();
        expect(color.packId).toBe(bundle.id);
      }
    }
  });
});
