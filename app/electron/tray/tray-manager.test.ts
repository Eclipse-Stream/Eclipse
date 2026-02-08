import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

// Create mock tray instance at module level
const mockTrayInstance = {
  setToolTip: vi.fn(),
  setImage: vi.fn(),
  setContextMenu: vi.fn(),
  on: vi.fn(),
  destroy: vi.fn(),
};

// Create mock TrayPanelWindow at module level (Story 9.2)
const mockTrayPanelWindow = {
  create: vi.fn().mockReturnValue({}),
  show: vi.fn(),
  hide: vi.fn(),
  toggle: vi.fn(),
  destroy: vi.fn(),
  getIsVisible: vi.fn().mockReturnValue(false),
  getWindow: vi.fn().mockReturnValue(null),
};

// Mock TrayPanelWindow (Story 9.2)
vi.mock('./tray-panel-window', () => {
  // Return a constructor function that creates the mock instance
  const TrayPanelWindowClass = function() {
    return mockTrayPanelWindow;
  };
  return {
    TrayPanelWindow: TrayPanelWindowClass,
  };
});

// Mock Menu for context menu (Story 9.4)
const mockMenu = {
  popup: vi.fn(),
};

// Mock Electron APIs
vi.mock('electron', () => {
  // Create a class that can be called with 'new'
  const TrayClass = vi.fn().mockImplementation(function() {
    return mockTrayInstance;
  });

  return {
    Tray: TrayClass,
    nativeImage: {
      createFromPath: vi.fn().mockReturnValue({
        isEmpty: () => true,
      }),
      createFromBuffer: vi.fn().mockReturnValue({
        isEmpty: () => false,
      }),
    },
    BrowserWindow: vi.fn(),
    app: {
      isPackaged: false,
      on: vi.fn(),
      getAppPath: vi.fn().mockReturnValue('/mock/app/path'),
      quit: vi.fn(),
      relaunch: vi.fn(),
    },
    Menu: {
      buildFromTemplate: vi.fn().mockReturnValue({
        popup: vi.fn(),
      }),
    },
  };
});

vi.mock('node:path', () => ({
  default: {
    join: (...args: string[]) => args.join('/'),
  },
}));

import { TrayManager } from './tray-manager';
import { Tray, BrowserWindow, app } from 'electron';

/**
 * Unit tests for TrayManager (Story 9.1)
 *
 * Tests verify class structure, state management, and method behavior.
 * Electron APIs are mocked since tests run outside of Electron context.
 */
