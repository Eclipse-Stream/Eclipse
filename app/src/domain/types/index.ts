// Domain Layer - Types
// Domain-specific types
export { PAGES, type Page } from "./navigation";
export { SunshineStatus, type SunshineStatusType } from "./sunshine";
export type { Credentials } from "./credentials";
export type {
  DeviceGUID,
  Resolution,
  RefreshRate,
  VirtualDisplayConfig,
  VDDStatus,
} from "./vdd";
export type {
  ScreenType,
  PhysicalScreen,
  EclipseScreen,
  ScreenPreset,
  DisplayableScreen,
  CreatePresetData,
  UpdatePresetData,
} from "./screen-preset";
export { STANDARD_RESOLUTIONS, AVAILABLE_REFRESH_RATES } from "./screen-preset";
// Sunshine Preset types (Story 5.1)
export type {
  SunshinePresetType,
  DisplayMode,
  ResolutionStrategy,
  StreamFPS,
  AudioMode,
  EncoderProfile,
  DisplayConfig,
  AudioConfig,
  NetworkConfig,
  InputConfig,
  ExpertConfig,
  SunshinePreset,
  CreateSunshinePresetData,
  UpdateSunshinePresetData,
} from "./sunshine-preset";
export {
  DISPLAY_MODE_LABELS,
  RESOLUTION_STRATEGY_LABELS,
  AUDIO_MODE_LABELS,
  ENCODER_PROFILE_LABELS,
  MIN_FPS,
  MAX_FPS,
  DEFAULT_FPS,
  MIN_BITRATE,
  MAX_BITRATE,
  DEFAULT_BITRATE,
  DEFAULT_ENCODER_PROFILE,
  ENCODER_PROFILE_KEYS,
  DEFAULT_SUNSHINE_PRESET_VALUES,
} from "./sunshine-preset";
// Sunshine Application types (Epic 7 - Story 7.1 & 7.2)
export type {
  SunshineApp,
  SunshineAppsFile,
  PrepCommand,
  RepositoryResult,
  CreateAppData,
} from "./sunshine-app";
export { APP_CONSTANTS } from "./sunshine-app";
// Moonlight Client types (Epic 6 - Pairing)
export type {
  MoonlightClient,
  ClientOperationResult,
  ClientsListResult,
  PairingResult,
  ServerNameConfig,
} from "./moonlight-client";
