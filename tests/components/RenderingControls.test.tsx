import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RenderingControls } from '@/components/studio/RenderingControls';

describe('RenderingControls', () => {
  const onSelectColorAlgorithm = vi.fn();
  const onQuickCompare = vi.fn();
  const onSelectDitherAlgorithm = vi.fn();
  const onDitherStrengthChange = vi.fn();

  it('renders all color matching pills and triggers callback on click', () => {
    render(
      <RenderingControls
        colorAlgorithm="ciede2000"
        onSelectColorAlgorithm={onSelectColorAlgorithm}
        onQuickCompare={onQuickCompare}
        ditherAlgorithm="floyd-steinberg"
        onSelectDitherAlgorithm={onSelectDitherAlgorithm}
        ditherStrength={0.75}
        onDitherStrengthChange={onDitherStrengthChange}
      />
    );

    expect(screen.getByRole('button', { name: /ciede2000/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /oklab/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /cie76/i })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /oklab/i }));
    expect(onSelectColorAlgorithm).toHaveBeenCalledWith('oklab');
  });

  it('triggers quick compare toggle button', () => {
    render(
      <RenderingControls
        colorAlgorithm="ciede2000"
        onSelectColorAlgorithm={onSelectColorAlgorithm}
        onQuickCompare={onQuickCompare}
        ditherAlgorithm="floyd-steinberg"
        onSelectDitherAlgorithm={onSelectDitherAlgorithm}
        ditherStrength={0.75}
        onDitherStrengthChange={onDitherStrengthChange}
      />
    );

    const compareBtn = screen.getByTitle(/quick compare/i);
    fireEvent.click(compareBtn);
    expect(onQuickCompare).toHaveBeenCalledTimes(1);
  });

  it('renders dither pills and updates strength slider', () => {
    render(
      <RenderingControls
        colorAlgorithm="ciede2000"
        onSelectColorAlgorithm={onSelectColorAlgorithm}
        onQuickCompare={onQuickCompare}
        ditherAlgorithm="atkinson"
        onSelectDitherAlgorithm={onSelectDitherAlgorithm}
        ditherStrength={0.75}
        onDitherStrengthChange={onDitherStrengthChange}
      />
    );

    expect(screen.getByRole('button', { name: /atkinson/i })).toBeDefined();
    const slider = screen.getByRole('slider');
    expect(slider).toBeDefined();

    fireEvent.change(slider, { target: { value: '0.5' } });
    expect(onDitherStrengthChange).toHaveBeenCalledWith(0.5);
  });

  it('hides dither strength slider when ditherAlgorithm is none', () => {
    render(
      <RenderingControls
        colorAlgorithm="ciede2000"
        onSelectColorAlgorithm={onSelectColorAlgorithm}
        onQuickCompare={onQuickCompare}
        ditherAlgorithm="none"
        onSelectDitherAlgorithm={onSelectDitherAlgorithm}
        ditherStrength={0.75}
        onDitherStrengthChange={onDitherStrengthChange}
      />
    );

    expect(screen.queryByRole('slider')).toBeNull();
  });
});
