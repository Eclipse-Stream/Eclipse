// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from './ipc/channels'
import type { SunshineApp } from './ipc/channels'

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke(IPC_CHANNELS.PING),
  getAppVersion: () => ipcRenderer.invoke(IPC_CHANNELS.GET_APP_VERSION),
  // Window controls (Story 1.2)
  windowMinimize: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MINIMIZE),
  windowClose: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE),
  // Sunshine (Story 2.1 & 2.2 & 2.5 & 10.2)
  sunshine: {
    getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.SUNSHINE_GET_STATUS),
    start: () => ipcRenderer.invoke(IPC_CHANNELS.SUNSHINE_START),
    stop: () => ipcRenderer.invoke(IPC_CHANNELS.SUNSHINE_STOP),
    restart: () => ipcRenderer.invoke(IPC_CHANNELS.SUNSHINE_RESTART),
    updateCredentials: (credentials: { username: string; password: string }) =>
      ipcRenderer.invoke(IPC_CHANNELS.SUNSHINE_UPDATE_CREDENTIALS, credentials),
    testCredentials: (credentials: { username: string; password: string }) =>
      ipcRenderer.invoke(IPC_CHANNELS.SUNSHINE_TEST_CREDENTIALS, credentials),
    changeCredentials: (data: { currentUsername: string; currentPassword: string; newUsername: string; newPassword: string }) =>
      ipcRenderer.invoke(IPC_CHANNELS.SUNSHINE_CHANGE_CREDENTIALS, data),
    setInitialCredentials: (credentials: { username: string; password: string }) =>
      ipcRenderer.invoke(IPC_CHANNELS.SUNSHINE_SET_INITIAL_CREDENTIALS, credentials),
    // Epic 11: Complete setup after credentials
    completeSetup: () => ipcRenderer.invoke(IPC_CHANNELS.SUNSHINE_COMPLETE_SETUP),
    // Health check & Reinstall (Story 10.2)
    checkHealth: () => ipcRenderer.invoke(IPC_CHANNELS.SUNSHINE_CHECK_HEALTH),
    reinstall: () => ipcRenderer.invoke(IPC_CHANNELS.SUNSHINE_REINSTALL),
    // Epic 11: Check if Sunshine has credentials configured (reinstall with AppData)
    hasCredentialsConfigured: () => ipcRenderer.invoke(IPC_CHANNELS.SUNSHINE_HAS_CREDENTIALS_CONFIGURED),
  },
  // Credential Storage (Story 2.4)
  storage: {
    save: (key: string, value: string) => ipcRenderer.invoke(IPC_CHANNELS.STORAGE_SAVE_CREDENTIALS, { key, value }),
    load: (key: string) => ipcRenderer.invoke(IPC_CHANNELS.STORAGE_LOAD_CREDENTIALS, key),
    delete: (key: string) => ipcRenderer.invoke(IPC_CHANNELS.STORAGE_DELETE_CREDENTIALS, key),
    isAvailable: () => ipcRenderer.invoke(IPC_CHANNELS.STORAGE_IS_AVAILABLE),
  },
  // Virtual Display Driver (Story 3.1)
  vdd: {
    enable: () => ipcRenderer.invoke(IPC_CHANNELS.VDD_ENABLE),
    disable: () => ipcRenderer.invoke(IPC_CHANNELS.VDD_DISABLE),
    getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.VDD_GET_STATUS),
    setResolution: (params: { width: number; height: number; refreshRate: 30 | 60 | 90 | 120 | 144 | 165 | 244 }) =>
      ipcRenderer.invoke(IPC_CHANNELS.VDD_SET_RESOLUTION, params),
    setHDR: (enabled: boolean) => ipcRenderer.invoke(IPC_CHANNELS.VDD_SET_HDR, enabled),
    getDeviceGUID: () => ipcRenderer.invoke(IPC_CHANNELS.VDD_GET_DEVICE_GUID),
    getCurrentSettings: () => ipcRenderer.invoke(IPC_CHANNELS.VDD_GET_CURRENT_SETTINGS),
    updateConfig: (params: { width: number; height: number; refreshRate: 30 | 60 | 90 | 120 | 144 | 165 | 244 }) =>
      ipcRenderer.invoke(IPC_CHANNELS.VDD_UPDATE_CONFIG, params),
    refreshDeviceId: () => ipcRenderer.invoke(IPC_CHANNELS.VDD_REFRESH_DEVICE_ID),
  },
  // Sunshine Config (Story 3.4)
  sunshineConfig: {
    configureWithVDD: () => ipcRenderer.invoke(IPC_CHANNELS.SUNSHINE_CONFIG_WITH_VDD),
    readConfig: () => ipcRenderer.invoke(IPC_CHANNELS.SUNSHINE_CONFIG_READ),
    restore: () => ipcRenderer.invoke(IPC_CHANNELS.SUNSHINE_CONFIG_RESTORE),
  },
  // Display Management (Story 3.2)
  display: {
    getPhysicalDisplays: () => ipcRenderer.invoke(IPC_CHANNELS.DISPLAY_GET_PHYSICAL),
  },
  // Audio Management (Story 5.3)
  audio: {
    getDevices: () => ipcRenderer.invoke(IPC_CHANNELS.AUDIO_GET_DEVICES),
    getSinks: () => ipcRenderer.invoke(IPC_CHANNELS.AUDIO_GET_SINKS),
  },
  // Sunshine Preset (Story 5.4 & 5.5)
  sunshinePreset: {
    detectConfig: () => ipcRenderer.invoke(IPC_CHANNELS.SUNSHINE_PRESET_DETECT_CONFIG),
    apply: (payload: { preset: unknown; currentConfig?: Record<string, string> }) =>
      ipcRenderer.invoke(IPC_CHANNELS.SUNSHINE_PRESET_APPLY, payload),
    writeConfig: (payload: { config: Record<string, string>; restart?: boolean }) =>
      ipcRenderer.invoke(IPC_CHANNELS.SUNSHINE_PRESET_WRITE_CONFIG, payload),
    findMatchingPreset: (presets: unknown[]) =>
      ipcRenderer.invoke(IPC_CHANNELS.SUNSHINE_PRESET_FIND_MATCHING, presets),
  },
  // Shell (Fix: openExternal via IPC)
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke(IPC_CHANNELS.SHELL_OPEN_EXTERNAL, url),
  },
  // Sunshine Apps Repository (Story 7.1)
  sunshineApps: {
    getPath: () => ipcRenderer.invoke(IPC_CHANNELS.SUNSHINE_APPS_GET_PATH),
    read: () => ipcRenderer.invoke(IPC_CHANNELS.SUNSHINE_APPS_READ),
    add: (app: SunshineApp) => ipcRenderer.invoke(IPC_CHANNELS.SUNSHINE_APPS_ADD, app),
    update: (name: string, updates: Partial<SunshineApp>) =>
      ipcRenderer.invoke(IPC_CHANNELS.SUNSHINE_APPS_UPDATE, name, updates),
    delete: (name: string) => ipcRenderer.invoke(IPC_CHANNELS.SUNSHINE_APPS_DELETE, name),
    backup: () => ipcRenderer.invoke(IPC_CHANNELS.SUNSHINE_APPS_BACKUP),
    restore: () => ipcRenderer.invoke(IPC_CHANNELS.SUNSHINE_APPS_RESTORE),
  },
  // Dialog & File utilities (Story 7.4 & 7.7)
  dialog: {
    selectExe: () => ipcRenderer.invoke(IPC_CHANNELS.DIALOG_SELECT_EXE),
    selectImage: () => ipcRenderer.invoke(IPC_CHANNELS.DIALOG_SELECT_IMAGE),
    extractIcon: (exePath: string) => ipcRenderer.invoke(IPC_CHANNELS.FILE_EXTRACT_ICON, exePath),
  },
  // System utilities
  system: {
    openExternal: (url: string) => ipcRenderer.invoke(IPC_CHANNELS.SHELL_OPEN_EXTERNAL, url),
    getHostname: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_GET_HOSTNAME),
    // Network Diagnostics (Story 12.6)
    getLocalIP: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_GET_LOCAL_IP),
    checkFirewall: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_CHECK_FIREWALL),
    recreateFirewall: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_RECREATE_FIREWALL),
  },
  // Eclipse Scripts (Story 7.9)
  scripts: {
    getPaths: () => ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_GET_PATHS),
    generatePrepCmd: () => ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_GENERATE_PREP_CMD),
    exist: () => ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_EXIST),
    ensure: () => ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_ENSURE),
    exportPresets: (presets: unknown[]) => ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_EXPORT_PRESETS, presets),
    updateConfig: () => ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_UPDATE_CONFIG),
    exportSunshineConfig: (config: Record<string, string>) => ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_EXPORT_SUNSHINE_CONFIG, config),
    exportActivePreset: (activePresetId: string | null) => ipcRenderer.invoke(IPC_CHANNELS.SCRIPTS_EXPORT_ACTIVE_PRESET, activePresetId),
  },
  // Moonlight Clients / Pairing (Epic 6)
  clients: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.CLIENTS_LIST),
    pair: (pin: string, deviceName: string) => ipcRenderer.invoke(IPC_CHANNELS.CLIENTS_PAIR, { pin, deviceName }),
    unpair: (uuid: string) => ipcRenderer.invoke(IPC_CHANNELS.CLIENTS_UNPAIR, uuid),
    getServerName: () => ipcRenderer.invoke(IPC_CHANNELS.SERVER_GET_NAME),
    setServerName: (name: string) => ipcRenderer.invoke(IPC_CHANNELS.SERVER_SET_NAME, name),
  },
  // Eclipse Recovery (stream cleanup)
  recovery: {
    checkAndCleanup: () => ipcRenderer.invoke(IPC_CHANNELS.RECOVERY_CHECK_AND_CLEANUP),
  },
  // System Tray (Story 9.1 & 10.5)
  tray: {
    setState: (state: 'playing' | 'pausing' | 'locked') => ipcRenderer.invoke(IPC_CHANNELS.TRAY_SET_STATE, state),
    getState: () => ipcRenderer.invoke(IPC_CHANNELS.TRAY_GET_STATE),
    setStreamingState: (isStreaming: boolean) => ipcRenderer.invoke(IPC_CHANNELS.TRAY_SET_STREAMING_STATE, isStreaming), // Legacy
    getStreamingState: () => ipcRenderer.invoke(IPC_CHANNELS.TRAY_GET_STREAMING_STATE), // Legacy
    showWindow: () => ipcRenderer.invoke(IPC_CHANNELS.TRAY_SHOW_WINDOW),
    setLanguage: (lang: 'fr' | 'en') => ipcRenderer.invoke(IPC_CHANNELS.TRAY_SET_LANGUAGE, lang), // Story 10.5
  },
  // Tray Panel (Story 9.2 & 9.3)
  trayPanel: {
    close: () => ipcRenderer.invoke(IPC_CHANNELS.TRAY_PANEL_CLOSE),
    openMainWindow: () => ipcRenderer.invoke(IPC_CHANNELS.TRAY_PANEL_OPEN_MAIN_WINDOW),
    setHeight: (height: number) => ipcRenderer.invoke(IPC_CHANNELS.TRAY_PANEL_SET_HEIGHT, height),
  },
  // Autostart (Story 9.7)
  autostart: {
    isEnabled: () => ipcRenderer.invoke(IPC_CHANNELS.AUTOSTART_IS_ENABLED),
    enable: () => ipcRenderer.invoke(IPC_CHANNELS.AUTOSTART_ENABLE),
    disable: () => ipcRenderer.invoke(IPC_CHANNELS.AUTOSTART_DISABLE),
    toggle: () => ipcRenderer.invoke(IPC_CHANNELS.AUTOSTART_TOGGLE),
  },
  // Config Reset (Story 10.3)
  config: {
    reset: () => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_RESET),
  },
})
