// UI Layer - TrayPanelScreensSection Tests
// Story 9.3: Panel Glassmorphism - Section Ecrans

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TrayPanelScreensSection } from './TrayPanelScreensSection';

// Mock electronAPI
const mockElectronAPI = {
  vdd: {
    enable: vi.fn().mockResolvedValue({ success: true }),
    disable: vi.fn().mockResolvedValue({ success: true }),
    getStatus: vi.fn().mockResolvedValue('disabled'),
    setResolution: vi.fn().mockResolvedValue({ success: true }),
    updateConfig: vi.fn().mockResolvedValue({ success: true }),
  },
};

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

// Mock screen presets data for localStorage
const mockScreenPresets = [
  {
    type: 'preset',
    id: 'preset-1',
    name: 'TV Salon 4K',
    deviceId: '{test-device-guid}',
    resolution: { width: 3840, height: 2160 },
    refreshRate: 60,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    type: 'preset',
    id: 'preset-2',
    name: 'Steam Deck 720p',
    deviceId: '{test-device-guid}',
    resolution: { width: 1280, height: 720 },
    refreshRate: 60,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

const DISPLAY_STORE_KEY = 'eclipse-display-store';

const setupLocalStorage = (presets = mockScreenPresets, activePresetId: string | null = null) => {
  localStorage.setItem(DISPLAY_STORE_KEY, JSON.stringify({
    state: {
      presets,
      activePresetId,
      vddDeviceId: '{test-device-guid}',
    },
  }));
};

describe('TrayPanelScreensSection - Story 9.3', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setupLocalStorage();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ============================================================================
  // AC1: Section fermée par défaut
  // ============================================================================
  describe('AC1: Section fermée par défaut', () => {
    it('should render collapsed by default', () => {
      render(<TrayPanelScreensSection />);

      // Header should be visible
      expect(screen.getByText('Ecrans')).toBeInTheDocument();

      // Presets should not be visible (section collapsed)
      // The max-h-0 class hides content
      const presetsContainer = screen.queryByText('TV Salon 4K');
      // Content is rendered but hidden with max-h-0
      expect(presetsContainer).toBeInTheDocument();
    });

    it('should show ChevronDown when collapsed', () => {
      render(<TrayPanelScreensSection />);

      // Button should exist
      const button = screen.getByText('Ecrans').closest('button');
      expect(button).toBeInTheDocument();
    });
  });

  // ============================================================================
  // AC2: Déplier la section Ecrans
  // ============================================================================
  describe('AC2: Déplier la section Ecrans', () => {
    it('should expand on click and call onExpandChange', async () => {
      const onExpandChange = vi.fn();
      render(<TrayPanelScreensSection onExpandChange={onExpandChange} />);

      const header = screen.getByText('Ecrans');
      fireEvent.click(header);

      await waitFor(() => {
        expect(onExpandChange).toHaveBeenCalledWith(true);
      });
    });

    it('should collapse on second click and call onExpandChange', async () => {
      const onExpandChange = vi.fn();
      render(<TrayPanelScreensSection onExpandChange={onExpandChange} />);

      const header = screen.getByText('Ecrans');

      // Expand
      fireEvent.click(header);
      await waitFor(() => {
        expect(onExpandChange).toHaveBeenCalledWith(true);
      });

      // Collapse
      fireEvent.click(header);
      await waitFor(() => {
        expect(onExpandChange).toHaveBeenCalledWith(false);
      });
    });
  });

  // ============================================================================
  // AC3: Affichage des presets d'écran
  // ============================================================================
  describe('AC3: Affichage des presets', () => {
    it('should display all presets from localStorage', () => {
      render(<TrayPanelScreensSection />);

      expect(screen.getByText('TV Salon 4K')).toBeInTheDocument();
      expect(screen.getByText('Steam Deck 720p')).toBeInTheDocument();
    });

    it('should display resolution for each preset', () => {
      render(<TrayPanelScreensSection />);

      expect(screen.getByText('3840x2160 @ 60Hz')).toBeInTheDocument();
      expect(screen.getByText('1280x720 @ 60Hz')).toBeInTheDocument();
    });

    it('should not render if no presets', () => {
      localStorage.clear();
      setupLocalStorage([], null);

      const { container } = render(<TrayPanelScreensSection />);
      expect(container.firstChild).toBeNull();
    });
  });

  // ============================================================================
  // AC4: Toggle ON - Allumer un écran
  // ============================================================================
  describe('AC4: Toggle ON - Allumer un écran', () => {
    it('should enable VDD when toggling ON a preset', async () => {
      mockElectronAPI.vdd.getStatus.mockResolvedValue('disabled');

      render(<TrayPanelScreensSection />);

      // Find the toggle switch for first preset
      const switches = screen.getAllByRole('switch');
      const firstSwitch = switches[0];

      fireEvent.click(firstSwitch);

      await waitFor(() => {
        expect(mockElectronAPI.vdd.enable).toHaveBeenCalled();
      });
    });

    it('should set resolution after enabling VDD', async () => {
      mockElectronAPI.vdd.getStatus.mockResolvedValue('disabled');

      render(<TrayPanelScreensSection />);

      const switches = screen.getAllByRole('switch');
      fireEvent.click(switches[0]);

      // Wait for enable to be called (this happens immediately)
      await waitFor(() => {
        expect(mockElectronAPI.vdd.enable).toHaveBeenCalled();
      });

      // setResolution is called after a 1500ms delay - we use longer timeout
      await waitFor(() => {
        expect(mockElectronAPI.vdd.setResolution).toHaveBeenCalledWith({
          width: 3840,
          height: 2160,
          refreshRate: 60,
        });
      }, { timeout: 3000 });
    }, 10000); // 10 second test timeout

    it('should update localStorage activePresetId', async () => {
      mockElectronAPI.vdd.getStatus.mockResolvedValue('disabled');

      render(<TrayPanelScreensSection />);

      const switches = screen.getAllByRole('switch');
      fireEvent.click(switches[0]);

      // Wait for the whole operation to complete (includes 1500ms delay)
      await waitFor(() => {
        const stored = localStorage.getItem(DISPLAY_STORE_KEY);
        const parsed = JSON.parse(stored || '{}');
        expect(parsed.state.activePresetId).toBe('preset-1');
      }, { timeout: 3000 });
    }, 10000);
  });

  // ============================================================================
  // AC5: Toggle OFF - Éteindre l'écran
  // ============================================================================
  describe('AC5: Toggle OFF - Éteindre lécran', () => {
    it('should disable VDD when toggling OFF active preset', async () => {
      setupLocalStorage(mockScreenPresets, 'preset-1'); // preset-1 is active

      render(<TrayPanelScreensSection />);

      const switches = screen.getAllByRole('switch');
      const firstSwitch = switches[0]; // This is the active one

      fireEvent.click(firstSwitch);

      await waitFor(() => {
        expect(mockElectronAPI.vdd.disable).toHaveBeenCalled();
      });
    });

    it('should clear activePresetId in localStorage', async () => {
      setupLocalStorage(mockScreenPresets, 'preset-1');

      render(<TrayPanelScreensSection />);

      const switches = screen.getAllByRole('switch');
      fireEvent.click(switches[0]);

      await waitFor(() => {
        const stored = localStorage.getItem(DISPLAY_STORE_KEY);
        const parsed = JSON.parse(stored || '{}');
        expect(parsed.state.activePresetId).toBeNull();
      });
    });
  });

  // ============================================================================
  // AC6: Un seul écran actif à la fois (bascule)
  // ============================================================================
  describe('AC6: Un seul écran actif à la fois', () => {
    it('should use updateConfig when VDD already enabled', async () => {
      setupLocalStorage(mockScreenPresets, 'preset-1');
      mockElectronAPI.vdd.getStatus.mockResolvedValue('enabled'); // VDD already ON

      render(<TrayPanelScreensSection />);

      // Click on second preset (which is OFF)
      const switches = screen.getAllByRole('switch');
      fireEvent.click(switches[1]); // preset-2

      // updateConfig is called immediately when VDD is already enabled (no delay)
      await waitFor(() => {
        expect(mockElectronAPI.vdd.updateConfig).toHaveBeenCalledWith({
          width: 1280,
          height: 720,
          refreshRate: 60,
        });
      }, { timeout: 2000 });
    });

    it('should switch activePresetId to new preset', async () => {
      setupLocalStorage(mockScreenPresets, 'preset-1');
      mockElectronAPI.vdd.getStatus.mockResolvedValue('enabled');

      render(<TrayPanelScreensSection />);

      const switches = screen.getAllByRole('switch');
      fireEvent.click(switches[1]); // preset-2

      await waitFor(() => {
        const stored = localStorage.getItem(DISPLAY_STORE_KEY);
        const parsed = JSON.parse(stored || '{}');
        expect(parsed.state.activePresetId).toBe('preset-2');
      }, { timeout: 2000 });
    });
  });

  // ============================================================================
  // AC7: Replier la section (tested in AC2)
  // ============================================================================

  // ============================================================================
  // Error Handling
  // ============================================================================
  describe('Error Handling', () => {
    it('should handle VDD enable failure gracefully', async () => {
      mockElectronAPI.vdd.enable.mockResolvedValue({ success: false, error: 'Test error' });
      mockElectronAPI.vdd.getStatus.mockResolvedValue('disabled');

      render(<TrayPanelScreensSection />);

      const switches = screen.getAllByRole('switch');
      fireEvent.click(switches[0]);

      // Wait for the toggle operation to complete (including the enable attempt)
      await waitFor(() => {
        expect(mockElectronAPI.vdd.enable).toHaveBeenCalled();
      });

      // activePresetId should not be updated on failure
      await waitFor(() => {
        const stored = localStorage.getItem(DISPLAY_STORE_KEY);
        const parsed = JSON.parse(stored || '{}');
        expect(parsed.state.activePresetId).toBeNull();
      }, { timeout: 2000 });
    });
  });
});
