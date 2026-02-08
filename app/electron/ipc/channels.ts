// IPC Channel definitions - Type-safe communication between main and renderer

export const IPC_CHANNELS = {
  // System
  PING: 'ipc:ping',
  GET_APP_VERSION: 'ipc:get-app-version',
  // Window controls (Story 1.2)
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_CLOSE: 'window:close',
  // Sunshine (Story 2.1)
  SUNSHINE_GET_STATUS: 'sunshine:get-status',
  // Sunshine Service Control (Story 2.2)
  SUNSHINE_START: 'sunshine:start',
  SUNSHINE_STOP: 'sunshine:stop',
  SUNSHINE_RESTART: 'sunshine:restart',
  // Credential Storage (Story 2.4)
  STORAGE_SAVE_CREDENTIALS: 'storage:save-credentials',
  STORAGE_LOAD_CREDENTIALS: 'storage:load-credentials',
  STORAGE_DELETE_CREDENTIALS: 'storage:delete-credentials',
  STORAGE_IS_AVAILABLE: 'storage:is-available',
  // Sunshine Credentials Update (Story 2.5)
  SUNSHINE_UPDATE_CREDENTIALS: 'sunshine:update-credentials',
  SUNSHINE_TEST_CREDENTIALS: 'sunshine:test-credentials',
  SUNSHINE_CHANGE_CREDENTIALS: 'sunshine:change-credentials',
  SUNSHINE_SET_INITIAL_CREDENTIALS: 'sunshine:set-initial-credentials',
  SUNSHINE_COMPLETE_SETUP: 'sunshine:complete-setup', // Epic 11: Complete first-time setup after credentials
  // Virtual Display Driver (Story 3.1)
  VDD_ENABLE: 'vdd:enable',
  VDD_DISABLE: 'vdd:disable',
  VDD_GET_STATUS: 'vdd:get-status',
  VDD_SET_RESOLUTION: 'vdd:set-resolution',
  VDD_SET_HDR: 'vdd:set-hdr',
  VDD_GET_DEVICE_GUID: 'vdd:get-device-guid',
  VDD_GET_CURRENT_SETTINGS: 'vdd:get-current-settings',
  VDD_UPDATE_CONFIG: 'vdd:update-config',
  VDD_REFRESH_DEVICE_ID: 'vdd:refresh-device-id',
  // Sunshine Config (Story 3.4)
  SUNSHINE_CONFIG_WITH_VDD: 'sunshine-config:configure-with-vdd',
  SUNSHINE_CONFIG_READ: 'sunshine-config:read',
  SUNSHINE_CONFIG_RESTORE: 'sunshine-config:restore',
  // Display Management (Story 3.2)
  DISPLAY_GET_PHYSICAL: 'display:get-physical',
  // Audio Management (Story 5.3)
  AUDIO_GET_DEVICES: 'audio:get-devices',
  AUDIO_GET_SINKS: 'audio:get-sinks',
  // Sunshine Preset (Story 5.4 & 5.5)
  SUNSHINE_PRESET_DETECT_CONFIG: 'sunshine-preset:detect-config',
  SUNSHINE_PRESET_APPLY: 'sunshine-preset:apply',
  SUNSHINE_PRESET_WRITE_CONFIG: 'sunshine-preset:write-config',
  SUNSHINE_PRESET_FIND_MATCHING: 'sunshine-preset:find-matching',
  // Shell (Fix: openExternal)
  SHELL_OPEN_EXTERNAL: 'shell:open-external',
  // Sunshine Apps Repository (Story 7.1)
  SUNSHINE_APPS_GET_PATH: 'sunshine-apps:get-path',
  SUNSHINE_APPS_READ: 'sunshine-apps:read',
  SUNSHINE_APPS_ADD: 'sunshine-apps:add',
  SUNSHINE_APPS_UPDATE: 'sunshine-apps:update',
  SUNSHINE_APPS_DELETE: 'sunshine-apps:delete',
  SUNSHINE_APPS_BACKUP: 'sunshine-apps:backup',
  SUNSHINE_APPS_RESTORE: 'sunshine-apps:restore',
  // Dialog & File utilities (Story 7.4 & 7.7)
  DIALOG_SELECT_EXE: 'dialog:select-exe',
  DIALOG_SELECT_IMAGE: 'dialog:select-image',
  FILE_EXTRACT_ICON: 'file:extract-icon',
  // Moonlight Clients / Pairing (Epic 6)
  CLIENTS_LIST: 'clients:list',
  CLIENTS_PAIR: 'clients:pair',
  CLIENTS_UNPAIR: 'clients:unpair',
  SERVER_GET_NAME: 'server:get-name',
  SERVER_SET_NAME: 'server:set-name',
  // Eclipse Scripts (Story 7.9)
  SCRIPTS_GET_PATHS: 'scripts:get-paths',
  SCRIPTS_GENERATE_PREP_CMD: 'scripts:generate-prep-cmd',
  SCRIPTS_EXIST: 'scripts:exist',
  SCRIPTS_ENSURE: 'scripts:ensure',
  SCRIPTS_EXPORT_PRESETS: 'scripts:export-presets',
  SCRIPTS_UPDATE_CONFIG: 'scripts:update-config',
  SCRIPTS_EXPORT_SUNSHINE_CONFIG: 'scripts:export-sunshine-config',
  SCRIPTS_EXPORT_ACTIVE_PRESET: 'scripts:export-active-preset',
  // Eclipse Recovery (stream cleanup)
  RECOVERY_CHECK_AND_CLEANUP: 'recovery:check-and-cleanup',
  // System Tray (Story 9.1)
  TRAY_SET_STATE: 'tray:set-state',
  TRAY_GET_STATE: 'tray:get-state',
  TRAY_SET_STREAMING_STATE: 'tray:set-streaming-state', // Legacy
  TRAY_GET_STREAMING_STATE: 'tray:get-streaming-state', // Legacy
  TRAY_SHOW_WINDOW: 'tray:show-window',
  // Tray Panel (Story 9.2 & 9.3)
  TRAY_PANEL_CLOSE: 'tray-panel:close',
  TRAY_PANEL_OPEN_MAIN_WINDOW: 'tray-panel:open-main-window',
  TRAY_PANEL_SET_HEIGHT: 'tray-panel:set-height',
  // Tray Language (Story 10.5)
  TRAY_SET_LANGUAGE: 'tray:set-language',
  // Autostart (Story 9.7)
  AUTOSTART_IS_ENABLED: 'autostart:is-enabled',
  AUTOSTART_ENABLE: 'autostart:enable',
  AUTOSTART_DISABLE: 'autostart:disable',
  AUTOSTART_TOGGLE: 'autostart:toggle',
  // Sunshine Health (Story 10.2)
  SUNSHINE_CHECK_HEALTH: 'sunshine:check-health',
  SUNSHINE_REINSTALL: 'sunshine:reinstall',
  // Epic 11: Check if Sunshine has credentials configured (reinstall with AppData)
  SUNSHINE_HAS_CREDENTIALS_CONFIGURED: 'sunshine:has-credentials-configured',
  // Config Reset (Story 10.3)
  CONFIG_RESET: 'config:reset',
  // System Info (Onboarding)
  SYSTEM_GET_HOSTNAME: 'system:get-hostname',
  // Network Diagnostics (Story 12.6)
  SYSTEM_GET_LOCAL_IP: 'system:get-local-ip',
  SYSTEM_CHECK_FIREWALL: 'system:check-firewall',
  SYSTEM_RECREATE_FIREWALL: 'system:recreate-firewall',
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]

