// Domain Layer - VDD Validators
// Schémas Zod pour validation runtime des types VDD

import { z } from "zod";
import type { DeviceGUID } from "../types/vdd";

/**
 * Regex pour le format GUID Windows
 * Format: {xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx}
 * Exemple: {672fd6d3-da89-5032-8e0d-c1aad7572529}
 */
const GUID_REGEX =
  /^\{[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\}$/;

/**
 * Schéma de validation pour DeviceGUID
 * Valide le format et crée un branded type
 */
export const DeviceGUIDSchema = z
  .string()
  .regex(GUID_REGEX, {
    message:
      "Le GUID doit être au format {xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx}",
  })
  .transform((val) => val as DeviceGUID);

/**
 * Schéma de validation pour Resolution
 */
export const ResolutionSchema = z.object({
  width: z.number().int().positive().min(640).max(7680),
  height: z.number().int().positive().min(480).max(4320),
});

/**
 * Schéma de validation pour RefreshRate
 * Doit correspondre à AVAILABLE_REFRESH_RATES dans screen-preset.ts
 */
export const RefreshRateSchema = z.union([
  z.literal(30),
  z.literal(60),
  z.literal(90),
  z.literal(120),
  z.literal(144),
  z.literal(165),
  z.literal(244),
]);

/**
 * Schéma de validation pour VirtualDisplayConfig
 */
export const VirtualDisplayConfigSchema = z.object({
  deviceGUID: DeviceGUIDSchema,
  resolution: ResolutionSchema,
  refreshRate: RefreshRateSchema,
  hdrEnabled: z.boolean(),
});

/**
 * Schéma de validation pour le nom d'un preset
 * Utilisé par ScreenPresetForm pour éviter la duplication des règles
 * Note: trim() est appliqué AVANT min/max pour rejeter les strings vides après trim
 */
export const PresetNameSchema = z
  .string()
  .trim()
  .min(2, { message: "Le nom doit contenir au moins 2 caractères" })
  .max(30, { message: "Le nom ne peut pas dépasser 30 caractères" });

/**
 * Schéma de validation pour la création/édition d'un preset
 */
export const ScreenPresetFormSchema = z.object({
  name: PresetNameSchema,
  resolution: ResolutionSchema,
  refreshRate: RefreshRateSchema,
});

/**
 * Type guard pour vérifier si une string est un DeviceGUID valide
 */
export function isValidDeviceGUID(value: unknown): value is DeviceGUID {
  return DeviceGUIDSchema.safeParse(value).success;
}

/**
 * Parse et valide un GUID, throw une erreur si invalide
 */
export function parseDeviceGUID(value: unknown): DeviceGUID {
  return DeviceGUIDSchema.parse(value);
}

/**
 * Parse et valide un GUID, retourne null si invalide
 */
export function safeParseDeviceGUID(value: unknown): DeviceGUID | null {
  const result = DeviceGUIDSchema.safeParse(value);
  return result.success ? result.data : null;
}
