// Infrastructure Layer - Sunshine Config Manager
// Gère la lecture/écriture du fichier sunshine.conf
// Story 3.4: Configuration automatique output_name

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { getSunshinePaths } from "./SunshinePathsService";

/**
 * Résultat d'une opération sur la configuration Sunshine
 */
export interface SunshineConfigResult {
  success: boolean;
  error?: string;
}

/**
 * Interface du gestionnaire de configuration Sunshine
 */
/**
 * Résultat de ensureSystemTrayDisabled
 */
export interface SystemTrayResult {
  modified: boolean;
  needsRestart: boolean;
  error?: string;
}

/**
 * Interface du gestionnaire de configuration Sunshine
 */
export interface ISunshineConfigManager {
  /** Retourne le chemin de sunshine.conf détecté, ou null si non trouvé */
  getConfigPath(): string | null;

  /** Lit toutes les paires clé=valeur de sunshine.conf */
  readConfig(): Promise<Record<string, string>>;

  /** Supprime une clé de sunshine.conf */
  deleteConfig(key: string): Promise<SunshineConfigResult>;

  /** Écrit une paire clé=valeur, préserve le format */
  writeConfig(key: string, value: string): Promise<SunshineConfigResult>;

  /** Crée un backup avec timestamp */
  backupConfig(): Promise<SunshineConfigResult>;

  /** Restaure depuis le dernier backup */
  restoreFromBackup(): Promise<SunshineConfigResult>;

  /** Met à jour output_name avec le GUID du VDD (backup + write) */
  updateOutputName(guid: string): Promise<SunshineConfigResult>;

  /** Story 9.6: Désactive le system tray Sunshine si pas déjà désactivé */
  ensureSystemTrayDisabled(): Promise<SystemTrayResult>;

  /** Story 9.6: Restaure le system tray Sunshine (pour désinstallation) */
  restoreSystemTray(): Promise<SunshineConfigResult>;

  /** Story 11.2: Initialise sunshine_name avec os.hostname() si non défini */
  ensureSunshineNameInitialized(): Promise<SunshineConfigResult>;
}

/**
 * Gestionnaire de configuration Sunshine
 * Lit et écrit le fichier sunshine.conf, gère les backups
 */
export class SunshineConfigManager implements ISunshineConfigManager {
  // Nombre max de backups à conserver
  private readonly MAX_BACKUPS = 5;

  // Chemin détecté de sunshine.conf
  private configPath: string | null = null;

  constructor() {
    this.detectConfigPath();
  }

  /**
   * Détecte le chemin de sunshine.conf
   * Utilise le chemin portable depuis SunshinePathsService
   */
  private detectConfigPath(): void {
    try {
      const paths = getSunshinePaths();
      if (fs.existsSync(paths.configFile)) {
        this.configPath = paths.configFile;
        console.log(`[SunshineConfig] Found config at: ${this.configPath}`);
        return;
      }
    } catch (error) {
      console.warn("[SunshineConfig] Error detecting config path:", error);
    }
    console.warn("[SunshineConfig] sunshine.conf not found");
  }

  /**
   * Retourne le chemin de sunshine.conf détecté
   */
  getConfigPath(): string | null {
    return this.configPath;
  }

  /**
   * Lit toutes les paires clé=valeur de sunshine.conf
   * Ignore les commentaires (lignes commençant par #)
   */
  async readConfig(): Promise<Record<string, string>> {
    if (!this.configPath) {
      console.warn("[SunshineConfig] No config path available");
      return {};
    }

    try {
      const content = await fs.promises.readFile(this.configPath, "utf-8");
      const config: Record<string, string> = {};

      for (const line of content.split("\n")) {
        const trimmed = line.trim();

        // Ignorer les lignes vides et les commentaires
        if (!trimmed || trimmed.startsWith("#")) {
          continue;
        }

        // Parser les paires clé=valeur
        const eqIndex = trimmed.indexOf("=");
        if (eqIndex > 0) {
          const key = trimmed.substring(0, eqIndex).trim();
          const value = trimmed.substring(eqIndex + 1).trim();
          config[key] = value;
        }
      }

      console.log(`[SunshineConfig] Read ${Object.keys(config).length} config entries`);
      return config;
    } catch (error) {
      console.error("[SunshineConfig] Failed to read config:", error);
      return {};
    }
  }

