// IPC handlers for Configuration Reset (Story 10.3)
// Réinitialise les presets écran et Sunshine aux valeurs par défaut

import { ipcMain } from "electron";
import { IPC_CHANNELS, type ConfigResetResult } from "./channels";
import { SunshineConfigManager } from "../../src/infrastructure/sunshine/SunshineConfigManager";
import { SunshineAppsRepository } from "../../src/infrastructure/sunshine/SunshineAppsRepository";
import { ProcessManager } from "../../src/infrastructure/system/process-manager";
import { ECLIPSE_DEFAULT_APP } from "../../src/domain/constants/sunshine.constants";
import { eclipseScriptsService } from "../../src/infrastructure/scripts/EclipseScriptsService";

// Singletons
let configManager: SunshineConfigManager | null = null;
let processManager: ProcessManager | null = null;
let appsRepository: SunshineAppsRepository | null = null;

/**
 * Récupère ou crée l'instance du config manager
 */
function getConfigManager(): SunshineConfigManager {
  if (!configManager) {
    configManager = new SunshineConfigManager();
  }
  return configManager;
}

/**
 * Récupère ou crée l'instance du process manager
 */
function getProcessManager(): ProcessManager {
  if (!processManager) {
    processManager = new ProcessManager();
  }
  return processManager;
}

/**
 * Récupère ou crée l'instance du repository d'apps
 */
function getAppsRepository(): SunshineAppsRepository {
  if (!appsRepository) {
    appsRepository = new SunshineAppsRepository();
  }
  return appsRepository;
}

/**
 * Valeurs par défaut Sunshine à restaurer
 * Note: On ne touche PAS à output_name (GUID du VDD) car c'est spécifique au hardware
 */
const SUNSHINE_DEFAULTS: Record<string, string> = {
  // Display - ne pas modifier output_name, c'est le GUID VDD
  fps: "60",

  // Audio
  audio_sink: "",  // Auto-détection

  // Network
  upnp: "enabled",

  // System tray (Story 9.6 - doit rester disabled pour Eclipse)
  system_tray: "disabled",
};

/**
 * Clés Sunshine à supprimer lors du reset (valeurs personnalisées)
 * Ces clés seront retirées de sunshine.conf pour revenir au comportement par défaut
 */
const SUNSHINE_KEYS_TO_REMOVE: string[] = [
  // Video - laisser Sunshine utiliser ses defaults
  "min_fps_target",
  "hevc_mode",
  "av1_mode",
  "encoder",
  "nvenc",
  "qsv",
  "resolution_downscale",

  // Audio custom
  "virtual_sink",

  // Network custom
  "port",
  "address_family",

  // Display custom (mais PAS output_name ni dd_configuration_option)
  "dd_adapter_name",
];

/**
 * Reset complet de la configuration Eclipse
 * AC4, AC7, AC8:
 * - Supprime les presets personnalisés (renderer gère le localStorage)
 * - Reset settings Sunshine aux valeurs par défaut
 * - NE TOUCHE PAS aux credentials, clients appairés, nom ordinateur
 *
 * @returns Résultat de l'opération
 */
