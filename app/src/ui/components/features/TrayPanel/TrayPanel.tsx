/**
 * TrayPanel - Story 9.2 & 9.3: Panel Glassmorphism - Core & Section Écrans
 * Main component for the system tray glassmorphism panel
 *
 * Features:
 * - Story 9.2: Lists all Sunshine configs with active indicator (AC2)
 * - Story 9.2: Shows Sunshine connection status (AC4)
 * - Story 9.2: Settings button to open main Eclipse window (AC5)
 * - Story 9.2: Glassmorphism styling (AC7)
 * - Story 9.3: Collapsible "Écrans" section with VDD preset toggles
 *
 * NOTE: This panel runs in a SEPARATE Electron window with its own JS context.
 * Zustand stores are NOT shared between windows. We use:
 * - localStorage for reading presets (shared between windows)
 * - IPC for Sunshine status and preset activation
 * - Storage events for real-time sync with main window
 */
import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings } from 'lucide-react';
import type { SunshinePreset } from '@domain/types';
import { SunshineStatus } from '@domain/types';
import { TrayPanelConfigItem } from './TrayPanelConfigItem';
import { TrayPanelScreensSection } from './TrayPanelScreensSection';

// localStorage key used by useSunshinePresetStore
const STORE_KEY = 'eclipse-sunshine-preset-store';

// Panel heights - two fixed sizes for collapsed/expanded states
// Collapsed: Écrans header + divider + Config header + 3 configs + divider + footer
const PANEL_HEIGHT_COLLAPSED = 280;
// Expanded: + 2 screen items (~116px)
const PANEL_HEIGHT_EXPANDED = 396;

interface TrayPanelState {
  presets: SunshinePreset[];
  activePresetId: string | null;
  sunshineStatus: SunshineStatus;
  isLoading: boolean;
}

// localStorage key for language (Story 10.5)
const LANGUAGE_KEY = 'eclipse-language';

