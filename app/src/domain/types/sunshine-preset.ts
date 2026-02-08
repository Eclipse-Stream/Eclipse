// Domain Layer - Sunshine Preset Types
// Story 5.1: Types pour les presets de configuration Sunshine streaming

/**
 * Type de preset: Simple (UI simplifiée) ou Expert (config avancée)
 */
export type SunshinePresetType = "simple" | "expert";

/**
 * Mode de comportement de l'écran virtuel
 * Définit comment le VDD réagit au démarrage du stream
 */
export type DisplayMode =
  | "standard" // Sunshine gère, on ne touche à rien (Défaut)
  | "check" // Vérifie seulement que l'écran existe
  | "enable" // Allume le VDD si éteint
  | "enable-primary" // Allume + Set Primary
  | "focus"; // Allume + Set Primary + Éteint les autres

/**
 * Stratégie de résolution vidéo
 */
export type ResolutionStrategy =
  | "moonlight" // Moonlight Request - Sunshine ne force pas (Défaut)
  | "preset" // Utilise la résolution du VDD/preset écran
  | "manual"; // Override manuel - saisie libre

/**
 * FPS minimum pour le streaming (10-120)
 */
export type StreamFPS = number;

/**
 * Profil d'encodage pour la qualité du stream
 * Story 12.7: Profils qualité d'encodage pour presets simples
 */
export type EncoderProfile = "low_latency" | "balanced" | "quality";

/**
 * Mode audio pour le streaming
 */
export type AudioMode =
  | "moonlight" // Son coupé sur PC, envoyé sur TV (Standard)
  | "pc" // Son joue sur PC, silence sur TV
  | "both"; // Son joue sur PC ET sur TV (Le Duo)

/**
 * Configuration d'affichage du preset
 */
export interface DisplayConfig {
  /** Mode de comportement de l'écran (5 modes) */
  mode: DisplayMode;
  /** ID de l'écran sélectionné (eclipse, physical id, ou preset id) */
  screenId?: string;
  /** Device ID Sunshine de l'écran (récupéré depuis DisplayStore) */
  deviceId?: string;
  /** Stratégie de résolution */
  resolutionStrategy: ResolutionStrategy;
  /** Résolution manuelle (si resolutionStrategy === 'manual') */
  manualResolution?: {
    width: number;
    height: number;
  };
  /** Refresh rate manuel (si resolutionStrategy === 'manual') */
  manualRefreshRate?: number;
  /** FPS du stream */
  fps: StreamFPS;
  /** Bitrate maximum en Mbps (5-120) */
  bitrate: number;
  /** Profil d'encodage pour la qualité du stream (Story 12.7) */
  encoderProfile?: EncoderProfile;
}

/**
 * Configuration audio du preset
 */
export interface AudioConfig {
  /** Mode audio (3 modes) */
  mode: AudioMode;
  /** ID du périphérique audio PC (si mode !== 'moonlight') */
  deviceId?: string;
}

/**
 * Configuration réseau du preset
 */
export interface NetworkConfig {
  /** Activer UPnP */
  upnp: boolean;
}

/**
 * Configuration des périphériques d'entrée
 */
export interface InputConfig {
  /** Activer le clavier */
  keyboard: boolean;
  /** Activer la souris */
  mouse: boolean;
  /** Activer le gamepad */
  gamepad: boolean;
}

/**
 * Configuration expert importée depuis sunshine.conf
 * Champs raw détectés par l'aspirateur de config
 */
export interface ExpertConfig {
  /** Encoder (nvenc, vaapi, software, etc.) */
  encoder?: string;
  /** Adapter name for GPU selection */
  adapter_name?: string;
  /** Output name for display */
  output_name?: string;
  /** Min threads for encoding */
  min_threads?: number;
  /** HEVC support */
  hevc_mode?: number;
  /** AV1 support */
  av1_mode?: number;
  /** Autres champs détectés */
  [key: string]: unknown;
}

/**
 * Preset de configuration Sunshine
 * Contient tous les paramètres de streaming
 */
export interface SunshinePreset {
  /** ID unique (UUID) */
  id: string;
  /** Nom du preset */
  name: string;
  /** Type de preset: simple ou expert */
  type: SunshinePresetType;
  /** Configuration d'affichage */
  display: DisplayConfig;
  /** Configuration audio */
  audio: AudioConfig;
  /** Configuration réseau */
  network: NetworkConfig;
  /** Configuration des entrées */
  inputs: InputConfig;
  /** Configuration expert (champs raw sunshine.conf) */
  expert?: ExpertConfig;
  /** Lecture seule (pour le preset Eclipse Default) */
  isReadOnly?: boolean;
  /** Date de création */
  createdAt: string;
  /** Date de dernière modification */
  updatedAt: string;
}

/**
 * Données pour créer un nouveau preset Sunshine
 */
export interface CreateSunshinePresetData {
  name: string;
  type?: SunshinePresetType;
  display?: Partial<DisplayConfig>;
  audio?: Partial<AudioConfig>;
  network?: Partial<NetworkConfig>;
  inputs?: Partial<InputConfig>;
  expert?: ExpertConfig;
}

