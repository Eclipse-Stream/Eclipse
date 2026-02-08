// IPC Handlers - Eclipse Recovery
// Cleans up orphaned state when stream ends unexpectedly (Sunshine crash/restart)

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from './channels';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const STATE_FILE = path.join(process.env.TEMP || '', 'eclipse_state.json');
const ECLIPSE_DIR = path.join(process.env.APPDATA || '', 'Eclipse');
const CONFIG_FILE = path.join(ECLIPSE_DIR, 'eclipse-config.json');

// v6.0 State format
interface DisplayInfo {
  width: number;
  height: number;
  frequency: number;
  primary: boolean;
}

interface EclipseState {
  timestamp: string;
  // Note: PowerShell may serialize false as empty array [], so we need to handle both
  vddWasEnabled: boolean | unknown[];
  initialPrimary: string | null;
  initialDisplays: Record<string, DisplayInfo>;
  disabledDisplays: string[];
  displayMode: string;
}

/**
 * Convert PowerShell's potentially weird boolean to actual boolean
 * PowerShell may serialize $false as [] and $true as true
 */
function toBool(value: boolean | unknown[]): boolean {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return Boolean(value);
}

interface EclipseConfig {
  devconPath: string;
  multiMonitorToolPath: string;
  vddInstanceId: string | null;
}

interface RecoveryResult {
  success: boolean;
  recovered: boolean;
  error?: string;
  details?: string;
}

/**
 * Check if state file exists (indicates unclean shutdown)
 */
export function hasOrphanedState(): boolean {
  return existsSync(STATE_FILE);
}

/**
 * Perform recovery cleanup if state file exists
 * Returns details about what was cleaned up
 */
