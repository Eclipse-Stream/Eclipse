// Domain Layer - IVirtualDisplayDriver Interface
// Contrat d'abstraction pour le driver d'écran virtuel

import type { DeviceGUID, Resolution, RefreshRate, VDDStatus } from "../types/vdd";

/**
 * Résultat d'une opération VDD (succès/échec)
 */
export interface VDDOperationResult {
  success: boolean;
  error?: string;
}

/**
 * Interface d'abstraction pour le driver d'écran virtuel
 * Permet de supporter différentes implémentations (Windows, Mac, Linux)
 */
export interface IVirtualDisplayDriver {
  /**
   * Initialise le driver VDD au démarrage de l'application.
   * - Vérifie si le driver est installé
   * - L'installe si nécessaire (une seule fois)
   * - Ne doit être appelée qu'au boot de l'app
   * @returns Promise avec le résultat de l'opération
   */
  initialize(): Promise<VDDOperationResult>;

  /**
   * Active l'écran virtuel (devcon enable).
   * IMPORTANT: N'installe PAS le driver. Si le driver n'est pas installé,
   * retourne une erreur. Utilisez initialize() au boot pour l'installation.
   * @returns Promise avec le résultat de l'opération
   */
  enable(): Promise<VDDOperationResult>;

  /**
   * Désactive l'écran virtuel
   * @returns Promise avec le résultat de l'opération
   */
  disable(): Promise<VDDOperationResult>;

  /**
   * Vérifie si l'écran virtuel est actuellement actif
   * @returns Promise avec le statut actuel
   */
  getStatus(): Promise<VDDStatus>;

  /**
   * Définit la résolution de l'écran virtuel
   * @param resolution - Largeur et hauteur en pixels
   * @param refreshRate - Taux de rafraîchissement en Hz
   * @returns Promise avec le résultat de l'opération
   */
  setResolution(resolution: Resolution, refreshRate: RefreshRate): Promise<VDDOperationResult>;

  /**
   * Active ou désactive le HDR sur l'écran virtuel
   * @param enabled - true pour activer, false pour désactiver
   * @returns Promise avec le résultat de l'opération
   */
  setHDR(enabled: boolean): Promise<VDDOperationResult>;

  /**
   * Récupère le GUID du périphérique écran virtuel
   * CRITIQUE: Ce GUID est utilisé pour configurer Sunshine (output_name)
   * @returns Promise avec le DeviceGUID ou null si non disponible
   */
  getDeviceGUID(): Promise<DeviceGUID | null>;

  /**
   * Met à jour la configuration de l'écran virtuel SANS le désactiver/réactiver.
   * Story 3.1: Permet la "bascule" fluide entre presets.
   * IMPORTANT: Le driver DOIT être déjà activé (état ON).
   * @param resolution - Largeur et hauteur en pixels
   * @param refreshRate - Taux de rafraîchissement en Hz
   * @returns Promise avec le résultat de l'opération
   */
  updateConfig(resolution: Resolution, refreshRate: RefreshRate): Promise<VDDOperationResult>;
}