// Type definitions for IPC handlers
// Service operation result type
export interface ServiceOperationResult {
  success: boolean;
  error?: string;
}

// VDD operation result
export interface VDDOperationResult {
  success: boolean;
  error?: string;
}

// VDD resolution params
export interface VDDResolutionParams {
  width: number;
  height: number;
  refreshRate: 30 | 60 | 90 | 120 | 144 | 165 | 244;
}

// VDD current display settings
export interface VDDCurrentSettings {
  resolution: { width: number; height: number };
  refreshRate: 30 | 60 | 90 | 120 | 144 | 165 | 244;
}

// Sunshine Config result (Story 3.4)
export interface SunshineConfigResult {
  success: boolean;
  error?: string;
}

// Audio device (Story 5.3)
export interface AudioDevice {
  id: string;
  name: string;
  type: 'sink' | 'source';
}

// Audio devices result (Story 5.3)
export interface AudioDevicesResult {
  success: boolean;
  devices: AudioDevice[];
  error?: string;
}

// Sunshine Preset detected config (Story 5.4)
export interface SunshineDetectedConfig {
  success: boolean;
  config?: Record<string, string>;
  error?: string;
}

// Sunshine Preset apply result (Story 5.5)
export interface SunshinePresetApplyResult {
  success: boolean;
  error?: string;
  phase?: 'flush' | 'apply' | 'write' | 'restart';
}

