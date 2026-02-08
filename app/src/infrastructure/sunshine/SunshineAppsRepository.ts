// Infrastructure Layer - Sunshine Apps Repository
// Story 7.1 & 7.5: Gère la lecture/écriture du fichier apps.json
// Suit le pattern de SunshineConfigManager

import fs from "node:fs";
import path from "node:path";
import { ECLIPSE_DEFAULT_APP } from "@domain/constants/sunshine.constants";
import { getSunshinePaths } from "./SunshinePathsService";
import { eclipseScriptsService } from "../scripts/EclipseScriptsService";
import type { SunshineApp, SunshineAppsFile, RepositoryResult } from "@domain/types";
import { APP_CONSTANTS } from "@domain/types";

/**
 * Interface du repository d'applications Sunshine
 */
export interface ISunshineAppsRepository {
  /** Retourne le chemin de apps.json détecté, ou null si non trouvé */
  getAppsPath(): string | null;

  /** Lit toutes les applications de apps.json */
  readApps(): Promise<SunshineAppsFile>;

  /** Ajoute une nouvelle application */
  addApp(app: SunshineApp): Promise<RepositoryResult>;

  /** Met à jour une application existante par son nom */
  updateApp(name: string, updates: Partial<SunshineApp>): Promise<RepositoryResult>;

  /** Supprime une application par son nom */
  deleteApp(name: string): Promise<RepositoryResult>;

  /** Crée un backup du fichier apps.json */
  backupApps(): Promise<RepositoryResult>;

  /** Restaure depuis le dernier backup */
  restoreFromBackup(): Promise<RepositoryResult>;
}

/**
 * Repository pour la gestion du fichier apps.json de Sunshine
 * Lecture/écriture sécurisée avec backups automatiques
 */
export class SunshineAppsRepository implements ISunshineAppsRepository {
  // Nombre max de backups à conserver
  private readonly MAX_BACKUPS = APP_CONSTANTS.MAX_BACKUPS;

  // Chemin détecté de apps.json
  private appsPath: string | null = null;

  constructor() {
    this.detectAppsPath();
  }

  /**
   * Détecte le chemin de apps.json
   * Utilise le chemin portable depuis SunshinePathsService
   * Bug Fix 5: Définit le chemin même si le fichier n'existe pas encore
   */
  private detectAppsPath(): void {
    try {
      const paths = getSunshinePaths();
      // Bug Fix 5: Toujours définir le chemin, même si le fichier n'existe pas
      // ensureEclipseAppExists() créera le fichier si nécessaire
      this.appsPath = paths.appsJson;
      if (fs.existsSync(paths.appsJson)) {
        console.log(`[SunshineApps] Found apps.json at: ${this.appsPath}`);
      } else {
        console.log(`[SunshineApps] apps.json not found, will create at: ${this.appsPath}`);
      }
    } catch (error) {
      console.warn("[SunshineApps] Error detecting apps.json path:", error);
      this.appsPath = null;
    }
  }

  /**
   * Retourne le chemin de apps.json détecté
   */
  getAppsPath(): string | null {
    return this.appsPath;
  }

