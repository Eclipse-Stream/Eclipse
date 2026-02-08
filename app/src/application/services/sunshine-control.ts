// Application Service - Sunshine Control
// Bridges renderer and main process for Sunshine service control

import type { ServiceOperationResult } from '../../domain/interfaces';
import { sunshineMonitor } from './sunshine-monitor';

/**
 * SunshineControlService
 * Provides methods to start, stop, and restart Sunshine service
 * Communicates with main process via IPC
 */
export class SunshineControlService {
  /**
   * Start Sunshine service
   * Handles optimistic UI updates via app store
   */
  async start(): Promise<ServiceOperationResult> {
    try {
      const result = await window.electronAPI.sunshine.start();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Stop Sunshine service
   * Marks the stop as user-initiated to prevent watchdog auto-restart
   */
  async stop(): Promise<ServiceOperationResult> {
    try {
      // Mark as user-initiated so watchdog doesn't auto-restart
      sunshineMonitor.markUserInitiatedStop();
      const result = await window.electronAPI.sunshine.stop();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Restart Sunshine service
   * Must complete in < 3 seconds per NFR4
   */
  async restart(): Promise<ServiceOperationResult> {
    try {
      const result = await window.electronAPI.sunshine.restart();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

// Singleton instance
let instance: SunshineControlService | null = null;

export function getSunshineControlService(): SunshineControlService {
  if (!instance) {
    instance = new SunshineControlService();
  }
  return instance;
}
