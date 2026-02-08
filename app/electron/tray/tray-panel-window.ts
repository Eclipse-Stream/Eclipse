/**
 * TrayPanelWindow - Glassmorphism panel window for System Tray
 * Story 9.2: Panel Glassmorphism - Core
 *
 * Handles:
 * - BrowserWindow creation with transparent/frameless config
 * - Dynamic positioning near tray icon
 * - Show/hide on left-click
 * - Panel closes via: tray click toggle, action completion, or programmatic hide
 *
 * NOTE: We do NOT use blur event to close the panel because it fires BEFORE
 * click events complete, preventing buttons from working. Instead, the panel
 * closes when: user clicks tray icon again, selects a config, or clicks settings.
 */
/// <reference path="../env.d.ts" />
import { BrowserWindow, screen, Rectangle } from 'electron';
import path from 'node:path';

// Panel dimensions (style Ear Trumpet)
const PANEL_WIDTH = 380;  // Large comme Ear Trumpet
const PANEL_HEIGHT = 280; // Initial height (collapsed) - must match TrayPanel PANEL_HEIGHT_COLLAPSED
const PANEL_MARGIN = 2;   // Quasi collé à la taskbar

export class TrayPanelWindow {
  private panel: BrowserWindow | null = null;
  private isVisible = false;
  private anchorY: number = 0; // Y position where panel bottom should be anchored