  /**
   * Lit le fichier apps.json et retourne sa structure
   * Bug Fix 5: Crée le fichier avec une structure vide s'il n'existe pas
   * @returns Structure SunshineAppsFile avec env et apps
   * @throws Error si le fichier est malformé ou non trouvé
   */
  async readApps(): Promise<SunshineAppsFile> {
    if (!this.appsPath) {
      throw new Error("apps.json non trouvé. Sunshine est-il installé?");
    }

    try {
      // Bug Fix 5: Créer le fichier s'il n'existe pas
      if (!fs.existsSync(this.appsPath)) {
        console.log("[SunshineApps] Creating empty apps.json file...");
        // Ensure parent directory exists
        const parentDir = path.dirname(this.appsPath);
        if (!fs.existsSync(parentDir)) {
          console.log(`[SunshineApps] Creating config directory: ${parentDir}`);
          await fs.promises.mkdir(parentDir, { recursive: true });
        }
        const emptyFile: SunshineAppsFile = { env: {}, apps: [] };
        await fs.promises.writeFile(this.appsPath, JSON.stringify(emptyFile, null, 2), "utf-8");
        return emptyFile;
      }

      const content = await fs.promises.readFile(this.appsPath, "utf-8");
      const parsed = JSON.parse(content) as SunshineAppsFile;

      // Valider la structure minimale
      if (!parsed.apps || !Array.isArray(parsed.apps)) {
        throw new Error("Structure apps.json invalide: tableau 'apps' manquant");
      }

      console.log(`[SunshineApps] Read ${parsed.apps.length} applications`);
      return parsed;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`apps.json malformé: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Ajoute une nouvelle application à apps.json
   * Crée un backup avant modification
   */
  async addApp(app: SunshineApp): Promise<RepositoryResult> {
    if (!this.appsPath) {
      return {
        success: false,
        error: "apps.json non trouvé. Sunshine est-il installé?",
      };
    }

    try {
      // Créer un backup avant modification
      const backupResult = await this.backupApps();

      // Lire le fichier actuel
      const appsFile = await this.readApps();

      // Vérifier que l'app n'existe pas déjà
      if (appsFile.apps.some((a) => a.name === app.name)) {
        return {
          success: false,
          error: `Une application nommée "${app.name}" existe déjà`,
        };
      }

      // Ajouter l'application
      appsFile.apps.push(app);

      // Écrire le fichier
      await this.writeAppsFile(appsFile);

      console.log(`[SunshineApps] Added app: ${app.name}`);
      return {
        success: true,
        backupPath: backupResult.backupPath,
      };
    } catch (error) {
      return this.handleError(error, "ajouter l'application");
    }
  }

  /**
   * Met à jour une application existante
   * Crée un backup avant modification
   */
  async updateApp(name: string, updates: Partial<SunshineApp>): Promise<RepositoryResult> {
    if (!this.appsPath) {
      return {
        success: false,
        error: "apps.json non trouvé. Sunshine est-il installé?",
      };
    }

    try {
      // Créer un backup avant modification
      const backupResult = await this.backupApps();

      // Lire le fichier actuel
      const appsFile = await this.readApps();

      // Trouver l'application
      const appIndex = appsFile.apps.findIndex((a) => a.name === name);
      if (appIndex === -1) {
        return {
          success: false,
          error: `Application "${name}" non trouvée`,
        };
      }

      // Mettre à jour l'application (merge des propriétés)
      appsFile.apps[appIndex] = {
        ...appsFile.apps[appIndex],
        ...updates,
      };

      // Écrire le fichier
      await this.writeAppsFile(appsFile);

      console.log(`[SunshineApps] Updated app: ${name}`);
      return {
        success: true,
        backupPath: backupResult.backupPath,
      };
    } catch (error) {
      return this.handleError(error, "mettre à jour l'application");
    }
  }

  /**
   * Supprime une application par son nom
   * Crée un backup avant modification
   * Story 7.5: Protection - Refuse de supprimer l'application Eclipse
   */
  async deleteApp(name: string): Promise<RepositoryResult> {
    // Story 7.5: Protection Eclipse - ne peut pas être supprimée
    if (name.toLowerCase() === APP_CONSTANTS.ECLIPSE_APP_NAME.toLowerCase()) {
      console.warn("[SunshineApps] Attempted to delete protected Eclipse app");
      return {
        success: false,
        error: `L'application "${APP_CONSTANTS.ECLIPSE_APP_NAME}" ne peut pas être supprimée`,
      };
    }

    if (!this.appsPath) {
      return {
        success: false,
        error: "apps.json non trouvé. Sunshine est-il installé?",
      };
    }

