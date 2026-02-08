// useAutostart hook - Story 9.7
// Hook to manage Windows auto-start setting

import { useState, useEffect, useCallback } from 'react';

interface UseAutostartResult {
  /** Whether auto-start is currently enabled */
  isEnabled: boolean;
  /** Whether the state is being loaded/updated */
  isLoading: boolean;
  /** Error message if operation failed */
  error: string | null;
  /** Toggle auto-start on/off */
  toggle: () => Promise<void>;
  /** Enable auto-start */
  enable: () => Promise<void>;
  /** Disable auto-start */
  disable: () => Promise<void>;
}

/**
 * Hook to manage Windows auto-start setting.
 * Uses Electron's app.setLoginItemSettings() via IPC.
 */
export function useAutostart(): UseAutostartResult {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial state
  useEffect(() => {
    const loadState = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const enabled = await window.electronAPI.autostart.isEnabled();
        setIsEnabled(enabled);
      } catch (err) {
        console.error('[useAutostart] Failed to load state:', err);
        setError('Impossible de charger le paramètre');
      } finally {
        setIsLoading(false);
      }
    };

    loadState();
  }, []);

  const toggle = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const newState = await window.electronAPI.autostart.toggle();
      setIsEnabled(newState);
    } catch (err) {
      console.error('[useAutostart] Failed to toggle:', err);
      setError('Impossible de modifier le paramètre');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const enable = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await window.electronAPI.autostart.enable();
      setIsEnabled(true);
    } catch (err) {
      console.error('[useAutostart] Failed to enable:', err);
      setError('Impossible d\'activer le démarrage automatique');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disable = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await window.electronAPI.autostart.disable();
      setIsEnabled(false);
    } catch (err) {
      console.error('[useAutostart] Failed to disable:', err);
      setError('Impossible de désactiver le démarrage automatique');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isEnabled,
    isLoading,
    error,
    toggle,
    enable,
    disable,
  };
}
