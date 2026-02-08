// IPC handlers for Display Management (Story 3.2)
// Détection des écrans physiques Windows avec Device IDs depuis Sunshine

import { ipcMain, screen } from "electron";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { IPC_CHANNELS } from "./channels";
import type { PhysicalScreen } from "../../src/domain/types/screen-preset";
import { VIRTUAL_DISPLAY_KEYWORDS } from "../../src/domain/constants";
import { getSunshinePaths } from "../../src/infrastructure/sunshine/SunshinePathsService";

/**
 * Structure d'un display Sunshine extrait des logs
 */
interface SunshineDisplayInfo {
  device_id: string;      // GUID: {xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx}
  display_name: string;   // Ex: \\.\DISPLAY1
  friendly_name?: string; // Ex: "MSI G271"
}

/**
 * Récupère les device_id Sunshine depuis les logs
 * Source: C:\Program Files\Sunshine\config\sunshine.log
 * 
 * Les logs contiennent des blocs JSON avec device_id et display_name
 * Exporté pour être utilisé par vdd-handlers.ts
 */
export async function getSunshineDisplays(): Promise<Map<string, SunshineDisplayInfo>> {
  const displays = new Map<string, SunshineDisplayInfo>();
  
  try {
    const sunshinePaths = getSunshinePaths();
    const logPath = sunshinePaths.logFile;

    if (!existsSync(logPath)) {
      console.log("[Display] Sunshine log not found:", logPath);
      return displays;
    }
    
    const logContent = await readFile(logPath, { encoding: "utf-8" });
    
    // Pattern pour trouver les paires device_id / display_name dans les logs
    // Format: "device_id": "{GUID}",\n    "display_name": "\\.\DISPLAY1"
    const pattern = /"device_id":\s*"(\{[^}]+\})",\s*\n\s*"display_name":\s*"([^"]+)"/g;
    
    let match;
    while ((match = pattern.exec(logContent)) !== null) {
      const deviceId = match[1];  // {672fd6d3-da89-5032-8e0d-c1aad7572529}
      const displayName = match[2]; // \\.\DISPLAY1
      
      // Normaliser le display_name (extraire DISPLAYx)
      const displayMatch = displayName.match(/DISPLAY(\d+)/i);
      const normalizedKey = displayMatch ? `DISPLAY${displayMatch[1]}` : displayName;
      
      // Garder le dernier device_id pour chaque display (le plus récent dans les logs)
      displays.set(normalizedKey, {
        device_id: deviceId,
        display_name: displayName,
      });
    }
    
    // Aussi chercher les friendly_name si présents
    const friendlyPattern = /"friendly_name":\s*"([^"]+)"/g;
    const friendlyNames: string[] = [];
    while ((match = friendlyPattern.exec(logContent)) !== null) {
      friendlyNames.push(match[1]);
    }
    
    console.log(`[Display] Found ${displays.size} Sunshine displays:`, Object.fromEntries(displays));
    
  } catch (error) {
    console.error("[Display] Failed to read Sunshine logs:", error);
  }
  
  return displays;
}

/**
 * Vérifie si un écran est un VDD (écran virtuel) basé sur son label
 */
function isVirtualDisplay(label: string): boolean {
  const lowerLabel = label.toLowerCase();
  return VIRTUAL_DISPLAY_KEYWORDS.some(keyword => lowerLabel.includes(keyword));
}

/**
 * Récupère la liste des écrans physiques détectés par Windows
 * Combine l'API Electron (résolution/refresh) avec les logs Sunshine (device_id)
 * 
 * IMPORTANT: Filtre les écrans virtuels (VDD) pour ne garder que les vrais écrans physiques
 */