// Sunshine Preset find matching result
export interface SunshineFindMatchingResult {
  success: boolean;
  /** IDs des presets correspondants (peut être vide si aucun ne correspond) */
  presetIds: string[];
  /** @deprecated Utiliser presetIds - Premier preset correspondant pour compatibilité */
  presetId: string | null;
  error?: string;
}

// Sunshine Apps types (Story 7.1) - Re-export from domain to avoid duplication
import type {
  SunshineApp as _SunshineApp,
  PrepCommand as _PrepCommand,
  SunshineAppsFile as _SunshineAppsFile,
  RepositoryResult as _SunshineAppsResult,
  MoonlightClient as _MoonlightClient,
  ClientsListResult as _ClientsListResult,
  PairingResult as _PairingResult,
  ClientOperationResult as _ClientOperationResult,
} from '../../src/domain/types'

// Re-export for external consumers
export type SunshineApp = _SunshineApp
export type PrepCommand = _PrepCommand
export type SunshineAppsFile = _SunshineAppsFile
export type SunshineAppsResult = _SunshineAppsResult
// Moonlight Client types (Epic 6)
export type MoonlightClient = _MoonlightClient
export type ClientsListResult = _ClientsListResult
export type PairingResult = _PairingResult
export type ClientOperationResult = _ClientOperationResult

export interface IpcHandlers {
  [IPC_CHANNELS.PING]: () => Promise<string>
  [IPC_CHANNELS.GET_APP_VERSION]: () => Promise<string>
  [IPC_CHANNELS.WINDOW_MINIMIZE]: () => Promise<void>
  [IPC_CHANNELS.WINDOW_CLOSE]: () => Promise<void>
  [IPC_CHANNELS.SUNSHINE_GET_STATUS]: () => Promise<string>
  [IPC_CHANNELS.SUNSHINE_START]: () => Promise<ServiceOperationResult>
  [IPC_CHANNELS.SUNSHINE_STOP]: () => Promise<ServiceOperationResult>
  [IPC_CHANNELS.SUNSHINE_RESTART]: () => Promise<ServiceOperationResult>
  [IPC_CHANNELS.VDD_ENABLE]: () => Promise<VDDOperationResult>
  [IPC_CHANNELS.VDD_DISABLE]: () => Promise<VDDOperationResult>
  [IPC_CHANNELS.VDD_GET_STATUS]: () => Promise<string>
  [IPC_CHANNELS.VDD_SET_RESOLUTION]: (params: VDDResolutionParams) => Promise<VDDOperationResult>
  [IPC_CHANNELS.VDD_SET_HDR]: (enabled: boolean) => Promise<VDDOperationResult>
  [IPC_CHANNELS.VDD_GET_DEVICE_GUID]: () => Promise<string | null>
  [IPC_CHANNELS.VDD_GET_CURRENT_SETTINGS]: () => Promise<VDDCurrentSettings | null>
  [IPC_CHANNELS.VDD_UPDATE_CONFIG]: (params: VDDResolutionParams) => Promise<VDDOperationResult>
  // Sunshine Config (Story 3.4)
  [IPC_CHANNELS.SUNSHINE_CONFIG_WITH_VDD]: () => Promise<SunshineConfigResult>
  [IPC_CHANNELS.SUNSHINE_CONFIG_READ]: () => Promise<Record<string, string>>
  [IPC_CHANNELS.SUNSHINE_CONFIG_RESTORE]: () => Promise<SunshineConfigResult>
  // Sunshine Apps Repository (Story 7.1)
  [IPC_CHANNELS.SUNSHINE_APPS_GET_PATH]: () => Promise<string | null>
  [IPC_CHANNELS.SUNSHINE_APPS_READ]: () => Promise<SunshineAppsFile>
  [IPC_CHANNELS.SUNSHINE_APPS_ADD]: (app: SunshineApp) => Promise<SunshineAppsResult>
  [IPC_CHANNELS.SUNSHINE_APPS_UPDATE]: (name: string, updates: Partial<SunshineApp>) => Promise<SunshineAppsResult>
  [IPC_CHANNELS.SUNSHINE_APPS_DELETE]: (name: string) => Promise<SunshineAppsResult>
  [IPC_CHANNELS.SUNSHINE_APPS_BACKUP]: () => Promise<SunshineAppsResult>
  [IPC_CHANNELS.SUNSHINE_APPS_RESTORE]: () => Promise<SunshineAppsResult>
  // Dialog & File utilities (Story 7.4 & 7.7)
  [IPC_CHANNELS.DIALOG_SELECT_EXE]: () => Promise<DialogSelectExeResult>
  [IPC_CHANNELS.DIALOG_SELECT_IMAGE]: () => Promise<DialogSelectImageResult>
  [IPC_CHANNELS.FILE_EXTRACT_ICON]: (exePath: string) => Promise<FileExtractIconResult>
  // Moonlight Clients / Pairing (Epic 6)
  [IPC_CHANNELS.CLIENTS_LIST]: () => Promise<ClientsListResult>
  [IPC_CHANNELS.CLIENTS_PAIR]: (data: { pin: string; deviceName: string }) => Promise<PairingResult>
  [IPC_CHANNELS.CLIENTS_UNPAIR]: (uuid: string) => Promise<ClientOperationResult>
  [IPC_CHANNELS.SERVER_GET_NAME]: () => Promise<string>
  [IPC_CHANNELS.SERVER_SET_NAME]: (name: string) => Promise<ClientOperationResult>
  // System Tray (Story 9.1)
  [IPC_CHANNELS.TRAY_SET_STATE]: (state: TrayState) => Promise<TrayOperationResult>
  [IPC_CHANNELS.TRAY_GET_STATE]: () => Promise<TrayStateResult>
  [IPC_CHANNELS.TRAY_SET_STREAMING_STATE]: (isStreaming: boolean) => Promise<TrayOperationResult>
  [IPC_CHANNELS.TRAY_GET_STREAMING_STATE]: () => Promise<TrayStreamingStateResult>
  [IPC_CHANNELS.TRAY_SHOW_WINDOW]: () => Promise<TrayOperationResult>
  // Tray Panel (Story 9.2 & 9.3)
  [IPC_CHANNELS.TRAY_PANEL_CLOSE]: () => Promise<TrayOperationResult>
  [IPC_CHANNELS.TRAY_PANEL_OPEN_MAIN_WINDOW]: () => Promise<TrayOperationResult>
  [IPC_CHANNELS.TRAY_PANEL_SET_HEIGHT]: (height: number) => Promise<TrayOperationResult>
  // Tray Language (Story 10.5)
  [IPC_CHANNELS.TRAY_SET_LANGUAGE]: (lang: 'fr' | 'en') => Promise<TrayOperationResult>
  // Autostart (Story 9.7)
  [IPC_CHANNELS.AUTOSTART_IS_ENABLED]: () => Promise<boolean>
  [IPC_CHANNELS.AUTOSTART_ENABLE]: () => Promise<void>
  [IPC_CHANNELS.AUTOSTART_DISABLE]: () => Promise<void>
  [IPC_CHANNELS.AUTOSTART_TOGGLE]: () => Promise<boolean>
  // Network Diagnostics (Story 12.6)
  [IPC_CHANNELS.SYSTEM_GET_LOCAL_IP]: () => Promise<string | null>
  [IPC_CHANNELS.SYSTEM_CHECK_FIREWALL]: () => Promise<FirewallCheckResult>
  [IPC_CHANNELS.SYSTEM_RECREATE_FIREWALL]: () => Promise<FirewallRecreateResult>
}