    try {
      // Créer un backup avant modification
      const backupResult = await this.backupApps();

      // Lire le fichier actuel
      const appsFile = await this.readApps();

      // Trouver l'application
      const appIndex = appsFile.apps.findIndex((a) => a.name === name);
      if (appIndex === -1) {
        return {
          success: false,
          error: `Application "${name}" non trouvée`,
        };
      }

      // Supprimer l'application
      appsFile.apps.splice(appIndex, 1);

      // Écrire le fichier
      await this.writeAppsFile(appsFile);

      console.log(`[SunshineApps] Deleted app: ${name}`);
      return {
        success: true,
        backupPath: backupResult.backupPath,
      };
    } catch (error) {
      return this.handleError(error, "supprimer l'application");
    }
  }

  /**
   * Story 7.5: Initialise les applications Eclipse au premier lancement
   * - Supprime l'app "Desktop" par défaut (inutile avec Eclipse)
   * - Crée l'app Eclipse en premier si absente
   * - Ajoute les scripts DO/UNDO à TOUTES les apps existantes
   *
   * Philosophie: Toutes les apps doivent avoir les scripts Eclipse par défaut.
   * Pour créer une app sans scripts, l'utilisateur doit passer par localhost Sunshine.
   */
  async ensureEclipseAppExists(): Promise<RepositoryResult> {
    if (!this.appsPath) {
      return {
        success: false,
        error: "apps.json non trouvé. Sunshine est-il installé?",
      };
    }

    try {
      const appsFile = await this.readApps();
      let needsWrite = false;

      // 1. Supprimer l'app "Desktop" par défaut (inutile avec Eclipse)
      const desktopIndex = appsFile.apps.findIndex(
        (app) => app.name.toLowerCase() === "desktop"
      );
      if (desktopIndex !== -1) {
        console.log("[SunshineApps] Removing default Desktop app (replaced by Eclipse)...");
        appsFile.apps.splice(desktopIndex, 1);
        needsWrite = true;
      }

      // 2. Vérifier/créer l'app Eclipse
      let eclipseApp = appsFile.apps.find(
        (app) => app.name.toLowerCase() === APP_CONSTANTS.ECLIPSE_APP_NAME.toLowerCase()
      );

      if (!eclipseApp) {
        // Créer l'application Eclipse avec les scripts DO/UNDO par défaut
        console.log("[SunshineApps] Creating default Eclipse app with scripts...");
        const newApp: SunshineApp = {
          ...ECLIPSE_DEFAULT_APP,
          "prep-cmd": eclipseScriptsService.generatePrepCmd(),
        };
        appsFile.apps.unshift(newApp); // Ajouter en premier
        needsWrite = true;
      } else {
        // Vérifier l'intégrité (nom correct)
        if (eclipseApp.name !== APP_CONSTANTS.ECLIPSE_APP_NAME) {
          console.warn("[SunshineApps] Repairing Eclipse app name...");
          eclipseApp.name = APP_CONSTANTS.ECLIPSE_APP_NAME;
          needsWrite = true;
        }
      }

      // 3. Ajouter les scripts DO/UNDO à TOUTES les apps qui n'en ont pas
      for (const app of appsFile.apps) {
        const hasEclipseScripts = app["prep-cmd"]?.some(
          (cmd) => cmd.do?.includes("ECLIPSE_MANAGED_APP")
        );

        if (!hasEclipseScripts) {
          console.log(`[SunshineApps] Adding DO/UNDO scripts to app: ${app.name}`);

          // Préserver les prep-cmd existants et ajouter les scripts Eclipse au début
          const existingPrepCmd = app["prep-cmd"] || [];
          const eclipseScripts = eclipseScriptsService.generatePrepCmd();

          // Scripts Eclipse en premier, puis les commandes existantes de l'app
          app["prep-cmd"] = [...eclipseScripts, ...existingPrepCmd];
          needsWrite = true;
        }
      }

      if (needsWrite) {
        await this.writeAppsFile(appsFile);
        console.log("[SunshineApps] Apps initialization complete");
      }

      return { success: true };
    } catch (error) {
      return this.handleError(error, "initialiser les applications Eclipse");
    }
  }

  /**
   * Crée un backup de apps.json avec timestamp
   * Format: apps.json.backup.2026-01-17T10-30-00
   * Rotation: garde les MAX_BACKUPS derniers backups
   */
  async backupApps(): Promise<RepositoryResult> {
    if (!this.appsPath) {
      return {
        success: false,
        error: "apps.json non trouvé",
      };
    }

    try {
      // Vérifier que le fichier existe
      if (!fs.existsSync(this.appsPath)) {
        return {
          success: false,
          error: "apps.json n'existe pas",
        };
      }

      // Générer le nom du backup avec timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = `${this.appsPath}${APP_CONSTANTS.BACKUP_EXTENSION}.${timestamp}`;

      // Copier le fichier
      await fs.promises.copyFile(this.appsPath, backupPath);
      console.log(`[SunshineApps] Backup created: ${backupPath}`);

      // Rotation: supprimer les anciens backups si nécessaire
      await this.rotateBackups();

      return {
        success: true,
        backupPath,
      };
    } catch (error) {
      return this.handleError(error, "créer le backup");
    }
  }

  /**
   * Restaure apps.json depuis le backup le plus récent
   */
  async restoreFromBackup(): Promise<RepositoryResult> {
    if (!this.appsPath) {
      return {
        success: false,
        error: "Chemin apps.json non défini",
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
      await fs.promises.copyFile(latestBackup, this.appsPath);
      console.log(`[SunshineApps] Restored from: ${latestBackup}`);

      return { success: true };
    } catch (error) {
      return this.handleError(error, "restaurer le backup");
    }
  }

  /**
   * Écrit le fichier apps.json avec formatage JSON lisible
   */
  private async writeAppsFile(appsFile: SunshineAppsFile): Promise<void> {
    if (!this.appsPath) {
      throw new Error("Chemin apps.json non défini");
    }

    const content = JSON.stringify(appsFile, null, 2);
    await fs.promises.writeFile(this.appsPath, content, "utf-8");
    console.log(`[SunshineApps] Wrote ${appsFile.apps.length} applications to ${this.appsPath}`);
  }

  /**
   * Supprime les anciens backups pour ne garder que les MAX_BACKUPS derniers
   */
  private async rotateBackups(): Promise<void> {
    if (!this.appsPath) return;

    try {
      const appsDir = path.dirname(this.appsPath);
      const appsName = path.basename(this.appsPath);
      const backupPrefix = `${appsName}${APP_CONSTANTS.BACKUP_EXTENSION}.`;

      // Lister tous les backups
      const files = await fs.promises.readdir(appsDir);
      const backups = files
        .filter((f) => f.startsWith(backupPrefix))
        .map((f) => path.join(appsDir, f))
        .sort()
        .reverse(); // Plus récent en premier

      // Supprimer les backups au-delà de MAX_BACKUPS
      if (backups.length > this.MAX_BACKUPS) {
        const toDelete = backups.slice(this.MAX_BACKUPS);
        for (const backup of toDelete) {
          await fs.promises.unlink(backup);
          console.log(`[SunshineApps] Deleted old backup: ${backup}`);
        }
      }
    } catch (error) {
      console.warn("[SunshineApps] Failed to rotate backups:", error);
    }
  }

  /**
   * Trouve le backup le plus récent
   */
  private async findLatestBackup(): Promise<string | null> {
    if (!this.appsPath) return null;

    try {
      const appsDir = path.dirname(this.appsPath);
      const appsName = path.basename(this.appsPath);
      const backupPrefix = `${appsName}${APP_CONSTANTS.BACKUP_EXTENSION}.`;

      const files = await fs.promises.readdir(appsDir);
      const backups = files
        .filter((f) => f.startsWith(backupPrefix))
        .sort()
        .reverse(); // Plus récent en premier

      if (backups.length > 0) {
        return path.join(appsDir, backups[0]);
      }
    } catch (error) {
      console.error("[SunshineApps] Failed to find backup:", error);
    }

    return null;
  }

  /**
   * Gère les erreurs et retourne un RepositoryResult formaté
   */
  private handleError(error: unknown, action: string): RepositoryResult {
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    console.error(`[SunshineApps] Failed to ${action}:`, error);

    // Vérifier si c'est une erreur de permission
    if (errorMessage.includes("EPERM") || errorMessage.includes("EACCES")) {
      return {
        success: false,
        error: "Permission refusée. Essayez d'exécuter Eclipse en administrateur.",
      };
    }

    return {
      success: false,
      error: `Impossible de ${action}: ${errorMessage}`,
    };
  }
}