export function TrayPanel() {
  const { t, i18n } = useTranslation();
  const [state, setState] = useState<TrayPanelState>({
    presets: [],
    activePresetId: null,
    sunshineStatus: SunshineStatus.OFFLINE,
    isLoading: true,
  });
  const [isActivating, setIsActivating] = useState(false);

  /**
   * Sync language from localStorage (Story 10.5)
   * Since TrayPanel runs in a separate window, we need to sync language manually
   */
  useEffect(() => {
    // Initial sync
    const savedLang = localStorage.getItem(LANGUAGE_KEY);
    if (savedLang && (savedLang === 'fr' || savedLang === 'en')) {
      i18n.changeLanguage(savedLang);
    }

    // Listen for language changes from main window
    const handleStorage = (e: StorageEvent) => {
      if (e.key === LANGUAGE_KEY && e.newValue) {
        console.log('[TrayPanel] Language changed to:', e.newValue);
        i18n.changeLanguage(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, [i18n]);

  /**
   * Load presets from localStorage (shared with main window)
   */
  const loadPresets = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Zustand persist stores state under 'state' key
        const presets = parsed.state?.presets || [];
        const activePresetId = parsed.state?.activePresetId || null;
        console.log('[TrayPanel] Loaded presets from localStorage:', presets.length, 'active:', activePresetId);
        setState(prev => ({
          ...prev,
          presets,
          activePresetId,
        }));
      }
    } catch (e) {
      console.error('[TrayPanel] Failed to load presets from localStorage:', e);
    }
  }, []);

  /**
   * Load Sunshine status via IPC
   */
  const loadSunshineStatus = useCallback(async () => {
    try {
      const status = await window.electronAPI.sunshine.getStatus();
      console.log('[TrayPanel] Sunshine status:', status);
      setState(prev => ({ ...prev, sunshineStatus: status }));
    } catch (e) {
      console.error('[TrayPanel] Failed to get Sunshine status:', e);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    console.log('[TrayPanel] Initializing...');

    // Load presets from localStorage
    loadPresets();

    // Load Sunshine status via IPC
    loadSunshineStatus();

    // Mark loading complete
    setState(prev => ({ ...prev, isLoading: false }));

    // Listen for localStorage changes from main window
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORE_KEY) {
        console.log('[TrayPanel] Storage event detected, reloading presets');
        loadPresets();
      }
    };
    window.addEventListener('storage', handleStorage);

    // Refresh Sunshine status periodically
    const interval = setInterval(loadSunshineStatus, 5000);

    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, [loadPresets, loadSunshineStatus]);

  // Determine connection status
  const isConnected = state.sunshineStatus === SunshineStatus.ONLINE;

  /**
   * Handle config selection (AC3)
   * Activates the config via IPC and closes the panel
   */
  const handleSelectConfig = async (configId: string) => {
    // Don't do anything if already active or loading
    if (configId === state.activePresetId || isActivating || state.isLoading) return;

    const preset = state.presets.find(p => p.id === configId);
    if (!preset) {
      console.error('[TrayPanel] Preset not found:', configId);
      return;
    }

    setIsActivating(true);
    try {
      console.log('[TrayPanel] Activating preset:', preset.name);

      // Apply preset via IPC (same as store does)
      const result = await window.electronAPI.sunshinePreset.apply({
        preset,
        currentConfig: undefined,
      });

      if (!result.success) {
        console.error('[TrayPanel] Failed to apply preset:', result.error);
        return;
      }

      console.log('[TrayPanel] Preset applied successfully');

      // Update localStorage to sync with main window
      const stored = localStorage.getItem(STORE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.state.activePresetId = configId;
        localStorage.setItem(STORE_KEY, JSON.stringify(parsed));
        console.log('[TrayPanel] Updated localStorage with new activePresetId');
      }

      // Update local state
      setState(prev => ({ ...prev, activePresetId: configId }));

      // Export active preset for scripts
      await window.electronAPI.scripts.exportActivePreset(configId);

      // Close panel after selection
      await window.electronAPI.trayPanel.close();
    } catch (error) {
      console.error('[TrayPanel] Failed to activate config:', error);
    } finally {
      setIsActivating(false);
    }
  };

  /**
   * Open main Eclipse window (AC5)
   */
  const handleOpenSettings = async () => {
    try {
      console.log('[TrayPanel] Opening main window...');
      await window.electronAPI.trayPanel.openMainWindow();
    } catch (error) {
      console.error('[TrayPanel] Failed to open main window:', error);
    }
  };

  /**
   * Handle Écrans section expand/collapse (Story 9.3 - AC2)
   * Changes panel height and repositions to stay anchored at bottom
   */
  const handleScreensSectionExpandChange = useCallback(async (isExpanded: boolean) => {
    const height = isExpanded ? PANEL_HEIGHT_EXPANDED : PANEL_HEIGHT_COLLAPSED;
    try {
      await window.electronAPI.trayPanel.setHeight(height);
      console.log('[TrayPanel] Panel height changed to:', height);
    } catch (error) {
      console.error('[TrayPanel] Failed to set panel height:', error);
    }
  }, []);

  return (
    <>
      {/* Hide scrollbar on the outer container (Webkit/Electron) */}
      <style>{`
        .tray-panel-container::-webkit-scrollbar { display: none; }
      `}</style>
      <div
        className="
          tray-panel-container
          w-full h-full p-3 rounded flex flex-col
          bg-[rgba(15,15,15,0.85)] backdrop-blur-[20px]
          border border-[rgba(255,255,255,0.08)]
        "
        style={{
          // Extra glassmorphism for Windows
          WebkitBackdropFilter: 'blur(20px)',
          // Hide any outer scrollbar completely
          overflow: 'hidden',
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none', // IE/Edge
        }}
      >
        {/* Section Écrans - Story 9.3: Collapsible section with VDD preset toggles */}
        <div className="flex-shrink-0">
          <TrayPanelScreensSection onExpandChange={handleScreensSectionExpandChange} />
        </div>

        {/* Section Config Sunshine - toujours juste après Écrans */}
        <div className="flex-shrink-0">
          {/* Titre section */}
          <div className="flex items-center justify-between py-2">
            <span className="text-[13px] font-medium text-text-primary">{t('tray.sunshineConfig')}</span>
          </div>

          {/* Configs List - max 3 presets visibles (~108px), scrollbar au-delà */}
          <div className="max-h-[108px] overflow-y-auto space-y-1">
            {state.presets.map((config) => (
              <TrayPanelConfigItem
                key={config.id}
                config={config}
                isActive={config.id === state.activePresetId}
                onSelect={() => handleSelectConfig(config.id)}
              />
            ))}
          </div>
        </div>

        {/* Spacer - espace vide EN DESSOUS des configs */}
        <div className="flex-1" />

        {/* Bottom Bar - TOUJOURS VISIBLE en bas */}
        <div className="flex-shrink-0">
          {/* Divider */}
          <div className="border-t border-[rgba(255,255,255,0.08)] my-2" />

          {/* Status + Settings (AC4, AC5) */}
          <div className="flex items-center justify-between">
            {/* Sunshine Status Indicator (AC4) */}
            <div className="flex items-center gap-2 text-sm">
              <span
                className={`
                  w-2 h-2 rounded-full
                  ${isConnected ? 'bg-success' : 'bg-error'}
                `}
              />
              <span className="text-text-secondary">
                {isConnected ? t('dashboard.sunshine.online') : t('dashboard.sunshine.offline')}
              </span>
            </div>

            {/* Settings Button (AC5) */}
            <button
              onClick={handleOpenSettings}
              className="
                p-2 rounded-lg
                hover:bg-white/5 transition-colors
                text-text-secondary hover:text-text-primary
              "
              title={t('tray.show')}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Loading overlay */}
        {(isActivating || state.isLoading) && (
          <div className="absolute inset-0 bg-black/50 rounded flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-corona border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </>
  );
}
