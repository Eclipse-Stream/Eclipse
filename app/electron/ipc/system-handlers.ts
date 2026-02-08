// IPC Handlers - System
// Handles system-level operations like service control

import { ipcMain, shell, app } from 'electron';
import os from 'node:os';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { IPC_CHANNELS } from './channels';
import type { FirewallCheckResult, FirewallRecreateResult } from './channels';
import { ProcessManager } from '../../src/infrastructure/system/process-manager';
import { autostartService } from '../services/autostart-service';
import { SunshineConfigManager } from '../../src/infrastructure/sunshine/SunshineConfigManager';

const processManager = new ProcessManager();
const sunshineConfigManager = new SunshineConfigManager();

export function registerSystemHandlers(): void {
  // Start Sunshine service
  ipcMain.handle(IPC_CHANNELS.SUNSHINE_START, async () => {
    return await processManager.startSunshine();
  });

  // Stop Sunshine service
  ipcMain.handle(IPC_CHANNELS.SUNSHINE_STOP, async () => {
    return await processManager.stopSunshine();
  });

  // Restart Sunshine service
  // Bug Fix: Ensure system_tray stays disabled after every restart
  ipcMain.handle(IPC_CHANNELS.SUNSHINE_RESTART, async () => {
    const result = await processManager.restartSunshine();
    if (result.success) {
      // Re-apply system_tray = disabled after restart
      await sunshineConfigManager.ensureSystemTrayDisabled();
    }
    return result;
  });

  // Open external URL in default browser
  ipcMain.handle(IPC_CHANNELS.SHELL_OPEN_EXTERNAL, async (_event, url: string) => {
    await shell.openExternal(url);
  });

  // Autostart handlers (Story 9.7)
  ipcMain.handle(IPC_CHANNELS.AUTOSTART_IS_ENABLED, () => {
    return autostartService.isEnabled();
  });

  ipcMain.handle(IPC_CHANNELS.AUTOSTART_ENABLE, () => {
    autostartService.enable();
  });

  ipcMain.handle(IPC_CHANNELS.AUTOSTART_DISABLE, () => {
    autostartService.disable();
  });

  ipcMain.handle(IPC_CHANNELS.AUTOSTART_TOGGLE, () => {
    return autostartService.toggle();
  });

  // Get system hostname (for onboarding - Sunshine name suggestion)
  ipcMain.handle(IPC_CHANNELS.SYSTEM_GET_HOSTNAME, () => {
    return os.hostname();
  });

  // Story 12.6: Get local IPv4 address (non-loopback)
  ipcMain.handle(IPC_CHANNELS.SYSTEM_GET_LOCAL_IP, (): string | null => {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      const addrs = interfaces[name];
      if (!addrs) continue;
      for (const addr of addrs) {
        if (addr.family === 'IPv4' && !addr.internal) {
          return addr.address;
        }
      }
    }
    return null;
  });

  // Story 12.6: Check if firewall rule for Sunshine exists
  // Checks "Eclipse Sunshine", "Eclipse" (legacy), and "Sunshine" (original installer)
  ipcMain.handle(IPC_CHANNELS.SYSTEM_CHECK_FIREWALL, (): FirewallCheckResult => {
    for (const ruleName of ['Eclipse Sunshine', 'Eclipse', 'Sunshine']) {
      try {
        const output = execSync(
          `netsh advfirewall firewall show rule name="${ruleName}"`,
          { encoding: 'utf-8', timeout: 5000 }
        );
        if (output.includes(ruleName)) {
          console.log(`[Eclipse] Firewall rule found: "${ruleName}"`);
          return { ruleExists: true };
        }
      } catch {
        // netsh returns exit code 1 when rule not found — try next name
      }
    }
    console.log('[Eclipse] Firewall rule check: absent');
    return { ruleExists: false };
  });

  // Story 12.6: Recreate "Eclipse Sunshine" firewall rule via add-firewall-rule.bat
  ipcMain.handle(IPC_CHANNELS.SYSTEM_RECREATE_FIREWALL, async (): Promise<FirewallRecreateResult> => {
    try {
      const isDev = !app.isPackaged;
      const scriptsDir = isDev
        ? path.join(app.getAppPath(), 'resources', 'tools', 'Sunshine', 'scripts')
        : path.join(process.resourcesPath, 'resources', 'tools', 'Sunshine', 'scripts');
      const batPath = path.join(scriptsDir, 'add-firewall-rule.bat');

      console.log('[Eclipse] Recreating firewall rule via:', batPath);
      execSync(`"${batPath}"`, { encoding: 'utf-8', timeout: 15000 });
      console.log('[Eclipse] Firewall rule recreated successfully');
      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.warn('[Eclipse] Failed to recreate firewall rule:', message);
      return { success: false, error: message };
    }
  });
}
