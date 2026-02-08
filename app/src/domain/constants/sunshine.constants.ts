// Domain Layer - Sunshine Constants
// Centralise les chemins et constantes liées à Sunshine pour éviter la duplication (DRY)
// NOTE: Sunshine est maintenant intégré en portable dans resources/tools/Sunshine

import path from "node:path";

/**
 * Chemins relatifs pour Sunshine portable (dans resources/tools/Sunshine)
 * Ces chemins sont relatifs au dossier tools de l'application
 */
export const SUNSHINE_RELATIVE_PATHS = {
  /** Dossier Sunshine dans resources/tools */
  SUNSHINE_DIR: "Sunshine",
  /** Exécutable Sunshine */
  SUNSHINE_EXE: path.join("Sunshine", "sunshine.exe"),
  /** Dossier config */
  CONFIG_DIR: path.join("Sunshine", "config"),
  /** Fichier sunshine.conf */
  CONFIG_FILE: path.join("Sunshine", "config", "sunshine.conf"),
  /** Fichier apps.json */
  APPS_JSON: path.join("Sunshine", "config", "apps.json"),
  /** Fichier sunshine.log */
  LOG_FILE: path.join("Sunshine", "config", "sunshine.log"),
  /** Dossier tools */
  TOOLS_DIR: path.join("Sunshine", "tools"),
  /** audio-info.exe */
  AUDIO_INFO_EXE: path.join("Sunshine", "tools", "audio-info.exe"),
  /** dxgi-info.exe */
  DXGI_INFO_EXE: path.join("Sunshine", "tools", "dxgi-info.exe"),
} as const;

/**
 * @deprecated Utilisez getSunshinePaths() de SunshinePathsService à la place
 * Ces chemins sont gardés pour rétrocompatibilité temporaire
 */
export const SUNSHINE_PATHS = {
  /** @deprecated */
  DEFAULT_INSTALL: "C:\\Program Files\\Sunshine",
  /** @deprecated */
  CONFIG_PATHS: [] as string[],
  /** @deprecated */
  APPS_JSON_PATHS: [] as string[],
  /** @deprecated */
  TOOLS_DIR: "C:\\Program Files\\Sunshine\\tools",
  /** @deprecated */
  AUDIO_INFO_EXE: "C:\\Program Files\\Sunshine\\tools\\audio-info.exe",
} as const;

/**
 * Story 7.9: Chemins pour les données Eclipse dans AppData
 *
 * Architecture:
 * - Les scripts .ps1 sont dans resources/scripts/ (packagés avec l'app)
 * - Les wrappers .bat sont générés dans AppData/Eclipse/scripts/
 * - La config utilisateur est dans AppData/Eclipse/
 *
 * Les chemins des scripts sont calculés dynamiquement dans EclipseScriptsService
 * car ils dépendent du chemin d'installation (qui varie dev vs prod).
 */
export const ECLIPSE_APPDATA = {
  /** Dossier racine Eclipse dans AppData */
  ROOT_DIR: path.join(process.env.APPDATA || "", "Eclipse"),

  /** Fichier de configuration Eclipse (chemins tools, VDD ID, etc.) */
  CONFIG_FILE: path.join(process.env.APPDATA || "", "Eclipse", "eclipse-config.json"),

  /** Fichier des presets utilisateur */
  PRESETS_FILE: path.join(process.env.APPDATA || "", "Eclipse", "presets.json"),

  /** Fichier du preset actif */
  ACTIVE_PRESET_FILE: path.join(process.env.APPDATA || "", "Eclipse", "active-preset.json"),
} as const;

/**
 * @deprecated Utilisez ECLIPSE_APPDATA à la place
 * Gardé pour rétrocompatibilité temporaire
 */
export const ECLIPSE_SCRIPTS = {
  SCRIPTS_DIR: path.join(process.env.APPDATA || "", "Eclipse", "scripts"),
  DO_SCRIPT: path.join(process.env.APPDATA || "", "Eclipse", "scripts", "eclipse-do.bat"),
  UNDO_SCRIPT: path.join(process.env.APPDATA || "", "Eclipse", "scripts", "eclipse-undo.bat"),
  PRESETS_CONFIG: path.join(process.env.APPDATA || "", "Eclipse", "presets.json"),
} as const;

/**
 * Configuration par défaut de Sunshine (valeurs neutres)
 * Utilisé pour le "flush" avant application d'un preset
 */
export const SUNSHINE_NEUTRAL_CONFIG = {
  // Display Device
  dd_configuration_option: "disabled",
  dd_resolution_option: "moonlight_request",
  dd_refresh_rate_option: "moonlight_request",
  dd_manual_resolution: "",
  dd_manual_refresh_rate: "",
  // Video
  fps: "60",
  minimum_fps_target: "60",
  max_bitrate: "50",
  // Inputs
  keyboard: "enabled",
  mouse: "enabled",
  gamepad: "enabled",
  key_rightalt_to_key_win: "disabled",
  // Network
  upnp: "enabled",
} as const;

/**
 * Application Eclipse par défaut (Story 7.5)
 * Cette application est garantie d'exister dans apps.json et ne peut pas être supprimée
 */
export const ECLIPSE_DEFAULT_APP: {
  name: string;
  "image-path": string;
  cmd: string;
  "working-dir": string;
  "prep-cmd": never[];
  detached: never[];
  output: string;
  "exclude-global-prep-cmd": string;
  elevated: string;
  "auto-detach": string;
  "wait-all": string;
  "exit-timeout": string;
} = {
  name: "Eclipse",
  "image-path": "",
  cmd: "",
  "working-dir": "",
  "prep-cmd": [],
  detached: [],
  output: "",
  "exclude-global-prep-cmd": "false",
  elevated: "false",
  "auto-detach": "true",
  "wait-all": "true",
  "exit-timeout": "5",
};

/**
 * Champs "simples" configurables via le formulaire simple
 * Pour ceux-ci en mode Expert : toggle "Garder" disponible
 */
export const SUNSHINE_SIMPLE_FIELDS = new Set([
  // Écran/Display
  "output_name",
  "dd_configuration_option",
  "dd_resolution_option",
  "dd_refresh_rate_option",
  "dd_manual_resolution",
  "dd_manual_refresh_rate",
  // FPS/Bitrate
  "fps",
  "minimum_fps_target",
  "max_bitrate",
  // Audio
  "audio_sink",
  "virtual_sink",
  // Réseau
  "upnp",
  // Inputs
  "keyboard",
  "mouse",
  "gamepad",
  "key_rightalt_to_key_win",
]);
