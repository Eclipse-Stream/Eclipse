// Infrastructure Layer - Sunshine Audio Service
// Story 5.3: Détection des périphériques audio via audio-info.exe
// Exécute l'outil Sunshine pour lister les périphériques audio disponibles

import { exec } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import { getSunshinePaths } from "./SunshinePathsService";

const execAsync = promisify(exec);

/**
 * Représente un périphérique audio détecté par audio-info.exe
 */
export interface AudioDevice {
  /** ID unique du périphérique (utilisé par Sunshine dans audio_sink) */
  id: string;
  /** Nom lisible du périphérique */
  name: string;
  /** Type de périphérique (sink = sortie, source = entrée) */
  type: "sink" | "source";
  /** True si c'est un périphérique virtuel (Steam Streaming Speakers) - utilisé pour mode Moonlight Only */
  isVirtual?: boolean;
}

/**
 * Résultat de la détection des périphériques audio
 */
export interface AudioDevicesResult {
  success: boolean;
  devices: AudioDevice[];
  error?: string;
}

/**
 * Interface du service audio Sunshine
 */
export interface ISunshineAudioService {
  /** Retourne le chemin de audio-info.exe, ou null si non trouvé */
  getAudioInfoPath(): string | null;

  /** Détecte et liste tous les périphériques audio disponibles */
  getAudioDevices(): Promise<AudioDevicesResult>;

  /** Retourne uniquement les périphériques de sortie (sinks) */
  getAudioSinks(): Promise<AudioDevicesResult>;
}

/**
 * Service de détection des périphériques audio via audio-info.exe de Sunshine
 * audio-info.exe est un outil Sunshine qui liste les périphériques audio Windows
 */
export class SunshineAudioService implements ISunshineAudioService {
  // Timeout pour l'exécution (5 secondes)
  private readonly EXEC_TIMEOUT = 5000;

  // Chemin détecté de audio-info.exe
  private audioInfoPath: string | null = null;

  constructor() {
    this.detectAudioInfoPath();
  }

  /**
   * Détecte le chemin de audio-info.exe
   * Utilise le chemin portable depuis SunshinePathsService
   */
  private detectAudioInfoPath(): void {
    try {
      const paths = getSunshinePaths();
      if (fs.existsSync(paths.audioInfoExe)) {
        this.audioInfoPath = paths.audioInfoExe;
        console.log(`[SunshineAudio] Found audio-info.exe at: ${this.audioInfoPath}`);
        return;
      }
    } catch (error) {
      console.warn("[SunshineAudio] Error detecting audio-info path:", error);
    }
    console.warn("[SunshineAudio] audio-info.exe not found");
  }

  /**
   * Retourne le chemin de audio-info.exe détecté
   */
  getAudioInfoPath(): string | null {
    return this.audioInfoPath;
  }

  /**
   * Exécute audio-info.exe et parse la sortie
   * Format attendu (texte brut, une ligne par device):
   *   Sink: "Device Name" [device-id]
   *   Source: "Device Name" [device-id]
   *
   * Ou format JSON si l'outil le supporte:
   *   { "sinks": [...], "sources": [...] }
   */
  async getAudioDevices(): Promise<AudioDevicesResult> {
    if (!this.audioInfoPath) {
      return {
        success: false,
        devices: [],
        error: "audio-info.exe non trouvé. Sunshine est-il installé correctement?",
      };
    }

    try {
      // Exécuter audio-info.exe
      const { stdout, stderr } = await execAsync(`"${this.audioInfoPath}"`, {
        timeout: this.EXEC_TIMEOUT,
        windowsHide: true,
      });

      if (stderr) {
        console.warn("[SunshineAudio] audio-info.exe stderr:", stderr);
      }

      // Parser la sortie
      const devices = this.parseAudioInfoOutput(stdout);

      console.log(`[SunshineAudio] Detected ${devices.length} audio devices`);

      return {
        success: true,
        devices,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
      console.error("[SunshineAudio] Failed to execute audio-info.exe:", error);

      return {
        success: false,
        devices: [],
        error: `Impossible d'exécuter audio-info.exe: ${errorMessage}`,
      };
    }
  }

  /**
   * Retourne uniquement les périphériques de sortie (sinks)
   * C'est ce dont on a besoin pour configurer audio_sink dans Sunshine
   */
  async getAudioSinks(): Promise<AudioDevicesResult> {
    const result = await this.getAudioDevices();

    if (!result.success) {
      return result;
    }

    const sinks = result.devices.filter((d) => d.type === "sink");

    return {
      success: true,
      devices: sinks,
    };
  }

  /**
   * Parse la sortie de audio-info.exe
   *
   * Format réel de Sunshine audio-info.exe:
   * ====== Found 3 audio devices ======
   * ===== Device =====
   * Device ID          : {0.0.0.00000000}.{guid}
   * Device name        : Casque Logitech (Logitech PRO X Gaming Headset)
   * Adapter name       : Logitech PRO X Gaming Headset
   * Device description : Casque Logitech
   * Device state       : Active
   * Current format     : Surround 7.1
   *
   * ===== Device =====
   * ...
   */
  private parseAudioInfoOutput(output: string): AudioDevice[] {
    const devices: AudioDevice[] = [];

    // Découper par blocs "===== Device ====="
    const deviceBlocks = output.split(/={5,}\s*Device\s*={5,}/i);

    for (const block of deviceBlocks) {
      // Skip les blocs vides ou l'en-tête
      if (!block.trim() || block.includes("Found") && block.includes("audio devices")) {
        continue;
      }

      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);

      let deviceId = "";
      let deviceName = "";
      let deviceDescription = "";

      for (const line of lines) {
        // Parser "Device ID          : {0.0.0.00000000}.{guid}"
        const idMatch = line.match(/^Device\s+ID\s*:\s*(.+)$/i);
        if (idMatch) {
          deviceId = idMatch[1].trim();
          continue;
        }

        // Parser "Device name        : Casque Logitech (Logitech PRO X Gaming Headset)"
        const nameMatch = line.match(/^Device\s+name\s*:\s*(.+)$/i);
        if (nameMatch) {
          deviceName = nameMatch[1].trim();
          continue;
        }

        // Parser "Device description : Casque Logitech"
        const descMatch = line.match(/^Device\s+description\s*:\s*(.+)$/i);
        if (descMatch) {
          deviceDescription = descMatch[1].trim();
          continue;
        }
      }

      // Ajouter le device si on a au moins un ID
      if (deviceId) {
        // Utiliser la description comme nom si disponible (plus court et lisible)
        // Sinon utiliser le nom complet
        const displayName = deviceDescription || deviceName || deviceId;
        
        // Détecter Steam Streaming Speakers (périphérique virtuel pour mode Moonlight Only)
        // Comme dans Archive_V1: is_eclipse = True pour Steam Streaming Speakers
        const isVirtual = deviceName.toLowerCase().includes("steam") && 
                          deviceName.toLowerCase().includes("speaker");

        devices.push({
          id: deviceId,
          name: isVirtual ? `🌑 Eclipse Audio (${displayName})` : displayName,
          type: "sink", // audio-info.exe liste les périphériques de sortie (sinks)
          isVirtual,
        });
      }
    }

    return devices;
  }
}