  /**
   * Supprime une clé de sunshine.conf
   * Préserve les commentaires et le format du fichier
   */
  async deleteConfig(key: string): Promise<SunshineConfigResult> {
    if (!this.configPath) {
      return {
        success: false,
        error: "sunshine.conf non trouvé. Sunshine est-il installé?",
      };
    }

    try {
      if (!fs.existsSync(this.configPath)) {
        return { success: true }; // Rien à supprimer
      }

      const content = await fs.promises.readFile(this.configPath, "utf-8");
      const lines = content.split("\n");

      // Filtrer la ligne contenant la clé
      const newLines = lines.filter((line) => {
        const trimmed = line.trim();
        // Supprimer les lignes qui correspondent à la clé
        return !(
          trimmed.startsWith(`${key} `) ||
          trimmed.startsWith(`${key}=`) ||
          trimmed === key
        );
      });

      // Écrire le fichier
      await fs.promises.writeFile(this.configPath, newLines.join("\n"), "utf-8");
      console.log(`[SunshineConfig] Deleted key: ${key}`);

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
      console.error("[SunshineConfig] Failed to delete config key:", error);

      if (errorMessage.includes("EPERM") || errorMessage.includes("EACCES")) {
        return {
          success: false,
          error: "Permission refusée. Essayez d'exécuter Eclipse en administrateur.",
        };
      }

      return {
        success: false,
        error: `Impossible de supprimer la clé: ${errorMessage}`,
      };
    }
  }

  /**
   * Écrit une paire clé=valeur dans sunshine.conf
   * Préserve les commentaires et le format du fichier
   * Modifie la valeur existante ou l'ajoute à la fin
   */
  async writeConfig(key: string, value: string): Promise<SunshineConfigResult> {
    if (!this.configPath) {
      return {
        success: false,
        error: "sunshine.conf non trouvé. Sunshine est-il installé?",
      };
    }

    try {
      let lines: string[] = [];
      let found = false;

      // Lire le fichier existant
      if (fs.existsSync(this.configPath)) {
        const content = await fs.promises.readFile(this.configPath, "utf-8");
        lines = content.split("\n");
      }

      // Modifier ou ajouter la clé
      const newLines: string[] = [];
      for (const line of lines) {
        const trimmed = line.trim();

        // Vérifier si c'est la ligne à modifier
        // Supporte "key = value" et "key=value"
        if (
          trimmed.startsWith(`${key} `) ||
          trimmed.startsWith(`${key}=`) ||
          trimmed === key
        ) {
          newLines.push(`${key} = ${value}`);
          found = true;
        } else {
          newLines.push(line);
        }
      }

      // Si la clé n'existait pas, l'ajouter à la fin
      if (!found) {
        // Ajouter une ligne vide si le fichier ne se termine pas par une
        if (newLines.length > 0 && newLines[newLines.length - 1].trim() !== "") {
          newLines.push("");
        }
        newLines.push(`${key} = ${value}`);
      }

      // Écrire le fichier
      await fs.promises.writeFile(this.configPath, newLines.join("\n"), "utf-8");
      console.log(`[SunshineConfig] Wrote ${key} = ${value}`);

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
      console.error("[SunshineConfig] Failed to write config:", error);

      // Vérifier si c'est une erreur de permission
      if (errorMessage.includes("EPERM") || errorMessage.includes("EACCES")) {
        return {
          success: false,
          error: "Permission refusée. Essayez d'exécuter Eclipse en administrateur.",
        };
      }

      return {
        success: false,
        error: `Impossible d'écrire la configuration: ${errorMessage}`,
      };
    }
  }

