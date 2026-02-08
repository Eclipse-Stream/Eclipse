// EclipseScriptsService.ts - Story 7.9: Service de gestion des scripts Eclipse
// Version 3.0: Scripts .ps1 dans resources/, wrappers .bat dans AppData
// Les .ps1 sont packagés avec l'app, seuls les .bat (qui pointent vers les .ps1) sont générés

import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

/**
 * Configuration Eclipse exportée pour les scripts
 */
interface EclipseConfig {
  toolsPath: string;
  devconPath: string;
  multiMonitorToolPath: string;
  vddHardwareId: string;
  vddInstanceId: string | null;
  vddDeviceId: string | null; // GUID Sunshine du VDD (pour comparer avec output_name)
}

/**
 * Génère le wrapper .bat qui lance le script PowerShell
 * Nécessaire car Sunshine attend un .bat ou .exe
 */
function generateBatWrapper(ps1Path: string): string {
  const lines = [
    '@echo off',
    'REM Eclipse Script Wrapper - Lance le script PowerShell en mode cache',
    'REM -WindowStyle Hidden cache la fenetre PowerShell',
    'powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + ps1Path + '" %*',
    'exit /b %ERRORLEVEL%',
  ];
  return lines.join('\r\n') + '\r\n';
}

/**
 * Service de gestion des scripts Eclipse
 *
 * Architecture:
 * - Les scripts .ps1 sont dans resources/scripts/ (packagés avec l'app, lecture seule)
 * - Les wrappers .bat sont générés dans AppData/Eclipse/scripts/ (pointent vers les .ps1)
 * - La config utilisateur est dans AppData/Eclipse/ (presets, active-preset, etc.)
 */
export class EclipseScriptsService {
  private eclipseDir: string;
  private scriptsDir: string;
  private configPath: string;

  constructor() {
    this.eclipseDir = path.join(process.env.APPDATA || '', 'Eclipse');
    this.scriptsDir = path.join(this.eclipseDir, 'scripts');
    this.configPath = path.join(this.eclipseDir, 'eclipse-config.json');
  }

  /**
   * Résout le chemin vers le dossier resources (dev vs prod)
   */
  private getResourcesPath(): string {
    const isDev = !app.isPackaged;
    if (isDev) {
      return path.join(app.getAppPath(), 'resources');
    } else {
      return path.join(process.resourcesPath, 'resources');
    }
  }

  /**
   * Résout le chemin vers le dossier tools (dev vs prod)
   */
  private getToolsPath(): string {
    return path.join(this.getResourcesPath(), 'tools');
  }

  /**
   * Retourne le chemin vers le script .ps1 DO dans resources/
   */
  private getDoPs1Path(): string {
    return path.join(this.getResourcesPath(), 'scripts', 'eclipse-do.ps1');
  }

  /**
   * Retourne le chemin vers le script .ps1 UNDO dans resources/
   */
  private getUndoPs1Path(): string {
    return path.join(this.getResourcesPath(), 'scripts', 'eclipse-undo.ps1');
  }

  /**
   * Retourne le chemin vers le wrapper .bat DO dans AppData
   */
  private getDoBatPath(): string {
    return path.join(this.scriptsDir, 'eclipse-do.bat');
  }

  /**
   * Retourne le chemin vers le wrapper .bat UNDO dans AppData
   */
  private getUndoBatPath(): string {
    return path.join(this.scriptsDir, 'eclipse-undo.bat');
  }

  /**
   * Initialise les scripts Eclipse
   * Les .ps1 sont dans resources/ (packagés), on génère juste les wrappers .bat dans AppData
   */
  async ensureScriptsExist(): Promise<{ success: boolean; error?: string }> {
    try {
      // Créer les dossiers s'ils n'existent pas
      await fs.mkdir(this.eclipseDir, { recursive: true });
      await fs.mkdir(this.scriptsDir, { recursive: true });

      // Chemins vers les scripts .ps1 dans resources/ (packagés avec l'app)
      const doPs1Path = this.getDoPs1Path();
      const undoPs1Path = this.getUndoPs1Path();

      // Vérifier que les scripts .ps1 existent dans resources/
      if (!existsSync(doPs1Path)) {
        console.error('[EclipseScriptsService] Script DO PS1 non trouvé:', doPs1Path);
        return { success: false, error: `Script DO non trouvé: ${doPs1Path}` };
      }
      if (!existsSync(undoPs1Path)) {
        console.error('[EclipseScriptsService] Script UNDO PS1 non trouvé:', undoPs1Path);
        return { success: false, error: `Script UNDO non trouvé: ${undoPs1Path}` };
      }

      console.log('[EclipseScriptsService] Scripts PS1 dans resources/:', doPs1Path);

      // Créer les wrappers .bat qui pointent vers les .ps1 dans resources/
      const doBatPath = this.getDoBatPath();
      const undoBatPath = this.getUndoBatPath();

      await fs.writeFile(doBatPath, generateBatWrapper(doPs1Path), 'utf-8');
      console.log('[EclipseScriptsService] Wrapper DO BAT créé:', doBatPath);

      await fs.writeFile(undoBatPath, generateBatWrapper(undoPs1Path), 'utf-8');
      console.log('[EclipseScriptsService] Wrapper UNDO BAT créé:', undoBatPath);

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('[EclipseScriptsService] Erreur lors de la création des scripts:', message);
      return { success: false, error: message };
    }
  }

