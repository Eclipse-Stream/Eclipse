// IPC handlers for Virtual Display Driver
// NOTE: Ce fichier est un "passe-plat" IPC. La logique métier est dans VirtualDisplayDriver.
import { ipcMain, app } from "electron";
import { writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { readFile } from "fs/promises";
import { IPC_CHANNELS, type VDDOperationResult, type VDDResolutionParams } from "./channels";
import { VirtualDisplayDriver } from "../../src/infrastructure/drivers";
import { ProcessManager } from "../../src/infrastructure/system/process-manager";
import { configureSunshineWithVDD } from "./sunshine-config-handlers";
import { notificationService } from "../services/notification-service";

// Singleton ProcessManager pour le redémarrage de Sunshine
const processManager = new ProcessManager();

// Singleton instance du driver
let vddDriver: VirtualDisplayDriver | null = null;

// VDD Device ID stocké (persistant)
let cachedVddDeviceId: string | null = null;

// Chemin du fichier de config pour stocker le VDD device_id
// IMPORTANT: Utiliser "Eclipse" (majuscule) pour cohérence avec le reste de l'app
const getVddConfigPath = () => path.join(process.env.APPDATA || '', 'Eclipse', "vdd-config.json");

interface VddConfig {
  vddDeviceId: string | null;
  lastUpdated: string;
}

/**
 * Récupère ou crée l'instance du driver VDD
 */
function getVDDDriver(): VirtualDisplayDriver {
  if (!vddDriver) {
    vddDriver = new VirtualDisplayDriver();
  }
  return vddDriver;
}

/**
 * Expose le driver VDD pour les autres modules (Story 3.4)
 */
export function getSharedVDDDriver(): VirtualDisplayDriver {
  return getVDDDriver();
}

/**
 * Charge la config VDD depuis le fichier persistant
 */
async function loadVddConfig(): Promise<VddConfig | null> {
  try {
    const configPath = getVddConfigPath();
    if (!existsSync(configPath)) {
      return null;
    }
    const content = await readFile(configPath, { encoding: "utf-8" });
    return JSON.parse(content) as VddConfig;
  } catch (error) {
    console.error("[VDD] Failed to load VDD config:", error);
    return null;
  }
}

/**
 * Sauvegarde la config VDD dans le fichier persistant
 */
async function saveVddConfig(deviceId: string | null): Promise<void> {
  try {
    const configPath = getVddConfigPath();
    const config: VddConfig = {
      vddDeviceId: deviceId,
      lastUpdated: new Date().toISOString(),
    };
    await writeFile(configPath, JSON.stringify(config, null, 2), { encoding: "utf-8" });
    console.log("[VDD] VDD config saved:", configPath);
  } catch (error) {
    console.error("[VDD] Failed to save VDD config:", error);
  }
}

/**
 * Récupère le VDD device_id (depuis cache ou fichier)
 */
export function getVddDeviceId(): string | null {
  return cachedVddDeviceId;
}

/**
 * Détecte le Device ID Sunshine du VDD Eclipse.
 * Délègue la logique métier au VirtualDisplayDriver.
 *
 * IMPORTANT: Redémarre Sunshine pour qu'il détecte le nouvel écran VDD.
 * Sans redémarrage, Sunshine ne voit pas le VDD et les logs ne contiennent pas son ID.
 *
 * @returns Le device_id Sunshine du VDD ou null si non détecté
 */
export async function detectEclipseDeviceId(): Promise<string | null> {
  const driver = getVDDDriver();

  // Fonction de redémarrage Sunshine injectée dans le driver
  const restartSunshineFn = async () => {
    return await processManager.restartSunshine();
  };

  // Déléguer la logique métier au driver (avec redémarrage Sunshine)
  const vddDeviceId = await driver.detectSunshineDeviceId(restartSunshineFn);

  if (vddDeviceId) {
    cachedVddDeviceId = vddDeviceId;
    await saveVddConfig(vddDeviceId);
  }

  return vddDeviceId;
}

/**
 * Initialise le driver VDD au démarrage de l'application.
 * 
 * Flow optimise pour l'UX:
 * 1. Charger le Device ID sauvegarde (si existant)
 * 2. Initialiser le driver (installe si necessaire)
 * 3. Si pas de Device ID sauvegarde -> detecter (Enable VDD -> Lire logs -> Disable VDD)
 * 4. Sinon -> utiliser l'ID sauvegarde (evite le clignotement d'ecran inutile)
 * 
 * Note: Le bouton "Refresh" permet de forcer une nouvelle detection si besoin.
 */
export async function initializeVDD(): Promise<void> {
  console.log("[VDD] ========================================");
  console.log("[VDD] Starting VDD initialization...");
  console.log("[VDD] ========================================");
  const driver = getVDDDriver();
  
  // 1. Charger le Device ID sauvegarde AVANT d'initialiser le driver
  const savedConfig = await loadVddConfig();
  const savedDeviceId = savedConfig?.vddDeviceId || null;
  
  if (savedDeviceId) {
    console.log(`[VDD] Found saved Device ID: ${savedDeviceId}`);
  } else {
    console.log("[VDD] No saved Device ID found, will need to detect");
  }
  
  // 2. Initialiser le driver (installe si necessaire)
  const result = await driver.initialize();
  if (!result.success) {
    console.error("[VDD] Failed to initialize VDD:", result.error);
    return;
  }
  console.log("[VDD] VDD driver initialized successfully");
  
  // 3. Si driver reinstalle -> forcer la detection (l'ancien Device ID n'est plus valide)
  if (result.wasInstalled) {
    console.log("[VDD] Driver was (re)installed, forcing device ID detection...");
    // L'ecran est deja allume apres installation, detectEclipseDeviceId() va le detecter puis l'eteindre
  } else if (savedDeviceId) {
    // 4. Driver existant + Device ID sauvegarde -> utiliser directement (pas de Enable/Disable)
    cachedVddDeviceId = savedDeviceId;
    console.log("[VDD] ========================================");
    console.log(`[VDD] VDD INITIALIZATION COMPLETE (using saved ID)`);
    console.log(`[VDD] Eclipse Device ID: ${savedDeviceId}`);
    console.log("[VDD] ========================================");
    return;
  }
  
  // 5. Pas de Device ID sauvegarde OU driver reinstalle -> faire la detection complete
  console.log("[VDD] Detecting Eclipse Device ID (first time or after driver change)...");
  const deviceId = await detectEclipseDeviceId();
  
  if (deviceId) {
    console.log("[VDD] ========================================");
    console.log(`[VDD] VDD INITIALIZATION COMPLETE`);
    console.log(`[VDD] Eclipse Device ID: ${deviceId}`);
    console.log("[VDD] ========================================");
  } else {
    console.warn("[VDD] ========================================");
    console.warn("[VDD] VDD INITIALIZATION: Device ID not detected");
    console.warn("[VDD] ========================================");
  }
}

/**
 * Désactive l'écran VDD à la fermeture de l'application.
 * Évite de laisser un écran fantôme actif après la fermeture.
 */
export async function shutdownVDD(): Promise<void> {
  console.log("[VDD] Shutting down VDD (disabling screen)...");
  const driver = getVDDDriver();
  const result = await driver.disable();

  if (result.success) {
    console.log("[VDD] VDD screen disabled successfully");
  } else {
    console.warn("[VDD] Failed to disable VDD screen:", result.error);
  }
}

/**
 * Enregistre tous les handlers IPC pour le VDD
 */
export function registerVDDHandlers(): void {
  const driver = getVDDDriver();

  // Enable virtual display (Story 3.4: auto-configure Sunshine, Story 9.5: notification)
  ipcMain.handle(IPC_CHANNELS.VDD_ENABLE, async (_event, presetName?: string): Promise<VDDOperationResult> => {
    console.log("[IPC] VDD Enable request");

    // 1. Activer le VDD
    const enableResult = await driver.enable();
    if (!enableResult.success) {
      return enableResult;
    }

    // 2. Configurer automatiquement Sunshine avec le GUID du VDD (Story 3.4)
    // Attendre que Windows détecte l'écran
    console.log("[IPC] VDD enabled, configuring Sunshine...");
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const configResult = await configureSunshineWithVDD(driver);
    if (!configResult.success) {
      // Ne pas faire échouer l'enable, juste logger un warning
      console.warn("[IPC] Failed to configure Sunshine:", configResult.error);
      // On retourne quand même success car le VDD est bien activé
    } else {
      console.log("[IPC] Sunshine configured successfully");
    }

    // 3. Story 9.5 (AC4): Notification VDD activé manuellement
    notificationService.vddEnabled(presetName || "virtuel");

    return enableResult;
  });

  // Disable virtual display (Story 9.5: notification)
  ipcMain.handle(IPC_CHANNELS.VDD_DISABLE, async (): Promise<VDDOperationResult> => {
    console.log("[IPC] VDD Disable request");
    const result = await driver.disable();

    // Story 9.5 (AC5): Notification VDD désactivé manuellement
    if (result.success) {
      notificationService.vddDisabled();
    }

    return result;
  });

  // Get status
  ipcMain.handle(IPC_CHANNELS.VDD_GET_STATUS, async (): Promise<string> => {
    console.log("[IPC] VDD Get Status request");
    return await driver.getStatus();
  });

  // Set resolution
  ipcMain.handle(
    IPC_CHANNELS.VDD_SET_RESOLUTION,
    async (_event, params: VDDResolutionParams): Promise<VDDOperationResult> => {
      console.log(`[IPC] VDD Set Resolution: ${params.width}x${params.height}@${params.refreshRate}Hz`);
      return await driver.setResolution(
        { width: params.width, height: params.height },
        params.refreshRate
      );
    }
  );

  // Set HDR
  ipcMain.handle(
    IPC_CHANNELS.VDD_SET_HDR,
    async (_event, enabled: boolean): Promise<VDDOperationResult> => {
      console.log(`[IPC] VDD Set HDR: ${enabled}`);
      return await driver.setHDR(enabled);
    }
  );

  // Get device GUID - retourne le VDD device_id Sunshine (pas le GUID Windows)
  ipcMain.handle(IPC_CHANNELS.VDD_GET_DEVICE_GUID, async (): Promise<string | null> => {
    console.log("[IPC] VDD Get Device GUID request");
    // Retourner le device_id Sunshine stocké, pas le GUID Windows du driver
    return cachedVddDeviceId;
  });

  // Get current display settings (resolution and refresh rate)
  ipcMain.handle(IPC_CHANNELS.VDD_GET_CURRENT_SETTINGS, async () => {
    console.log("[IPC] VDD Get Current Settings request");
    return await driver.getCurrentDisplaySettings();
  });

  // Story 3.1: Update config (bascule intelligente - pas de status check)
  ipcMain.handle(
    IPC_CHANNELS.VDD_UPDATE_CONFIG,
    async (_event, params: VDDResolutionParams): Promise<VDDOperationResult> => {
      console.log(`[IPC] VDD Update Config: ${params.width}x${params.height}@${params.refreshRate}Hz`);
      return await driver.updateConfig(
        { width: params.width, height: params.height },
        params.refreshRate
      );
    }
  );

  // Refresh Device ID - même workflow que initializeVDD (check driver + détection ID)
  ipcMain.handle(IPC_CHANNELS.VDD_REFRESH_DEVICE_ID, async (): Promise<string | null> => {
    console.log("[IPC] VDD Refresh Device ID request - full workflow like startup");
    
    // Réinitialiser le cache pour forcer une nouvelle détection
    cachedVddDeviceId = null;
    
    // Relancer le même workflow que initializeVDD
    await initializeVDD();
    
    return cachedVddDeviceId;
  });

  console.log("[IPC] VDD handlers registered");
}
