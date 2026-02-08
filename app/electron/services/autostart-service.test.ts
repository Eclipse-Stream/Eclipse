// AutostartService tests - Story 9.7
// Tests for Windows auto-start functionality

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Electron app module
const mockGetLoginItemSettings = vi.fn();
const mockSetLoginItemSettings = vi.fn();

vi.mock('electron', () => ({
  app: {
    getLoginItemSettings: () => mockGetLoginItemSettings(),
    setLoginItemSettings: (settings: unknown) => mockSetLoginItemSettings(settings),
  },
}));

// Import after mock
import { AutostartService } from './autostart-service';

describe('AutostartService', () => {
  let service: AutostartService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AutostartService();
  });

  describe('isEnabled', () => {
    it('should return true when openAtLogin is true', () => {
      mockGetLoginItemSettings.mockReturnValue({ openAtLogin: true });

      expect(service.isEnabled()).toBe(true);
    });

    it('should return false when openAtLogin is false', () => {
      mockGetLoginItemSettings.mockReturnValue({ openAtLogin: false });

      expect(service.isEnabled()).toBe(false);
    });

    it('should return false when settings are empty', () => {
      mockGetLoginItemSettings.mockReturnValue({});

      expect(service.isEnabled()).toBe(false);
    });
  });

  describe('enable', () => {
    it('should call setLoginItemSettings with correct options', () => {
      service.enable();

      expect(mockSetLoginItemSettings).toHaveBeenCalledWith({
        openAtLogin: true,
        openAsHidden: true,
        args: ['--hidden'],
      });
    });

    it('should set openAsHidden to true for minimized start', () => {
      service.enable();

      const callArg = mockSetLoginItemSettings.mock.calls[0][0];
      expect(callArg.openAsHidden).toBe(true);
    });

    it('should include --hidden flag in args', () => {
      service.enable();

      const callArg = mockSetLoginItemSettings.mock.calls[0][0];
      expect(callArg.args).toContain('--hidden');
    });
  });

  describe('disable', () => {
    it('should call setLoginItemSettings with openAtLogin false', () => {
      service.disable();

      expect(mockSetLoginItemSettings).toHaveBeenCalledWith({
        openAtLogin: false,
      });
    });
  });

  describe('toggle', () => {
    it('should disable when currently enabled and return false', () => {
      mockGetLoginItemSettings.mockReturnValue({ openAtLogin: true });

      const result = service.toggle();

      expect(mockSetLoginItemSettings).toHaveBeenCalledWith({
        openAtLogin: false,
      });
      expect(result).toBe(false);
    });

    it('should enable when currently disabled and return true', () => {
      mockGetLoginItemSettings.mockReturnValue({ openAtLogin: false });

      const result = service.toggle();

      expect(mockSetLoginItemSettings).toHaveBeenCalledWith({
        openAtLogin: true,
        openAsHidden: true,
        args: ['--hidden'],
      });
      expect(result).toBe(true);
    });
  });
});