  /**
   * Crée un backup de sunshine.conf avec timestamp
   * Format: sunshine.conf.backup.2026-01-11T10-30-00
   * Rotation: garde les MAX_BACKUPS derniers backups
   */
  async backupConfig(): Promise<SunshineConfigResult> {
    if (!this.configPath) {
      return {
        success: false,
        error: "sunshine.conf non trouvé",
      };
    }

    try {
      // Vérifier que le fichier existe
      if (!fs.existsSync(this.configPath)) {
        return {
          success: false,
          error: "sunshine.conf n'existe pas",
        };
      }

      // Générer le nom du backup avec timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = `${this.configPath}.backup.${timestamp}`;

      // Copier le fichier
      await fs.promises.copyFile(this.configPath, backupPath);
      console.log(`[SunshineConfig] Backup created: ${backupPath}`);

      // Rotation: supprimer les anciens backups si nécessaire
      await this.rotateBackups();

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
      console.error("[SunshineConfig] Failed to create backup:", error);
      return {
        success: false,
        error: `Impossible de créer le backup: ${errorMessage}`,
      };
    }
  }

  /**
   * Supprime les anciens backups pour ne garder que les MAX_BACKUPS derniers
   */
  private async rotateBackups(): Promise<void> {
    if (!this.configPath) return;

    try {
      const configDir = path.dirname(this.configPath);
      const configName = path.basename(this.configPath);
      const backupPrefix = `${configName}.backup.`;

      // Lister tous les backups
      const files = await fs.promises.readdir(configDir);
      const backups = files
        .filter((f) => f.startsWith(backupPrefix))
        .map((f) => path.join(configDir, f))
        .sort()
        .reverse(); // Plus récent en premier

      // Supprimer les backups au-delà de MAX_BACKUPS
      if (backups.length > this.MAX_BACKUPS) {
        const toDelete = backups.slice(this.MAX_BACKUPS);
        for (const backup of toDelete) {
          await fs.promises.unlink(backup);
          console.log(`[SunshineConfig] Deleted old backup: ${backup}`);
        }
      }
    } catch (error) {
      console.warn("[SunshineConfig] Failed to rotate backups:", error);
    }
  }

  /**
   * Trouve le backup le plus récent
   */
  private async findLatestBackup(): Promise<string | null> {
    if (!this.configPath) return null;

    try {
      const configDir = path.dirname(this.configPath);
      const configName = path.basename(this.configPath);
      const backupPrefix = `${configName}.backup.`;

      const files = await fs.promises.readdir(configDir);
      const backups = files
        .filter((f) => f.startsWith(backupPrefix))
        .sort()
        .reverse(); // Plus récent en premier

      if (backups.length > 0) {
        return path.join(configDir, backups[0]);
      }
    } catch (error) {
      console.error("[SunshineConfig] Failed to find backup:", error);
    }

    return null;
  }

  /**
   * Restaure sunshine.conf depuis le backup le plus récent
   */
  async restoreFromBackup(): Promise<SunshineConfigResult> {
    if (!this.configPath) {
      return {
        success: false,
        error: "Chemin de configuration non défini",
      };
    }

    try {
      const latestBackup = await this.findLatestBackup();

      if (!latestBackup) {
        return {
          success: false,
          error: "Aucun backup trouvé",
        };
      }

      // Restaurer le backup
      await fs.promises.copyFile(latestBackup, this.configPath);
      console.log(`[SunshineConfig] Restored from: ${latestBackup}`);

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
      console.error("[SunshineConfig] Failed to restore backup:", error);
      return {
        success: false,
        error: `Impossible de restaurer le backup: ${errorMessage}`,
      };
    }
  }

  /**
   * Met à jour output_name avec le GUID du VDD
   * Crée un backup avant modification (NFR19)
   */
  async updateOutputName(guid: string): Promise<SunshineConfigResult> {
    if (!guid) {
      return {
        success: false,
        error: "GUID invalide",
      };
    }

    console.log(`[SunshineConfig] Updating output_name to: ${guid}`);

    // 1. Créer un backup d'abord (NFR19)
    const backupResult = await this.backupConfig();
    if (!backupResult.success) {
      console.warn("[SunshineConfig] Backup failed, continuing anyway:", backupResult.error);
      // On continue quand même - le backup est recommandé mais pas bloquant
    }

    // 2. Écrire la nouvelle valeur
    const writeResult = await this.writeConfig("output_name", guid);
    if (!writeResult.success) {
      return writeResult;
    }

    console.log(`[SunshineConfig] output_name updated successfully to ${guid}`);
    return { success: true };
  }

