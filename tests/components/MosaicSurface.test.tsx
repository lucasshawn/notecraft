import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MosaicSurface } from '@/components/studio/MosaicSurface';
import { MosaicCell } from '@/types/mosaic';

describe('MosaicSurface Component', () => {
  const sampleGrid: MosaicCell[][] = [
    [
      {
        row: 0,
        col: 0,
        color: {
          id: 'test-yellow',
          name: 'Electric Yellow',
          hex: '#FFFF00',
          lab: [97, -15, 93],
          symbol: 'Y',
          packId: 'test-pack',
        },
        originalRgb: [255, 255, 0],
      },
      {
        row: 0,
        col: 1,
        color: {
          id: 'test-blue',
          name: 'Aqua Blue',
          hex: '#00FFFF',
          lab: [91, -48, -14],
          symbol: 'B',
          packId: 'test-pack',
        },
        originalRgb: [0, 255, 255],
      },
    ],
    [
      {
        row: 1,
        col: 0,
        color: {
          id: 'test-pink',
          name: 'Neon Pink',
          hex: '#FF1493',
          lab: [53, 80, 7],
          symbol: 'P',
          packId: 'test-pack',
        },
        originalRgb: [255, 20, 147],
      },
      {
        row: 1,
        col: 1,
        color: {
          id: 'test-green',
          name: 'Lime Green',
          hex: '#32CD32',
          lab: [74, -58, 62],
          symbol: 'G',
          packId: 'test-pack',
        },
        originalRgb: [50, 205, 50],
      },
    ],
  ];

  it('renders placeholder message when grid is empty', () => {
    render(<MosaicSurface grid={[]} />);
    expect(
      screen.getByText(/Upload a reference picture to generate your sticky note mosaic/i)
    ).toBeDefined();
  });

  it('renders placeholder message when grid contains empty rows', () => {
    render(<MosaicSurface grid={[[]]} />);
    expect(
      screen.getByText(/Upload a reference picture to generate your sticky note mosaic/i)
    ).toBeDefined();
  });

  it('renders grid with correct note counts in header', () => {
    render(<MosaicSurface grid={sampleGrid} />);
    expect(screen.getByText(/Mosaic:/i)).toBeDefined();
    // 2 x 2 notes (4 total)
    expect(screen.getByText(/4 total/i)).toBeDefined();
  });

  it('renders cells with background color corresponding to sticky note colors', () => {
    render(<MosaicSurface grid={sampleGrid} />);
    const cells = screen.getAllByTestId('mosaic-cell');
    expect(cells.length).toBe(4);
    expect(cells[0].style.backgroundColor).toBe('rgb(255, 255, 0)');
    expect(cells[1].style.backgroundColor).toBe('rgb(0, 255, 255)');
  });

  it('toggles paper realism checkbox', () => {
    render(<MosaicSurface grid={sampleGrid} />);
    const checkbox = screen.getByRole('checkbox', { name: /Paper Realism/i }) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);

    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);

    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
  });

  it('shows tooltip inspector on hover with color details and coordinates, and hides on mouse leave', () => {
    render(<MosaicSurface grid={sampleGrid} />);
    const cells = screen.getAllByTestId('mosaic-cell');
    expect(cells.length).toBe(4);

    // Initial state: no tooltip
    expect(screen.queryByText(/Electric Yellow/i)).toBeNull();

    // Hover first cell: row 0, col 0 -> Electric Yellow, Row 1, Col 1
    fireEvent.mouseEnter(cells[0]);
    expect(screen.getByText('Electric Yellow')).toBeDefined();
    expect(screen.getByText('(Y)')).toBeDefined();
    expect(screen.getByText('Row 1, Col 1')).toBeDefined();

    // Mouse leave: tooltip should disappear
    fireEvent.mouseLeave(cells[0]);
    expect(screen.queryByText('Electric Yellow')).toBeNull();
  });

  it('updates tooltip when hovering a different cell', () => {
    render(<MosaicSurface grid={sampleGrid} />);
    const cells = screen.getAllByTestId('mosaic-cell');

    // Hover second cell (Aqua Blue)
    fireEvent.mouseEnter(cells[1]);
    expect(screen.getByText('Aqua Blue')).toBeDefined();
    expect(screen.getByText('(B)')).toBeDefined();
    expect(screen.getByText('Row 1, Col 2')).toBeDefined();
  });
});
