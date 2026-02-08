/**
 * TrayPanelScreensSection - Story 9.3: Panel Glassmorphism - Section Écrans
 * Collapsible section showing VDD presets with ON/OFF toggles
 *
 * NOTE: This runs in a SEPARATE Electron window with its own JS context.
 * Zustand stores are NOT shared. We use:
 * - localStorage for reading presets (eclipse-display-store)
 * - IPC for VDD operations (enable/disable)
 * - Storage events for real-time sync
 */
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { ScreenPreset } from '@domain/types';
import { TrayPanelScreenItem } from './TrayPanelScreenItem';

// localStorage key used by useDisplayStore
const DISPLAY_STORE_KEY = 'eclipse-display-store';

// Height for 2 screen items visible (each item ~50px)
const SCREENS_LIST_MAX_HEIGHT = 'max-h-[100px]';

interface TrayPanelScreensSectionProps {
  /** Callback when section expands/collapses - used to resize panel */
  onExpandChange?: (isExpanded: boolean) => void;
}

interface ScreensState {
  presets: ScreenPreset[];
  activePresetId: string | null;
}

export function TrayPanelScreensSection({ onExpandChange }: TrayPanelScreensSectionProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [state, setState] = useState<ScreensState>({
    presets: [],
    activePresetId: null,
  });
  const [isToggling, setIsToggling] = useState<string | null>(null);

  /**
   * Load screen presets from localStorage (shared with main window)
   */
  const loadPresets = useCallback(() => {
    try {
      const stored = localStorage.getItem(DISPLAY_STORE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Zustand persist stores state under 'state' key
        const presets = parsed.state?.presets || [];
        const activePresetId = parsed.state?.activePresetId || null;
        console.log('[TrayPanelScreensSection] Loaded presets:', presets.length, 'active:', activePresetId);
        setState({ presets, activePresetId });
      }
    } catch (e) {
      console.error('[TrayPanelScreensSection] Failed to load presets:', e);
    }
  }, []);

  // Initialize on mount and listen for storage changes
  useEffect(() => {
    loadPresets();

    // Listen for localStorage changes from main window
    const handleStorage = (e: StorageEvent) => {
      if (e.key === DISPLAY_STORE_KEY) {
        console.log('[TrayPanelScreensSection] Storage event, reloading presets');
        loadPresets();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, [loadPresets]);

  /**
   * Handle toggle ON/OFF for a preset
   * AC4: Toggle ON = VDD s'allume avec resolution du preset
   * AC5: Toggle OFF = VDD s'eteint
   * AC6: Un seul ecran actif (bascule automatique)
   */
  const handleToggle = async (presetId: string, currentlyActive: boolean) => {
    if (isToggling) return; // Prevent double-click

    setIsToggling(presetId);
    try {
      if (currentlyActive) {
        // AC5: Turn OFF - disable VDD
        console.log('[TrayPanelScreensSection] Disabling VDD');
        const result = await window.electronAPI.vdd.disable();
        if (result.success) {
          // Update localStorage to sync activePresetId
          updateLocalStorageActivePreset(null);
          setState(prev => ({ ...prev, activePresetId: null }));
        } else {
          console.error('[TrayPanelScreensSection] Failed to disable VDD:', result.error);
        }
      } else {
        // AC4 & AC6: Turn ON - enable VDD with preset resolution
        const preset = state.presets.find(p => p.id === presetId);
        if (!preset) {
          console.error('[TrayPanelScreensSection] Preset not found:', presetId);
          return;
        }

        console.log('[TrayPanelScreensSection] Activating preset:', preset.name);

        // Check current VDD status to determine enable or update
        const vddStatus = await window.electronAPI.vdd.getStatus();
        const resolutionParams = {
          width: preset.resolution.width,
          height: preset.resolution.height,
          refreshRate: preset.refreshRate,
        };

        let success = false;
        if (vddStatus === 'enabled') {
          // AC6: VDD already ON, just switch resolution (bascule)
          const result = await window.electronAPI.vdd.updateConfig(resolutionParams);
          success = result.success;
          if (!result.success) {
            console.error('[TrayPanelScreensSection] Failed to update config:', result.error);
          }
        } else {
          // VDD OFF, enable then set resolution
          const enableResult = await window.electronAPI.vdd.enable();
          if (enableResult.success) {
            // Wait for Windows to detect the display
            await new Promise(resolve => setTimeout(resolve, 1500));
            const resResult = await window.electronAPI.vdd.setResolution(resolutionParams);
            success = resResult.success;
            if (!resResult.success) {
              console.error('[TrayPanelScreensSection] Failed to set resolution:', resResult.error);
            }
          } else {
            console.error('[TrayPanelScreensSection] Failed to enable VDD:', enableResult.error);
          }
        }

        if (success) {
          // Update localStorage to sync activePresetId
          updateLocalStorageActivePreset(presetId);
          setState(prev => ({ ...prev, activePresetId: presetId }));
        }
      }
    } finally {
      setIsToggling(null);
    }
  };

  /**
   * Update activePresetId in localStorage to sync with main window
   */
  const updateLocalStorageActivePreset = (presetId: string | null) => {
    try {
      const stored = localStorage.getItem(DISPLAY_STORE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.state.activePresetId = presetId;
        localStorage.setItem(DISPLAY_STORE_KEY, JSON.stringify(parsed));
        console.log('[TrayPanelScreensSection] Updated localStorage activePresetId:', presetId);
      }
    } catch (e) {
      console.error('[TrayPanelScreensSection] Failed to update localStorage:', e);
    }
  };

  const toggleExpanded = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onExpandChange?.(newExpanded);
  };

  // Don't render if no presets
  if (state.presets.length === 0) {
    return null;
  }

  return (
    <div className="screens-section">
      {/* Header cliquable (AC1, AC2, AC7) */}
      <button
        onClick={toggleExpanded}
        className="
          w-full flex items-center justify-between px-3 py-2 rounded-lg
          text-sm text-text-secondary hover:bg-white/5 transition-colors
        "
      >
        <span>{t('tray.screens')}</span>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronUp className="w-4 h-4" />
        )}
      </button>

      {/* Contenu depliable - HAUTEUR FIXE quand ouvert, transition opacity seulement */}
      <div
        className={`
          overflow-hidden transition-opacity duration-150
          ${isExpanded ? 'h-[116px] opacity-100' : 'h-0 opacity-0'}
        `}
      >
        {/* Scrollable list - max 2 items visible, scroll if more */}
        <div className={`${SCREENS_LIST_MAX_HEIGHT} overflow-y-auto space-y-1 py-2`}>
          {state.presets.map((preset) => (
            <TrayPanelScreenItem
              key={preset.id}
              preset={preset}
              isActive={preset.id === state.activePresetId}
              isLoading={isToggling === preset.id}
              onToggle={() => handleToggle(preset.id, preset.id === state.activePresetId)}
            />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-[rgba(255,255,255,0.08)] my-2" />
    </div>
  );
}
