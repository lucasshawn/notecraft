import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReferenceSurface } from '@/components/studio/ReferenceSurface';

describe('ReferenceSurface Component', () => {
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalImage: typeof Image;

  beforeEach(() => {
    originalCreateObjectURL = URL.createObjectURL;
    originalImage = global.Image;

    URL.createObjectURL = vi.fn(() => 'blob:mock-image-url');

    class MockImage {
      width = 100;
      height = 100;
      crossOrigin = '';
      onload: (() => void) | null = null;
      private _src = '';
      set src(val: string) {
        this._src = val;
        setTimeout(() => {
          if (this.onload) this.onload();
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
            data: new Uint8ClampedArray([255, 0, 0, 255]),
            width: 100,
            height: 100,
          })),
        }) as unknown as CanvasRenderingContext2D
    );
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    global.Image = originalImage;
    vi.restoreAllMocks();
  });

  it('renders upload dropzone when no image is loaded', () => {
    render(<ReferenceSurface imageUrl={null} onImageLoaded={() => {}} />);
    expect(screen.getByText(/Drag & Drop Reference Picture/i)).toBeDefined();
    expect(screen.getByText(/Supports PNG, JPG, WebP/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Browse Photo/i })).toBeDefined();
  });

  it('renders image preview when imageUrl is provided', () => {
    render(<ReferenceSurface imageUrl="http://example.com/test.png" onImageLoaded={() => {}} />);
    const img = screen.getByAltText('Reference Preview');
    expect(img).toBeDefined();
    expect(img.getAttribute('src')).toBe('http://example.com/test.png');
  });

  it('triggers file input click when Browse Photo button is clicked', () => {
    const { container } = render(<ReferenceSurface imageUrl={null} onImageLoaded={() => {}} />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeDefined();

    const clickSpy = vi.spyOn(fileInput, 'click');
    const browseButton = screen.getByRole('button', { name: /Browse Photo/i });
    fireEvent.click(browseButton);
    expect(clickSpy).toHaveBeenCalled();
  });

  it('processes image file when file is selected via input', async () => {
    const onImageLoaded = vi.fn();
    const { container } = render(<ReferenceSurface imageUrl={null} onImageLoaded={onImageLoaded} />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

    const file = new File(['dummy content'], 'photo.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(onImageLoaded).toHaveBeenCalled();
    });

    const callArgs = onImageLoaded.mock.calls[0];
    expect(callArgs[0]).toBeInstanceOf(Uint8ClampedArray);
    expect(callArgs[1]).toBe(100);
    expect(callArgs[2]).toBe(100);
    expect(callArgs[3]).toBe('blob:mock-image-url');
  });

  it('processes image file when dropped into dropzone', async () => {
    const onImageLoaded = vi.fn();
    render(<ReferenceSurface imageUrl={null} onImageLoaded={onImageLoaded} />);
    const dropzone = screen.getByText(/Drag & Drop Reference Picture/i).closest('div')!;

    const file = new File(['dummy content'], 'sample.jpg', { type: 'image/jpeg' });
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [file],
      },
    });

    await waitFor(() => {
      expect(onImageLoaded).toHaveBeenCalled();
    });
  });

  it('ignores non-image file drop', async () => {
    const onImageLoaded = vi.fn();
    render(<ReferenceSurface imageUrl={null} onImageLoaded={onImageLoaded} />);
    const dropzone = screen.getByText(/Drag & Drop Reference Picture/i).closest('div')!;

    const file = new File(['dummy content'], 'document.pdf', { type: 'application/pdf' });
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [file],
      },
    });

    // Wait a brief moment to ensure onImageLoaded was not called
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(onImageLoaded).not.toHaveBeenCalled();
  });

  it('allows drag over event with preventDefault', () => {
    render(<ReferenceSurface imageUrl={null} onImageLoaded={() => {}} />);
    const dropzone = screen.getByText(/Drag & Drop Reference Picture/i).closest('div')!;
    const dragOverEvent = new Event('dragover', { bubbles: true, cancelable: true });
    dropzone.dispatchEvent(dragOverEvent);
    expect(dragOverEvent.defaultPrevented).toBe(true);
  });
});
