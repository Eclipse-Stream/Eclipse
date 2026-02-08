// Domain Layer - VDD (Virtual Display Driver) Types
// Types stricts pour le driver d'écran virtuel

/**
 * GUID de périphérique Windows (format strictement validé)
 * Exemple: "{672fd6d3-da89-5032-8e0d-c1aad7572529}"
 *
 * Branded type pour éviter de passer n'importe quelle string
 */
export type DeviceGUID = string & { readonly __brand: "DeviceGUID" };

/**
 * Résolution d'écran (en pixels)
 */
export interface Resolution {
  width: number;
  height: number;
}

/**
 * Taux de rafraîchissement (en Hz)
 * Valeurs correspondant aux refresh rates dans vdd_settings.xml
 * (g_refresh_rate globaux + refresh_rate par résolution)
 */
export type RefreshRate = 30 | 60 | 90 | 120 | 144 | 165 | 244;

/**
 * Caractéristiques complètes d'un écran virtuel
 */
export interface VirtualDisplayConfig {
  deviceGUID: DeviceGUID;
  resolution: Resolution;
  refreshRate: RefreshRate;
  hdrEnabled: boolean;
}

/**
 * État d'un écran virtuel
 */
export type VDDStatus = "enabled" | "disabled" | "error";
