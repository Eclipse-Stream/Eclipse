// UI Layer - TrayPanel Tests
// Story 9.2 & 9.3: Panel Glassmorphism - Core & Section Ecrans

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TrayPanel } from './TrayPanel';

// Mock electronAPI
const mockElectronAPI = {
  sunshine: {
    getStatus: vi.fn().mockResolvedValue('ONLINE'),
  },
  sunshinePreset: {
    apply: vi.fn().mockResolvedValue({ success: true }),
  },
  scripts: {
    exportActivePreset: vi.fn().mockResolvedValue({ success: true }),
  },
  trayPanel: {
    close: vi.fn().mockResolvedValue({ success: true }),
    openMainWindow: vi.fn().mockResolvedValue({ success: true }),
    setHeight: vi.fn().mockResolvedValue({ success: true }),
  },
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

// Mock presets data for localStorage
const mockPresets = [
  {
    id: 'eclipse-default',
    name: 'Eclipse Default',
    type: 'simple' as const,
    display: { mode: 'enable', resolutionStrategy: 'moonlight', fps: 60, bitrate: 35 },
    audio: { mode: 'moonlight' },
    network: { upnp: true },
    inputs: { keyboard: true, mouse: true, gamepad: true },
    isReadOnly: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'gaming-preset',
    name: 'Gaming 4K',
    type: 'simple' as const,
    display: { mode: 'enable', resolutionStrategy: 'moonlight', fps: 120, bitrate: 50 },
    audio: { mode: 'both' },
    network: { upnp: true },
    inputs: { keyboard: true, mouse: true, gamepad: true },
    isReadOnly: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

const STORE_KEY = 'eclipse-sunshine-preset-store';
const DISPLAY_STORE_KEY = 'eclipse-display-store';

// Mock screen presets for Story 9.3
const mockScreenPresets = [
  {
    type: 'preset',
    id: 'screen-preset-1',
    name: 'TV Salon 4K',
    deviceId: '{test-guid}',
    resolution: { width: 3840, height: 2160 },
    refreshRate: 60,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

const setupLocalStorage = (presets = mockPresets, activePresetId: string | null = 'eclipse-default') => {
  // Sunshine preset store
  localStorage.setItem(STORE_KEY, JSON.stringify({
    state: {
      presets,
      activePresetId,
    },
  }));
  // Display store (screen presets for Story 9.3)
  localStorage.setItem(DISPLAY_STORE_KEY, JSON.stringify({
    state: {
      presets: mockScreenPresets,
      activePresetId: null,
      vddDeviceId: '{test-guid}',
    },
  }));
};

describe('TrayPanel - Story 9.2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setupLocalStorage();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ============================================================================
  // AC2: Liste des configs Sunshine
  // ============================================================================
  describe('AC2: Configs List', () => {
    it('should display all Sunshine configs from localStorage', async () => {
      render(<TrayPanel />);

      await waitFor(() => {
        expect(screen.getByText('Eclipse Default')).toBeInTheDocument();
        expect(screen.getByText('Gaming 4K')).toBeInTheDocument();
      });
    });

    it('should mark active config with a check icon', async () => {
      render(<TrayPanel />);

      await waitFor(() => {
        // The active config (Eclipse Default) should have a check
        const eclipseButton = screen.getByText('Eclipse Default').closest('button');
        expect(eclipseButton).toHaveClass('bg-corona/20');
      });
    });

    it('should show inactive configs without check icon', async () => {
      render(<TrayPanel />);

      await waitFor(() => {
        const gamingButton = screen.getByText('Gaming 4K').closest('button');
        expect(gamingButton).not.toHaveClass('bg-corona/20');
      });
    });
  });

  // ============================================================================
  // AC3: Selection d'une config en 1 clic
  // ============================================================================
  describe('AC3: Config Selection', () => {
    it('should activate config via IPC on click', async () => {
      render(<TrayPanel />);

      await waitFor(() => {
        expect(screen.getByText('Gaming 4K')).toBeInTheDocument();
      });

      const gamingButton = screen.getByText('Gaming 4K');
      fireEvent.click(gamingButton);

      await waitFor(() => {
        expect(mockElectronAPI.sunshinePreset.apply).toHaveBeenCalledWith({
          preset: expect.objectContaining({ id: 'gaming-preset' }),
          currentConfig: undefined,
        });
      });
    });

    it('should close panel after config selection', async () => {
      render(<TrayPanel />);

      await waitFor(() => {
        expect(screen.getByText('Gaming 4K')).toBeInTheDocument();
      });

      const gamingButton = screen.getByText('Gaming 4K');
      fireEvent.click(gamingButton);

      await waitFor(() => {
        expect(mockElectronAPI.trayPanel.close).toHaveBeenCalled();
      });
    });

    it('should update localStorage after config selection', async () => {
      render(<TrayPanel />);

      await waitFor(() => {
        expect(screen.getByText('Gaming 4K')).toBeInTheDocument();
      });

      const gamingButton = screen.getByText('Gaming 4K');
      fireEvent.click(gamingButton);

      await waitFor(() => {
        const stored = localStorage.getItem(STORE_KEY);
        const parsed = JSON.parse(stored || '{}');
        expect(parsed.state.activePresetId).toBe('gaming-preset');
      });
    });

    it('should not activate already active config', async () => {
      render(<TrayPanel />);

      await waitFor(() => {
        expect(screen.getByText('Eclipse Default')).toBeInTheDocument();
      });

      const eclipseButton = screen.getByText('Eclipse Default');
      fireEvent.click(eclipseButton);

      // Should not call apply for already active config
      expect(mockElectronAPI.sunshinePreset.apply).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // AC4: Indicateur etat Sunshine
  // ============================================================================
  describe('AC4: Sunshine Status Indicator', () => {
    it('should show connected status when Sunshine is ONLINE', async () => {
      mockElectronAPI.sunshine.getStatus.mockResolvedValue('ONLINE');
      render(<TrayPanel />);

      await waitFor(() => {
        expect(screen.getByText('Sunshine connecté')).toBeInTheDocument();
      });
    });

    it('should show disconnected status when Sunshine is OFFLINE', async () => {
      mockElectronAPI.sunshine.getStatus.mockResolvedValue('OFFLINE');
      render(<TrayPanel />);

      await waitFor(() => {
        expect(screen.getByText('Sunshine déconnecté')).toBeInTheDocument();
      });
    });

    it('should fetch Sunshine status via IPC on mount', async () => {
      render(<TrayPanel />);

      await waitFor(() => {
        expect(mockElectronAPI.sunshine.getStatus).toHaveBeenCalled();
      });
    });
  });

  // ============================================================================
  // AC5: Bouton ouvrir Eclipse
  // ============================================================================
  describe('AC5: Open Eclipse Button', () => {
    it('should render settings button', () => {
      render(<TrayPanel />);

      const settingsButton = screen.getByTitle('Ouvrir Eclipse');
      expect(settingsButton).toBeInTheDocument();
    });

    it('should open main window on settings click', async () => {
      render(<TrayPanel />);

      const settingsButton = screen.getByTitle('Ouvrir Eclipse');
      fireEvent.click(settingsButton);

      await waitFor(() => {
        expect(mockElectronAPI.trayPanel.openMainWindow).toHaveBeenCalled();
      });
    });
  });

  // ============================================================================
  // AC7: Style glassmorphism
  // ============================================================================
  describe('AC7: Glassmorphism Style', () => {
    it('should have glassmorphism container styles', () => {
      const { container } = render(<TrayPanel />);

      // TrayPanel returns a Fragment with <style> first, then the panel div
      const panel = container.querySelector('.tray-panel-container') as HTMLElement;
      expect(panel).toBeInTheDocument();
      expect(panel).toHaveClass('backdrop-blur-[20px]');
      expect(panel).toHaveClass('rounded');
    });
  });

  // ============================================================================
  // Section Ecrans (Story 9.3)
  // ============================================================================
  describe('Screens Section - Story 9.3', () => {
    it('should render Ecrans section', () => {
      render(<TrayPanel />);

      expect(screen.getByText('Ecrans')).toBeInTheDocument();
    });

    it('should show screen presets', () => {
      render(<TrayPanel />);

      expect(screen.getByText('TV Salon 4K')).toBeInTheDocument();
    });

    it('should call setHeight when section expands', async () => {
      render(<TrayPanel />);

      const ecransButton = screen.getByText('Ecrans');
      fireEvent.click(ecransButton);

      await waitFor(() => {
        expect(mockElectronAPI.trayPanel.setHeight).toHaveBeenCalledWith(420);
      });
    });

    it('should call setHeight when section collapses', async () => {
      render(<TrayPanel />);

      const ecransButton = screen.getByText('Ecrans');

      // Expand
      fireEvent.click(ecransButton);

      await waitFor(() => {
        expect(mockElectronAPI.trayPanel.setHeight).toHaveBeenCalledWith(420);
      });

      // Collapse
      fireEvent.click(ecransButton);

      await waitFor(() => {
        expect(mockElectronAPI.trayPanel.setHeight).toHaveBeenCalledWith(270);
      });
    });
  });

  // ============================================================================
  // Empty State
  // ============================================================================
  describe('Empty State', () => {
    it('should handle empty localStorage gracefully', async () => {
      localStorage.clear();
      render(<TrayPanel />);

      // Should not crash, just show empty list
      await waitFor(() => {
        expect(screen.queryByText('Eclipse Default')).not.toBeInTheDocument();
      });
    });
  });
});
