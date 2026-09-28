import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FloorAssemblyModal } from '@/components/print/FloorAssemblyModal';
import { AMAZON_STICKY_BUNDLES } from '@/data/amazonBundles';
import { MosaicCell, MosaicDimensions } from '@/types/mosaic';
import { BOMReport } from '@/lib/bomCalculator';

describe('FloorAssemblyModal Component', () => {
  const color1 = AMAZON_STICKY_BUNDLES[0].colors[0]; // e.g. symbol "★"
  const color2 = AMAZON_STICKY_BUNDLES[0].colors[1];

  const mockDimensions: MosaicDimensions = {
    unit: 'inches',
    surfaceWidth: 60,
    surfaceHeight: 48,
    noteWidth: 3,
    noteHeight: 3,
    cols: 20,
    rows: 16,
    lockAspectRatio: true,
  };

  const mockBOM: BOMReport = {
    totalNotes: 2,
    colorCounts: [
      {
        color: color1,
        notesNeeded: 1,
        padsNeeded: 1,
        packName: AMAZON_STICKY_BUNDLES[0].name,
        bundleId: AMAZON_STICKY_BUNDLES[0].id,
      },
      {
        color: color2,
        notesNeeded: 1,
        padsNeeded: 1,
        packName: AMAZON_STICKY_BUNDLES[0].name,
        bundleId: AMAZON_STICKY_BUNDLES[0].id,
      },
    ],
    packRequirements: [
      {
        bundle: AMAZON_STICKY_BUNDLES[0],
        packsNeeded: 1,
        affiliateUrl: 'https://example.com/pack1',
      },
    ],
  };

  const smallGrid: MosaicCell[][] = [
    [
      { row: 0, col: 0, color: color1, originalRgb: [255, 0, 0] },
      { row: 0, col: 1, color: color2, originalRgb: [0, 255, 0] },
    ],
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <FloorAssemblyModal
        isOpen={false}
        onClose={() => {}}
        grid={smallGrid}
        bom={mockBOM}
        dimensions={mockDimensions}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders floor matrix and sheet preview when opened', () => {
    render(
      <FloorAssemblyModal
        isOpen={true}
        onClose={() => {}}
        grid={smallGrid}
        bom={mockBOM}
        dimensions={mockDimensions}
      />
    );

    expect(screen.getByText(/Printable Floor Assembly Packet/i)).toBeDefined();
    expect(screen.getByText(/NOTECRAFT MOSAIC BLUEPRINT/i)).toBeDefined();
    expect(screen.getByText(/Floor Tile Layout Guide/i)).toBeDefined();
    expect(screen.getByText(/Color Symbol Legend:/i)).toBeDefined();
  });

  it('displays surface dimensions, total notes, and color symbols in the legend', () => {
    render(
      <FloorAssemblyModal
        isOpen={true}
        onClose={() => {}}
        grid={smallGrid}
        bom={mockBOM}
        dimensions={mockDimensions}
      />
    );

    expect(screen.getByText(/Surface: 60″ × 48″/i)).toBeDefined();
    expect(screen.getByText(/20 × 16 Notes \(2 total\)/i)).toBeDefined();
    expect(screen.getByText(color1.name)).toBeDefined();
    expect(screen.getByText(color2.name)).toBeDefined();
  });

  it('invokes onClose when the close button is clicked', () => {
    const onCloseMock = vi.fn();
    render(
      <FloorAssemblyModal
        isOpen={true}
        onClose={onCloseMock}
        grid={smallGrid}
        bom={mockBOM}
        dimensions={mockDimensions}
      />
    );

    const closeButtons = screen.getAllByRole('button');
    const closeBtn = closeButtons.find((btn) => !btn.textContent?.includes('Print'));
    expect(closeBtn).toBeDefined();
    if (closeBtn) {
      fireEvent.click(closeBtn);
    }
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('invokes window.print when Print / Save PDF button is clicked', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(
      <FloorAssemblyModal
        isOpen={true}
        onClose={() => {}}
        grid={smallGrid}
        bom={mockBOM}
        dimensions={mockDimensions}
      />
    );

    const printButton = screen.getByRole('button', { name: /Print \/ Save PDF/i });
    fireEvent.click(printButton);

    expect(printSpy).toHaveBeenCalledTimes(1);
  });

  it('toggles ink-saver mode when the checkbox is toggled', () => {
    render(
      <FloorAssemblyModal
        isOpen={true}
        onClose={() => {}}
        grid={smallGrid}
        bom={mockBOM}
        dimensions={mockDimensions}
      />
    );

    const inkCheckbox = screen.getByRole('checkbox', { name: /Ink-Saver Mode/i }) as HTMLInputElement;
    expect(inkCheckbox.checked).toBe(false);

    fireEvent.click(inkCheckbox);
    expect(inkCheckbox.checked).toBe(true);
  });

  it('renders multiple sheet tiles when grid exceeds single sheet boundaries', () => {
    // Generate a 25x30 grid (default sheet size is 20 rows x 25 cols)
    // 25 rows = 2 sheet rows, 30 cols = 2 sheet cols => 4 sheets total
    const largeGrid: MosaicCell[][] = [];
    for (let r = 0; r < 25; r++) {
      const row: MosaicCell[] = [];
      for (let c = 0; c < 30; c++) {
        row.push({
          row: r,
          col: c,
          color: color1,
          originalRgb: [200, 200, 200],
        });
      }
      largeGrid.push(row);
    }

    render(
      <FloorAssemblyModal
        isOpen={true}
        onClose={() => {}}
        grid={largeGrid}
        bom={{
          totalNotes: 750,
          colorCounts: [{ color: color1, notesNeeded: 750, padsNeeded: 8, packName: 'Pack 1', bundleId: 'b1' }],
          packRequirements: [],
        }}
        dimensions={{
          unit: 'notes',
          surfaceWidth: 30,
          surfaceHeight: 25,
          noteWidth: 3,
          noteHeight: 3,
          cols: 30,
          rows: 25,
          lockAspectRatio: false,
        }}
      />
    );

    // Total Sheets: 5 (1 Cover + 4 Grid Tiles)
    expect(screen.getByText(/Total Sheets:/i)).toBeDefined();
    expect(screen.getByText(/1 Cover \+ 4 Grid Tiles/i)).toBeDefined();

    // Check that Section codes A1, A2, B1, B2 are rendered in the schematic and sheets
    expect(screen.getAllByText(/Sec A1/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Sec A2/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Sec B1/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Sec B2/i).length).toBeGreaterThan(0);
  });
});