describe('TrayManager', () => {
  let trayManager: TrayManager;
  let mockMainWindow: BrowserWindow;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock tray instance methods
    mockTrayInstance.setToolTip.mockClear();
    mockTrayInstance.setImage.mockClear();
    mockTrayInstance.setContextMenu.mockClear();
    mockTrayInstance.on.mockClear();
    mockTrayInstance.destroy.mockClear();

    // Reset mock tray panel window methods (Story 9.2)
    mockTrayPanelWindow.create.mockClear();
    mockTrayPanelWindow.show.mockClear();
    mockTrayPanelWindow.hide.mockClear();
    mockTrayPanelWindow.toggle.mockClear();
    mockTrayPanelWindow.destroy.mockClear();

    // Create mock BrowserWindow
    mockMainWindow = {
      show: vi.fn(),
      hide: vi.fn(),
      focus: vi.fn(),
      setSkipTaskbar: vi.fn(),
      on: vi.fn(),
    } as unknown as BrowserWindow;

    trayManager = new TrayManager(mockMainWindow);
  });

  describe('Class Structure', () => {
    it('should instantiate TrayManager', () => {
      expect(trayManager).toBeInstanceOf(TrayManager);
    });

    it('should have init method', () => {
      expect(typeof trayManager.init).toBe('function');
    });

    it('should have setState method', () => {
      expect(typeof trayManager.setState).toBe('function');
    });

    it('should have getState method', () => {
      expect(typeof trayManager.getState).toBe('function');
    });

    it('should have setStreamingState method (legacy)', () => {
      expect(typeof trayManager.setStreamingState).toBe('function');
    });

    it('should have getStreamingState method (legacy)', () => {
      expect(typeof trayManager.getStreamingState).toBe('function');
    });

    it('should have showWindow method', () => {
      expect(typeof trayManager.showWindow).toBe('function');
    });

    it('should have hideWindow method', () => {
      expect(typeof trayManager.hideWindow).toBe('function');
    });

    it('should have destroy method', () => {
      expect(typeof trayManager.destroy).toBe('function');
    });
  });

  describe('Initialization (AC1)', () => {
    it('should create Tray on init', () => {
      trayManager.init();

      expect(Tray).toHaveBeenCalled();
    });

    it('should set default tooltip to "Eclipse V2 - Locked"', () => {
      trayManager.init();

      expect(mockTrayInstance.setToolTip).toHaveBeenCalledWith('Eclipse V2 - Locked');
    });

    it('should create TrayPanelWindow on init (Story 9.2)', () => {
      trayManager.init();

      expect(mockTrayPanelWindow.create).toHaveBeenCalled();
    });

    it('should register click handler for panel toggle (Story 9.2)', () => {
      trayManager.init();

      expect(mockTrayInstance.on).toHaveBeenCalledWith('click', expect.any(Function));
    });

    // Note: Double-click handler removed - users open main window via panel settings button

    it('should register close handler on mainWindow', () => {
      trayManager.init();

      expect(mockMainWindow.on).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('should register before-quit handler on app', () => {
      trayManager.init();

      expect(app.on).toHaveBeenCalledWith('before-quit', expect.any(Function));
    });
  });

  describe('Tray State (AC2, AC3)', () => {
    beforeEach(() => {
      trayManager.init();
    });

    it('should start with locked state', () => {
      expect(trayManager.getState()).toBe('locked');
    });

    it('should update state to playing', () => {
      trayManager.setState('playing');

      expect(trayManager.getState()).toBe('playing');
    });

    it('should update state to pausing', () => {
      trayManager.setState('pausing');

      expect(trayManager.getState()).toBe('pausing');
    });

    it('should update state back to locked', () => {
      trayManager.setState('playing');
      trayManager.setState('locked');

      expect(trayManager.getState()).toBe('locked');
    });

    it('should update tooltip when state changes to playing', () => {
      trayManager.setState('playing');

      expect(mockTrayInstance.setToolTip).toHaveBeenCalledWith('Eclipse V2 - Playing');
    });

    it('should update tooltip when state changes to pausing', () => {
      trayManager.setState('pausing');

      expect(mockTrayInstance.setToolTip).toHaveBeenCalledWith('Eclipse V2 - Pausing');
    });

    it('should update tooltip when state changes to locked', () => {
      trayManager.setState('playing');
      trayManager.setState('locked');

      expect(mockTrayInstance.setToolTip).toHaveBeenLastCalledWith('Eclipse V2 - Locked');
    });

    it('should update tray image when state changes', () => {
      trayManager.setState('playing');

      expect(mockTrayInstance.setImage).toHaveBeenCalled();
    });
  });

  describe('Legacy Streaming State', () => {
    beforeEach(() => {
      trayManager.init();
    });

    it('should map setStreamingState(true) to playing state', () => {
      trayManager.setStreamingState(true);

      expect(trayManager.getState()).toBe('playing');
      expect(trayManager.getStreamingState()).toBe(true);
    });

    it('should map setStreamingState(false) to pausing state', () => {
      trayManager.setStreamingState(false);

      expect(trayManager.getState()).toBe('pausing');
      expect(trayManager.getStreamingState()).toBe(false);
    });

    it('should return true for getStreamingState when playing', () => {
      trayManager.setState('playing');

      expect(trayManager.getStreamingState()).toBe(true);
    });

    it('should return false for getStreamingState when not playing', () => {
      trayManager.setState('pausing');
      expect(trayManager.getStreamingState()).toBe(false);

      trayManager.setState('locked');
      expect(trayManager.getStreamingState()).toBe(false);
    });
  });

  describe('Window Management (AC4, AC5)', () => {
    beforeEach(() => {
      trayManager.init();
    });

    it('showWindow should call mainWindow.show()', () => {
      trayManager.showWindow();

      expect(mockMainWindow.show).toHaveBeenCalled();
    });

    it('showWindow should call mainWindow.focus()', () => {
      trayManager.showWindow();

      expect(mockMainWindow.focus).toHaveBeenCalled();
    });

    it('showWindow should set skipTaskbar to false', () => {
      trayManager.showWindow();

      expect(mockMainWindow.setSkipTaskbar).toHaveBeenCalledWith(false);
    });

    it('hideWindow should call mainWindow.hide()', () => {
      trayManager.hideWindow();

      expect(mockMainWindow.hide).toHaveBeenCalled();
    });

    it('hideWindow should set skipTaskbar to true', () => {
      trayManager.hideWindow();

      expect(mockMainWindow.setSkipTaskbar).toHaveBeenCalledWith(true);
    });
  });

  describe('Quitting State', () => {
    beforeEach(() => {
      trayManager.init();
    });

    it('should start with quitting state false', () => {
      expect(trayManager.isAppQuitting()).toBe(false);
    });

    it('setQuitting should update quitting state', () => {
      trayManager.setQuitting(true);

      expect(trayManager.isAppQuitting()).toBe(true);
    });
  });

  describe('Destroy', () => {
    beforeEach(() => {
      trayManager.init();
    });

    it('should call tray.destroy() when destroying', () => {
      trayManager.destroy();

      expect(mockTrayInstance.destroy).toHaveBeenCalled();
    });

    it('should handle destroy when tray is null', () => {
      trayManager.destroy();
      // Calling destroy again should not throw
      expect(() => trayManager.destroy()).not.toThrow();
    });
  });

  describe('Minimize-to-Tray Behavior (AC4)', () => {
    let closeHandler: ((event: { preventDefault: () => void }) => void) | undefined;

    beforeEach(() => {
      (mockMainWindow.on as Mock).mockImplementation((event: string, handler: () => void) => {
        if (event === 'close') {
          closeHandler = handler;
        }
      });

      trayManager.init();
    });

    it('should intercept close event', () => {
      expect(closeHandler).toBeDefined();
    });

    it('should prevent default and hide window when not quitting', () => {
      const mockEvent = { preventDefault: vi.fn() };

      closeHandler?.(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockMainWindow.hide).toHaveBeenCalled();
    });

    it('should allow close when app is quitting', () => {
      const mockEvent = { preventDefault: vi.fn() };

      trayManager.setQuitting(true);
      closeHandler?.(mockEvent);

      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    });
  });

  // Note: Double-click Restore (AC5) removed - users open main window via panel settings button

  // ============================================================================
  // Story 9.2: Tray Panel Integration
  // ============================================================================
  describe('Tray Panel Integration (Story 9.2)', () => {
    let clickHandler: ((_event: unknown, bounds: { x: number; y: number; width: number; height: number }) => void) | undefined;

    beforeEach(() => {
      (mockTrayInstance.on as Mock).mockImplementation((event: string, handler: () => void) => {
        if (event === 'click') {
          clickHandler = handler;
        }
      });

      trayManager.init();
    });

    it('should toggle panel on tray click', () => {
      const mockBounds = { x: 100, y: 100, width: 24, height: 24 };
      clickHandler?.({}, mockBounds);

      expect(mockTrayPanelWindow.toggle).toHaveBeenCalledWith(mockBounds);
    });

    it('should have getTrayPanel method', () => {
      expect(typeof trayManager.getTrayPanel).toBe('function');
    });

    it('should return TrayPanelWindow from getTrayPanel', () => {
      const panel = trayManager.getTrayPanel();

      expect(panel).toBe(mockTrayPanelWindow);
    });

    it('should have hideTrayPanel method', () => {
      expect(typeof trayManager.hideTrayPanel).toBe('function');
    });

    it('should call panel.hide() from hideTrayPanel', () => {
      trayManager.hideTrayPanel();

      expect(mockTrayPanelWindow.hide).toHaveBeenCalled();
    });

    it('should destroy panel when TrayManager is destroyed', () => {
      trayManager.destroy();

      expect(mockTrayPanelWindow.destroy).toHaveBeenCalled();
    });
  });
});
