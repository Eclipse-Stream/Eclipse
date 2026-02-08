/**
 * TrayManager - System Tray integration for Eclipse V2
 * Story 9.1: Infrastructure Tray & Minimize-to-Tray
 * Story 9.2: Panel Glassmorphism - Core
 *
 * Handles:
 * - System tray icon with dynamic state (idle/streaming)
 * - Minimize-to-tray behavior (close button hides instead of quits)
 * - Left-click to open glassmorphism panel (Story 9.2)
 * - Double-click to restore window
 */
import { Tray, nativeImage, BrowserWindow, app, NativeImage, Menu } from 'electron';
import path from 'node:path';
import { TrayPanelWindow } from './tray-panel-window';

export type TrayState = 'playing' | 'pausing' | 'locked';
export type TrayLanguage = 'fr' | 'en';

// Tray menu translations (Story 10.5)
const TRAY_TRANSLATIONS: Record<TrayLanguage, { open: string; restart: string; quit: string }> = {
  fr: {
    open: 'Ouvrir Eclipse',
    restart: 'Redémarrer Eclipse',
    quit: 'Quitter',
  },
  en: {
    open: 'Open Eclipse',
    restart: 'Restart Eclipse',
    quit: 'Quit',
  },
};

export class TrayManager {
  private tray: Tray | null = null;
  private mainWindow: BrowserWindow;
  private currentState: TrayState = 'locked';
  private isQuitting = false;
  private isRestarting = false;
  private trayPanel: TrayPanelWindow;
  private currentLanguage: TrayLanguage = 'fr';

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.trayPanel = new TrayPanelWindow();
  }

  /**
   * Initialize the system tray icon and behaviors
   */
  init(): void {
    const icon = this.getIcon('locked');
    this.tray = new Tray(icon);
    this.tray.setToolTip('Eclipse V2 - Locked');

    // Create the tray panel (Story 9.2)
    this.trayPanel.create();

    // Left-click to toggle panel (Story 9.2 - AC1)
    // Note: Double-click removed - users open main window via panel settings button
    this.tray.on('click', (_event, bounds) => {
      this.trayPanel.toggle(bounds);
    });

    // Setup close-to-tray behavior (AC4)
    this.setupMinimizeToTray();

    // Setup context menu (Story 9.4)
    this.tray.setContextMenu(this.createContextMenu());

    // Handle app quit properly
    app.on('before-quit', () => {
      this.isQuitting = true;
    });

    console.log('[TrayManager] Initialized');
  }

  /**
   * Set the tray state and update icon/tooltip
   * @param state - 'playing' | 'pausing' | 'locked'
   */
  setState(state: TrayState): void {
    this.currentState = state;

    if (!this.tray) return;

    const icon = this.getIcon(state);
    this.tray.setImage(icon);

    const tooltips: Record<TrayState, string> = {
      playing: 'Eclipse V2 - Playing',
      pausing: 'Eclipse V2 - Pausing',
      locked: 'Eclipse V2 - Locked',
    };
    this.tray.setToolTip(tooltips[state]);

    console.log(`[TrayManager] State changed to: ${state}`);
  }

  /**
   * Get the current tray state
   */
  getState(): TrayState {
    return this.currentState;
  }

  /**
   * Legacy method - maps streaming boolean to state
   * @deprecated Use setState() instead
   */
  setStreamingState(streaming: boolean): void {
    this.setState(streaming ? 'playing' : 'pausing');
  }

  /**
   * Legacy method - returns true if playing
   * @deprecated Use getState() instead
   */
  getStreamingState(): boolean {
    return this.currentState === 'playing';
  }

  /**
   * Show the main window (restore from tray)
   */
  showWindow(): void {
    if (this.mainWindow) {
      this.mainWindow.show();
      this.mainWindow.focus();
      // Ensure window appears in taskbar when visible
      this.mainWindow.setSkipTaskbar(false);
    }
  }

  /**
   * Hide the main window to tray
   */
  hideWindow(): void {
    if (this.mainWindow) {
      this.mainWindow.hide();
      // Remove from taskbar when hidden (AC4)
      this.mainWindow.setSkipTaskbar(true);
    }
  }

  /**
   * Check if the app is in quitting state
   */
  isAppQuitting(): boolean {
    return this.isQuitting;
  }

  /**
   * Set quitting state (called before actual quit)
   */
  setQuitting(quitting: boolean): void {
    this.isQuitting = quitting;
  }

  /**
   * Check if the app is restarting (Story 9.4)
   */
  isAppRestarting(): boolean {
    return this.isRestarting;
  }

  /**
   * Set restarting state (Story 9.4)
   */
  setRestarting(restarting: boolean): void {
    this.isRestarting = restarting;
  }

  /**
   * Destroy the tray icon and panel
   */
  destroy(): void {
    // Destroy the tray panel (Story 9.2)
    this.trayPanel.destroy();

    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
    console.log('[TrayManager] Destroyed');
  }

  /**
   * Get the TrayPanelWindow instance (Story 9.2)
   */
  getTrayPanel(): TrayPanelWindow {
    return this.trayPanel;
  }

  /**
   * Hide the tray panel (Story 9.2)
   */
  hideTrayPanel(): void {
    this.trayPanel.hide();
  }

  /**
   * Set the tray panel height (Story 9.3 - dynamic height for collapsible section)
   */
  setTrayPanelHeight(height: number): void {
    this.trayPanel.setHeight(height);
  }

  /**
   * Get the tray icon for a given state
   */
  private getIcon(state: TrayState): NativeImage {
    const iconNames: Record<TrayState, string> = {
      playing: 'tray-icon-playing.png',
      pausing: 'tray-icon-pausing.png',
      locked: 'tray-icon-locked.png',
    };
    const iconPath = this.getResourcePath(iconNames[state]);

    // Try to load the icon from file
    let icon = nativeImage.createFromPath(iconPath);

    // Fallback: create a simple icon if file not found
    if (icon.isEmpty()) {
      console.warn(`[TrayManager] Icon not found at ${iconPath}, using fallback`);
      icon = this.createFallbackIcon(state);
    }

    return icon;
  }

  /**
   * Get the path to a resource file (handles dev vs production)
   */
  private getResourcePath(filename: string): string {
    if (app.isPackaged) {
      // Production: resources are in extraResource folder
      return path.join(process.resourcesPath, 'resources', 'icons', filename);
    } else {
      // Development: use app.getAppPath() for reliable path resolution
      // app.getAppPath() returns the app directory (where package.json is)
      return path.join(app.getAppPath(), 'resources', 'icons', filename);
    }
  }

  /**
   * Create a simple fallback icon when PNG files are not available
   * This creates a basic 16x16 colored square
   */
  private createFallbackIcon(state: TrayState): NativeImage {
    // Create a simple 16x16 icon using raw pixel data
    const size = 16;
    const buffer = Buffer.alloc(size * size * 4); // RGBA

    // Colors matching Sunshine convention:
    // Playing = Green (#22C55E) - streaming active
    // Pausing = Orange (#F97316) - ready, not streaming
    // Locked = Gray (#6B7280) - auth required or offline
    const colors: Record<TrayState, { r: number; g: number; b: number; a: number }> = {
      playing: { r: 34, g: 197, b: 94, a: 255 },   // Green
      pausing: { r: 249, g: 115, b: 22, a: 255 },  // Orange
      locked: { r: 107, g: 114, b: 128, a: 255 },  // Gray
    };
    const color = colors[state];

    for (let i = 0; i < size * size; i++) {
      const offset = i * 4;
      buffer[offset] = color.r;     // R
      buffer[offset + 1] = color.g; // G
      buffer[offset + 2] = color.b; // B
      buffer[offset + 3] = color.a; // A
    }

    return nativeImage.createFromBuffer(buffer, { width: size, height: size });
  }

  /**
   * Set the tray language and update context menu (Story 10.5)
   */
  setLanguage(lang: TrayLanguage): void {
    this.currentLanguage = lang;
    if (this.tray) {
      this.tray.setContextMenu(this.createContextMenu());
      console.log(`[TrayManager] Language changed to: ${lang}`);
    }
  }

  /**
   * Create the native context menu for the tray icon (Story 9.4)
   */
  private createContextMenu(): Menu {
    const t = TRAY_TRANSLATIONS[this.currentLanguage];
    return Menu.buildFromTemplate([
      {
        label: t.open,
        click: () => this.handleOpenMainWindow(),
      },
      {
        label: t.restart,
        click: () => this.handleRestartApp(),
      },
      { type: 'separator' },
      {
        label: t.quit,
        click: () => this.handleQuitApp(),
      },
    ]);
  }

  /**
   * Handle "Ouvrir Eclipse" menu action (Story 9.4 - AC2)
   * Shows and focuses the main window, restoring if minimized
   */
  private handleOpenMainWindow(): void {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore();
      }
      this.mainWindow.show();
      this.mainWindow.focus();
      this.mainWindow.setSkipTaskbar(false);
    }
  }

  /**
   * Handle "Redémarrer Eclipse" menu action (Story 9.4 - AC3)
   * Sets restart flag and quits - main.ts handles relaunch after cleanup
   */
  private handleRestartApp(): void {
    console.log('[TrayManager] Restarting application...');
    this.isRestarting = true;
    this.isQuitting = true;
    app.quit();
  }

  /**
   * Handle "Quitter" menu action (Story 9.4 - AC4)
   * Sets quitting flag and quits the app
   */
  private handleQuitApp(): void {
    console.log('[TrayManager] Quitting application...');
    this.isQuitting = true;
    app.quit();
  }

  /**
   * Setup the minimize-to-tray behavior
   * Intercepts window close event to hide instead of quit
   */
  private setupMinimizeToTray(): void {
    this.mainWindow.on('close', (event) => {
      // Allow actual quit when app is explicitly quitting
      if (this.isQuitting) {
        return;
      }

      // Otherwise, hide to tray instead of closing (AC4)
      event.preventDefault();
      this.hideWindow();
    });
  }
}