  /**
   * Create and initialize the panel window (hidden by default)
   */
  create(): BrowserWindow {
    if (this.panel && !this.panel.isDestroyed()) {
      return this.panel;
    }

    this.panel = new BrowserWindow({
      width: PANEL_WIDTH,
      height: PANEL_HEIGHT,
      frame: false,
      transparent: true,
      resizable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      show: false,
      focusable: true,
      webPreferences: {
        // Use same path pattern as main.ts - preload.js is in same directory after compilation
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    // Load the tray panel HTML
    this.loadContent();

    // NOTE: We intentionally do NOT use blur event to close the panel.
    // The blur event fires BEFORE click events complete, which prevents
    // buttons inside the panel from working. The panel closes via:
    // - Clicking tray icon again (toggle)
    // - Selecting a config (calls trayPanel.close())
    // - Clicking settings button (calls trayPanel.openMainWindow())

    // Handle window close - just hide instead of destroying
    this.panel.on('close', (event) => {
      event.preventDefault();
      this.hide();
    });

    console.log('[TrayPanelWindow] Created');
    return this.panel;
  }

  /**
   * Load the panel content (dev server or built file)
   */
  private loadContent(): void {
    if (!this.panel) return;

    // Check if we have a dev server URL (set by Electron Forge as global constant)
    // Note: MAIN_WINDOW_VITE_DEV_SERVER_URL is a global constant, not process.env
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      // Development: load from Vite dev server
      // Use the same dev server but with tray-panel.html path
      const panelUrl = MAIN_WINDOW_VITE_DEV_SERVER_URL.replace(/\/$/, '') + '/tray-panel.html';
      this.panel.loadURL(panelUrl);
      console.log('[TrayPanelWindow] Loading dev URL:', panelUrl);
    } else {
      // Production: load from built files
      const panelPath = path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/tray-panel.html`);
      this.panel.loadFile(panelPath);
      console.log('[TrayPanelWindow] Loading file:', panelPath);
    }
  }

  /**
   * Show the panel near the tray icon
   * @param trayBounds - The bounds of the tray icon
   */
  show(trayBounds: Rectangle): void {
    if (!this.panel || this.panel.isDestroyed()) {
      this.create();
    }

    if (!this.panel) return;

    // Position the panel
    this.positionNearTray(trayBounds);

    // Show and focus
    this.panel.show();
    this.panel.focus();
    this.isVisible = true;

    console.log('[TrayPanelWindow] Shown');
  }

  /**
   * Hide the panel
   */
  hide(): void {
    if (this.panel && !this.panel.isDestroyed()) {
      this.panel.hide();
      this.isVisible = false;
      console.log('[TrayPanelWindow] Hidden');
    }
  }

  /**
   * Toggle panel visibility
   * @param trayBounds - The bounds of the tray icon
   */
  toggle(trayBounds: Rectangle): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show(trayBounds);
    }
  }

  /**
   * Check if panel is currently visible
   */
  getIsVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Set the panel height (Story 9.3 - dynamic height for collapsible section)
   * Panel bottom stays anchored, grows upward
   */
  setHeight(height: number): void {
    if (!this.panel || this.panel.isDestroyed()) return;

    const bounds = this.panel.getBounds();

    // Calculate new Y to keep bottom anchored at same position
    // Bottom position = anchorY, so top position = anchorY - height
    const newY = this.anchorY - height;

    this.panel.setBounds({
      x: bounds.x,
      y: Math.max(0, newY), // Don't go above screen
      width: bounds.width,
      height: height,
    });

    console.log(`[TrayPanelWindow] Height changed to: ${height}, Y: ${newY}`);
  }

  /**
   * Position the panel near the tray icon
   * Handles different taskbar positions (bottom, top, left, right)
   * Stores anchor position so panel can grow/shrink while staying anchored
   */
  private positionNearTray(trayBounds: Rectangle): void {
    if (!this.panel) return;

    const { x: trayX, y: trayY, width: trayWidth, height: trayHeight } = trayBounds;
    const panelBounds = this.panel.getBounds();

    // Get the display where the tray icon is located
    const display = screen.getDisplayNearestPoint({ x: trayX, y: trayY });
    const { workArea } = display;

    let panelX: number;
    let panelY: number;

    // Determine taskbar position by comparing tray position to work area
    const taskbarOnBottom = trayY > workArea.y + workArea.height / 2;
    const taskbarOnTop = trayY < workArea.y + workArea.height / 2 && trayY < 100;
    const taskbarOnRight = trayX > workArea.x + workArea.width / 2;

    if (taskbarOnBottom) {
      // Taskbar at bottom: panel above the tray icon
      // Anchor = bottom of panel (just above tray)
      panelX = Math.round(trayX - panelBounds.width / 2 + trayWidth / 2);
      this.anchorY = trayY - PANEL_MARGIN; // Bottom of panel anchored here
      panelY = this.anchorY - panelBounds.height;
    } else if (taskbarOnTop) {
      // Taskbar at top: panel below the tray icon
      // Anchor = top of panel (just below tray)
      panelX = Math.round(trayX - panelBounds.width / 2 + trayWidth / 2);
      panelY = trayY + trayHeight + PANEL_MARGIN;
      this.anchorY = panelY + panelBounds.height; // For consistency, anchor at bottom
    } else if (taskbarOnRight) {
      // Taskbar on right: panel to the left of tray
      panelX = trayX - panelBounds.width - PANEL_MARGIN;
      panelY = Math.round(trayY - panelBounds.height / 2 + trayHeight / 2);
      this.anchorY = panelY + panelBounds.height;
    } else {
      // Taskbar on left: panel to the right of tray
      panelX = trayX + trayWidth + PANEL_MARGIN;
      panelY = Math.round(trayY - panelBounds.height / 2 + trayHeight / 2);
      this.anchorY = panelY + panelBounds.height;
    }

    // Ensure panel stays within screen bounds
    panelX = Math.max(workArea.x, Math.min(panelX, workArea.x + workArea.width - panelBounds.width));
    panelY = Math.max(workArea.y, Math.min(panelY, workArea.y + workArea.height - panelBounds.height));

    // Update anchorY if panelY was clamped
    if (taskbarOnBottom) {
      this.anchorY = panelY + panelBounds.height;
    }

    this.panel.setPosition(Math.round(panelX), Math.round(panelY));
    console.log(`[TrayPanelWindow] Positioned at Y=${panelY}, anchorY=${this.anchorY}`);
  }

  /**
   * Get the BrowserWindow instance
   */
  getWindow(): BrowserWindow | null {
    return this.panel;
  }

  /**
   * Destroy the panel window
   */
  destroy(): void {
    if (this.panel && !this.panel.isDestroyed()) {
      this.panel.destroy();
      this.panel = null;
      this.isVisible = false;
      console.log('[TrayPanelWindow] Destroyed');
    }
  }
}
