// Infrastructure Layer - Sunshine Paths Service
// Résout dynamiquement les chemins vers Sunshine portable (resources/tools/Sunshine)
// Pattern similaire à VirtualDisplayDriver.getToolsPath()

import path from "node:path";
import fs from "node:fs";
import { app } from "electron";
import { SUNSHINE_RELATIVE_PATHS } from "@domain/constants/sunshine.constants";

/**
 * Interface des chemins Sunshine résolus
 */
export interface SunshinePaths {
  /** Dossier racine de Sunshine */
  sunshineDir: string;
  /** Exécutable sunshine.exe */
  sunshineExe: string;
  /** Dossier config */
  configDir: string;
  /** Fichier sunshine.conf */
  configFile: string;
  /** Fichier apps.json */
  appsJson: string;
  /** Fichier sunshine.log */
  logFile: string;
  /** Dossier tools */
  toolsDir: string;
  /** audio-info.exe */
  audioInfoExe: string;
  /** dxgi-info.exe */
  dxgiInfoExe: string;
}

/**
 * Service de résolution des chemins Sunshine
 * Gère les différences entre dev et prod (packaged)
 */
export class SunshinePathsService {
  private static instance: SunshinePathsService;
  private cachedPaths: SunshinePaths | null = null;

  private constructor() {}

  /**
   * Singleton pattern
   */
  static getInstance(): SunshinePathsService {
    if (!SunshinePathsService.instance) {
      SunshinePathsService.instance = new SunshinePathsService();
    }
    return SunshinePathsService.instance;
  }

  /**
   * Résout le chemin vers le dossier tools (dev vs prod)
   * En dev: app/resources/tools/
   * En prod: resources/resources/tools/ (dans le package)
   */
  private getToolsBasePath(): string {
    const isDev = !app.isPackaged;

    if (isDev) {
      return path.join(app.getAppPath(), "resources", "tools");
    } else {
      return path.join(process.resourcesPath, "resources", "tools");
    }
  }

  /**
   * Retourne tous les chemins Sunshine résolus
   */
  getPaths(): SunshinePaths {
    if (this.cachedPaths) {
      return this.cachedPaths;
    }

    const toolsBase = this.getToolsBasePath();

    this.cachedPaths = {
      sunshineDir: path.join(toolsBase, SUNSHINE_RELATIVE_PATHS.SUNSHINE_DIR),
      sunshineExe: path.join(toolsBase, SUNSHINE_RELATIVE_PATHS.SUNSHINE_EXE),
      configDir: path.join(toolsBase, SUNSHINE_RELATIVE_PATHS.CONFIG_DIR),
      configFile: path.join(toolsBase, SUNSHINE_RELATIVE_PATHS.CONFIG_FILE),
      appsJson: path.join(toolsBase, SUNSHINE_RELATIVE_PATHS.APPS_JSON),
      logFile: path.join(toolsBase, SUNSHINE_RELATIVE_PATHS.LOG_FILE),
      toolsDir: path.join(toolsBase, SUNSHINE_RELATIVE_PATHS.TOOLS_DIR),
      audioInfoExe: path.join(toolsBase, SUNSHINE_RELATIVE_PATHS.AUDIO_INFO_EXE),
      dxgiInfoExe: path.join(toolsBase, SUNSHINE_RELATIVE_PATHS.DXGI_INFO_EXE),
    };

    console.log("[SunshinePaths] Resolved paths:", {
      sunshineDir: this.cachedPaths.sunshineDir,
      configFile: this.cachedPaths.configFile,
    });

    return this.cachedPaths;
  }

  /**
   * Vérifie si Sunshine portable est installé
   */
  isSunshineInstalled(): boolean {
    const paths = this.getPaths();
    return fs.existsSync(paths.sunshineExe);
  }

  /**
   * Vérifie si le fichier de config existe
   */
  configExists(): boolean {
    const paths = this.getPaths();
    return fs.existsSync(paths.configFile);
  }

  /**
   * Vérifie si apps.json existe
   */
  appsJsonExists(): boolean {
    const paths = this.getPaths();
    return fs.existsSync(paths.appsJson);
  }

  /**
   * Vérifie si audio-info.exe existe
   */
  audioInfoExists(): boolean {
    const paths = this.getPaths();
    return fs.existsSync(paths.audioInfoExe);
  }

  /**
   * Vérifie si les logs Sunshine existent
   */
  logFileExists(): boolean {
    const paths = this.getPaths();
    return fs.existsSync(paths.logFile);
  }

  /**
   * Vérifie si Sunshine a des credentials configurés
   * Sunshine stocke les credentials dans credentials.json dans le dossier config
   * Si ce fichier n'existe pas ou est vide, Sunshine n'a pas de credentials
   */
  hasCredentialsConfigured(): boolean {
    const paths = this.getPaths();
    const credentialsFile = path.join(paths.configDir, "credentials.json");
    
    if (!fs.existsSync(credentialsFile)) {
      console.log("[SunshinePaths] credentials.json does not exist - no credentials configured");
      return false;
    }
    
    try {
      const content = fs.readFileSync(credentialsFile, "utf-8").trim();
      // Fichier vide ou JSON vide = pas de credentials
      if (!content || content === "{}" || content === "[]") {
        console.log("[SunshinePaths] credentials.json is empty - no credentials configured");
        return false;
      }
      
      // Vérifier si le JSON contient des données valides
      const data = JSON.parse(content);
      const hasData = Object.keys(data).length > 0;
      console.log(`[SunshinePaths] credentials.json has data: ${hasData}`);
      return hasData;
    } catch (error) {
      console.warn("[SunshinePaths] Error reading credentials.json:", error);
      return false;
    }
  }

  /**
   * Invalide le cache des chemins (utile pour les tests)
   */
  invalidateCache(): void {
    this.cachedPaths = null;
  }
}

// Export singleton pour faciliter l'usage
export const sunshinePathsService = SunshinePathsService.getInstance();

/**
 * Helper function pour obtenir les chemins rapidement
 */
export function getSunshinePaths(): SunshinePaths {
  return sunshinePathsService.getPaths();
}
