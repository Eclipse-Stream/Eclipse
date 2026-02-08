// Domain Layer - Sunshine Application Types
// Story 7.1: Types pour la gestion des applications Sunshine (apps.json)

/**
 * Application Sunshine telle que stockée dans apps.json
 * Les champs utilisent des strings pour les booléens (format Sunshine natif)
 */
export interface SunshineApp {
  /** Nom de l'application affiché dans Moonlight */
  name: string;
  /** Chemin vers l'image/icône de l'application */
  "image-path"?: string;
  /** Commandes de préparation (prep-cmd) */
  "prep-cmd"?: PrepCommand[];
  /** Commandes détachées exécutées en parallèle */
  detached?: string[];
  /** Commande principale à exécuter */
  cmd?: string;
  /** Répertoire de travail */
  "working-dir"?: string;
  /** Output name (écran cible - GUID) */
  output?: string;
  /** Exclure les prep-cmd globales */
  "exclude-global-prep-cmd"?: string;
  /** Exécution avec privilèges élevés ("true" | "false") */
  elevated?: string;
  /** Détacher le processus du stream ("true" | "false") */
  "auto-detach"?: string;
  /** Attendre tous les processus avant cleanup ("true" | "false") */
  "wait-all"?: string;
  /** Timeout en secondes avant de forcer la fermeture */
  "exit-timeout"?: string;
}

/**
 * Commande de préparation (prep-cmd)
 */
export interface PrepCommand {
  /** Commande "do" exécutée au lancement */
  do: string;
  /** Commande "undo" exécutée à la fermeture (optionnelle) */
  undo?: string;
  /** Élévation requise ("true" | "false") */
  elevated?: string;
}

/**
 * Structure complète du fichier apps.json
 */
export interface SunshineAppsFile {
  /** Variables d'environnement globales */
  env?: Record<string, string>;
  /** Liste des applications */
  apps: SunshineApp[];
}

/**
 * Résultat d'une opération sur le repository
 */
export interface RepositoryResult {
  /** Succès de l'opération */
  success: boolean;
  /** Message d'erreur si échec */
  error?: string;
  /** Chemin du backup créé (si applicable) */
  backupPath?: string;
}

/**
 * Données pour créer une nouvelle application Eclipse
 * Simplifié: juste nom + exe + icône. Le script détecte la config active automatiquement.
 */
export interface CreateAppData {
  /** Nom de l'application (requis) */
  name: string;
  /** Chemin vers l'exécutable (optionnel - vide = Desktop) */
  exePath: string;
  /** Image/icône en base64 (optionnel) */
  iconBase64?: string;
}

/**
 * Constantes pour les applications
 */
export const APP_CONSTANTS = {
  /** Nom de l'application Eclipse par défaut */
  ECLIPSE_APP_NAME: "Eclipse",
  /** Nombre maximum de backups à conserver */
  MAX_BACKUPS: 5,
  /** Extension des fichiers de backup */
  BACKUP_EXTENSION: ".backup",
} as const;