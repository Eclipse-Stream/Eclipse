// Infrastructure Layer - VirtualDisplayDriver
// Implémentation Windows du driver d'écran virtuel
// Story 3.2: Gestion correcte du driver Eclipse avec persistence de l'Instance ID

import path from "node:path";
import fs from "node:fs";
import { app, screen } from "electron";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import type {
  IVirtualDisplayDriver,
  VDDOperationResult,
} from "../../domain/interfaces";
import type {
  DeviceGUID,
  Resolution,
  RefreshRate,
  VDDStatus,
} from "../../domain/types";
import { safeParseDeviceGUID } from "../../domain/validators";
import {
  VDD_HARDWARE_ID,
  VDD_CONFIG_FILE_NAME,
  VDD_SETTINGS_SYSTEM_PATHS,
  VDD_SETTINGS_FILE_NAME,
  SUNSHINE_DETECTION_DELAY_MS,
} from "../../domain/constants";
import { getSunshinePaths } from "../sunshine/SunshinePathsService";

const execFileAsync = promisify(execFile);

/**
 * Configuration persistée du driver VDD Eclipse
 */
interface VDDConfig {
  // Instance ID du driver créé par Eclipse (ex: "ROOT\DISPLAY\0001")
  instanceId: string | null;
  // Date de création
  createdAt: string | null;
}

/**
 * Implémentation Windows du driver d'écran virtuel
 * Utilise devcon.exe pour gérer le driver VDD
 *
 * ARCHITECTURE:
 * - On stocke l'Instance ID de NOTRE driver dans un fichier de config
 * - Au boot : on vérifie si notre driver existe encore. Si non, on en crée un nouveau.
 * - enable()/disable() : utilisent l'Instance ID spécifique de notre driver
 * - On ne touche JAMAIS aux autres drivers VDD de l'utilisateur
 */
export class VirtualDisplayDriver implements IVirtualDisplayDriver {
  private readonly DEVICE_HARDWARE_ID = VDD_HARDWARE_ID;
  private readonly CONFIG_FILE_NAME = VDD_CONFIG_FILE_NAME;

  // Instance ID de notre driver (chargé depuis la config)
  private eclipseInstanceId: string | null = null;

  /**
   * Résout le chemin vers les outils VDD (dev vs prod)
   */
  private getToolsPath(): string {
    const isDev = !app.isPackaged;

    if (isDev) {
      return path.join(app.getAppPath(), "resources", "tools", "VDD");
    } else {
      return path.join(process.resourcesPath, "resources", "tools", "VDD");
    }
  }

  /**
   * Résout le chemin vers le fichier de config VDD
   */
  private getConfigPath(): string {
    // IMPORTANT: Utiliser "Eclipse" (majuscule) pour cohérence avec le reste de l'app
    // (credential-storage, EclipseScriptsService, recovery-handlers, etc.)
    return path.join(process.env.APPDATA || '', 'Eclipse', this.CONFIG_FILE_NAME);
  }

  /**
   * Charge la configuration VDD depuis le fichier
   */
  private loadConfig(): VDDConfig {
    try {
      const configPath = this.getConfigPath();
      if (fs.existsSync(configPath)) {
        const data = fs.readFileSync(configPath, "utf-8");
        const config = JSON.parse(data) as VDDConfig;
        console.log(`[VDD] Config loaded: instanceId=${config.instanceId}`);
        return config;
      }
    } catch (error) {
      console.warn("[VDD] Failed to load config:", error);
    }
    return { instanceId: null, createdAt: null };
  }

  /**
   * Sauvegarde la configuration VDD
   */
  private saveConfig(config: VDDConfig): void {
    try {
      const configPath = this.getConfigPath();
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
      console.log(`[VDD] Config saved: instanceId=${config.instanceId}`);
    } catch (error) {
      console.error("[VDD] Failed to save config:", error);
    }
  }

