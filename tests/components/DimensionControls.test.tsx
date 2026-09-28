import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DimensionControls } from '@/components/studio/DimensionControls';
import { MosaicDimensions } from '@/types/mosaic';

describe('DimensionControls Component', () => {
  const initialDimensions: MosaicDimensions = {
    unit: 'inches',
    surfaceWidth: 72,
    surfaceHeight: 48,
    noteWidth: 3,
    noteHeight: 3,
    cols: 24,
    rows: 16,
    lockAspectRatio: true,
  };

  it('renders width and height inputs with correct initial values and units', () => {
    render(
      <DimensionControls
        dimensions={initialDimensions}
        onPhysicalChange={() => {}}
        onGridCountChange={() => {}}
      />
    );

    expect(screen.getByLabelText(/Surface Width \(inches\)/i)).toBeDefined();
    expect(screen.getByLabelText(/Surface Height \(inches\)/i)).toBeDefined();

    const widthInput = screen.getByLabelText(/Surface Width \(inches\)/i) as HTMLInputElement;
    const heightInput = screen.getByLabelText(/Surface Height \(inches\)/i) as HTMLInputElement;

    expect(widthInput.value).toBe('72');
    expect(heightInput.value).toBe('48');
  });

  it('renders grid columns and rows sliders with values in label', () => {
    render(
      <DimensionControls
        dimensions={initialDimensions}
        onPhysicalChange={() => {}}
        onGridCountChange={() => {}}
      />
    );

    expect(screen.getByLabelText(/Grid Notes Wide \(24\)/i)).toBeDefined();
    expect(screen.getByLabelText(/Grid Notes High \(16\)/i)).toBeDefined();
  });

  it('calls onPhysicalChange when surface width changes', () => {
    const onPhysicalChange = vi.fn();
    render(
      <DimensionControls
        dimensions={initialDimensions}
        onPhysicalChange={onPhysicalChange}
        onGridCountChange={() => {}}
      />
    );

    const widthInput = screen.getByLabelText(/Surface Width \(inches\)/i);
    fireEvent.change(widthInput, { target: { value: '96' } });

    expect(onPhysicalChange).toHaveBeenCalledWith(96, 48, 3, 3);
  });

  it('calls onPhysicalChange when surface height changes', () => {
    const onPhysicalChange = vi.fn();
    render(
      <DimensionControls
        dimensions={initialDimensions}
        onPhysicalChange={onPhysicalChange}
        onGridCountChange={() => {}}
      />
    );

    const heightInput = screen.getByLabelText(/Surface Height \(inches\)/i);
    fireEvent.change(heightInput, { target: { value: '60' } });

    expect(onPhysicalChange).toHaveBeenCalledWith(72, 60, 3, 3);
  });

  it('calls onGridCountChange when grid column slider changes', () => {
    const onGridCountChange = vi.fn();
    render(
      <DimensionControls
        dimensions={initialDimensions}
        onPhysicalChange={() => {}}
        onGridCountChange={onGridCountChange}
      />
    );

    const colsSlider = screen.getByLabelText(/Grid Notes Wide \(24\)/i);
    fireEvent.change(colsSlider, { target: { value: '32' } });

    expect(onGridCountChange).toHaveBeenCalledWith(32, 16);
  });

  it('calls onGridCountChange when grid row slider changes', () => {
    const onGridCountChange = vi.fn();
    render(
      <DimensionControls
        dimensions={initialDimensions}
        onPhysicalChange={() => {}}
        onGridCountChange={onGridCountChange}
      />
    );

    const rowsSlider = screen.getByLabelText(/Grid Notes High \(16\)/i);
    fireEvent.change(rowsSlider, { target: { value: '20' } });

    expect(onGridCountChange).toHaveBeenCalledWith(24, 20);
  });
});
