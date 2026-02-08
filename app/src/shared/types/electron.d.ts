// Type definitions for the Electron API exposed via preload
import type { SunshineStatus, VDDStatus, PhysicalScreen } from '../../domain/types'

export interface ServiceOperationResult {
  success: boolean
  error?: string
}

export interface VDDOperationResult {
  success: boolean
  error?: string
}

export interface ElectronAPI {
  ping: () => Promise<string>
  getAppVersion: () => Promise<string>
  // Window controls (Story 1.2)
  windowMinimize: () => Promise<void>
  windowClose: () => Promise<void>
  // Sunshine controls (Story 2.1, 2.2, 2.5, 10.2)
  sunshine: {
    getStatus: () => Promise<SunshineStatus>
    start: () => Promise<ServiceOperationResult>
    stop: () => Promise<ServiceOperationResult>
    restart: () => Promise<ServiceOperationResult>
    updateCredentials: (credentials: { username: string; password: string }) => Promise<ServiceOperationResult>
    testCredentials: (credentials: { username: string; password: string }) => Promise<ServiceOperationResult>
    changeCredentials: (data: {
      currentUsername: string;
      currentPassword: string;
      newUsername: string;
      newPassword: string
    }) => Promise<ServiceOperationResult>
    /** Set initial credentials on Sunshine via CLI (first time setup) */
    setInitialCredentials: (credentials: { username: string; password: string }) => Promise<ServiceOperationResult>
    /** Epic 11: Complete Sunshine setup after credentials (creates app, applies preset, etc.) */
    completeSetup: () => Promise<ServiceOperationResult>
    // Health check & Reinstall (Story 10.2)
    checkHealth: () => Promise<SunshineHealthCheckResult>
    reinstall: () => Promise<SunshineReinstallResult>
    /** Epic 11: Check if Sunshine has credentials configured (reinstall with AppData) */
    hasCredentialsConfigured: () => Promise<{ hasCredentials: boolean; error?: string }>
  }
  // Credential Storage (Story 2.4)
  storage: {
    save: (key: string, value: string) => Promise<ServiceOperationResult>
    load: (key: string) => Promise<{ success: boolean; data?: string | null; error?: string }>
    delete: (key: string) => Promise<ServiceOperationResult>
    isAvailable: () => Promise<boolean>
  }
  // Virtual Display Driver (Story 3.1 & 3.2)
  vdd: {
    enable: () => Promise<VDDOperationResult>
    disable: () => Promise<VDDOperationResult>
    getStatus: () => Promise<VDDStatus>
    setResolution: (params: { width: number; height: number; refreshRate: 30 | 60 | 90 | 120 | 144 | 165 | 244 }) => Promise<VDDOperationResult>
    setHDR: (enabled: boolean) => Promise<VDDOperationResult>
    getDeviceGUID: () => Promise<string | null>
    getCurrentSettings: () => Promise<{ resolution: { width: number; height: number }; refreshRate: number } | null>
    updateConfig: (params: { width: number; height: number; refreshRate: 30 | 60 | 90 | 120 | 144 | 165 | 244 }) => Promise<VDDOperationResult>
    refreshDeviceId: () => Promise<string | null>
  }
  // Sunshine Config (Story 3.4)
  sunshineConfig: {
    configureWithVDD: () => Promise<ServiceOperationResult>
    readConfig: () => Promise<Record<string, string>>
    restore: () => Promise<ServiceOperationResult>
  }
  // Display Management (Story 3.2)
  display: {
    getPhysicalDisplays: () => Promise<PhysicalScreen[]>
  }
  // Audio Management (Story 5.3)
  audio: {
    getDevices: () => Promise<AudioDevicesResult>
    getSinks: () => Promise<AudioDevicesResult>
  }
  // Sunshine Preset (Story 5.4 & 5.5)
  sunshinePreset: {
    detectConfig: () => Promise<SunshineDetectedConfigResult>
    apply: (payload: { preset: SunshinePresetPayload; currentConfig?: Record<string, string> }) => Promise<SunshinePresetApplyResult>
    writeConfig: (payload: { config: Record<string, string>; restart?: boolean }) => Promise<SunshinePresetApplyResult>
    /** Trouve le preset qui correspond à la config Sunshine actuelle */
    findMatchingPreset: (presets: SunshinePresetPayload[]) => Promise<SunshineFindMatchingResult>
  }
  // Shell (Story 5.6)
  shell: {
    openExternal: (url: string) => Promise<void>
  }
  // Sunshine Apps Repository (Story 7.1)
  sunshineApps: {
    getPath: () => Promise<string | null>
    read: () => Promise<SunshineAppsFile>
    add: (app: SunshineApp) => Promise<SunshineAppsResult>
    update: (name: string, updates: Partial<SunshineApp>) => Promise<SunshineAppsResult>
    delete: (name: string) => Promise<SunshineAppsResult>
    backup: () => Promise<SunshineAppsResult>
    restore: () => Promise<SunshineAppsResult>
  }
  // Dialog & File utilities (Story 7.4 & 7.7)
  dialog: {
    selectExe: () => Promise<DialogSelectExeResult>
    selectImage: () => Promise<DialogSelectImageResult>
    extractIcon: (exePath: string) => Promise<FileExtractIconResult>
  }
  // System utilities (Story 7.7 & Onboarding & 12.6)
  system: {
    openExternal: (url: string) => Promise<void>
    /** Get system hostname (for Sunshine name suggestion during onboarding) */
    getHostname: () => Promise<string>
    /** Story 12.6: Get local IPv4 address (non-loopback) */
    getLocalIP: () => Promise<string | null>
    /** Story 12.6: Check if "Eclipse Sunshine" firewall rule exists */
    checkFirewall: () => Promise<FirewallCheckResult>
    /** Story 12.6: Recreate "Eclipse Sunshine" firewall rule */
    recreateFirewall: () => Promise<FirewallRecreateResult>
  }
  // Eclipse Scripts (Story 7.9)
  scripts: {
    getPaths: () => Promise<{ doScript: string; undoScript: string }>
    /** Génère le prep-cmd standard pour une app Eclipse (détecte la config active automatiquement) */
    generatePrepCmd: () => Promise<PrepCommand[]>
    exist: () => Promise<boolean>
    ensure: () => Promise<{ success: boolean; error?: string }>
    exportPresets: (presets: unknown[]) => Promise<{ success: boolean; error?: string }>
    updateConfig: () => Promise<{ success: boolean; error?: string }>
    exportSunshineConfig: (config: Record<string, string>) => Promise<{ success: boolean; error?: string }>
    exportActivePreset: (activePresetId: string | null) => Promise<{ success: boolean; error?: string }>
  }
  // Moonlight Clients / Pairing (Epic 6)
  clients: {
    list: () => Promise<ClientsListResult>
    pair: (pin: string, deviceName: string) => Promise<PairingResult>
    unpair: (uuid: string) => Promise<ClientOperationResult>
    getServerName: () => Promise<string>
    setServerName: (name: string) => Promise<ClientOperationResult>
  }
  // Eclipse Recovery (stream cleanup)
  recovery: {
    /** Vérifie si un state file orphelin existe et fait le cleanup si nécessaire */
    checkAndCleanup: () => Promise<RecoveryResult>
  }
  // System Tray (Story 9.1)
  tray: {
    /** Définit l'état du tray (playing/pausing/locked) */
    setState: (state: TrayState) => Promise<TrayOperationResult>
    /** Récupère l'état actuel du tray */
    getState: () => Promise<TrayStateResult>
    /** @deprecated Use setState() - Définit l'état de streaming (change l'icône et le tooltip) */
    setStreamingState: (isStreaming: boolean) => Promise<TrayOperationResult>
    /** @deprecated Use getState() - Récupère l'état de streaming actuel */
    getStreamingState: () => Promise<TrayStreamingStateResult>
    /** Affiche la fenêtre depuis le tray */
    showWindow: () => Promise<TrayOperationResult>
  }
  // Tray Panel (Story 9.2 & 9.3)
  trayPanel: {
    /** Ferme le panel tray */
    close: () => Promise<TrayOperationResult>
    /** Ouvre la fenêtre principale Eclipse depuis le panel */
    openMainWindow: () => Promise<TrayOperationResult>
    /** Ajuste la hauteur du panel (pour section dépliable Story 9.3) */
    setHeight: (height: number) => Promise<TrayOperationResult>
  }
  // Autostart (Story 9.7)
  autostart: {
    isEnabled: () => Promise<boolean>
    enable: () => Promise<void>
    disable: () => Promise<void>
    toggle: () => Promise<boolean>
  }
  // Config Reset (Story 10.3)
  config: {
    /** Réinitialise la configuration Eclipse aux valeurs par défaut */
    reset: () => Promise<ConfigResetResult>
  }
}

