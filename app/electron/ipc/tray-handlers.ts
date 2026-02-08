/**
 * Tray IPC Handlers - Story 9.1 & 9.2
 * Handles IPC communication for system tray operations and tray panel
 */
import { ipcMain } from 'electron';
import { IPC_CHANNELS } from './channels';
import { TrayManager, TrayState } from '../tray/tray-manager';

let trayManagerInstance: TrayManager | null = null;

/**
 * Set the TrayManager instance for handlers to use
 */
export function setTrayManager(manager: TrayManager): void {
  trayManagerInstance = manager;
}

/**
 * Register all tray-related IPC handlers
 */
export function registerTrayHandlers(): void {
  // Set tray state (playing/pausing/locked)
  ipcMain.handle(IPC_CHANNELS.TRAY_SET_STATE, async (_event, state: TrayState) => {
    if (!trayManagerInstance) {
      console.warn('[TrayHandlers] TrayManager not initialized');
      return { success: false, error: 'TrayManager not initialized' };
    }

    trayManagerInstance.setState(state);
    return { success: true };
  });

  // Get tray state
  ipcMain.handle(IPC_CHANNELS.TRAY_GET_STATE, async () => {
    if (!trayManagerInstance) {
      return { success: false, state: 'locked', error: 'TrayManager not initialized' };
    }

    return { success: true, state: trayManagerInstance.getState() };
  });

  // Legacy: Set streaming state (maps to playing/pausing)
  ipcMain.handle(IPC_CHANNELS.TRAY_SET_STREAMING_STATE, async (_event, isStreaming: boolean) => {
    if (!trayManagerInstance) {
      console.warn('[TrayHandlers] TrayManager not initialized');
      return { success: false, error: 'TrayManager not initialized' };
    }

    trayManagerInstance.setStreamingState(isStreaming);
    return { success: true };
  });

  // Legacy: Get streaming state
  ipcMain.handle(IPC_CHANNELS.TRAY_GET_STREAMING_STATE, async () => {
    if (!trayManagerInstance) {
      return { success: false, isStreaming: false, error: 'TrayManager not initialized' };
    }

    return { success: true, isStreaming: trayManagerInstance.getStreamingState() };
  });

  // Show window from renderer
  ipcMain.handle(IPC_CHANNELS.TRAY_SHOW_WINDOW, async () => {
    if (!trayManagerInstance) {
      return { success: false, error: 'TrayManager not initialized' };
    }

    trayManagerInstance.showWindow();
    return { success: true };
  });

  // Story 9.2: Tray Panel handlers

  // Close tray panel
  ipcMain.handle(IPC_CHANNELS.TRAY_PANEL_CLOSE, async () => {
    if (!trayManagerInstance) {
      return { success: false, error: 'TrayManager not initialized' };
    }

    trayManagerInstance.hideTrayPanel();
    return { success: true };
  });

  // Open main window from tray panel
  ipcMain.handle(IPC_CHANNELS.TRAY_PANEL_OPEN_MAIN_WINDOW, async () => {
    if (!trayManagerInstance) {
      return { success: false, error: 'TrayManager not initialized' };
    }

    // Hide panel first, then show main window
    trayManagerInstance.hideTrayPanel();
    trayManagerInstance.showWindow();
    return { success: true };
  });

  // Story 9.3: Set tray panel height (for collapsible section)
  ipcMain.handle(IPC_CHANNELS.TRAY_PANEL_SET_HEIGHT, async (_event, height: number) => {
    if (!trayManagerInstance) {
      return { success: false, error: 'TrayManager not initialized' };
    }

    trayManagerInstance.setTrayPanelHeight(height);
    return { success: true };
  });

  // Story 10.5: Set tray language (updates context menu)
  ipcMain.handle(IPC_CHANNELS.TRAY_SET_LANGUAGE, async (_event, lang: 'fr' | 'en') => {
    if (!trayManagerInstance) {
      return { success: false, error: 'TrayManager not initialized' };
    }

    trayManagerInstance.setLanguage(lang);
    return { success: true };
  });

  console.log('[TrayHandlers] Registered');
}
