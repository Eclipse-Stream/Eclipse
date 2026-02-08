/// <reference path="./env.d.ts" />
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { IPC_CHANNELS } from './ipc/channels';
import { isWindows11 } from '../src/shared/utils/platform';
import { registerSunshineHandlers } from './ipc/sunshine-handlers';
import { registerSystemHandlers } from './ipc/system-handlers';
import { registerStorageHandlers } from './ipc/storage-handlers';
import { registerVDDHandlers, initializeVDD, shutdownVDD, getSharedVDDDriver } from './ipc/vdd-handlers';
import { registerSunshineConfigHandlers } from './ipc/sunshine-config-handlers';
import { registerDisplayHandlers } from './ipc/display-handlers';
import { registerAudioHandlers } from './ipc/audio-handlers';
import { registerSunshinePresetHandlers, applyEclipseDefaultPreset } from './ipc/sunshine-preset-handlers';
import { registerSunshineAppsHandlers, ensureEclipseAppExists } from './ipc/sunshine-apps-handlers';
import { registerDialogHandlers } from './ipc/dialog-handlers';
import { registerScriptsHandlers, ensureEclipseScriptsExist, updateEclipseConfig } from './ipc/scripts-handlers';
import { registerClientsHandlers } from './ipc/clients-handlers'; // Epic 6
import { registerRecoveryHandlers, performStartupRecovery } from './ipc/recovery-handlers';
import { registerTrayHandlers, setTrayManager } from './ipc/tray-handlers';
import { registerConfigHandlers } from './ipc/config-handlers'; // Story 10.3
import { TrayManager } from './tray/tray-manager';
import { ProcessManager } from '../src/infrastructure/system/process-manager';
import { SunshineConfigManager } from '../src/infrastructure/sunshine/SunshineConfigManager';
import { sunshineHealthChecker } from '../src/infrastructure/sunshine';
import { sunshineEventMonitor, streamNotificationBridge } from './services';
import { getCredentialStorage } from '../src/infrastructure/storage/credential-storage';
import { isEclipseSetupCompleted, markEclipseSetupCompleted } from '../src/infrastructure/sunshine/EclipseSetupFlagService';

// Singleton ProcessManager for lifecycle control
const processManager = new ProcessManager();

// Singleton SunshineConfigManager for config operations (Story 9.6)
const sunshineConfigManager = new SunshineConfigManager();

// TrayManager instance (Story 9.1)
let trayManager: TrayManager | null = null;

// Story 9.7: Detect hidden start mode (auto-start with Windows)
// The --hidden flag is passed by app.setLoginItemSettings({ args: ['--hidden'] })
const isHiddenStart = process.argv.includes('--hidden');
if (isHiddenStart) {
  console.log('[Eclipse] Starting in hidden mode (auto-start with Windows)');
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

/**
 * Get the path to the app icon (handles dev vs production)
 */
const getIconPath = (): string => {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'resources', 'icons', 'icon.png');
  } else {
    return path.join(app.getAppPath(), 'resources', 'icons', 'icon.png');
  }
};

