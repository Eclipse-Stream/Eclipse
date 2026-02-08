import '@testing-library/jest-dom';
import { vi, beforeEach } from 'vitest';

// ============================================================================
// Initialize i18n for tests (Story 10.4)
// ============================================================================
import '../i18n';

// ============================================================================
// Mock Electron modules (for infrastructure code that imports electron directly)
// ============================================================================

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: vi.fn().mockReturnValue('C:\\Users\\TestUser\\AppData\\Roaming'),
    getAppPath: vi.fn().mockReturnValue('C:\\TestApp'),
  },
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
  },
  ipcRenderer: {
    invoke: vi.fn(),
    on: vi.fn(),
  },
  BrowserWindow: vi.fn(),
  dialog: {
    showOpenDialog: vi.fn(),
    showSaveDialog: vi.fn(),
  },
  shell: {
    openExternal: vi.fn(),
  },
  safeStorage: {
    isEncryptionAvailable: vi.fn().mockReturnValue(true),
    encryptString: vi.fn().mockReturnValue(Buffer.from('encrypted')),
    decryptString: vi.fn().mockReturnValue('decrypted'),
  },
}));

// ============================================================================
// Mock window.electronAPI - Comprehensive mocks for all IPC functions
// ============================================================================

const mockElectronAPI = {
  ping: vi.fn().mockResolvedValue('pong'),
  getAppVersion: vi.fn().mockResolvedValue('1.0.0'),
  windowMinimize: vi.fn().mockResolvedValue(undefined),
  windowClose: vi.fn().mockResolvedValue(undefined),

  // Sunshine controls (Story 2.1, 2.2, 2.5)
  sunshine: {
    getStatus: vi.fn().mockResolvedValue('ONLINE'),
    start: vi.fn().mockResolvedValue({ success: true }),
    stop: vi.fn().mockResolvedValue({ success: true }),
    restart: vi.fn().mockResolvedValue({ success: true }),
    updateCredentials: vi.fn().mockResolvedValue({ success: true }),
    testCredentials: vi.fn().mockResolvedValue({ success: true }),
    changeCredentials: vi.fn().mockResolvedValue({ success: true }),
  },

  // Credential Storage (Story 2.4)
  storage: {
    save: vi.fn().mockResolvedValue({ success: true }),
    load: vi.fn().mockResolvedValue({ success: true, data: null }),
    delete: vi.fn().mockResolvedValue({ success: true }),
    isAvailable: vi.fn().mockResolvedValue(true),
  },

  // Virtual Display Driver (Story 3.1 & 3.2)
  vdd: {
    enable: vi.fn().mockResolvedValue({ success: true }),
    disable: vi.fn().mockResolvedValue({ success: true }),
    getStatus: vi.fn().mockResolvedValue({ isEnabled: false, deviceId: null }),
    setResolution: vi.fn().mockResolvedValue({ success: true }),
    setHDR: vi.fn().mockResolvedValue({ success: true }),
    getDeviceGUID: vi.fn().mockResolvedValue('{12345678-1234-1234-1234-123456789abc}'),
    getCurrentSettings: vi.fn().mockResolvedValue({ resolution: { width: 1920, height: 1080 }, refreshRate: 60 }),
    updateConfig: vi.fn().mockResolvedValue({ success: true }),
    refreshDeviceId: vi.fn().mockResolvedValue('{12345678-1234-1234-1234-123456789abc}'),
  },

  // Sunshine Config (Story 3.4)
  sunshineConfig: {
    configureWithVDD: vi.fn().mockResolvedValue({ success: true }),
    readConfig: vi.fn().mockResolvedValue({}),
    restore: vi.fn().mockResolvedValue({ success: true }),
  },

  // Display Management (Story 3.2)
  display: {
    getPhysicalDisplays: vi.fn().mockResolvedValue([]),
  },

  // Audio Management (Story 5.3)
  audio: {
    getDevices: vi.fn().mockResolvedValue({ success: true, devices: [] }),
    getSinks: vi.fn().mockResolvedValue({ success: true, devices: [] }),
  },

  // Sunshine Preset (Story 5.4 & 5.5)
  sunshinePreset: {
    detectConfig: vi.fn().mockResolvedValue({ success: true, config: {} }),
    apply: vi.fn().mockResolvedValue({ success: true }),
    writeConfig: vi.fn().mockResolvedValue({ success: true }),
    findMatchingPreset: vi.fn().mockResolvedValue({ success: true, presetIds: [], presetId: null }),
  },

  // Shell (Story 5.6)
  shell: {
    openExternal: vi.fn().mockResolvedValue(undefined),
  },

  // Sunshine Apps Repository (Story 7.1)
  sunshineApps: {
    getPath: vi.fn().mockResolvedValue('/path/to/apps.json'),
    read: vi.fn().mockResolvedValue({ apps: [] }),
    add: vi.fn().mockResolvedValue({ success: true }),
    update: vi.fn().mockResolvedValue({ success: true }),
    delete: vi.fn().mockResolvedValue({ success: true }),
    backup: vi.fn().mockResolvedValue({ success: true }),
    restore: vi.fn().mockResolvedValue({ success: true }),
  },

  // Dialog & File utilities (Story 7.4 & 7.7)
  dialog: {
    selectExe: vi.fn().mockResolvedValue({ success: true, canceled: true }),
    selectImage: vi.fn().mockResolvedValue({ success: true, canceled: true }),
    extractIcon: vi.fn().mockResolvedValue({ success: true, iconBase64: '' }),
  },

  // System utilities (Story 7.7)
  system: {
    openExternal: vi.fn().mockResolvedValue(undefined),
  },

  // Eclipse Scripts (Story 7.9)
  scripts: {
    getPaths: vi.fn().mockResolvedValue({ doScript: 'eclipse-do.ps1', undoScript: 'eclipse-undo.ps1' }),
    generatePrepCmd: vi.fn().mockResolvedValue([]),
    exist: vi.fn().mockResolvedValue(true),
    ensure: vi.fn().mockResolvedValue({ success: true }),
    exportPresets: vi.fn().mockResolvedValue({ success: true }),
    updateConfig: vi.fn().mockResolvedValue({ success: true }),
    exportSunshineConfig: vi.fn().mockResolvedValue({ success: true }),
    exportActivePreset: vi.fn().mockResolvedValue({ success: true }),
  },

  // Moonlight Clients / Pairing (Epic 6)
  clients: {
    list: vi.fn().mockResolvedValue({ success: true, clients: [] }),
    pair: vi.fn().mockResolvedValue({ success: true }),
    unpair: vi.fn().mockResolvedValue({ success: true }),
    getServerName: vi.fn().mockResolvedValue('Test PC'),
    setServerName: vi.fn().mockResolvedValue({ success: true }),
  },

  // Eclipse Recovery (stream cleanup)
  recovery: {
    checkAndCleanup: vi.fn().mockResolvedValue({ success: true, recovered: false }),
  },

  // Autostart (Story 9.7)
  autostart: {
    isEnabled: vi.fn().mockResolvedValue(false),
    enable: vi.fn().mockResolvedValue(undefined),
    disable: vi.fn().mockResolvedValue(undefined),
    toggle: vi.fn().mockResolvedValue(true),
  },
};

// Set up the global mock
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
  configurable: true,
});

// Export for tests that need to customize mocks
export { mockElectronAPI };

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});