  /**
   * Exécute une commande devcon avec execFile (plus sécurisé que exec)
   * @param args - Arguments sous forme de tableau pour éviter l'injection shell
   */
  private async runDevcon(args: string[]): Promise<{ stdout: string; stderr: string }> {
    const devconPath = path.join(this.getToolsPath(), "devcon.exe");

    console.log(`[VDD] Running: devcon ${args.join(" ")}`);

    try {
      const result = await execFileAsync(devconPath, args);
      console.log(`[VDD] stdout: ${result.stdout}`);
      if (result.stderr) {
        console.log(`[VDD] stderr: ${result.stderr}`);
      }
      return result;
    } catch (error: any) {
      // devcon retourne parfois un exit code != 0 même en cas de succès partiel
      if (error.stdout) {
        console.log(`[VDD] stdout (from error): ${error.stdout}`);
        return { stdout: error.stdout, stderr: error.stderr || "" };
      }
      throw new Error(`devcon error: ${error.message}`);
    }
  }

  /**
   * Vérifie si un Instance ID spécifique existe encore dans Windows
   */
  private async doesInstanceExist(instanceId: string): Promise<boolean> {
    try {
      // Utiliser @ pour cibler un Instance ID spécifique
      const { stdout } = await this.runDevcon(["find", `@${instanceId}`]);
      // Si on trouve "matching device(s) found" avec un nombre > 0, le device existe
      const match = stdout.match(/(\d+)\s+matching\s+device/i);
      const count = match ? parseInt(match[1], 10) : 0;
      return count > 0;
    } catch {
      return false;
    }
  }

  /**
   * Liste tous les drivers VDD MttVDD installés et retourne leurs Instance IDs
   */
  private async listVDDInstances(): Promise<string[]> {
    try {
      const { stdout } = await this.runDevcon(["findall", this.DEVICE_HARDWARE_ID]);

      // Parser le stdout pour extraire les Instance IDs
      // Format: "ROOT\DISPLAY\0000    : Virtual Display Driver"
      const lines = stdout.split("\n");
      const instanceIds: string[] = [];

      for (const line of lines) {
        // Chercher les lignes qui contiennent un Instance ID (format ROOT\...)
        const match = line.match(/^(ROOT\\[^\s:]+)/i);
        if (match) {
          instanceIds.push(match[1]);
        }
      }

      console.log(`[VDD] Found ${instanceIds.length} VDD instances:`, instanceIds);
      return instanceIds;
    } catch {
      return [];
    }
  }

  /**
   * Trouve l'Instance ID du dernier driver créé (après une installation)
   */
  private async findNewInstanceId(previousInstances: string[]): Promise<string | null> {
    const currentInstances = await this.listVDDInstances();

    // Trouver les nouveaux Instance IDs (ceux qui n'existaient pas avant)
    const newInstances = currentInstances.filter(id => !previousInstances.includes(id));

    if (newInstances.length > 0) {
      // Prendre le dernier créé (généralement le plus haut numéro)
      const sorted = newInstances.sort();
      return sorted[sorted.length - 1];
    }

    return null;
  }