  /**
   * Story 9.6: Désactive le system tray Sunshine pour qu'Eclipse gère seul les notifications
   * AC1: Modifie sunshine.conf pour ajouter system_tray = disabled
   * AC3: Ne modifie rien si déjà désactivé
   * AC4: Gère le cas où sunshine.conf n'existe pas
   */
  async ensureSystemTrayDisabled(): Promise<SystemTrayResult> {
    // AC4: sunshine.conf n'existe pas
    if (!this.configPath) {
      console.warn("[SunshineConfig] sunshine.conf not found - skipping system_tray configuration");
      return { modified: false, needsRestart: false };
    }

    try {
      const config = await this.readConfig();
      const currentValue = config["system_tray"];

      // AC3: Déjà désactivé - ne rien faire
      if (currentValue === "disabled") {
        console.log("[SunshineConfig] Sunshine system_tray already disabled");
        return { modified: false, needsRestart: false };
      }

      // AC1: Modifier la configuration
      console.log(`[SunshineConfig] Setting system_tray = disabled (was: ${currentValue || "not set"})`);

      const writeResult = await this.writeConfig("system_tray", "disabled");
      if (!writeResult.success) {
        console.error("[SunshineConfig] Failed to set system_tray:", writeResult.error);
        return {
          modified: false,
          needsRestart: false,
          error: writeResult.error,
        };
      }

      console.log("[SunshineConfig] system_tray set to disabled successfully");
      // AC2: Signaler qu'un restart est nécessaire
      return { modified: true, needsRestart: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
      console.error("[SunshineConfig] Failed to configure system_tray:", error);
      return {
        modified: false,
        needsRestart: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Story 9.6 AC5: Restaure le system tray Sunshine pour la désinstallation
   * Remet system_tray = enabled pour que Sunshine retrouve son comportement normal
   */
  async restoreSystemTray(): Promise<SunshineConfigResult> {
    if (!this.configPath) {
      return {
        success: false,
        error: "sunshine.conf non trouvé",
      };
    }

    try {
      const writeResult = await this.writeConfig("system_tray", "enabled");
      if (!writeResult.success) {
        return writeResult;
      }

      console.log("[SunshineConfig] system_tray restored to enabled");
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
      console.error("[SunshineConfig] Failed to restore system_tray:", error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Story 11.2: Initialise sunshine_name avec os.hostname() si non défini
   * Appelé au premier lancement pour personnaliser le nom du serveur
   * avec le nom réel du PC Windows plutôt que "Sunshine" par défaut
   */
  async ensureSunshineNameInitialized(): Promise<SunshineConfigResult> {
    if (!this.configPath) {
      console.warn("[SunshineConfig] sunshine.conf not found - skipping sunshine_name initialization");
      return { success: true }; // Pas d'erreur, Sunshine n'est peut-être pas encore installé
    }

    try {
      const config = await this.readConfig();
      const currentName = config["sunshine_name"];

      // Si sunshine_name est déjà défini, ne rien faire
      if (currentName && currentName.trim() !== "") {
        console.log(`[SunshineConfig] sunshine_name already set: ${currentName}`);
        return { success: true };
      }

      // Récupérer le hostname Windows
      const hostname = os.hostname();
      console.log(`[SunshineConfig] Initializing sunshine_name with hostname: ${hostname}`);

      // Écrire le hostname comme nom du serveur
      const writeResult = await this.writeConfig("sunshine_name", hostname);
      if (!writeResult.success) {
        return writeResult;
      }

      console.log(`[SunshineConfig] sunshine_name initialized to: ${hostname}`);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
      console.error("[SunshineConfig] Failed to initialize sunshine_name:", error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}
