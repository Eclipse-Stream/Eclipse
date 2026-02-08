// IPC handlers for Sunshine Configuration
// Story 3.4: Configuration automatique output_name

import { ipcMain } from "electron";
import { IPC_CHANNELS, type SunshineConfigResult } from "./channels";
import { SunshineConfigManager } from "../../src/infrastructure/sunshine/SunshineConfigManager";
import { VirtualDisplayDriver } from "../../src/infrastructure/drivers";
import { ProcessManager } from "../../src/infrastructure/system/process-manager";

// Singletons
let configManager: SunshineConfigManager | null = null;
let processManager: ProcessManager | null = null;

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
 * Configure automatiquement Sunshine avec le GUID du VDD
 * Flow complet: GUID → backup → write config → restart Sunshine
 *
 * @param vddDriver - Instance du driver VDD pour récupérer le GUID
 * @returns Résultat de l'opération
 */
export async function configureSunshineWithVDD(
  vddDriver: VirtualDisplayDriver
): Promise<SunshineConfigResult> {
  const manager = getConfigManager();
  const procManager = getProcessManager();

  try {
    console.log("[SunshineConfig] Starting VDD → Sunshine configuration...");

    // Vérifier que sunshine.conf existe
    const configPath = manager.getConfigPath();
    if (!configPath) {
      console.warn("[SunshineConfig] Sunshine config not found, skipping configuration");
      return {
        success: false,
        error: "sunshine.conf non trouvé. Sunshine est-il installé?",
      };
    }

    // 1. Récupérer le GUID du VDD (avec retry)
    let guid: string | null = null;
    const maxRetries = 3;
    const retryDelay = 1000; // 1 seconde

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      guid = await vddDriver.getDeviceGUID();

      if (guid) {
        console.log(`[SunshineConfig] Got GUID on attempt ${attempt}: ${guid}`);
        break;
      }

      console.log(`[SunshineConfig] GUID null, retry ${attempt}/${maxRetries}...`);

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }

    if (!guid) {
      return {
        success: false,
        error: "Impossible de récupérer le GUID du VDD après plusieurs tentatives",
      };
    }

    // 2. Mettre à jour output_name (avec backup automatique - NFR19)
    const updateResult = await manager.updateOutputName(guid);
    if (!updateResult.success) {
      return updateResult;
    }

    // 3. Redémarrer Sunshine pour appliquer les changements
    console.log("[SunshineConfig] Restarting Sunshine to apply config...");
    const restartResult = await procManager.restartSunshine();

    if (!restartResult.success) {
      console.error("[SunshineConfig] Sunshine restart failed, rolling back config");

      // Rollback: restaurer le backup
      const rollbackResult = await manager.restoreFromBackup();
      if (!rollbackResult.success) {
        console.error("[SunshineConfig] Rollback also failed:", rollbackResult.error);
      }

      return {
        success: false,
        error: `Configuration mise à jour mais Sunshine n'a pas redémarré: ${restartResult.error}`,
      };
    }

    console.log(`[SunshineConfig] Success! output_name set to ${guid}, Sunshine restarted`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("[SunshineConfig] Unexpected error:", error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Enregistre les handlers IPC pour la configuration Sunshine
 */
export function registerSunshineConfigHandlers(vddDriver: VirtualDisplayDriver): void {
  const manager = getConfigManager();

  // Configure Sunshine avec le GUID du VDD (flow complet)
  ipcMain.handle(
    IPC_CHANNELS.SUNSHINE_CONFIG_WITH_VDD,
    async (): Promise<SunshineConfigResult> => {
      console.log("[IPC] Sunshine Config With VDD request");
      return await configureSunshineWithVDD(vddDriver);
    }
  );

  // Lire la configuration Sunshine (debug/info)
  ipcMain.handle(
    IPC_CHANNELS.SUNSHINE_CONFIG_READ,
    async (): Promise<Record<string, string>> => {
      console.log("[IPC] Sunshine Config Read request");
      return await manager.readConfig();
    }
  );

  // Restaurer depuis le backup
  ipcMain.handle(
    IPC_CHANNELS.SUNSHINE_CONFIG_RESTORE,
    async (): Promise<SunshineConfigResult> => {
      console.log("[IPC] Sunshine Config Restore request");
      return await manager.restoreFromBackup();
    }
  );

  console.log("[IPC] Sunshine Config handlers registered");
}