  /**
   * Copie notre fichier vdd_settings.xml vers les emplacements système où le driver le lit
   * Le driver MttVDD lit sa config depuis C:\VirtualDisplayDriver\ ou C:\VDD\
   */
  private async copyVddSettingsToSystem(): Promise<void> {
    const sourceSettingsPath = path.join(this.getToolsPath(), VDD_SETTINGS_FILE_NAME);
    const targetPaths = VDD_SETTINGS_SYSTEM_PATHS;

    console.log("[VDD] Copying vdd_settings.xml to system locations...");

    for (const targetPath of targetPaths) {
      try {
        // Créer le dossier parent si nécessaire
        const targetDir = path.dirname(targetPath);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
          console.log(`[VDD] Created directory: ${targetDir}`);
        }

        // Copier le fichier
        fs.copyFileSync(sourceSettingsPath, targetPath);
        console.log(`[VDD] Copied vdd_settings.xml to: ${targetPath}`);
      } catch (error) {
        console.warn(`[VDD] Failed to copy to ${targetPath}:`, error);
      }
    }
  }

  /**
   * Initialise le driver VDD au démarrage de l'application.
   * - Copie vdd_settings.xml vers les emplacements système (pour HDR, etc.)
   * - Charge la config pour retrouver notre Instance ID
   * - Vérifie si notre driver existe encore
   * - Si non, en crée un nouveau et sauvegarde son Instance ID
   * - Ne touche JAMAIS aux drivers des autres applications
   */
  async initialize(): Promise<VDDOperationResult & { wasInstalled?: boolean }> {
    try {
      console.log("[VDD] Initializing VDD driver...");

      // IMPORTANT: Copier notre vdd_settings.xml vers les emplacements systeme
      // Ceci doit etre fait AVANT toute installation/activation du driver
      // pour que le driver utilise nos settings (HDRPlus=true, etc.)
      await this.copyVddSettingsToSystem();

      // Charger la config
      const config = this.loadConfig();
      this.eclipseInstanceId = config.instanceId;

      // Si on a un Instance ID sauvegarde, verifier s'il existe encore
      if (this.eclipseInstanceId) {
        const exists = await this.doesInstanceExist(this.eclipseInstanceId);
        if (exists) {
          console.log(`[VDD] Eclipse driver found: ${this.eclipseInstanceId}`);
          return { success: true, wasInstalled: false };
        } else {
          console.log(`[VDD] Saved driver ${this.eclipseInstanceId} no longer exists, will create new one`);
          this.eclipseInstanceId = null;
        }
      }

      // Pas de driver Eclipse existant, en creer un nouveau
      console.log("[VDD] No Eclipse driver found, installing new one...");

      // Lister les instances AVANT installation
      const instancesBefore = await this.listVDDInstances();

      // Installer le driver
      const vddInfPath = path.join(this.getToolsPath(), "MttVDD.inf");
      try {
        await this.runDevcon(["install", vddInfPath, this.DEVICE_HARDWARE_ID]);
      } catch (error) {
        console.log("[VDD] Install command completed (may have non-zero exit code, checking result...)");
      }

      // Attendre un peu pour que Windows enregistre le device
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Trouver le nouvel Instance ID
      const newInstanceId = await this.findNewInstanceId(instancesBefore);

      if (newInstanceId) {
        this.eclipseInstanceId = newInstanceId;
        this.saveConfig({
          instanceId: newInstanceId,
          createdAt: new Date().toISOString(),
        });
        console.log(`[VDD] New Eclipse driver created: ${newInstanceId}`);

        // NOTE: On NE desactive PAS l'ecran ici.
        // initializeVDD() s'en chargera apres avoir detecte le device_id Sunshine.
        // Cela evite un double cycle enable/disable au demarrage.

        return { success: true, wasInstalled: true };
      } else {
        console.error("[VDD] Failed to find new Instance ID after installation");
        return {
          success: false,
          error: "errors.vdd.installFailed",
        };
      }
    } catch (error) {
      console.error("[VDD] Failed to initialize driver:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error during initialization",
      };
    }
  }

  /**
   * Active l'écran virtuel Eclipse (devcon enable sur notre Instance ID)
   */
  async enable(): Promise<VDDOperationResult> {
    try {
      console.log("[VDD] Enabling virtual display...");

      // S'assurer qu'on a notre Instance ID
      if (!this.eclipseInstanceId) {
        const config = this.loadConfig();
        this.eclipseInstanceId = config.instanceId;
      }

      if (!this.eclipseInstanceId) {
        console.error("[VDD] No Eclipse driver Instance ID found");
        return {
          success: false,
          error: "errors.vdd.notInstalled",
        };
      }

      // Vérifier que notre driver existe encore
      const exists = await this.doesInstanceExist(this.eclipseInstanceId);
      if (!exists) {
        console.error(`[VDD] Eclipse driver ${this.eclipseInstanceId} no longer exists`);
        return {
          success: false,
          error: "errors.vdd.removed",
        };
      }

      // Activer notre driver spécifique avec @InstanceID
      await this.runDevcon(["enable", `@${this.eclipseInstanceId}`]);

      console.log("[VDD] Virtual display enabled successfully");
      return { success: true };
    } catch (error) {
      console.error("[VDD] Failed to enable virtual display:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Désactive l'écran virtuel Eclipse (devcon disable sur notre Instance ID)
   */
  async disable(): Promise<VDDOperationResult> {
    try {
      console.log("[VDD] Disabling virtual display...");

      // S'assurer qu'on a notre Instance ID
      if (!this.eclipseInstanceId) {
        const config = this.loadConfig();
        this.eclipseInstanceId = config.instanceId;
      }

      if (!this.eclipseInstanceId) {
        console.log("[VDD] No Eclipse driver to disable");
        return { success: true };
      }

      // Désactiver notre driver spécifique
      await this.runDevcon(["disable", `@${this.eclipseInstanceId}`]);

      console.log("[VDD] Virtual display disabled successfully");
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "";
      if (errorMessage.includes("No matching devices")) {
        console.log("[VDD] Device already disabled or not found");
        return { success: true };
      }

      console.error("[VDD] Failed to disable virtual display:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Récupère le statut actuel de l'écran virtuel Eclipse
   */
  async getStatus(): Promise<VDDStatus> {
    try {
      // S'assurer qu'on a notre Instance ID
      if (!this.eclipseInstanceId) {
        const config = this.loadConfig();
        this.eclipseInstanceId = config.instanceId;
      }

      if (!this.eclipseInstanceId) {
        return "disabled";
      }

      // Vérifier le statut de notre driver spécifique
      const { stdout } = await this.runDevcon(["status", `@${this.eclipseInstanceId}`]);

      // Si "Driver is running", c'est enabled. Sinon disabled.
      const isRunning = stdout.includes("Driver is running");
      return isRunning ? "enabled" : "disabled";
    } catch (error) {
      console.log("[VDD] Error getting status, assuming disabled");
      return "disabled";
    }
  }

  /**
   * Résout le chemin vers MultiMonitorTool
   */
  private getMultiMonitorToolPath(): string {
    const toolsPath = this.getToolsPath();
    return path.join(toolsPath, "..", "multimonitortool", "MultiMonitorTool.exe");
  }

  /**
   * Exécute MultiMonitorTool avec les arguments spécifiés
   * Utilise execFile pour éviter les problèmes d'échappement du shell
   */
  private async runMultiMonitorTool(args: string[]): Promise<{ stdout: string; stderr: string }> {
    const mmtPath = this.getMultiMonitorToolPath();

    console.log(`[VDD] Running MultiMonitorTool: ${mmtPath}`);
    console.log(`[VDD] Arguments: ${JSON.stringify(args)}`);

    try {
      const result = await execFileAsync(mmtPath, args);
      console.log(`[VDD] MultiMonitorTool stdout: ${result.stdout}`);
      if (result.stderr) {
        console.log(`[VDD] MultiMonitorTool stderr: ${result.stderr}`);
      }
      return result;
    } catch (error: any) {
      if (error.stdout !== undefined) {
        console.log(`[VDD] MultiMonitorTool stdout (from error): ${error.stdout}`);
        return { stdout: error.stdout || "", stderr: error.stderr || "" };
      }
      throw new Error(`MultiMonitorTool error: ${error.message}`);
    }
  }

  /**
   * Trouve le numéro du display VDD via MultiMonitorTool
   * Identifie le VDD par son nom d'adaptateur (contient "Mtt" ou "VDD")
   * Retourne le numéro sous forme de string car MMT accepte "Name=3" comme raccourci
   */
  private async findVDDDisplayNumber(): Promise<string | null> {
    try {
      const fsModule = await import("node:fs");
      const tempCsvPath = path.join(app.getPath("temp"), "eclipse-displays.csv");

      // Exporter la liste des écrans en CSV
      await this.runMultiMonitorTool(["/scomma", tempCsvPath]);

      // Attendre un peu que le fichier soit écrit
      await new Promise(resolve => setTimeout(resolve, 500));

      if (!fsModule.existsSync(tempCsvPath)) {
        console.error("[VDD] CSV file not created by MultiMonitorTool");
        return null;
      }

      const csvContent = fsModule.readFileSync(tempCsvPath, "utf-8");
      console.log("[VDD] MultiMonitorTool CSV content:");
      console.log(csvContent);
      
      const lines = csvContent.split("\n");

      // Parser le CSV pour trouver l'écran VDD par son adaptateur
      // Format CSV: Name,Short Name,Adapter Name,Monitor Name,...
      // Le VDD a un adaptateur contenant "Mtt" ou "VDD" ou "Virtual"
      let vddDisplayNumber: string | null = null;
      let fallbackHighestNum = 0;

      for (const line of lines) {
        // Chercher le nom du display
        const displayMatch = line.match(/\\\\\.\\DISPLAY(\d+)/i);
        if (!displayMatch) continue;

        const displayNum = parseInt(displayMatch[1], 10);
        
        // Vérifier si c'est un écran VDD par le nom de l'adaptateur
        // Les adaptateurs VDD contiennent généralement "Mtt", "VDD", ou "Virtual Display"
        const lowerLine = line.toLowerCase();
        if (lowerLine.includes("mtt") || 
            lowerLine.includes("vdd") || 
            lowerLine.includes("virtual display") ||
            lowerLine.includes("indirect display")) {
          console.log(`[VDD] Found VDD display by adapter name: DISPLAY${displayNum}`);
          vddDisplayNumber = String(displayNum);
          break; // On a trouvé le VDD, pas besoin de continuer
        }

        // Fallback: garder le numéro le plus élevé (heuristique)
        if (displayNum > fallbackHighestNum) {
          fallbackHighestNum = displayNum;
        }
      }

      // Nettoyer le fichier temporaire
      try {
        fsModule.unlinkSync(tempCsvPath);
      } catch {
        // Ignorer les erreurs de suppression
      }

      // Utiliser le VDD trouvé par nom d'adaptateur, sinon fallback sur le numéro le plus élevé
      if (vddDisplayNumber) {
        console.log(`[VDD] Using VDD display: DISPLAY${vddDisplayNumber} (identified by adapter)`);
        return vddDisplayNumber;
      }

      if (fallbackHighestNum >= 2) {
        console.log(`[VDD] Using fallback: DISPLAY${fallbackHighestNum} (highest number)`);
        return String(fallbackHighestNum);
      }

      console.warn("[VDD] Could not identify VDD display from MultiMonitorTool output");
      return null;
    } catch (error) {
      console.error("[VDD] Error finding VDD display number:", error);
      return null;
    }
  }

  /**
   * Définit la résolution de l'écran virtuel
   * Utilise MultiMonitorTool /SetMonitors (format documenté)
   */
  async setResolution(
    resolution: Resolution,
    refreshRate: RefreshRate
  ): Promise<VDDOperationResult> {
    try {
      console.log(
        `[VDD] Setting resolution: ${resolution.width}x${resolution.height}@${refreshRate}Hz`
      );

      const status = await this.getStatus();
      if (status !== "enabled") {
        return {
          success: false,
          error: "errors.vdd.mustBeEnabled",
        };
      }

      // Trouver le numéro du moniteur Windows (ex: 3 pour DISPLAY3)
      const displayNumber = await this.findVDDDisplayNumber();
      if (!displayNumber) {
        console.error("[VDD] Could not find VDD display number");
        return {
          success: false,
          error: "errors.vdd.notFoundInWindows",
        };
      }

      console.log(`[VDD] Found VDD display number: ${displayNumber}`);

      // Utiliser MultiMonitorTool /SetMonitors avec le format correct
      // Format documenté: /SetMonitors "Name=\\.\DISPLAY3 Width=1920 Height=1080 DisplayFrequency=60"
      // Avec execFile, pas besoin d'échapper les backslashes - on passe la config comme un seul argument
      const displayName = `\\\\.\\DISPLAY${displayNumber}`;
      const monitorConfig = `Name=${displayName} Width=${resolution.width} Height=${resolution.height} DisplayFrequency=${refreshRate}`;

      console.log(`[VDD] Target display: ${displayName}`);
      console.log(`[VDD] Monitor config: ${monitorConfig}`);

      try {
        await this.runMultiMonitorTool(["/SetMonitors", monitorConfig]);
        console.log("[VDD] Resolution changed successfully");
        return { success: true };
      } catch (error) {
        console.error("[VDD] Failed to change resolution with MultiMonitorTool:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "errors.vdd.resolutionFailed",
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "errors.vdd.resolutionFailed",
      };
    }
  }

  /**
   * Story 3.1: Met à jour la configuration de l'écran virtuel SANS vérifier le statut.
   * Permet la "bascule" fluide entre presets sans disable/enable.
   * IMPORTANT: L'appelant doit s'assurer que l'écran est déjà activé.
   */
  async updateConfig(
    resolution: Resolution,
    refreshRate: RefreshRate
  ): Promise<VDDOperationResult> {
    try {
      console.log(
        `[VDD] updateConfig: ${resolution.width}x${resolution.height}@${refreshRate}Hz (no status check)`
      );

      // Trouver le numéro du moniteur Windows (ex: 3 pour DISPLAY3)
      const displayNumber = await this.findVDDDisplayNumber();
      if (!displayNumber) {
        console.error("[VDD] Could not find VDD display number");
        return {
          success: false,
          error: "errors.vdd.notFoundInWindows",
        };
      }

      // Utiliser MultiMonitorTool /SetMonitors avec le format correct
      const displayName = `\\\\.\\DISPLAY${displayNumber}`;
      const monitorConfig = `Name=${displayName} Width=${resolution.width} Height=${resolution.height} DisplayFrequency=${refreshRate}`;

      console.log(`[VDD] updateConfig target: ${displayName}`);
      console.log(`[VDD] updateConfig config: ${monitorConfig}`);

      try {
        await this.runMultiMonitorTool(["/SetMonitors", monitorConfig]);
        console.log("[VDD] updateConfig: Resolution changed successfully");
        return { success: true };
      } catch (error) {
        console.error("[VDD] updateConfig: Failed to change resolution:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "errors.vdd.resolutionFailed",
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "errors.vdd.resolutionFailed",
      };
    }
  }

  /**
   * Active ou désactive le HDR
   */
  async setHDR(enabled: boolean): Promise<VDDOperationResult> {
    try {
      console.log(`[VDD] Setting HDR: ${enabled}`);

      const status = await this.getStatus();
      if (status !== "enabled") {
        return {
          success: false,
          error: "errors.vdd.mustBeEnabled",
        };
      }

      // Note: Le HDR n'est pas directement contrôlable via MultiMonitorTool
      // Il faut utiliser l'API Windows (SetDisplayConfig) ou le driver VDD lui-même
      // Pour l'instant, on log l'intention et on retourne success
      // L'implémentation complète nécessiterait d'utiliser des APIs Windows natives
      console.warn("[VDD] HDR control not fully implemented - requires Windows Display API");
      console.log(`[VDD] HDR would be set to: ${enabled}`);

      // TODO: Implémenter avec Windows Display Configuration API
      // ou via le driver VDD si celui-ci expose une API HDR

      return { 
        success: true,
        // Note: En production, on pourrait retourner un warning
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Récupère le GUID du périphérique écran virtuel
   * CRITIQUE: Ce GUID est utilisé pour configurer Sunshine (output_name)
   */
  async getDeviceGUID(): Promise<DeviceGUID | null> {
    try {
      console.log("[VDD] Getting device GUID...");

      const status = await this.getStatus();
      if (status !== "enabled") {
        console.log("[VDD] Device not enabled, no GUID available");
        return null;
      }

      if (!this.eclipseInstanceId) {
        return null;
      }

      // devcon hwids pour obtenir les IDs matériels de notre driver
      const { stdout } = await this.runDevcon(["hwids", `@${this.eclipseInstanceId}`]);

      // Parser le stdout pour extraire le GUID du device
      // Le GUID peut être dans différents formats selon la version de Windows
      const guidMatch = stdout.match(/\{[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}/i);

      if (guidMatch) {
        const guidString = guidMatch[0];
        const guid = safeParseDeviceGUID(guidString);

        console.log(`[VDD] Found device GUID: ${guidString}`);
        return guid;
      }

      console.warn("[VDD] Could not parse GUID from devcon output");
      return null;
    } catch (error) {
      console.error("[VDD] Error getting device GUID:", error);
      return null;
    }
  }

  /**
   * Retourne l'Instance ID du driver Eclipse (pour debug/info)
   */
  getEclipseInstanceId(): string | null {
    return this.eclipseInstanceId;
  }

  /**
   * Récupère les paramètres d'affichage actuels du VDD (résolution et refresh rate)
   * via MultiMonitorTool
   */
  async getCurrentDisplaySettings(): Promise<{ resolution: Resolution; refreshRate: RefreshRate } | null> {
    try {
      const status = await this.getStatus();
      if (status !== "enabled") {
        console.log("[VDD] Display not enabled, cannot get current settings");
        return null;
      }

      const fsModule = await import("node:fs");
      const tempCsvPath = path.join(app.getPath("temp"), "eclipse-displays-settings.csv");

      // Exporter la liste des écrans en CSV
      await this.runMultiMonitorTool(["/scomma", tempCsvPath]);

      // Attendre un peu que le fichier soit écrit
      await new Promise(resolve => setTimeout(resolve, 500));

      if (!fsModule.existsSync(tempCsvPath)) {
        console.error("[VDD] CSV file not created by MultiMonitorTool");
        return null;
      }

      const csvContent = fsModule.readFileSync(tempCsvPath, "utf-8");
      const lines = csvContent.split("\n");

      // Trouver la ligne du VDD
      for (const line of lines) {
        const lowerLine = line.toLowerCase();
        
        // Identifier le VDD par son adaptateur
        if (lowerLine.includes("mtt") || 
            lowerLine.includes("vdd") || 
            lowerLine.includes("virtual display") ||
            lowerLine.includes("indirect display")) {
          
          // Le format CSV de MultiMonitorTool inclut Resolution (ex: "1920 x 1080")
          // et Frequency (ex: "60")
          // Les colonnes sont séparées par des virgules
          const columns = line.split(",");
          
          // Chercher la résolution dans les colonnes (format "1920 x 1080" ou "1920x1080")
          let width = 0, height = 0, refreshRate = 60;
          
          for (const col of columns) {
            // Chercher un pattern de résolution (ex: "1920 x 1080" ou "1920x1080")
            const resMatch = col.match(/(\d{3,4})\s*x\s*(\d{3,4})/i);
            if (resMatch && width === 0) {
              width = parseInt(resMatch[1], 10);
              height = parseInt(resMatch[2], 10);
            }
            
            // Chercher un refresh rate (nombre seul entre 30 et 300)
            const rateMatch = col.trim().match(/^(\d+)$/);
            if (rateMatch) {
              const rate = parseInt(rateMatch[1], 10);
              if (rate >= 30 && rate <= 300) {
                refreshRate = rate;
              }
            }
          }

          // Nettoyer le fichier temporaire
          try {
            fsModule.unlinkSync(tempCsvPath);
          } catch {
            // Ignorer
          }

          if (width > 0 && height > 0) {
            console.log(`[VDD] Current display settings: ${width}x${height}@${refreshRate}Hz`);
            return {
              resolution: { width, height },
              refreshRate: refreshRate as RefreshRate,
            };
          }
        }
      }

      // Nettoyer le fichier temporaire
      try {
        fsModule.unlinkSync(tempCsvPath);
      } catch {
        // Ignorer
      }

      console.warn("[VDD] Could not find VDD display settings in CSV");
      return null;
    } catch (error) {
      console.error("[VDD] Error getting current display settings:", error);
      return null;
    }
  }

  // ============================================================================
  // SUNSHINE DEVICE ID DETECTION
  // Logique métier pour détecter le Device ID Sunshine du VDD Eclipse
  // ============================================================================

  /**
   * Lit les logs Sunshine et extrait les displays avec leurs device_id
   */
  private async readSunshineDisplays(): Promise<Map<string, { device_id: string; display_name: string }>> {
    const displays = new Map<string, { device_id: string; display_name: string }>();

    try {
      const sunshinePaths = getSunshinePaths();
      const logPath = sunshinePaths.logFile;

      if (!existsSync(logPath)) {
        console.log("[VDD] Sunshine log not found:", logPath);
        return displays;
      }

      const logContent = await readFile(logPath, { encoding: "utf-8" });

      // Pattern pour trouver les paires device_id / display_name dans les logs
      const pattern = /"device_id":\s*"(\{[^}]+\})",\s*\n\s*"display_name":\s*"([^"]+)"/g;

      let match;
      while ((match = pattern.exec(logContent)) !== null) {
        const deviceId = match[1];
        const displayName = match[2];

        const displayMatch = displayName.match(/DISPLAY(\d+)/i);
        const normalizedKey = displayMatch ? `DISPLAY${displayMatch[1]}` : displayName;

        displays.set(normalizedKey, {
          device_id: deviceId,
          display_name: displayName,
        });
      }

      console.log(`[VDD] Found ${displays.size} Sunshine displays`);
    } catch (error) {
      console.error("[VDD] Failed to read Sunshine logs:", error);
    }

    return displays;
  }

  /**
   * Détecte le Device ID Sunshine du VDD Eclipse.
   *
   * Flow complet (logique métier) :
   * 1. Enable le VDD Eclipse
   * 2. Redémarrer Sunshine pour qu'il détecte le nouvel écran et écrive dans les logs
   * 3. Lit les logs Sunshine et trouve le display avec le numéro le plus élevé (= VDD)
   * 4. Disable le VDD
   * 5. Retourne le device_id détecté
   *
   * @param restartSunshineFn - Fonction pour redémarrer Sunshine (injectée depuis le main process)
   * @returns Le device_id Sunshine du VDD ou null si non détecté
   */
  async detectSunshineDeviceId(restartSunshineFn?: () => Promise<{ success: boolean }>): Promise<string | null> {
    console.log("[VDD] === DETECTING SUNSHINE DEVICE ID ===");

    // 1. Compter les écrans physiques actuels
    const physicalDisplays = screen.getAllDisplays();
    console.log(`[VDD] Physical displays (Electron): ${physicalDisplays.length}`);

    // 2. Enable le VDD
    console.log("[VDD] Enabling VDD for detection...");
    const enableResult = await this.enable();
    if (!enableResult.success) {
      console.error("[VDD] Failed to enable VDD for detection:", enableResult.error);
      return null;
    }

    // 3. Redémarrer Sunshine pour qu'il détecte le nouvel écran
    // C'est CRITIQUE: Sunshine ne voit le VDD que s'il est redémarré après l'activation
    if (restartSunshineFn) {
      console.log("[VDD] Restarting Sunshine to detect the virtual display...");
      const restartResult = await restartSunshineFn();
      if (!restartResult.success) {
        console.warn("[VDD] Failed to restart Sunshine, continuing anyway...");
      }
      // Attendre que Sunshine écrive ses logs après redémarrage
      console.log("[VDD] Waiting for Sunshine to write logs...");
      await new Promise((resolve) => setTimeout(resolve, SUNSHINE_DETECTION_DELAY_MS));
    } else {
      // Fallback: juste attendre (ne fonctionnera pas si Sunshine n'est pas redémarré)
      console.warn("[VDD] No restart function provided, Sunshine may not detect the VDD");
      await new Promise((resolve) => setTimeout(resolve, SUNSHINE_DETECTION_DELAY_MS));
    }

    // 4. Lire les logs Sunshine et trouver le VDD
    console.log("[VDD] Reading Sunshine logs...");
    const sunshineDisplays = await this.readSunshineDisplays();
    console.log(`[VDD] Sunshine displays found: ${sunshineDisplays.size}`);

    // Trouver le device_id du VDD (le display avec le numéro le plus élevé = le dernier ajouté)
    let vddDeviceId: string | null = null;
    let highestDisplayNum = 0;

    for (const [key, info] of sunshineDisplays) {
      const match = key.match(/DISPLAY(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        console.log(`[VDD] Found display: ${key} -> ${info.device_id}`);
        if (num > highestDisplayNum) {
          highestDisplayNum = num;
          vddDeviceId = info.device_id;
        }
      }
    }

    // 5. Disable le VDD
    console.log("[VDD] Disabling VDD after detection...");
    await this.disable();

    // 6. Retourner le résultat
    if (vddDeviceId) {
      console.log(`[VDD] === SUNSHINE DEVICE ID DETECTED: ${vddDeviceId} ===`);
    } else {
      console.warn("[VDD] === FAILED TO DETECT SUNSHINE DEVICE ID ===");
    }

    return vddDeviceId;
  }
}
