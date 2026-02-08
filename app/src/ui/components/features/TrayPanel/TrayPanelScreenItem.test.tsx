// UI Layer - TrayPanelScreenItem Tests
// Story 9.3: Panel Glassmorphism - Section Ecrans

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrayPanelScreenItem } from './TrayPanelScreenItem';
import type { ScreenPreset } from '@domain/types';

const mockPreset: ScreenPreset = {
  type: 'preset',
  id: 'test-preset',
  name: 'TV Salon 4K',
  deviceId: '{test-device-guid}',
  resolution: { width: 3840, height: 2160 },
  refreshRate: 60,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('TrayPanelScreenItem - Story 9.3', () => {
  // ============================================================================
  // AC3: Affichage des presets d'écran
  // ============================================================================
  describe('AC3: Affichage preset', () => {
    it('should display preset name', () => {
      render(
        <TrayPanelScreenItem
          preset={mockPreset}
          isActive={false}
          isLoading={false}
          onToggle={() => {}}
        />
      );

      expect(screen.getByText('TV Salon 4K')).toBeInTheDocument();
    });

    it('should display resolution and refresh rate', () => {
      render(
        <TrayPanelScreenItem
          preset={mockPreset}
          isActive={false}
          isLoading={false}
          onToggle={() => {}}
        />
      );

      expect(screen.getByText('3840x2160 @ 60Hz')).toBeInTheDocument();
    });

    it('should render switch toggle', () => {
      render(
        <TrayPanelScreenItem
          preset={mockPreset}
          isActive={false}
          isLoading={false}
          onToggle={() => {}}
        />
      );

      expect(screen.getByRole('switch')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Toggle State
  // ============================================================================
  describe('Toggle State', () => {
    it('should show switch as checked when active', () => {
      render(
        <TrayPanelScreenItem
          preset={mockPreset}
          isActive={true}
          isLoading={false}
          onToggle={() => {}}
        />
      );

      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveAttribute('data-state', 'checked');
    });

    it('should show switch as unchecked when inactive', () => {
      render(
        <TrayPanelScreenItem
          preset={mockPreset}
          isActive={false}
          isLoading={false}
          onToggle={() => {}}
        />
      );

      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveAttribute('data-state', 'unchecked');
    });

    it('should call onToggle when switch is clicked', () => {
      const onToggle = vi.fn();
      render(
        <TrayPanelScreenItem
          preset={mockPreset}
          isActive={false}
          isLoading={false}
          onToggle={onToggle}
        />
      );

      const switchElement = screen.getByRole('switch');
      fireEvent.click(switchElement);

      expect(onToggle).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Loading State
  // ============================================================================
  describe('Loading State', () => {
    it('should show loading spinner when isLoading', () => {
      render(
        <TrayPanelScreenItem
          preset={mockPreset}
          isActive={false}
          isLoading={true}
          onToggle={() => {}}
        />
      );

      // Loading spinner has animate-spin class
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should disable switch when loading', () => {
      render(
        <TrayPanelScreenItem
          preset={mockPreset}
          isActive={false}
          isLoading={true}
          onToggle={() => {}}
        />
      );

      const switchElement = screen.getByRole('switch');
      expect(switchElement).toBeDisabled();
    });

    it('should apply opacity when loading', () => {
      const { container } = render(
        <TrayPanelScreenItem
          preset={mockPreset}
          isActive={false}
          isLoading={true}
          onToggle={() => {}}
        />
      );

      expect(container.firstChild).toHaveClass('opacity-50');
    });
  });

  // ============================================================================
  // Accessibility
  // ============================================================================
  describe('Accessibility', () => {
    it('should have aria-label on switch', () => {
      render(
        <TrayPanelScreenItem
          preset={mockPreset}
          isActive={false}
          isLoading={false}
          onToggle={() => {}}
        />
      );

      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveAttribute('aria-label', 'Toggle TV Salon 4K');
    });
  });
});