// Audio types (Story 5.3)
export interface AudioDevice {
  id: string
  name: string
  type: 'sink' | 'source'
  /** True si c'est un périphérique virtuel (Steam Streaming Speakers) - utilisé pour mode Moonlight Only */
  isVirtual?: boolean
}

export interface AudioDevicesResult {
  success: boolean
  devices: AudioDevice[]
  error?: string
}

// Sunshine Preset types (Story 5.4 & 5.5)
export interface SunshineDetectedConfigResult {
  success: boolean
  config?: Record<string, string>
  error?: string
}

export interface SunshinePresetApplyResult {
  success: boolean
  error?: string
  phase?: 'flush' | 'apply' | 'write' | 'restart'
}

export interface SunshineFindMatchingResult {
  success: boolean
  /** IDs des presets correspondants (peut être vide si aucun ne correspond) */
  presetIds: string[]
  /** @deprecated Utiliser presetIds - Premier preset correspondant pour compatibilité */
  presetId: string | null
  error?: string
}

export interface SunshinePresetPayload {
  id: string
  name: string
  type: 'simple' | 'expert'
  display: {
    mode: string
    resolutionStrategy: string
    fps: number
    bitrate: number
    manualResolution?: { width: number; height: number }
    manualRefreshRate?: number
  }
  audio: {
    mode: string
    deviceId?: string
  }
  network: {
    upnp: boolean
  }
  inputs: {
    keyboard: boolean
    mouse: boolean
    gamepad: boolean
  }
  expert?: Record<string, unknown>
}