async function resetConfiguration(): Promise<ConfigResetResult> {
  const manager = getConfigManager();
  const procManager = getProcessManager();
  const apps = getAppsRepository();

  try {
    console.log("[ConfigReset] Starting configuration reset...");

    // 1. Backup de la config Sunshine avant modification
    console.log("[ConfigReset] Creating backup of sunshine.conf...");
    const backupResult = await manager.backupConfig();
    if (!backupResult.success) {
      console.warn("[ConfigReset] Backup failed, continuing anyway:", backupResult.error);
    }

    // 2. Supprimer les clés personnalisées de sunshine.conf
    console.log("[ConfigReset] Removing custom Sunshine settings...");
    for (const key of SUNSHINE_KEYS_TO_REMOVE) {
      const deleteResult = await manager.deleteConfig(key);
      if (!deleteResult.success) {
        console.warn(`[ConfigReset] Failed to delete ${key}:`, deleteResult.error);
        // Continue anyway - some keys might not exist
      }
    }

    // 3. Écrire les valeurs par défaut
    console.log("[ConfigReset] Writing default Sunshine values...");
    for (const [key, value] of Object.entries(SUNSHINE_DEFAULTS)) {
      const writeResult = await manager.writeConfig(key, value);
      if (!writeResult.success) {
        console.error(`[ConfigReset] Failed to write ${key}=${value}:`, writeResult.error);
        return {
          success: false,
          error: `Impossible d'écrire ${key}: ${writeResult.error}`,
        };
      }
    }

    // 4. Reset des applications Sunshine
    // - Supprimer l'app "Desktop" (remplacée par Eclipse)
    // - S'assurer que l'app Eclipse existe avec les bons scripts
    // - Garder les apps auto-détectées par Sunshine (Steam, Epic, etc.) mais leur appliquer les scripts Eclipse
    console.log("[ConfigReset] Resetting Sunshine applications...");
    try {
      await apps.backupApps();
      const appsFile = await apps.readApps();

      // Supprimer l'app "Desktop" si elle existe
      const desktopIndex = appsFile.apps.findIndex(
        (app) => app.name.toLowerCase() === "desktop"
      );
      if (desktopIndex !== -1) {
        appsFile.apps.splice(desktopIndex, 1);
        console.log("[ConfigReset] Removed Desktop app");
      }

      // Vérifier/créer l'app Eclipse
      const eclipseIndex = appsFile.apps.findIndex(
        (app) => app.name.toLowerCase() === "eclipse"
      );

      const eclipseScripts = eclipseScriptsService.generatePrepCmd();

      if (eclipseIndex === -1) {
        // Créer l'app Eclipse par défaut avec les scripts
        const eclipseApp = {
          ...ECLIPSE_DEFAULT_APP,
          "prep-cmd": eclipseScripts,
        };
        appsFile.apps.unshift(eclipseApp); // En premier
        console.log("[ConfigReset] Created Eclipse app");
      } else {
        // Mettre à jour les scripts de l'app Eclipse existante
        appsFile.apps[eclipseIndex]["prep-cmd"] = eclipseScripts;
        console.log("[ConfigReset] Updated Eclipse app scripts");
      }

      // Appliquer les scripts Eclipse à toutes les autres apps
      for (const app of appsFile.apps) {
        if (app.name.toLowerCase() === "eclipse") continue;

        // Vérifier si l'app a déjà les scripts Eclipse
        const hasEclipseScripts = app["prep-cmd"]?.some(
          (cmd) => cmd.do?.includes("ECLIPSE_MANAGED_APP")
        );

        if (!hasEclipseScripts) {
          // Ajouter les scripts Eclipse au début des prep-cmd existants
          const existingPrepCmd = app["prep-cmd"] || [];
          app["prep-cmd"] = [...eclipseScripts, ...existingPrepCmd];
          console.log(`[ConfigReset] Added Eclipse scripts to app: ${app.name}`);
        }
      }

      // Écrire le fichier
      const appsPath = apps.getAppsPath();
      if (appsPath) {
        const fs = await import("node:fs/promises");
        await fs.writeFile(appsPath, JSON.stringify(appsFile, null, 2), "utf-8");
        console.log("[ConfigReset] Applications reset completed");
      }
    } catch (appsError) {
      console.warn("[ConfigReset] Failed to reset apps, continuing:", appsError);
      // Ne pas échouer le reset complet pour ça
    }

    // 5. Redémarrer Sunshine pour appliquer les changements
    console.log("[ConfigReset] Restarting Sunshine to apply changes...");
    const restartResult = await procManager.restartSunshine();
    if (!restartResult.success) {
      console.error("[ConfigReset] Sunshine restart failed:", restartResult.error);
      return {
        success: false,
        error: `Configuration réinitialisée mais Sunshine n'a pas redémarré: ${restartResult.error}`,
      };
    }

    // 6. Petite attente pour que Sunshine lise bien la config (évite le flash du tray)
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log("[ConfigReset] Configuration reset completed successfully");
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("[ConfigReset] Unexpected error:", error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Enregistre les handlers IPC pour la réinitialisation de la configuration
 */
export function registerConfigHandlers(): void {
  // Reset configuration (Story 10.3)
  ipcMain.handle(
    IPC_CHANNELS.CONFIG_RESET,
    async (): Promise<ConfigResetResult> => {
      console.log("[IPC] Config Reset request");
      return await resetConfiguration();
    }
  );

  console.log("[IPC] Config handlers registered");
}
