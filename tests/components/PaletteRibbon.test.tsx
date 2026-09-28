import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { PaletteRibbon } from '@/components/studio/PaletteRibbon';
import { AMAZON_STICKY_BUNDLES } from '@/data/amazonBundles';

describe('PaletteRibbon Component', () => {
  it('renders Amazon Post-it packs and triggers onSelect when clicked', () => {
    let selectedId = '';
    render(
      <PaletteRibbon
        activeBundleId="miami"
        combinedBundleIds={['miami']}
        onSelectBundle={(id) => {
          selectedId = id;
        }}
        onToggleBundle={() => {}}
      />
    );

    const rioButton = screen.getByText(/Rio de Janeiro/i);
    expect(rioButton).toBeDefined();
    fireEvent.click(rioButton);
    expect(selectedId).toBe('rio');
  });

  it('renders all packs from AMAZON_STICKY_BUNDLES with their color swatches', () => {
    render(
      <PaletteRibbon
        activeBundleId="miami"
        combinedBundleIds={['miami']}
        onSelectBundle={() => {}}
        onToggleBundle={() => {}}
      />
    );

    for (const bundle of AMAZON_STICKY_BUNDLES) {
      const card = screen.getByTestId(`bundle-card-${bundle.id}`);
      const cardQueries = within(card);
      const displayName = bundle.name.replace('Post-it ', '');
      expect(cardQueries.getByText(displayName)).toBeDefined();
      expect(cardQueries.getByText(`${bundle.colors.length} colors`)).toBeDefined();
    }
  });

  it('triggers onToggleBundle when combine button is clicked', () => {
    const onToggleBundle = vi.fn();
    render(
      <PaletteRibbon
        activeBundleId="miami"
        combinedBundleIds={['miami']}
        onSelectBundle={() => {}}
        onToggleBundle={onToggleBundle}
      />
    );

    const toggleRio = screen.getByRole('button', { name: /Toggle Rio de Janeiro/i });
    fireEvent.click(toggleRio);
    expect(onToggleBundle).toHaveBeenCalledWith('rio');
  });

  it('triggers onToggleBundle when a pack is shift-clicked', () => {
    const onSelectBundle = vi.fn();
    const onToggleBundle = vi.fn();
    render(
      <PaletteRibbon
        activeBundleId="miami"
        combinedBundleIds={['miami']}
        onSelectBundle={onSelectBundle}
        onToggleBundle={onToggleBundle}
      />
    );

    const marseilleButton = screen.getByText(/Marseille Collection/i);
    fireEvent.click(marseilleButton, { shiftKey: true });

    expect(onToggleBundle).toHaveBeenCalledWith('marseille');
    expect(onSelectBundle).not.toHaveBeenCalled();
  });

  it('highlights selected bundles in combinedBundleIds', () => {
    render(
      <PaletteRibbon
        activeBundleId="miami"
        combinedBundleIds={['miami', 'energy']}
        onSelectBundle={() => {}}
        onToggleBundle={() => {}}
      />
    );

    const miamiToggle = screen.getByRole('button', { name: /Toggle Miami Collection/i });
    const energyToggle = screen.getByRole('button', { name: /Toggle Energy Collection/i });
    const canaryToggle = screen.getByRole('button', { name: /Toggle Classic Canary Yellow/i });

    expect(miamiToggle.textContent).toContain('In mix');
    expect(energyToggle.textContent).toContain('In mix');
    expect(canaryToggle.textContent).toContain('+ Mix');
  });
});