/**
 * Données pour modifier un preset Sunshine existant
 */
export interface UpdateSunshinePresetData {
  name?: string;
  type?: SunshinePresetType;
  display?: Partial<DisplayConfig>;
  audio?: Partial<AudioConfig>;
  network?: Partial<NetworkConfig>;
  inputs?: Partial<InputConfig>;
  expert?: ExpertConfig;
}

/**
 * Labels français pour les modes d'affichage
 */
export const DISPLAY_MODE_LABELS: Record<DisplayMode, string> = {
  standard: "Standard (Désactivé)",
  check: "Vérifier disponibilité",
  enable: "Activer l'écran",
  "enable-primary": "Activer & Principal",
  focus: "Mode Focus",
};

/**
 * Labels français pour les stratégies de résolution
 */
export const RESOLUTION_STRATEGY_LABELS: Record<ResolutionStrategy, string> = {
  moonlight: "Moonlight Request",
  preset: "Preset Screen",
  manual: "Override Manuel",
};

/**
 * Labels français pour les modes audio
 */
export const AUDIO_MODE_LABELS: Record<AudioMode, string> = {
  moonlight: "Moonlight Only",
  pc: "PC Only",
  both: "Le Duo (Both)",
};

/**
 * Plage de FPS minimum pour le streaming
 */
export const MIN_FPS = 10;
export const MAX_FPS = 120;
export const DEFAULT_FPS = 60;

/**
 * Plage de bitrate maximum pour le streaming
 */
export const MIN_BITRATE = 5;
export const MAX_BITRATE = 120;
export const DEFAULT_BITRATE = 35;

/**
 * Profil d'encodage par défaut
 */
export const DEFAULT_ENCODER_PROFILE: EncoderProfile = "balanced";

/**
 * Mapping profil d'encodage → clés Sunshine par famille d'encodeur
 * Story 12.7: Chaque profil mappe vers des valeurs spécifiques pour NVENC, QSV, AMD, Software
 * IMPORTANT: La clé `encoder` n'est JAMAIS incluse (auto-détection Sunshine préservée)
 */
export const ENCODER_PROFILE_KEYS: Record<EncoderProfile, Record<string, string>> = {
  low_latency: {
    // NVENC
    nvenc_preset: "1",
    nvenc_twopass: "disabled",
    nvenc_spatial_aq: "disabled",
    nvenc_vbv_increase: "0",
    // QSV
    qsv_preset: "veryfast",
    qsv_coder: "cavlc",
    // AMD
    amd_usage: "ultralowlatency",
    amd_rc: "vbr_latency",
    amd_quality: "speed",
    amd_preanalysis: "disabled",
    amd_vbaq: "disabled",
    // Software
    sw_preset: "ultrafast",
    sw_tune: "zerolatency",
  },
  balanced: {
    // NVENC
    nvenc_preset: "3",
    nvenc_twopass: "quarter_res",
    nvenc_spatial_aq: "enabled",
    nvenc_vbv_increase: "0",
    // QSV
    qsv_preset: "medium",
    qsv_coder: "auto",
    // AMD
    amd_usage: "lowlatency_high_quality",
    amd_rc: "vbr_latency",
    amd_quality: "balanced",
    amd_preanalysis: "disabled",
    amd_vbaq: "enabled",
    // Software
    sw_preset: "fast",
    sw_tune: "zerolatency",
  },
  quality: {
    // NVENC
    nvenc_preset: "5",
    nvenc_twopass: "full_res",
    nvenc_spatial_aq: "enabled",
    nvenc_vbv_increase: "10",
    // QSV
    qsv_preset: "slow",
    qsv_coder: "cabac",
    // AMD
    amd_usage: "transcoding",
    amd_rc: "vbr_peak",
    amd_quality: "quality",
    amd_preanalysis: "enabled",
    amd_vbaq: "enabled",
    // Software
    sw_preset: "medium",
    sw_tune: "zerolatency",
  },
};

/**
 * Labels pour les profils d'encodage (fallback)
 */
export const ENCODER_PROFILE_LABELS: Record<EncoderProfile, string> = {
  low_latency: "Basse latence",
  balanced: "Équilibré (recommandé)",
  quality: "Qualité",
};

/**
 * Valeurs par défaut pour un nouveau preset
 */
export const DEFAULT_SUNSHINE_PRESET_VALUES: Omit<
  SunshinePreset,
  "id" | "name" | "createdAt" | "updatedAt"
> = {
  type: "simple",
  display: {
    mode: "standard",
    screenId: "eclipse",
    resolutionStrategy: "moonlight",
    fps: DEFAULT_FPS,
    bitrate: DEFAULT_BITRATE,
    encoderProfile: DEFAULT_ENCODER_PROFILE,
  },
  audio: {
    mode: "moonlight",
  },
  network: {
    upnp: true,
  },
  inputs: {
    keyboard: true,
    mouse: true,
    gamepad: true,
  },
};