export async function performRecovery(): Promise<RecoveryResult> {
  console.log('[Recovery] Checking for orphaned state...');

  if (!existsSync(STATE_FILE)) {
    console.log('[Recovery] No orphaned state found');
    return { success: true, recovered: false };
  }

  console.log('[Recovery] Found orphaned state file, performing cleanup...');

  try {
    // 1. Read state file
    const stateContent = await fs.readFile(STATE_FILE, 'utf-8');
    const state: EclipseState = JSON.parse(stateContent.replace(/^\uFEFF/, ''));
    const vddWasEnabledBool = toBool(state.vddWasEnabled);
    console.log('[Recovery] State loaded:', {
      timestamp: state.timestamp,
      vddWasEnabled: vddWasEnabledBool,
      initialPrimary: state.initialPrimary,
      displayMode: state.displayMode,
      disabledDisplays: state.disabledDisplays,
      displayCount: state.initialDisplays ? Object.keys(state.initialDisplays).length : 0,
    });

    // 2. Read Eclipse config to get tool paths
    if (!existsSync(CONFIG_FILE)) {
      console.warn('[Recovery] Eclipse config not found, cannot perform full recovery');
      await fs.unlink(STATE_FILE);
      return {
        success: true,
        recovered: true,
        details: 'State file removed but config missing - partial recovery'
      };
    }

    const configContent = await fs.readFile(CONFIG_FILE, 'utf-8');
    const config: EclipseConfig = JSON.parse(configContent.replace(/^\uFEFF/, ''));
    const { devconPath, multiMonitorToolPath: mmtPath, vddInstanceId } = config;

    const actions: string[] = [];

    // 3. Re-enable disabled displays (focus mode cleanup)
    if (state.disabledDisplays && state.disabledDisplays.length > 0 && existsSync(mmtPath)) {
      console.log('[Recovery] Re-enabling disabled displays:', state.disabledDisplays);
      for (const display of state.disabledDisplays) {
        try {
          execSync(`"${mmtPath}" /enable ${display}`, { stdio: 'pipe' });
          console.log(`[Recovery] Re-enabled: ${display}`);
          actions.push(`Re-enabled display: ${display}`);
        } catch (err) {
          console.warn(`[Recovery] Failed to re-enable ${display}:`, err);
        }
      }
      // Wait for displays to stabilize
      await sleep(1000);
    }

    // 4. Restore initial resolutions for all displays
    if (state.initialDisplays && existsSync(mmtPath)) {
      console.log('[Recovery] Restoring initial resolutions...');
      for (const [displayName, info] of Object.entries(state.initialDisplays)) {
        if (info.width && info.height && info.frequency) {
          try {
            const cmd = `"${mmtPath}" /SetMonitors "Name=${displayName} Width=${info.width} Height=${info.height} DisplayFrequency=${info.frequency}"`;
            execSync(cmd, { stdio: 'pipe' });
            console.log(`[Recovery] Restored ${displayName}: ${info.width}x${info.height}@${info.frequency}Hz`);
            actions.push(`Restored resolution: ${displayName}`);
          } catch (err) {
            console.warn(`[Recovery] Failed to restore resolution for ${displayName}:`, err);
          }
        }
      }
      await sleep(300);
    }

    // 5. Restore primary display (only if mode changed it)
    const shouldRestorePrimary = state.displayMode === 'enable-primary' || state.displayMode === 'focus';
    if (shouldRestorePrimary && state.initialPrimary && existsSync(mmtPath)) {
      console.log('[Recovery] Restoring primary display:', state.initialPrimary, `(mode was: ${state.displayMode})`);
      try {
        execSync(`"${mmtPath}" /SetPrimary ${state.initialPrimary}`, { stdio: 'pipe' });
        actions.push(`Restored primary: ${state.initialPrimary}`);
      } catch (err) {
        console.warn('[Recovery] Failed to restore primary:', err);
      }
    } else if (!shouldRestorePrimary) {
      console.log('[Recovery] Skipping primary restore (mode was:', state.displayMode, '- no change needed)');
    }

    // 6. Disable VDD if we had enabled it (it was off before stream)
    const vddWasEnabled = toBool(state.vddWasEnabled);
    if (!vddWasEnabled && vddInstanceId && existsSync(devconPath)) {
      console.log('[Recovery] VDD was not enabled before stream, disabling it...');
      try {
        // Check current VDD status
        const status = execSync(`"${devconPath}" status "@${vddInstanceId}"`, { encoding: 'utf-8' });
        const isEnabled = status.includes('Driver is running');

        if (isEnabled) {
          execSync(`"${devconPath}" disable "@${vddInstanceId}"`, { stdio: 'pipe' });
          console.log('[Recovery] VDD disabled');
          actions.push('Disabled VDD');
        } else {
          console.log('[Recovery] VDD already disabled');
        }
      } catch (err) {
        console.warn('[Recovery] Failed to disable VDD:', err);
      }
    }

    // 7. Remove state file
    await fs.unlink(STATE_FILE);
    console.log('[Recovery] State file removed');

    const details = actions.length > 0
      ? `Recovered: ${actions.join(', ')}`
      : 'No recovery actions needed';

    console.log('[Recovery] Cleanup complete:', details);
    return { success: true, recovered: true, details };

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Recovery] Recovery failed:', message);

    // Still try to remove the state file to avoid infinite loops
    try {
      await fs.unlink(STATE_FILE);
    } catch {
      // Ignore
    }

    return { success: false, recovered: false, error: message };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Register IPC handlers for recovery
 */
export function registerRecoveryHandlers(): void {
  // Check and cleanup orphaned state
  ipcMain.handle(
    IPC_CHANNELS.RECOVERY_CHECK_AND_CLEANUP,
    async (): Promise<RecoveryResult> => {
      return performRecovery();
    }
  );

  console.log('[RecoveryHandlers] Registered');
}

/**
 * Perform recovery at startup (called from main.ts)
 */
export async function performStartupRecovery(): Promise<void> {
  const result = await performRecovery();
  if (result.recovered) {
    console.log('[Eclipse] Startup recovery performed:', result.details);
  }
}
