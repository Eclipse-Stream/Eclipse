// useAutostart hook tests - Story 9.7
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAutostart } from './use-autostart';
import { mockElectronAPI } from '../../test/setup';

describe('useAutostart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should load initial enabled state from API', async () => {
      mockElectronAPI.autostart.isEnabled.mockResolvedValue(true);

      const { result } = renderHook(() => useAutostart());

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isEnabled).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should load initial disabled state from API', async () => {
      mockElectronAPI.autostart.isEnabled.mockResolvedValue(false);

      const { result } = renderHook(() => useAutostart());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isEnabled).toBe(false);
    });

    it('should handle load error', async () => {
      mockElectronAPI.autostart.isEnabled.mockRejectedValue(new Error('API error'));

      const { result } = renderHook(() => useAutostart());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Impossible de charger le paramètre');
    });
  });

  describe('toggle', () => {
    it('should toggle from disabled to enabled', async () => {
      mockElectronAPI.autostart.isEnabled.mockResolvedValue(false);
      mockElectronAPI.autostart.toggle.mockResolvedValue(true);

      const { result } = renderHook(() => useAutostart());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isEnabled).toBe(false);

      await act(async () => {
        await result.current.toggle();
      });

      expect(mockElectronAPI.autostart.toggle).toHaveBeenCalled();
      expect(result.current.isEnabled).toBe(true);
    });

    it('should toggle from enabled to disabled', async () => {
      mockElectronAPI.autostart.isEnabled.mockResolvedValue(true);
      mockElectronAPI.autostart.toggle.mockResolvedValue(false);

      const { result } = renderHook(() => useAutostart());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.toggle();
      });

      expect(result.current.isEnabled).toBe(false);
    });

    it('should handle toggle error', async () => {
      mockElectronAPI.autostart.isEnabled.mockResolvedValue(false);
      mockElectronAPI.autostart.toggle.mockRejectedValue(new Error('Toggle failed'));

      const { result } = renderHook(() => useAutostart());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.toggle();
      });

      expect(result.current.error).toBe('Impossible de modifier le paramètre');
      expect(result.current.isEnabled).toBe(false); // State unchanged
    });
  });

  describe('enable', () => {
    it('should enable auto-start', async () => {
      mockElectronAPI.autostart.isEnabled.mockResolvedValue(false);
      mockElectronAPI.autostart.enable.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAutostart());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.enable();
      });

      expect(mockElectronAPI.autostart.enable).toHaveBeenCalled();
      expect(result.current.isEnabled).toBe(true);
    });
  });

  describe('disable', () => {
    it('should disable auto-start', async () => {
      mockElectronAPI.autostart.isEnabled.mockResolvedValue(true);
      mockElectronAPI.autostart.disable.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAutostart());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.disable();
      });

      expect(mockElectronAPI.autostart.disable).toHaveBeenCalled();
      expect(result.current.isEnabled).toBe(false);
    });
  });
});
