// Domain types for Moonlight clients (Epic 6 - Pairing)

/**
 * Représente un client Moonlight appairé à Sunshine
 */
export interface MoonlightClient {
  /** Identifiant unique du client (UUID) */
  uuid: string;
  /** Nom du client tel qu'affiché dans Moonlight */
  name: string;
}

/**
 * Résultat d'une opération sur les clients
 */
export interface ClientOperationResult {
  success: boolean;
  error?: string;
}

/**
 * Résultat de la récupération des clients
 */
export interface ClientsListResult {
  success: boolean;
  clients: MoonlightClient[];
  error?: string;
}

/**
 * Résultat d'une opération d'appairage PIN
 */
export interface PairingResult {
  success: boolean;
  clientName?: string;
  error?: string;
}

/**
 * Configuration du nom du serveur Sunshine
 */
export interface ServerNameConfig {
  name: string;
}
