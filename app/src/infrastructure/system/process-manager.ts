import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

const execAsync = promisify(exec);

// Chemin du state file créé par le script DO
const STATE_FILE = path.join(process.env.TEMP || '', 'eclipse_state.json');

interface ServiceOperationResult {
  success: boolean;
  error?: string;
}

/**
 * ProcessManager handles Sunshine portable process management
 * Uses sunshine.exe directly instead of Windows service
 * Isolated in infrastructure layer per architecture requirements
 */
export class ProcessManager {
  private readonly PROCESS_NAME = 'sunshine.exe';
  
  // Protection contre les opérations simultanées
  private operationInProgress = false;

  /**
   * Résout le chemin vers sunshine.exe (dev vs prod)
   */
  private getSunshineExePath(): string {
    const isDev = !app.isPackaged;
    if (isDev) {
      return path.join(app.getAppPath(), 'resources', 'tools', 'Sunshine', 'sunshine.exe');
    } else {
      return path.join(process.resourcesPath, 'resources', 'tools', 'Sunshine', 'sunshine.exe');
    }
  }

  /**
   * Résout le chemin vers sunshine.conf (dev vs prod)
   */
  private getSunshineConfigPath(): string {
    const isDev = !app.isPackaged;
    if (isDev) {
      return path.join(app.getAppPath(), 'resources', 'tools', 'Sunshine', 'config', 'sunshine.conf');
    } else {
      return path.join(process.resourcesPath, 'resources', 'tools', 'Sunshine', 'config', 'sunshine.conf');
    }
  }

  /**
   * Start Sunshine portable (launches sunshine.exe with config path)
   * The process runs detached so it persists after Eclipse closes
   */
  async startSunshine(): Promise<ServiceOperationResult> {
    // Protection contre les appels simultanés
    if (this.operationInProgress) {
      console.log('[ProcessManager] Operation already in progress, waiting...');
      await this.waitForOperationComplete();
    }
    
    this.operationInProgress = true;
    try {
      // Check if already running
      const isRunning = await this.isSunshineRunning();
      if (isRunning) {
        console.log('[ProcessManager] Sunshine already running');
        return { success: true };
      }

      const sunshineExe = this.getSunshineExePath();
      const configPath = this.getSunshineConfigPath();
      console.log('[ProcessManager] Starting Sunshine:', sunshineExe);
      console.log('[ProcessManager] Config path:', configPath);

      // Spawn detached process with config path argument
      const child = spawn(sunshineExe, [configPath], {
        detached: true,
        stdio: 'ignore',
        cwd: path.dirname(sunshineExe),
      });
      child.unref();

      // Attendre que le processus démarre vraiment (avec vérification)
      const started = await this.waitForProcessState(true, 5000);
      
      if (started) {
        console.log('[ProcessManager] Sunshine started successfully');
        return { success: true };
      } else {
        return { success: false, error: 'Sunshine process did not start' };
      }
    } catch (error: any) {
      console.log('[ProcessManager] Start failed:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to start Sunshine',
      };
    } finally {
      this.operationInProgress = false;
    }
  }

  /**
   * Stop Sunshine portable (kills sunshine.exe process)
   * Exécute le script UNDO avant de kill si nécessaire
   */
  async stopSunshine(): Promise<ServiceOperationResult> {
    // Protection contre les appels simultanés
    if (this.operationInProgress) {
      console.log('[ProcessManager] Operation already in progress, waiting...');
      await this.waitForOperationComplete();
    }

    this.operationInProgress = true;
    try {
      // Check if running first
      const isRunning = await this.isSunshineRunning();
      if (!isRunning) {
        console.log('[ProcessManager] Sunshine not running');
        return { success: true };
      }

      // IMPORTANT: Exécuter le script UNDO AVANT de kill
      // Cela permet de restaurer l'état des écrans proprement
      await this.executeUndoScriptIfNeeded();

      console.log('[ProcessManager] Stopping Sunshine...');
      await execAsync(`taskkill /F /IM ${this.PROCESS_NAME}`);
      
      // Attendre que le processus soit vraiment terminé (avec vérification en boucle)
      const stopped = await this.waitForProcessState(false, 5000);
      
      if (stopped) {
        console.log('[ProcessManager] Sunshine stopped successfully');
        return { success: true };
      } else {
        return { success: false, error: 'Failed to stop Sunshine process' };
      }
    } catch (error: any) {
      console.log('[ProcessManager] Stop failed:', error.message);
      
      // taskkill may fail with "process not found" which is actually success
      if (error.message?.includes('not found') || error.stderr?.includes('not found')) {
        return { success: true };
      }

      return {
        success: false,
        error: error.message || 'Failed to stop Sunshine',
      };
    } finally {
      this.operationInProgress = false;
    }
  }