// Dialog select exe result (Story 7.4)
export interface DialogSelectExeResult {
  success: boolean;
  canceled?: boolean;
  path?: string;
  error?: string;
}

// Dialog select image result (Story 7.7)
export interface DialogSelectImageResult {
  success: boolean;
  canceled?: boolean;
  imageBase64?: string;
  error?: string;
}

// File extract icon result (Story 7.4)
export interface FileExtractIconResult {
  success: boolean;
  iconBase64?: string;
  error?: string;
}

// Tray types (Story 9.1)
export type TrayState = 'playing' | 'pausing' | 'locked';

export interface TrayOperationResult {
  success: boolean;
  error?: string;
}

export interface TrayStateResult {
  success: boolean;
  state: TrayState;
  error?: string;
}

export interface TrayStreamingStateResult {
  success: boolean;
  isStreaming: boolean;
  error?: string;
}

// Sunshine Health types (Story 10.2)
export type SunshineHealthStatus = 'HEALTHY' | 'MISSING' | 'CORRUPTED';

export interface SunshineHealthCheckResult {
  status: SunshineHealthStatus;
  missingFiles?: string[];
  sunshinePath?: string;
}

export interface SunshineReinstallResult {
  success: boolean;
  error?: string;
}

// Config Reset types (Story 10.3)
export interface ConfigResetResult {
  success: boolean;
  error?: string;
}

// Network Diagnostics types (Story 12.6)
export interface FirewallCheckResult {
  ruleExists: boolean;
  error?: string;
}

export interface FirewallRecreateResult {
  success: boolean;
  error?: string;
}
