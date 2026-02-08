// UI Layer - TrayPanelConfigItem Tests
// Story 9.2: Panel Glassmorphism - Core

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrayPanelConfigItem } from './TrayPanelConfigItem';
import type { SunshinePreset } from '@domain/types';

describe('TrayPanelConfigItem - Story 9.2', () => {
  const mockConfig: SunshinePreset = {
    id: 'test-preset',
    name: 'Test Preset',
    type: 'simple',
    display: {
      mode: 'enable',
      resolutionStrategy: 'moonlight',
      fps: 60,
      bitrate: 35,
    },
    audio: { mode: 'moonlight' },
    network: { upnp: true },
    inputs: { keyboard: true, mouse: true, gamepad: true },
    isReadOnly: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Rendering
  // ============================================================================
  describe('Rendering', () => {
    it('should render config name', () => {
      render(
        <TrayPanelConfigItem
          config={mockConfig}
          isActive={false}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('Test Preset')).toBeInTheDocument();
    });

    it('should render as a button', () => {
      render(
        <TrayPanelConfigItem
          config={mockConfig}
          isActive={false}
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Active State (AC2)
  // ============================================================================
  describe('Active State', () => {
    it('should show check icon when active', () => {
      const { container } = render(
        <TrayPanelConfigItem
          config={mockConfig}
          isActive={true}
          onSelect={mockOnSelect}
        />
      );

      // Check for Lucide Check icon (has class for the icon)
      const svgIcon = container.querySelector('svg');
      expect(svgIcon).toBeInTheDocument();
    });

    it('should not show check icon when inactive', () => {
      const { container } = render(
        <TrayPanelConfigItem
          config={mockConfig}
          isActive={false}
          onSelect={mockOnSelect}
        />
      );

      // Should not have the Check icon
      const svgIcon = container.querySelector('svg');
      expect(svgIcon).not.toBeInTheDocument();
    });

    it('should have active styling when active', () => {
      render(
        <TrayPanelConfigItem
          config={mockConfig}
          isActive={true}
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-corona/20');
      expect(button).toHaveClass('text-corona');
    });

    it('should have inactive styling when not active', () => {
      render(
        <TrayPanelConfigItem
          config={mockConfig}
          isActive={false}
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByRole('button');
      expect(button).not.toHaveClass('bg-corona/20');
      expect(button).toHaveClass('text-text-secondary');
    });
  });

  // ============================================================================
  // Interaction (AC3)
  // ============================================================================
  describe('Interaction', () => {
    it('should call onSelect when clicked', () => {
      render(
        <TrayPanelConfigItem
          config={mockConfig}
          isActive={false}
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockOnSelect).toHaveBeenCalledTimes(1);
    });

    it('should have hover styles', () => {
      render(
        <TrayPanelConfigItem
          config={mockConfig}
          isActive={false}
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('hover:bg-white/5');
    });
  });

  // ============================================================================
  // Long Names
  // ============================================================================
  describe('Long Names', () => {
    it('should truncate long config names', () => {
      const longNameConfig = {
        ...mockConfig,
        name: 'This is a very long preset name that should be truncated',
      };

      render(
        <TrayPanelConfigItem
          config={longNameConfig}
          isActive={false}
          onSelect={mockOnSelect}
        />
      );

      const nameElement = screen.getByText(longNameConfig.name);
      expect(nameElement).toHaveClass('truncate');
    });
  });
});