async function getPhysicalDisplays(): Promise<PhysicalScreen[]> {
  const electronDisplays = screen.getAllDisplays();
  const primaryDisplay = screen.getPrimaryDisplay();
  
  // Récupérer les device_id depuis les logs Sunshine
  const sunshineDisplays = await getSunshineDisplays();
  console.log(`[Display] Got ${sunshineDisplays.size} Sunshine displays, ${electronDisplays.length} from Electron`);

  // Filtrer les écrans virtuels (VDD) - ne garder que les vrais écrans physiques
  const physicalDisplays: PhysicalScreen[] = [];
  
  for (let index = 0; index < electronDisplays.length; index++) {
    const display = electronDisplays[index];
    const displayLabel = display.label || '';
    
    // Ignorer les écrans virtuels (VDD, Parsec, etc.)
    if (isVirtualDisplay(displayLabel)) {
      console.log(`[Display] Skipping virtual display: ${displayLabel}`);
      continue;
    }
    
    const displayNum = index + 1;
    const sunshineKey = `DISPLAY${displayNum}`;
    
    // Récupérer le device_id Sunshine pour cet écran
    const sunshineInfo = sunshineDisplays.get(sunshineKey);
    const deviceId = sunshineInfo?.device_id || `\\\\.\\DISPLAY${displayNum}`;
    
    // Nom: priorité au label Electron, puis générique
    const name = displayLabel || `Écran ${displayNum} (${display.size.width}x${display.size.height})`;

    physicalDisplays.push({
      type: "physical" as const,
      name,
      deviceId,
      resolution: {
        width: display.size.width,
        height: display.size.height,
      },
      refreshRate: display.displayFrequency || 60,
      isPrimary: display.id === primaryDisplay.id,
    });
  }
  
  console.log(`[Display] Returning ${physicalDisplays.length} physical displays (filtered from ${electronDisplays.length} total)`);
  return physicalDisplays;
}

/**
 * Détecte le device_id du VDD depuis les logs Sunshine
 * Le VDD est identifié par edid: null dans les logs (écran virtuel sans EDID physique)
 * 
 * @param knownPhysicalIds - Set des device_id des écrans physiques connus (à exclure)
 * @returns Le device_id du VDD ou null si non trouvé
 */
export async function detectVddDeviceIdFromSunshine(knownPhysicalIds: Set<string>): Promise<string | null> {
  try {
    const sunshinePaths = getSunshinePaths();
    const logPath = sunshinePaths.logFile;

    if (!existsSync(logPath)) {
      console.log("[Display] Sunshine log not found for VDD detection");
      return null;
    }
    
    const logContent = await readFile(logPath, { encoding: "utf-8" });
    
    // Chercher les écrans avec edid: null (caractéristique des écrans virtuels)
    // Format dans les logs: "device_id": "{GUID}", ... "edid": null ou "edid": {\n      "manufacturer_id": null
    // On cherche les blocs complets pour identifier les VDD
    
    // Pattern pour trouver les device_id avec edid null
    const vddPattern = /"device_id":\s*"(\{[^}]+\})"[^}]*?"edid":\s*\{[^}]*?"manufacturer_id":\s*null/gs;
    
    let match;
    while ((match = vddPattern.exec(logContent)) !== null) {
      const deviceId = match[1];
      
      // Si ce device_id n'est pas un écran physique connu, c'est notre VDD
      if (!knownPhysicalIds.has(deviceId)) {
        console.log(`[Display] Found VDD device_id: ${deviceId}`);
        return deviceId;
      }
    }
    
    // Fallback: chercher le dernier device_id qui n'est pas dans les physiques
    const allDeviceIds: string[] = [];
    const allPattern = /"device_id":\s*"(\{[^}]+\})"/g;
    while ((match = allPattern.exec(logContent)) !== null) {
      allDeviceIds.push(match[1]);
    }
    
    // Trouver le device_id le plus récent (dernier dans les logs) qui n'est pas physique
    for (let i = allDeviceIds.length - 1; i >= 0; i--) {
      const deviceId = allDeviceIds[i];
      if (!knownPhysicalIds.has(deviceId)) {
        console.log(`[Display] Found potential VDD device_id (fallback): ${deviceId}`);
        return deviceId;
      }
    }
    
    console.log("[Display] No VDD device_id found in Sunshine logs");
    return null;
    
  } catch (error) {
    console.error("[Display] Failed to detect VDD device_id:", error);
    return null;
  }
}

/**
 * Enregistre les handlers IPC pour la gestion des écrans
 */
export function registerDisplayHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.DISPLAY_GET_PHYSICAL, async () => {
    console.log("[IPC] Get Physical Displays request");
    const displays = await getPhysicalDisplays();
    console.log(`[IPC] Found ${displays.length} physical displays`);
    return displays;
  });

  console.log("[IPC] Display handlers registered");
}
