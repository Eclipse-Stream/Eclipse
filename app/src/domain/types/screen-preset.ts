// Domain Layer - Screen Preset Types
// Story 3.2 & 3.3: Types pour les écrans et presets

import type { Resolution, RefreshRate } from "./vdd";

/**
 * Type d'écran affiché dans la liste
 */
export type ScreenType = "physical" | "eclipse" | "preset";

/**
 * Écran physique détecté par Windows
 * Lecture seule - l'utilisateur ne peut pas le modifier
 */
export interface PhysicalScreen {
  type: "physical";
  /** Nom de l'écran (ex: "DELL U2722D") */
  name: string;
  /** Device ID Windows (ex: "\\.\DISPLAY1") */
  deviceId: string;
  /** Résolution actuelle */
  resolution: Resolution;
  /** Taux de rafraîchissement actuel */
  refreshRate: number;
  /** Est-ce l'écran principal? */
  isPrimary: boolean;
}

/**
 * Écran Eclipse par défaut (VDD)
 * Lecture seule - preset système non modifiable, non allumable manuellement
 */
export interface EclipseScreen {
  type: "eclipse";
  /** Toujours "Écran Eclipse" */
  name: string;
  /** Device ID du VDD (partagé avec tous les presets VDD) */
  deviceId: string;
  /** Résolution par défaut: 1080p */
  resolution: Resolution;
  /** Refresh rate par défaut: 60Hz */
  refreshRate: RefreshRate;
}

/**
 * Preset d'écran virtuel créé par l'utilisateur
 * Modifiable et allumable
 */
export interface ScreenPreset {
  type: "preset";
  /** ID unique (UUID) */
  id: string;
  /** Nom personnalisé (ex: "TV 4K Salon", "Steam Deck") */
  name: string;
  /** Device ID du VDD (même que Eclipse car même driver) */
  deviceId: string;
  /** Résolution configurée */
  resolution: Resolution;
  /** Taux de rafraîchissement configuré */
  refreshRate: RefreshRate;
  /** Date de création */
  createdAt: string;
  /** Date de dernière modification */
  updatedAt: string;
}

/**
 * Union de tous les types d'écrans affichables
 */
export type DisplayableScreen = PhysicalScreen | EclipseScreen | ScreenPreset;

/**
 * Données pour créer un nouveau preset
 */
export interface CreatePresetData {
  name: string;
  resolution: Resolution;
  refreshRate: RefreshRate;
}

/**
 * Données pour modifier un preset existant
 */
export interface UpdatePresetData {
  name?: string;
  resolution?: Resolution;
  refreshRate?: RefreshRate;
}

/**
 * Résolutions standards disponibles pour les presets
 * IMPORTANT: Doit correspondre aux résolutions dans vdd_settings.xml
 */
export const STANDARD_RESOLUTIONS: Array<{ label: string; value: Resolution }> = [
  { label: "800 x 600", value: { width: 800, height: 600 } },
  { label: "1280 x 720 (HD)", value: { width: 1280, height: 720 } },
  { label: "1366 x 768 (HD)", value: { width: 1366, height: 768 } },
  { label: "1920 x 1080 (Full HD)", value: { width: 1920, height: 1080 } },
  { label: "2560 x 1440 (2K QHD)", value: { width: 2560, height: 1440 } },
  { label: "3440 x 1440 (UltraWide)", value: { width: 3440, height: 1440 } },
  { label: "3840 x 2160 (4K UHD)", value: { width: 3840, height: 2160 } },
];

/**
 * Refresh rates disponibles pour les presets
 * IMPORTANT: Doit correspondre aux g_refresh_rate dans vdd_settings.xml
 */
export const AVAILABLE_REFRESH_RATES: RefreshRate[] = [30, 60, 90, 120, 144, 165, 244];
