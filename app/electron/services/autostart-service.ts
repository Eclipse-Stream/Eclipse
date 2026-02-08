// AutostartService - Story 9.7
// Manages Windows auto-start (login item) settings for Eclipse

import { app } from 'electron';

/**
 * Service to manage Windows auto-start (login item) settings.
 * Uses Electron's app.setLoginItemSettings() API.
 *
 * Note: In dev mode, Electron's login item API may not work correctly.
 * We maintain a local state to track the intended state.
 */
export class AutostartService {
  // Track state locally because Electron's API may not reflect changes in dev mode
  private _localState: boolean | null = null;

  /**
   * Check if auto-start is currently enabled
   */
  isEnabled(): boolean {
    // In packaged app, trust Electron's API
    if (app.isPackaged) {
      const settings = app.getLoginItemSettings();
      console.log('[AutostartService] getLoginItemSettings (packaged):', settings);
      return settings.openAtLogin === true;
    }

    // In dev mode, use local state if set, otherwise read from Electron
    if (this._localState !== null) {
      console.log('[AutostartService] Using local state (dev mode):', this._localState);
      return this._localState;
    }

    const settings = app.getLoginItemSettings();
    console.log('[AutostartService] getLoginItemSettings (dev):', settings);
    return settings.openAtLogin === true;
  }

  /**
   * Enable auto-start with Windows
   * - openAtLogin: true - Register in Windows startup
   * - openAsHidden: true - Start minimized (no window)
   * - args: ['--hidden'] - Flag to detect hidden start
   */
  enable(): void {
    console.log('[AutostartService] Enabling autostart...');
    app.setLoginItemSettings({
      openAtLogin: true,
      openAsHidden: true,
      args: ['--hidden'],
    });
    this._localState = true;
    console.log('[AutostartService] Autostart enabled');
  }

  /**
   * Disable auto-start with Windows
   */
  disable(): void {
    console.log('[AutostartService] Disabling autostart...');
    app.setLoginItemSettings({
      openAtLogin: false,
    });
    this._localState = false;
    console.log('[AutostartService] Autostart disabled');
  }

  /**
   * Toggle auto-start state
   * @returns New state after toggle (true = enabled)
   */
  toggle(): boolean {
    const isCurrentlyEnabled = this.isEnabled();
    console.log('[AutostartService] Toggle: current state =', isCurrentlyEnabled);
    if (isCurrentlyEnabled) {
      this.disable();
    } else {
      this.enable();
    }
    const newState = !isCurrentlyEnabled;
    console.log('[AutostartService] Toggle: new state =', newState);
    return newState;
  }
}

// Singleton instance
export const autostartService = new AutostartService();
