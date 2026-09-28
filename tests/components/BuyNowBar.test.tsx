import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BuyNowBar } from '@/components/studio/BuyNowBar';
import { BOMReport } from '@/lib/bomCalculator';
import { AMAZON_STICKY_BUNDLES } from '@/data/amazonBundles';

describe('BuyNowBar Component', () => {
  const mockBOM: BOMReport = {
    totalNotes: 360,
    colorCounts: [
      {
        color: AMAZON_STICKY_BUNDLES[0].colors[0],
        notesNeeded: 180,
        padsNeeded: 2,
        packName: 'Post-it Miami Collection',
        bundleId: 'miami',
      },
      {
        color: AMAZON_STICKY_BUNDLES[1].colors[0],
        notesNeeded: 180,
        padsNeeded: 2,
        packName: 'Post-it Rio de Janeiro Collection',
        bundleId: 'rio',
      },
    ],
    packRequirements: [
      {
        bundle: AMAZON_STICKY_BUNDLES[0],
        packsNeeded: 2,
        affiliateUrl: 'https://www.amazon.com/dp/B00006JN88?tag=notecraft-20',
      },
      {
        bundle: AMAZON_STICKY_BUNDLES[1],
        packsNeeded: 2,
        affiliateUrl: 'https://www.amazon.com/dp/B00006JNB9?tag=notecraft-20',
      },
    ],
  };

  it('renders nothing when bom.totalNotes is 0', () => {
    const emptyBOM: BOMReport = {
      totalNotes: 0,
      colorCounts: [],
      packRequirements: [],
    };

    const { container } = render(<BuyNowBar bom={emptyBOM} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders total notes count and pack calculation breakdown', () => {
    render(<BuyNowBar bom={mockBOM} />);

    expect(screen.getByText(/Bill of Materials: 360 Sticky Notes Required/i)).toBeDefined();
    expect(
      screen.getByText(/2x Post-it Miami Collection \+ 2x Post-it Rio de Janeiro Collection/i)
    ).toBeDefined();
  });

  it('renders direct Amazon affiliate Buy Now buttons with correct attributes', () => {
    render(<BuyNowBar bom={mockBOM} />);

    const miamiLink = screen.getByRole('link', { name: /Buy Miami Collection on Amazon/i });
    expect(miamiLink).toBeDefined();
    expect(miamiLink.getAttribute('href')).toBe('https://www.amazon.com/dp/B00006JN88?tag=notecraft-20');
    expect(miamiLink.getAttribute('target')).toBe('_blank');
    expect(miamiLink.getAttribute('rel')).toBe('noopener noreferrer');

    const rioLink = screen.getByRole('link', { name: /Buy Rio de Janeiro Collection on Amazon/i });
    expect(rioLink).toBeDefined();
    expect(rioLink.getAttribute('href')).toBe('https://www.amazon.com/dp/B00006JNB9?tag=notecraft-20');
    expect(rioLink.getAttribute('target')).toBe('_blank');
    expect(rioLink.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('safely handles empty packRequirements with totalNotes > 0 without crashing', () => {
    const bomWithoutPacks: BOMReport = {
      totalNotes: 10,
      colorCounts: [],
      packRequirements: [],
    };

    render(<BuyNowBar bom={bomWithoutPacks} />);
    expect(screen.getByText(/Bill of Materials: 10 Sticky Notes Required/i)).toBeDefined();
  });
});