  /**
   * Met à jour le fichier de config Eclipse avec les chemins et l'Instance ID VDD
   * Ce fichier est lu par les scripts PowerShell
   */
  async updateConfig(vddInstanceId: string | null, vddDeviceId: string | null = null): Promise<{ success: boolean; error?: string }> {
    try {
      const toolsPath = this.getToolsPath();

      const config: EclipseConfig = {
        toolsPath,
        devconPath: path.join(toolsPath, 'VDD', 'devcon.exe'),
        multiMonitorToolPath: path.join(toolsPath, 'multimonitortool', 'MultiMonitorTool.exe'),
        vddHardwareId: 'Root\\MttVDD',
        vddInstanceId,
        vddDeviceId,
      };

      await fs.mkdir(this.eclipseDir, { recursive: true });
      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
      console.log('[EclipseScriptsService] Config mise à jour:', this.configPath);

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('[EclipseScriptsService] Erreur mise à jour config:', message);
      return { success: false, error: message };
    }
  }

  /**
   * Exporte l'ID du preset actuellement actif
   * Permet au script de savoir quel preset utiliser si aucun PresetId n'est passé en argument
   */
  async exportActivePresetId(activePresetId: string | null): Promise<{ success: boolean; error?: string }> {
    try {
      const activePresetPath = path.join(this.eclipseDir, 'active-preset.json');
      const data = { activePresetId };
      await fs.mkdir(this.eclipseDir, { recursive: true });
      await fs.writeFile(activePresetPath, JSON.stringify(data, null, 2), 'utf-8');
      console.log('[EclipseScriptsService] Active preset exporté:', activePresetPath, '→', activePresetId);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('[EclipseScriptsService] Erreur export active preset:', message);
      return { success: false, error: message };
    }
  }

  /**
   * Exporte les presets vers un fichier JSON lisible par les scripts
   */
  async exportPresets(presets: unknown[]): Promise<{ success: boolean; error?: string }> {
    try {
      const presetsPath = path.join(this.eclipseDir, 'presets.json');
      await fs.writeFile(presetsPath, JSON.stringify(presets, null, 2), 'utf-8');
      console.log('[EclipseScriptsService] Presets exportés:', presetsPath);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('[EclipseScriptsService] Erreur export presets:', message);
      return { success: false, error: message };
    }
  }

  /**
   * Exporte la config Sunshine actuelle vers un fichier JSON lisible par les scripts
   * Permet au script DO de connaître les paramètres actuels (output_name, résolution, etc.)
   */
  async exportSunshineConfig(config: Record<string, string>): Promise<{ success: boolean; error?: string }> {
    try {
      const sunshineConfigPath = path.join(this.eclipseDir, 'sunshine-active-config.json');
      await fs.writeFile(sunshineConfigPath, JSON.stringify(config, null, 2), 'utf-8');
      console.log('[EclipseScriptsService] Sunshine config exportée:', sunshineConfigPath);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('[EclipseScriptsService] Erreur export Sunshine config:', message);
      return { success: false, error: message };
    }
  }

  /**
   * Retourne les chemins des scripts .bat (dans AppData)
   */
  getScriptPaths(): { doScript: string; undoScript: string } {
    return {
      doScript: this.getDoBatPath(),
      undoScript: this.getUndoBatPath(),
    };
  }

  /**
   * Vérifie si les scripts existent
   * - Les .ps1 doivent être dans resources/ (packagés)
   * - Les .bat doivent être dans AppData (générés)
   */
  async scriptsExist(): Promise<boolean> {
    try {
      // Vérifier les .ps1 dans resources/
      await fs.access(this.getDoPs1Path());
      await fs.access(this.getUndoPs1Path());
      // Vérifier les .bat dans AppData
      await fs.access(this.getDoBatPath());
      await fs.access(this.getUndoBatPath());
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Génère le prep-cmd pour une application Eclipse
   * Simplifié: pas de paramètres, le script détecte la config active via les fichiers exportés
   *
   * Note: On utilise cmd /c "rem ..." pour le marqueur car Sunshine exécute
   * chaque commande directement. "rem" seul échoue car ce n'est pas un exécutable.
   * cmd /c permet d'exécuter une commande batch inline, incluant rem.
   *
   * IMPORTANT: On utilise le chemin absolu vers les scripts .ps1 dans le dossier d'installation.
   * Le chemin est résolu au moment de l'enregistrement de l'app, pas au runtime.
   * Cela évite les problèmes de résolution de %APPDATA% par Sunshine.
   */
  generatePrepCmd(): Array<{ do: string; undo: string; elevated: string }> {
    // Utiliser les chemins absolus vers les scripts .ps1 dans resources/
    const doPs1Path = this.getDoPs1Path();
    const undoPs1Path = this.getUndoPs1Path();

    // Commande PowerShell directe (pas besoin du wrapper .bat)
    const psCommand = 'powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File';

    return [
      // Marqueur Eclipse pour identifier les apps gérées
      {
        do: 'cmd /c "rem ECLIPSE_MANAGED_APP"',
        undo: '',
        elevated: 'false',
      },
      // Scripts do/undo - chemin absolu vers les .ps1 dans le dossier d'installation
      {
        do: `${psCommand} "${doPs1Path}"`,
        undo: `${psCommand} "${undoPs1Path}"`,
        elevated: 'false',
      },
    ];
  }
}

// Singleton instance
export const eclipseScriptsService = new EclipseScriptsService();