const createWindow = () => {
  // Eclipse V2 - Compact window configuration (Story 1.2)
  mainWindow = new BrowserWindow({
    width: 750,
    height: 600,
    minWidth: 750,
    maxWidth: 750,
    minHeight: 600,
    maxHeight: 600,
    resizable: false,           // FR79 - Fixed size window
    frame: false,               // Custom titlebar
    // Win11: backgroundMaterial gère la transparence automatiquement (PR electron#39708)
    // Win10: transparent:true comme fallback pour le CSS backdrop-blur
    transparent: !isWindows11(),
    backgroundColor: '#00000000', // Transparent background
    backgroundMaterial: isWindows11() ? 'acrylic' : undefined, // Acrylic effect on Win11
    show: false,                // Story 9.7: Don't show immediately, wait for ready-to-show
    icon: getIconPath(),        // Eclipse Guardian logo for taskbar
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Story 9.7: Show window only when ready AND not in hidden mode
  mainWindow.once('ready-to-show', () => {
    if (!isHiddenStart) {
      mainWindow?.show();
      console.log('[Eclipse] Window shown (normal start)');
    } else {
      console.log('[Eclipse] Window hidden (auto-start mode) - use tray to show');
    }
  });

  // Load the app
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open DevTools only in development
  if (process.env.NODE_ENV === 'development' || MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  // Register IPC handlers first (synchronous, fast)
  registerSunshineHandlers();
  registerSystemHandlers();
  registerStorageHandlers();
  registerVDDHandlers();
  registerSunshineConfigHandlers(getSharedVDDDriver()); // Story 3.4
  registerDisplayHandlers(); // Story 3.2
  registerAudioHandlers(); // Story 5.3
  registerSunshinePresetHandlers(); // Story 5.4 & 5.5
  registerSunshineAppsHandlers(); // Story 7.1
  registerDialogHandlers(); // Story 7.4
  registerScriptsHandlers(); // Story 7.9
  registerClientsHandlers(); // Epic 6
  registerRecoveryHandlers(); // Stream recovery
  registerTrayHandlers(); // Story 9.1
  registerConfigHandlers(); // Story 10.3

  // Create window IMMEDIATELY for fast startup UX
  createWindow();

  // Initialize TrayManager after window is created (Story 9.1)
  if (mainWindow) {
    trayManager = new TrayManager(mainWindow);
    setTrayManager(trayManager);
    trayManager.init();
  }

  // Initialize VDD, Sunshine, and Eclipse app in background (non-blocking)
  // These can take time but shouldn't delay window display
  (async () => {
    try {
      // 0. Perform recovery if previous stream ended uncleanly
      console.log('[Eclipse] Checking for orphaned stream state...');
      await performStartupRecovery();

      // 1. Initialize VDD driver first (Story 3.2)
      console.log('[Eclipse] Initializing VDD driver...');
      await initializeVDD();

      // 2. Update Eclipse config with VDD Instance ID (must be after VDD init)
      console.log('[Eclipse] Updating Eclipse config...');
      await updateEclipseConfig();

      // 2b. Story 10.2: Check Sunshine health BEFORE trying to start it
      console.log('[Eclipse] Checking Sunshine installation health...');
      const healthResult = sunshineHealthChecker.checkSunshineInstallation();
      console.log('[Eclipse] Sunshine health:', healthResult.status);

      if (healthResult.status !== 'HEALTHY') {
        console.warn('[Eclipse] Sunshine not healthy, skipping startup. Status:', healthResult.status);
        console.warn('[Eclipse] Missing files:', healthResult.missingFiles);
        // Don't start Sunshine - let the renderer show the dialog
        return;
      }

      // 3. Story 11.2: Initialize sunshine_name with hostname on first launch
      console.log('[Eclipse] Initializing sunshine_name if needed...');
      const nameResult = await sunshineConfigManager.ensureSunshineNameInitialized();
      if (!nameResult.success) {
        console.warn('[Eclipse] Could not initialize sunshine_name:', nameResult.error);
      }

      // 3b. Check credentials and sync with Sunshine if needed
      const credentialStorage = getCredentialStorage();
      const storedCredsJson = await credentialStorage.load('sunshine-credentials');
      
      if (!storedCredsJson) {
        console.log('[Eclipse] No credentials found - skipping Sunshine auto-start');
        console.log('[Eclipse] User must configure credentials via SetupCredentialsDialog');
        // Don't start Sunshine - let the renderer show the credentials dialog first
        return;
      }

      // We have credentials in Eclipse - need to ensure Sunshine has them too
      console.log('[Eclipse] Credentials found in Eclipse storage');
      const storedCreds = JSON.parse(storedCredsJson) as { username: string; password: string };

      // 4. Start Sunshine first (needed for API communication)
      console.log('[Eclipse] Starting Sunshine service...');
      const startResult = await processManager.startSunshine();
      if (!startResult.success) {
        console.warn('[Eclipse] Failed to start Sunshine:', startResult.error);
        return;
      }
      console.log('[Eclipse] Sunshine service started successfully');

      // 4b. Wait for API and check if Sunshine needs credentials pushed
      console.log('[Eclipse] Checking if Sunshine needs credentials sync...');
      const axios = await import('axios');
      const https = await import('https');
      const httpsAgent = new https.Agent({ rejectUnauthorized: false });
      const baseUrl = 'https://localhost:47990';

      // Wait for Sunshine API to be ready
      let apiReady = false;
      for (let attempt = 1; attempt <= 15; attempt++) {
        try {
          const response = await axios.default.get(`${baseUrl}/api/config`, {
            timeout: 2000,
            httpsAgent,
            validateStatus: () => true,
          });
          if (response.status === 200 || response.status === 401) {
            apiReady = true;
            console.log(`[Eclipse] Sunshine API ready (status: ${response.status})`);
            
            // If 200 without auth = setup mode, need to push credentials
            if (response.status === 200) {
              console.log('[Eclipse] Sunshine in setup mode - pushing credentials via API POST');
              const postResponse = await axios.default.post(`${baseUrl}/api/password`, {
                currentUsername: '',
                currentPassword: '',
                newUsername: storedCreds.username,
                newPassword: storedCreds.password,
                confirmNewPassword: storedCreds.password
              }, {
                timeout: 10000,
                httpsAgent,
                headers: { 'Content-Type': 'application/json' },
                validateStatus: () => true,
              });
              
              if (postResponse.status === 200) {
                console.log('[Eclipse] Credentials pushed to Sunshine successfully');
              } else {
                console.warn('[Eclipse] Failed to push credentials:', postResponse.status, postResponse.data);
              }
            } else {
              console.log('[Eclipse] Sunshine already has credentials configured');
            }
            break;
          }
        } catch (e: any) {
          if (attempt < 15) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      if (!apiReady) {
        console.warn('[Eclipse] Sunshine API not reachable after startup');
      }

      // 4b. Story 9.6: Masquer le tray Sunshine (Eclipse gère les notifications)
      console.log('[Eclipse] Checking Sunshine system_tray configuration...');
      const trayResult = await sunshineConfigManager.ensureSystemTrayDisabled();
      if (trayResult.needsRestart) {
        console.log('[Eclipse] Restarting Sunshine to apply system_tray = disabled');
        await processManager.restartSunshine();
      } else if (trayResult.error) {
        console.warn('[Eclipse] Could not configure system_tray:', trayResult.error);
      }

      // 5. Ensure Eclipse scripts exist FIRST (needed by app Eclipse)
      console.log('[Eclipse] Ensuring Eclipse scripts exist...');
      await ensureEclipseScriptsExist();

      // 6. Ensure Eclipse app exists in apps.json with scripts (Story 7.5)
      console.log('[Eclipse] Ensuring Eclipse app exists with DO/UNDO scripts...');
      await ensureEclipseAppExists();

      // 6b. Apply Eclipse Default preset ONLY on first startup after installation
      // Check if setup was already completed (flag in Sunshine config folder)
      const setupAlreadyDone = isEclipseSetupCompleted();
      
      if (!setupAlreadyDone) {
        console.log('[Eclipse] First startup detected - applying Eclipse Default preset...');
        await applyEclipseDefaultPreset();
        markEclipseSetupCompleted();
        console.log('[Eclipse] Eclipse Default preset applied and setup marked as completed');
      } else {
        console.log('[Eclipse] Setup already completed - skipping preset application');
        console.log('[Eclipse] User preset will be preserved from previous session');
      }

      // 7. Story 9.5: Start streaming event monitor and connect to notifications
      console.log('[Eclipse] Starting Sunshine event monitor...');
      streamNotificationBridge.init();
      sunshineEventMonitor.start();
      console.log('[Eclipse] Sunshine event monitor started');

    } catch (error) {
      console.error('[Eclipse] Background initialization error:', error);
    }
  })();
});

// Story 9.1: With TrayManager, we don't quit when windows are closed
// The app stays running in the system tray
// On macOS, it's also common to stay active until explicit quit
app.on('window-all-closed', () => {
  // Don't quit - app stays in tray (Story 9.1)
  // Only quit via tray menu or explicit app.quit()
});

// Cleanup when Eclipse closes (Story 2.2, 3.2, 9.1)
// - Notify TrayManager of quitting
// - Disable VDD screen to avoid ghost display
// - Stop Sunshine service
app.on('before-quit', async (event) => {
  // Prevent immediate quit to allow async cleanup
  event.preventDefault();

  // Notify TrayManager that we're quitting (Story 9.1)
  if (trayManager) {
    trayManager.setQuitting(true);
    trayManager.destroy();
  }

  // Story 9.5: Stop Sunshine event monitor
  console.log('[Eclipse] Stopping Sunshine event monitor...');
  sunshineEventMonitor.stop();
  streamNotificationBridge.destroy();

  // Disable VDD screen (Story 3.2)
  console.log('[Eclipse] Disabling VDD screen...');
  await shutdownVDD();

  // Stop Sunshine service (Story 2.2)
  console.log('[Eclipse] Stopping Sunshine service...');
  const stopResult = await processManager.stopSunshine();
  if (stopResult.success) {
    console.log('[Eclipse] Sunshine service stopped successfully');
  } else {
    console.warn('[Eclipse] Failed to stop Sunshine:', stopResult.error);
  }

  // Check if this is a restart request (Story 9.4)
  const shouldRestart = trayManager?.isAppRestarting() ?? false;
  console.log('[Eclipse] Restart flag:', shouldRestart);

  if (shouldRestart) {
    // In dev mode, relaunch doesn't work well with electron-forge
    // In production, we need to preserve the executable path and args
    const isDevMode = !app.isPackaged;

    if (isDevMode) {
      console.log('[Eclipse] Dev mode detected - manual restart required');
      console.log('[Eclipse] Run "npm start" to restart the application');
    } else {
      console.log('[Eclipse] Relaunching application...');
      app.relaunch({
        execPath: process.execPath,
        args: process.argv.slice(1)
      });
    }
  }

  // Now actually quit
  app.exit(0);
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

// IPC Handlers
ipcMain.handle(IPC_CHANNELS.PING, async () => {
  return 'pong';
});

ipcMain.handle(IPC_CHANNELS.GET_APP_VERSION, async () => {
  return app.getVersion();
});

// Window control handlers (Story 1.2)
ipcMain.handle(IPC_CHANNELS.WINDOW_MINIMIZE, () => {
  mainWindow?.minimize();
});

ipcMain.handle(IPC_CHANNELS.WINDOW_CLOSE, () => {
  mainWindow?.close();
});

/**
 * Epic 11: Complete Sunshine setup after credentials have been entered
 * This is called by the renderer after SetupCredentialsDialog saves credentials
 * and starts Sunshine. It completes the remaining setup steps.
 */
ipcMain.handle(IPC_CHANNELS.SUNSHINE_COMPLETE_SETUP, async (): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('[Eclipse] SUNSHINE_COMPLETE_SETUP: Starting post-credentials setup...');
    
    // Wait for Sunshine API to be ready
    const axios = await import('axios');
    const https = await import('https');
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });
    const baseUrl = 'https://localhost:47990';
    
    let apiReady = false;
    for (let attempt = 1; attempt <= 15; attempt++) {
      try {
        const response = await axios.default.get(`${baseUrl}/api/config`, {
          timeout: 2000,
          httpsAgent,
          validateStatus: () => true,
        });
        if (response.status === 200 || response.status === 401) {
          apiReady = true;
          console.log(`[Eclipse] Sunshine API ready (status: ${response.status})`);
          break;
        }
      } catch (e: unknown) {
        if (attempt < 15) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    if (!apiReady) {
      console.warn('[Eclipse] Sunshine API not reachable after startup');
      return { success: false, error: 'Sunshine API not reachable' };
    }
    
    // Ensure system_tray is disabled
    console.log('[Eclipse] Checking Sunshine system_tray configuration...');
    const trayResult = await sunshineConfigManager.ensureSystemTrayDisabled();
    if (trayResult.needsRestart) {
      console.log('[Eclipse] Restarting Sunshine to apply system_tray = disabled');
      await processManager.restartSunshine();
      // Wait a bit for restart
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Ensure Eclipse scripts exist
    console.log('[Eclipse] Ensuring Eclipse scripts exist...');
    await ensureEclipseScriptsExist();
    
    // Ensure Eclipse app exists in apps.json
    console.log('[Eclipse] Ensuring Eclipse app exists with DO/UNDO scripts...');
    await ensureEclipseAppExists();
    
    // Apply Eclipse Default preset (with VDD Device ID) and mark setup as completed
    console.log('[Eclipse] Applying Eclipse Default preset...');
    await applyEclipseDefaultPreset();
    markEclipseSetupCompleted();
    console.log('[Eclipse] Setup marked as completed (flag created)');
    
    // Start streaming event monitor
    console.log('[Eclipse] Starting Sunshine event monitor...');
    streamNotificationBridge.init();
    sunshineEventMonitor.start();
    
    console.log('[Eclipse] SUNSHINE_COMPLETE_SETUP: Setup completed successfully!');
    return { success: true };
  } catch (error: unknown) {
    console.error('[Eclipse] SUNSHINE_COMPLETE_SETUP error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});
