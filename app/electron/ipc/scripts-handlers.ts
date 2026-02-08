// IPC Handlers - Eclipse Scripts
// Story 7.9: Handles scripts initialization and management

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from './channels';
import { eclipseScriptsService } from '../../src/infrastructure/scripts';
import { getSharedVDDDriver, getVddDeviceId } from './vdd-handlers';

/**
 * Initialise les scripts Eclipse au démarrage de l'application
 */
export async function ensureEclipseScriptsExist(): Promise<void> {
  try {
    const result = await eclipseScriptsService.ensureScriptsExist();
    if (result.success) {
      console.log('[ScriptsHandlers] Eclipse scripts verified/created');
    } else {
      console.warn('[ScriptsHandlers] Failed to ensure Eclipse scripts:', result.error);
    }
  } catch (error) {
    console.error('[ScriptsHandlers] Error ensuring Eclipse scripts:', error);
  }
}

/**
 * Met à jour la config Eclipse avec l'Instance ID et Device ID du VDD
 * Doit être appelé APRÈS initializeVDD()
 */
export async function updateEclipseConfig(): Promise<void> {
  try {
    const vddDriver = getSharedVDDDriver();
    const vddInstanceId = vddDriver.getEclipseInstanceId();
    const vddDeviceId = getVddDeviceId();

    const result = await eclipseScriptsService.updateConfig(vddInstanceId, vddDeviceId);
    if (result.success) {
      console.log('[ScriptsHandlers] Eclipse config updated with VDD Instance ID:', vddInstanceId, 'Device ID:', vddDeviceId);
    } else {
      console.warn('[ScriptsHandlers] Failed to update Eclipse config:', result.error);
    }
  } catch (error) {
    console.error('[ScriptsHandlers] Error updating Eclipse config:', error);
  }
}

export function registerScriptsHandlers(): void {
  // Retourne les chemins des scripts
  ipcMain.handle(IPC_CHANNELS.SCRIPTS_GET_PATHS, async (): Promise<{ doScript: string; undoScript: string }> => {
    return eclipseScriptsService.getScriptPaths();
  });

  // Génère le prep-cmd pour une application Eclipse (simplifié - pas de params)
  ipcMain.handle(
    IPC_CHANNELS.SCRIPTS_GENERATE_PREP_CMD,
    async (): Promise<Array<{ do: string; undo: string; elevated: string }>> => {
      return eclipseScriptsService.generatePrepCmd();
    }
  );

  // Vérifie si les scripts existent
  ipcMain.handle(IPC_CHANNELS.SCRIPTS_EXIST, async (): Promise<boolean> => {
    return eclipseScriptsService.scriptsExist();
  });

  // Recrée les scripts (mise à jour)
  ipcMain.handle(IPC_CHANNELS.SCRIPTS_ENSURE, async (): Promise<{ success: boolean; error?: string }> => {
    return eclipseScriptsService.ensureScriptsExist();
  });

  // Exporte les presets vers le fichier JSON pour les scripts
  ipcMain.handle(
    IPC_CHANNELS.SCRIPTS_EXPORT_PRESETS,
    async (_event, presets: unknown[]): Promise<{ success: boolean; error?: string }> => {
      return eclipseScriptsService.exportPresets(presets);
    }
  );

  // Met à jour la config Eclipse (chemins outils + VDD Instance ID + Device ID)
  ipcMain.handle(IPC_CHANNELS.SCRIPTS_UPDATE_CONFIG, async (): Promise<{ success: boolean; error?: string }> => {
    const vddDriver = getSharedVDDDriver();
    const vddInstanceId = vddDriver.getEclipseInstanceId();
    const vddDeviceId = getVddDeviceId();
    return eclipseScriptsService.updateConfig(vddInstanceId, vddDeviceId);
  });

  // Exporte la config Sunshine actuelle pour les scripts
  ipcMain.handle(
    IPC_CHANNELS.SCRIPTS_EXPORT_SUNSHINE_CONFIG,
    async (_event, config: Record<string, string>): Promise<{ success: boolean; error?: string }> => {
      return eclipseScriptsService.exportSunshineConfig(config);
    }
  );

  // Exporte l'ID du preset actif pour les scripts
  ipcMain.handle(
    IPC_CHANNELS.SCRIPTS_EXPORT_ACTIVE_PRESET,
    async (_event, activePresetId: string | null): Promise<{ success: boolean; error?: string }> => {
      return eclipseScriptsService.exportActivePresetId(activePresetId);
    }
  );

  console.log('[ScriptsHandlers] Registered all handlers');
}
