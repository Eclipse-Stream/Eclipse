// Infrastructure Layer - Eclipse Setup Flag Service
// Gère le flag "setup completed" pour détecter le premier démarrage après installation
// Le flag est stocké dans le dossier config de Sunshine (supprimé à la désinstallation)

import fs from "node:fs";
import path from "node:path";
import { getSunshinePaths } from "./SunshinePathsService";

const SETUP_FLAG_FILENAME = "eclipse_setup_complete.flag";

/**
 * Service de gestion du flag de setup Eclipse
 * 
 * Le flag est stocké dans le dossier config de Sunshine ($INSTDIR/resources/tools/Sunshine/config)
 * Ce choix garantit que le flag est supprimé à la désinstallation (fait partie de $INSTDIR)
 * 
 * Flow:
 * - Premier démarrage après install → flag n'existe pas → appliquer preset Eclipse Default → créer flag
 * - Démarrages suivants → flag existe → ne pas réappliquer le preset
 * - Désinstallation → dossier $INSTDIR supprimé → flag supprimé
 * - Réinstallation → premier démarrage détecté
 */
export class EclipseSetupFlagService {
  private static instance: EclipseSetupFlagService;

  private constructor() {}

  static getInstance(): EclipseSetupFlagService {
    if (!EclipseSetupFlagService.instance) {
      EclipseSetupFlagService.instance = new EclipseSetupFlagService();
    }
    return EclipseSetupFlagService.instance;
  }

  /**
   * Retourne le chemin complet du flag
   */
  private getFlagPath(): string {
    const paths = getSunshinePaths();
    return path.join(paths.configDir, SETUP_FLAG_FILENAME);
  }

  /**
   * Vérifie si le setup initial a déjà été effectué
   * @returns true si le flag existe (setup déjà fait), false sinon
   */
  isSetupCompleted(): boolean {
    try {
      const flagPath = this.getFlagPath();
      const exists = fs.existsSync(flagPath);
      console.log(`[EclipseSetup] Flag check: ${exists ? "exists" : "not found"} at ${flagPath}`);
      return exists;
    } catch (error) {
      console.error("[EclipseSetup] Error checking setup flag:", error);
      return false; // En cas d'erreur, on considère que le setup n'a pas été fait
    }
  }

  /**
   * Marque le setup comme complété en créant le flag
   */
  markSetupCompleted(): void {
    try {
      const flagPath = this.getFlagPath();
      const flagContent = JSON.stringify({
        completedAt: new Date().toISOString(),
        version: "1.0.0",
      }, null, 2);
      
      fs.writeFileSync(flagPath, flagContent, "utf-8");
      console.log(`[EclipseSetup] Setup marked as completed: ${flagPath}`);
    } catch (error) {
      console.error("[EclipseSetup] Error creating setup flag:", error);
    }
  }

  /**
   * Supprime le flag (utilisé pour forcer un nouveau setup)
   * Note: Normalement pas nécessaire car le flag est supprimé avec l'installation
   */
  clearSetupFlag(): void {
    try {
      const flagPath = this.getFlagPath();
      if (fs.existsSync(flagPath)) {
        fs.unlinkSync(flagPath);
        console.log(`[EclipseSetup] Setup flag cleared: ${flagPath}`);
      }
    } catch (error) {
      console.error("[EclipseSetup] Error clearing setup flag:", error);
    }
  }
}

// Export singleton
export const eclipseSetupFlagService = EclipseSetupFlagService.getInstance();

/**
 * Helper functions pour usage simplifié
 */
export function isEclipseSetupCompleted(): boolean {
  return eclipseSetupFlagService.isSetupCompleted();
}

export function markEclipseSetupCompleted(): void {
  eclipseSetupFlagService.markSetupCompleted();
}