  /**
   * Restart Sunshine portable (stop then start)
   * Gère l'opération de manière atomique pour éviter les conflits
   */
  async restartSunshine(): Promise<ServiceOperationResult> {
    // Protection contre les appels simultanés
    if (this.operationInProgress) {
      console.log('[ProcessManager] Operation already in progress, waiting...');
      await this.waitForOperationComplete();
    }
    
    this.operationInProgress = true;
    console.log('[ProcessManager] Restarting Sunshine...');
    
    try {
      // 1. Arrêter le processus s'il tourne
      const isRunning = await this.isSunshineRunning();
      if (isRunning) {
        // IMPORTANT: Exécuter le script UNDO AVANT de kill
        // Cela permet de restaurer l'état des écrans proprement
        await this.executeUndoScriptIfNeeded();

        console.log('[ProcessManager] Stopping current instance...');
        await execAsync(`taskkill /F /IM ${this.PROCESS_NAME}`);
        
        // Attendre que le processus soit vraiment terminé
        const stopped = await this.waitForProcessState(false, 5000);
        if (!stopped) {
          console.warn('[ProcessManager] Process may not have stopped cleanly');
        }
      }

      // 2. Délai de sécurité pour libérer les ressources (ports, fichiers)
      console.log('[ProcessManager] Waiting for resources to be released...');
      await this.delay(2000);

      // 3. Démarrer le nouveau processus
      const sunshineExe = this.getSunshineExePath();
      const configPath = this.getSunshineConfigPath();
      console.log('[ProcessManager] Starting new instance...');

      const child = spawn(sunshineExe, [configPath], {
        detached: true,
        stdio: 'ignore',
        cwd: path.dirname(sunshineExe),
      });
      child.unref();

      // 4. Attendre que le processus démarre vraiment
      const started = await this.waitForProcessState(true, 5000);
      
      if (started) {
        console.log('[ProcessManager] Sunshine restarted successfully');
        return { success: true };
      } else {
        return { success: false, error: 'Sunshine did not restart properly' };
      }
    } catch (error: any) {
      console.log('[ProcessManager] Restart failed:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to restart Sunshine',
      };
    } finally {
      this.operationInProgress = false;
    }
  }

  /**
   * Check if Sunshine is currently running
   */
  async isSunshineRunning(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`tasklist /FI "IMAGENAME eq ${this.PROCESS_NAME}" /NH`);
      return stdout.toLowerCase().includes('sunshine');
    } catch {
      return false;
    }
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Résout le chemin vers eclipse-undo.ps1 (dev vs prod)
   */
  private getUndoScriptPath(): string {
    const isDev = !app.isPackaged;
    if (isDev) {
      return path.join(app.getAppPath(), 'resources', 'scripts', 'eclipse-undo.ps1');
    } else {
      return path.join(process.resourcesPath, 'resources', 'scripts', 'eclipse-undo.ps1');
    }
  }

  /**
   * Exécute le script UNDO si un state file existe
   * Appelé AVANT de kill Sunshine pour permettre une fermeture propre
   */
  private async executeUndoScriptIfNeeded(): Promise<void> {
    try {
      // Vérifier si un state file existe (= stream en cours ou cleanup nécessaire)
      if (!fs.existsSync(STATE_FILE)) {
        console.log('[ProcessManager] No state file, no UNDO needed');
        return;
      }

      const undoScript = this.getUndoScriptPath();
      if (!fs.existsSync(undoScript)) {
        console.warn('[ProcessManager] UNDO script not found:', undoScript);
        return;
      }

      console.log('[ProcessManager] Executing UNDO script before killing Sunshine...');

      // Exécuter le script UNDO avec PowerShell
      const command = `powershell.exe -ExecutionPolicy Bypass -File "${undoScript}"`;
      await execAsync(command, { timeout: 10000 });

      console.log('[ProcessManager] UNDO script executed successfully');

      // Petit délai pour laisser les changements d'écran se stabiliser
      await this.delay(500);
    } catch (error: any) {
      console.warn('[ProcessManager] UNDO script failed:', error.message);
      // On continue quand même - le kill doit se faire
    }
  }

  /**
   * Attend que l'opération en cours soit terminée
   * Polling toutes les 200ms, timeout après 10s
   */
  private async waitForOperationComplete(): Promise<void> {
    const maxWait = 10000;
    const interval = 200;
    let waited = 0;
    
    while (this.operationInProgress && waited < maxWait) {
      await this.delay(interval);
      waited += interval;
    }
    
    if (waited >= maxWait) {
      console.warn('[ProcessManager] Timeout waiting for operation to complete');
    }
  }

  /**
   * Attend que le processus atteigne l'état désiré (running ou stopped)
   * @param shouldBeRunning - true pour attendre qu'il démarre, false pour attendre qu'il s'arrête
   * @param timeout - temps max d'attente en ms
   * @returns true si l'état désiré est atteint, false si timeout
   */
  private async waitForProcessState(shouldBeRunning: boolean, timeout: number): Promise<boolean> {
    const interval = 300;
    let waited = 0;
    
    while (waited < timeout) {
      const isRunning = await this.isSunshineRunning();
      
      if (isRunning === shouldBeRunning) {
        console.log(`[ProcessManager] Process state reached: ${shouldBeRunning ? 'running' : 'stopped'} (after ${waited}ms)`);
        return true;
      }
      
      await this.delay(interval);
      waited += interval;
    }
    
    console.warn(`[ProcessManager] Timeout waiting for process to ${shouldBeRunning ? 'start' : 'stop'}`);
    return false;
  }
}
