import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Page from '@/app/page';

describe('Notecraft Studio Page Integration', () => {
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;
  let originalImage: typeof Image;

  beforeEach(() => {
    localStorage.clear();
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    originalImage = global.Image;

    URL.createObjectURL = vi.fn(() => 'blob:mock-image-url');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    class MockImage {
      width = 100;
      height = 100;
      crossOrigin = '';
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      private _src = '';
      set src(val: string) {
        this._src = val;
        setTimeout(() => {
          if (val.includes('error') && this.onerror) {
            this.onerror();
          } else if (this.onload) {
            this.onload();
          }
        }, 10);
      }
      get src() {
        return this._src;
      }
    }

    global.Image = MockImage as unknown as typeof Image;

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () =>
        ({
          drawImage: vi.fn(),
          getImageData: vi.fn(() => ({
            data: new Uint8ClampedArray(100 * 100 * 4).fill(255),
            width: 100,
            height: 100,
          })),
        }) as unknown as CanvasRenderingContext2D
    );
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    global.Image = originalImage;
    vi.restoreAllMocks();
  });

  it('renders Studio title, Palette Ribbon, and design surfaces', () => {
    render(<Page />);
    expect(screen.getByText(/Notecraft/i)).toBeDefined();
    expect(screen.getByText(/Amazon 3M Post-it Palettes/i)).toBeDefined();
    expect(screen.getByText(/Surface 1: Reference Picture/i)).toBeDefined();
    expect(screen.getByText(/Surface 2: 8-Bit Sticky Note Mosaic/i)).toBeDefined();
  });

  it('renders sample images buttons from sample gallery', () => {
    render(<Page />);
    expect(screen.getByText(/Vibrant Sunflower/i)).toBeDefined();
    expect(screen.getByText(/Ocean Sunset/i)).toBeDefined();
  });

  it('renders dimension controls and allows unit/size adjustments', () => {
    render(<Page />);
    expect(screen.getByText(/Surface Width/i)).toBeDefined();
    expect(screen.getByText(/Grid Notes Wide/i)).toBeDefined();
  });

  it('allows user to switch between color algorithms and dithering styles in real time', () => {
    render(<Page />);

    // Color distance pills
    const ciedeBtn = screen.getByRole('button', { name: /CIEDE2000/i });
    const oklabBtn = screen.getByRole('button', { name: /Oklab/i });
    const cie76Btn = screen.getByRole('button', { name: /CIE76/i });
    const flipBtn = screen.getByTitle(/quick compare/i);

    expect(ciedeBtn).toBeDefined();
    expect(oklabBtn).toBeDefined();
    expect(cie76Btn).toBeDefined();

    // Default active is CIEDE2000
    expect(ciedeBtn.className).toContain('bg-blue-600');

    // Click Oklab
    fireEvent.click(oklabBtn);
    expect(oklabBtn.className).toContain('bg-blue-600');
    expect(ciedeBtn.className).not.toContain('bg-blue-600');

    // Click Flip button to return to CIEDE2000
    fireEvent.click(flipBtn);
    expect(ciedeBtn.className).toContain('bg-blue-600');

    // Dither style pills
    const offBtn = screen.getByRole('button', { name: /^Off$/i });
    const atkinsonBtn = screen.getByRole('button', { name: /Atkinson/i });
    const bayerBtn = screen.getByRole('button', { name: /Bayer 4×4/i });

    expect(offBtn).toBeDefined();
    expect(atkinsonBtn).toBeDefined();
    expect(bayerBtn).toBeDefined();

    // Click Atkinson
    fireEvent.click(atkinsonBtn);
    expect(atkinsonBtn.className).toContain('bg-indigo-600');

    // Strength slider should be visible
    const slider = screen.getByLabelText(/Dither Strength/i) as HTMLInputElement;
    expect(slider).toBeDefined();
    fireEvent.change(slider, { target: { value: '0.5' } });
    expect(slider.value).toBe('0.5');

    // Click Off
    fireEvent.click(offBtn);
    expect(offBtn.className).toContain('bg-indigo-600');
    expect(screen.queryByLabelText(/Dither Strength/i)).toBeNull();
  });

  it('provides an Open / Import Project button and file input', () => {
    render(<Page />);
    expect(screen.getByRole('button', { name: /Open Project/i })).toBeDefined();
    expect(screen.getByLabelText(/Upload Project File/i)).toBeDefined();
  });

  it('loads sample image, enables Save and Print buttons, and renders BOM buy now bar', async () => {
    render(<Page />);

    const saveButton = screen.getByRole('button', { name: /Save Project/i });
    const printButton = screen.getByRole('button', { name: /Print Assembly Map/i });
    expect(saveButton.hasAttribute('disabled')).toBe(true);
    expect(printButton.hasAttribute('disabled')).toBe(true);

    const sunflowerBtn = screen.getByRole('button', { name: /Vibrant Sunflower/i });
    fireEvent.click(sunflowerBtn);

    // Wait for image loading and mosaic generation
    await waitFor(() => {
      expect(saveButton.hasAttribute('disabled')).toBe(false);
      expect(printButton.hasAttribute('disabled')).toBe(false);
    });

    // BOM bar should appear
    expect(screen.getByText(/Sticky Notes Required/i)).toBeDefined();

    // Clicking Print Assembly Map should open the modal
    fireEvent.click(printButton);
    await waitFor(() => {
      expect(screen.getByText(/Printable Floor Assembly Packet/i)).toBeDefined();
      expect(screen.getByText(/NOTECRAFT MOSAIC BLUEPRINT/i)).toBeDefined();
    });

    // Close the modal
    const closeBtn = screen.getByLabelText(/^Close$/i);
    fireEvent.click(closeBtn);
    await waitFor(() => {
      expect(screen.queryByText(/Printable Floor Assembly Packet/i)).toBeNull();
    });
  });

  it('exports project JSON and persists to localStorage', async () => {
    render(<Page />);

    // Load sample image
    fireEvent.click(screen.getByRole('button', { name: /Vibrant Sunflower/i }));

    const saveButton = screen.getByRole('button', { name: /Save Project/i });
    await waitFor(() => {
      expect(saveButton.hasAttribute('disabled')).toBe(false);
    });

    // Click Save Project
    fireEvent.click(saveButton);

    expect(URL.createObjectURL).toHaveBeenCalled();
    const stored = localStorage.getItem('notecraft_project');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.version).toBe('1.0');
    expect(parsed.dimensions).toBeDefined();
    expect(parsed.colorAlgorithm).toBeDefined();
    expect(parsed.ditherAlgorithm).toBeDefined();
  });

  it('imports project JSON from file and updates state', async () => {
    render(<Page />);

    const fileInput = screen.getByTestId('project-file-input') as HTMLInputElement;

    const mockProjectData = {
      version: '1.0',
      timestamp: '2026-09-28T00:00:00.000Z',
      dimensions: {
        unit: 'inches',
        surfaceWidth: 90,
        surfaceHeight: 60,
        noteWidth: 3,
        noteHeight: 3,
        cols: 30,
        rows: 20,
        lockAspectRatio: true,
      },
      activeBundleId: 'marseille',
      combinedBundleIds: ['marseille'],
      colorAlgorithm: 'oklab',
      ditherAlgorithm: 'atkinson',
      ditherStrength: 0.5,
    };

    const file = new File([JSON.stringify(mockProjectData)], 'my-project.notecraft', {
      type: 'application/json',
    });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(localStorage.getItem('notecraft_project')).toContain('marseille');
    });
  });

  it('restores project configuration from localStorage on initial render', async () => {
    const savedProject = {
      version: '1.0',
      timestamp: '2026-09-28T00:00:00.000Z',
      dimensions: {
        unit: 'inches',
        surfaceWidth: 120,
        surfaceHeight: 90,
        noteWidth: 3,
        noteHeight: 3,
        cols: 40,
        rows: 30,
        lockAspectRatio: true,
      },
      activeBundleId: 'bali',
      combinedBundleIds: ['bali'],
      colorAlgorithm: 'cie76',
      ditherAlgorithm: 'none',
      ditherStrength: 0.5,
    };
    localStorage.setItem('notecraft_project', JSON.stringify(savedProject));

    render(<Page />);

    await waitFor(() => {
      const offBtn = screen.getByRole('button', { name: /^Off$/i });
      expect(offBtn.className).toContain('bg-indigo-600');
    });
  });

  it('handles image loading errors gracefully with console warning', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const savedProject = {
      version: '1.0',
      timestamp: '2026-09-28T00:00:00.000Z',
      imageUrl: 'https://example.com/error-sample.png',
    };
    localStorage.setItem('notecraft_project', JSON.stringify(savedProject));

    render(<Page />);

    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load sample image')
      );
    });
  });

  it('executes localStorage restoration strictly once on initial mount and guards against re-execution', async () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
    const { rerender } = render(<Page />);
    const callsAfterMount = getItemSpy.mock.calls.filter((c) => c[0] === 'notecraft_project').length;
    expect(callsAfterMount).toBe(1);

    // Re-render
    rerender(<Page />);
    const callsAfterRerender = getItemSpy.mock.calls.filter((c) => c[0] === 'notecraft_project').length;
    expect(callsAfterRerender).toBe(1);
  });
});