// Sunshine Apps types (Story 7.1)
export interface SunshineApp {
  name: string
  "image-path"?: string
  "prep-cmd"?: PrepCommand[]
  detached?: string[]
  cmd?: string
  "working-dir"?: string
  output?: string
  "exclude-global-prep-cmd"?: string
  elevated?: string
  "auto-detach"?: string
  "wait-all"?: string
  "exit-timeout"?: string
}

export interface PrepCommand {
  do: string
  undo?: string
  elevated?: string
}

export interface SunshineAppsFile {
  env?: Record<string, string>
  apps: SunshineApp[]
}

export interface SunshineAppsResult {
  success: boolean
  error?: string
  backupPath?: string
}

// Dialog & File types (Story 7.4 & 7.7)
export interface DialogSelectExeResult {
  success: boolean
  canceled?: boolean
  path?: string
  error?: string
}

export interface DialogSelectImageResult {
  success: boolean
  canceled?: boolean
  imageBase64?: string
  error?: string
}

export interface FileExtractIconResult {
  success: boolean
  iconBase64?: string
  error?: string
}

// Moonlight Client types (Epic 6)
export interface MoonlightClient {
  uuid: string
  name: string
}

export interface ClientsListResult {
  success: boolean
  clients: MoonlightClient[]
  error?: string
}

export interface PairingResult {
  success: boolean
  clientName?: string
  error?: string
}

export interface ClientOperationResult {
  success: boolean
  error?: string
}

// Recovery types (stream cleanup)
export interface RecoveryResult {
  success: boolean
  /** True if cleanup was performed (state file existed) */
  recovered: boolean
  error?: string
  /** Details about what was cleaned up */
  details?: string
}

// Tray types (Story 9.1)
export type TrayState = 'playing' | 'pausing' | 'locked'

export interface TrayOperationResult {
  success: boolean
  error?: string
}

export interface TrayStateResult {
  success: boolean
  state: TrayState
  error?: string
}

export interface TrayStreamingStateResult {
  success: boolean
  isStreaming: boolean
  error?: string
}

// Sunshine Health types (Story 10.2)
export type SunshineHealthStatus = 'HEALTHY' | 'MISSING' | 'CORRUPTED'

export interface SunshineHealthCheckResult {
  status: SunshineHealthStatus
  missingFiles?: string[]
  sunshinePath?: string
}

export interface SunshineReinstallResult {
  success: boolean
  error?: string
}

// Config Reset types (Story 10.3)
export interface ConfigResetResult {
  success: boolean
  error?: string
}

// Network Diagnostics types (Story 12.6)
export interface FirewallCheckResult {
  ruleExists: boolean
  error?: string
}

export interface FirewallRecreateResult {
  success: boolean
  error?: string
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
