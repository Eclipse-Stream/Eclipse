// IPC handlers for Sunshine Preset operations
// Story 5.4: Détection config & Story 5.5: Application preset

import { ipcMain } from "electron";
import { IPC_CHANNELS, type SunshineDetectedConfig, type SunshinePresetApplyResult, type SunshineFindMatchingResult } from "./channels";
import { SunshineConfigManager } from "../../src/infrastructure/sunshine/SunshineConfigManager";
import { SunshinePresetApplicator } from "../../src/infrastructure/sunshine/SunshinePresetApplicator";
import { ProcessManager } from "../../src/infrastructure/system/process-manager";
import type { SunshinePreset } from "../../src/domain/types";
import { DEFAULT_FPS, DEFAULT_BITRATE } from "../../src/domain/types";
import { getVddDeviceId } from "./vdd-handlers";

// Eclipse Default Preset (copied from useSunshinePresetStore to avoid circular deps)
const ECLIPSE_DEFAULT_PRESET: SunshinePreset = {
  id: "eclipse-default",
  name: "Eclipse Default",
  type: "simple",
  display: {
    mode: "enable",
    resolutionStrategy: "moonlight",
    fps: DEFAULT_FPS,
    bitrate: DEFAULT_BITRATE,
  },
  audio: {
    mode: "moonlight",
  },
  network: {
    upnp: false,
  },
  inputs: {
    keyboard: true,
    mouse: true,
    gamepad: true,
  },
  isReadOnly: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

// Singletons
let configManager: SunshineConfigManager | null = null;
let presetApplicator: SunshinePresetApplicator | null = null;
let processManager: ProcessManager | null = null;

function getConfigManager(): SunshineConfigManager {
  if (!configManager) {
    configManager = new SunshineConfigManager();
  }
  return configManager;
}

function getPresetApplicator(): SunshinePresetApplicator {
  if (!presetApplicator) {
    presetApplicator = new SunshinePresetApplicator(getConfigManager());
  }
  return presetApplicator;
}

function getProcessManager(): ProcessManager {
  if (!processManager) {
    processManager = new ProcessManager();
  }
  return processManager;
}

/**
 * Enregistre les handlers IPC pour les opérations de preset Sunshine
 */
export function registerSunshinePresetHandlers(): void {
  const manager = getConfigManager();
  const applicator = getPresetApplicator();
  const procManager = getProcessManager();

  // Story 5.4: Détecter la configuration actuelle de Sunshine
  ipcMain.handle(
    IPC_CHANNELS.SUNSHINE_PRESET_DETECT_CONFIG,
    async (): Promise<SunshineDetectedConfig> => {
      console.log("[IPC] Sunshine Preset Detect Config request");
      try {
        const config = await manager.readConfig();
        return {
          success: true,
          config,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
        console.error("[IPC] Detect config error:", error);
        return {
          success: false,
          error: errorMessage,
        };
      }
    }
  );

  // Story 5.5: Appliquer un preset (Flush + Apply + Restart)
  ipcMain.handle(
    IPC_CHANNELS.SUNSHINE_PRESET_APPLY,
    async (
      _event,
      payload: { preset: SunshinePreset; currentConfig?: Record<string, string> }
    ): Promise<SunshinePresetApplyResult> => {
      console.log("[IPC] ========================================");
      console.log("[IPC] Sunshine Preset Apply request:", payload.preset.name);
      
      try {
        // Vérifier que le chemin config est valide
        const configPath = manager.getConfigPath();
        if (!configPath) {
          console.error("[IPC] ERROR: No config path available!");
          return {
            success: false,
            error: "sunshine.conf non trouvé. Vérifiez l'installation de Sunshine portable.",
          };
        }

        // BUG FIX: Injecter le Device ID du VDD si manquant
        // Ceci garantit que même lors d'une activation manuelle depuis l'UI,
        // le preset aura toujours le bon Device ID du VDD Eclipse
        const vddDeviceId = getVddDeviceId();
        let presetToApply = payload.preset;
        
        if (!presetToApply.display.deviceId && vddDeviceId) {
          console.log(`[IPC] Injecting VDD Device ID "${vddDeviceId}" into preset "${presetToApply.name}"`);
          presetToApply = {
            ...presetToApply,
            display: {
              ...presetToApply.display,
              deviceId: vddDeviceId,
            },
          };
        }

        // 1. Appliquer le preset (Flush + Apply + Write)
        console.log("[IPC] Step 1: Applying preset...");
        const applyResult = await applicator.applyPreset(presetToApply, {
          currentConfig: payload.currentConfig,
          restartSunshine: false, // On gère le restart séparément
        });

        if (!applyResult.success) {
          console.error("[IPC] Apply failed:", applyResult.error);
          return applyResult;
        }
        console.log("[IPC] Step 1 OK: Preset applied to config file");

        // 2. Redémarrer Sunshine
        console.log("[IPC] Step 2: Restarting Sunshine...");
        const restartResult = await procManager.restartSunshine();

        if (!restartResult.success) {
          console.error("[IPC] Sunshine restart failed:", restartResult.error);
          return {
            success: false,
            error: `Configuration appliquée mais Sunshine n'a pas redémarré: ${restartResult.error}`,
            phase: "restart",
          };
        }

        console.log("[IPC] Step 2 OK: Sunshine restarted");
        console.log("[IPC] Preset applied successfully!");
        console.log("[IPC] ========================================");
        return { success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
        console.error("[IPC] Apply preset EXCEPTION:", error);
        return {
          success: false,
          error: errorMessage,
        };
      }
    }
  );

  // Story 5.5: Écrire une config complète (pour mode Expert)
  ipcMain.handle(
    IPC_CHANNELS.SUNSHINE_PRESET_WRITE_CONFIG,
    async (
      _event,
      payload: { config: Record<string, string>; restart?: boolean }
    ): Promise<SunshinePresetApplyResult> => {
      console.log("[IPC] Sunshine Preset Write Config request");
      try {
        const writeResult = await applicator.writeFullConfig(payload.config);

        if (!writeResult.success) {
          return writeResult;
        }

        if (payload.restart) {
          console.log("[IPC] Restarting Sunshine after config write...");
          const restartResult = await procManager.restartSunshine();

          if (!restartResult.success) {
            return {
              success: false,
              error: `Configuration écrite mais Sunshine n'a pas redémarré: ${restartResult.error}`,
              phase: "restart",
            };
          }
        }

        return { success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
        console.error("[IPC] Write config error:", error);
        return {
          success: false,
          error: errorMessage,
        };
      }
    }
  );

  // Détecter quels presets correspondent à la config actuelle de Sunshine
  ipcMain.handle(
    IPC_CHANNELS.SUNSHINE_PRESET_FIND_MATCHING,
    async (
      _event,
      presets: SunshinePreset[]
    ): Promise<SunshineFindMatchingResult> => {
      console.log("[IPC] Sunshine Preset Find Matching request");
      try {
        // Lire la config actuelle
        const config = await manager.readConfig();
        if (!config || Object.keys(config).length === 0) {
          console.log("[IPC] No Sunshine config found");
          return {
            success: true,
            presetIds: [],
            presetId: null,
          };
        }

        // BUG FIX: Injecter le Device ID du VDD dans les presets avant comparaison
        // Ceci garantit que la comparaison utilise le bon Device ID actuel
        const vddDeviceId = getVddDeviceId();
        const presetsWithDeviceId = presets.map(p => {
          if (!p.display.deviceId && vddDeviceId) {
            return {
              ...p,
              display: {
                ...p.display,
                deviceId: vddDeviceId,
              },
            };
          }
          return p;
        });

        // Trouver TOUS les presets correspondants
        const matchingPresetIds = applicator.findAllMatchingPresets(config, presetsWithDeviceId);

        console.log(`[IPC] Found ${matchingPresetIds.length} matching presets`);

        return {
          success: true,
          presetIds: matchingPresetIds,
          presetId: matchingPresetIds.length > 0 ? matchingPresetIds[0] : null,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
        console.error("[IPC] Find matching preset error:", error);
        return {
          success: false,
          presetIds: [],
          presetId: null,
          error: errorMessage,
        };
      }
    }
  );

  console.log("[IPC] Sunshine Preset handlers registered");
}

/**
 * Applique le preset Eclipse Default au premier démarrage
 * Appelé depuis main.ts après que Sunshine soit prêt
 * Bug Fix: Redémarre Sunshine après application pour que les changements prennent effet
 */
export async function applyEclipseDefaultPreset(): Promise<void> {
  try {
    const manager = getConfigManager();
    const applicator = getPresetApplicator();
    const procManager = getProcessManager();
    
    console.log("[SunshinePreset] Applying Eclipse Default preset on first startup...");
    
    // Récupérer le Device ID du VDD (déjà détecté lors de initializeVDD)
    const vddDeviceId = getVddDeviceId();
    console.log(`[SunshinePreset] VDD Device ID: ${vddDeviceId || "(not detected)"}`);
    
    // Créer une copie du preset avec le Device ID injecté
    const presetWithDeviceId: SunshinePreset = {
      ...ECLIPSE_DEFAULT_PRESET,
      display: {
        ...ECLIPSE_DEFAULT_PRESET.display,
        deviceId: vddDeviceId || undefined, // Injecter le Device ID du VDD
      },
    };
    
    // Lire la config actuelle
    const currentConfig = await manager.readConfig();
    
    // Appliquer le preset avec Device ID (écrire dans sunshine.conf)
    const result = await applicator.applyPreset(presetWithDeviceId, {
      currentConfig,
      restartSunshine: false, // On gère le restart manuellement après
    });
    
    if (!result.success) {
      console.warn("[SunshinePreset] Failed to apply Eclipse Default preset:", result.error);
      return;
    }
    
    console.log("[SunshinePreset] Eclipse Default preset written to config");
    
    // Bug Fix: Redémarrer Sunshine pour charger la nouvelle config
    console.log("[SunshinePreset] Restarting Sunshine to apply Eclipse Default preset...");
    const restartResult = await procManager.restartSunshine();
    
    if (restartResult.success) {
      console.log("[SunshinePreset] Sunshine restarted - Eclipse Default preset now active!");
    } else {
      console.warn("[SunshinePreset] Sunshine restart failed:", restartResult.error);
      console.warn("[SunshinePreset] Config is written but may not be active until manual restart");
    }
  } catch (error) {
    console.error("[SunshinePreset] Error applying Eclipse Default preset:", error);
  }
}
