/// <reference types="vite/client" />
/// <reference types="vite-plugin-electron/electron-env" />

import type { SunshineStatus, VDDStatus } from '../src/domain/types'

interface ServiceOperationResult {
  success: boolean
  error?: string
}

interface VDDOperationResult {
  success: boolean
  error?: string
}

interface VDDResolutionParams {
  width: number
  height: number
  refreshRate: 30 | 60 | 90 | 120 | 144 | 165 | 244
}

interface VDDCurrentSettings {
  resolution: { width: number; height: number }
  refreshRate: 30 | 60 | 90 | 120 | 144 | 165 | 244
}

declare global {
  interface Window {
    electronAPI: {
      ping: () => Promise<string>
      getAppVersion: () => Promise<string>
      windowMinimize: () => Promise<void>
      windowClose: () => Promise<void>
      sunshine: {
        getStatus: () => Promise<SunshineStatus>
        start: () => Promise<ServiceOperationResult>
        stop: () => Promise<ServiceOperationResult>
        restart: () => Promise<ServiceOperationResult>
      }
      storage: {
        save: (key: string, value: string) => Promise<ServiceOperationResult>
        load: (key: string) => Promise<{ success: boolean; data?: string | null; error?: string }>
        delete: (key: string) => Promise<ServiceOperationResult>
        isAvailable: () => Promise<boolean>
      }
      vdd: {
        enable: () => Promise<VDDOperationResult>
        disable: () => Promise<VDDOperationResult>
        getStatus: () => Promise<VDDStatus>
        setResolution: (params: VDDResolutionParams) => Promise<VDDOperationResult>
        setHDR: (enabled: boolean) => Promise<VDDOperationResult>
        getDeviceGUID: () => Promise<string | null>
        getCurrentSettings: () => Promise<VDDCurrentSettings | null>
        updateConfig: (params: VDDResolutionParams) => Promise<VDDOperationResult>
        refreshDeviceId: () => Promise<string | null>
      }
    }
  }
}

interface ImportMetaEnv {
  readonly MAIN_WINDOW_VITE_DEV_SERVER_URL: string
  readonly MAIN_WINDOW_VITE_NAME: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;
