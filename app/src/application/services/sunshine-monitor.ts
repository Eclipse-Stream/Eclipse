// Application Layer - SunshineMonitorService
// Polls Sunshine status and updates the store
// Runs in Renderer Process
// Also handles stream end recovery (cleanup orphaned state)
// Also includes watchdog to auto-restart Sunshine if it stops unexpectedly

import type { SunshineStatus } from '@domain/types'
import { useAppStore } from '@application/stores'
import { useSunshinePresetStore } from '@application/stores/useSunshinePresetStore'

/** Delay before checking for orphaned state after stream ends (ms) */
const RECOVERY_DELAY_MS = 7000

/** Delay before auto-restarting Sunshine after unexpected shutdown (ms) */
const WATCHDOG_DELAY_MS = 4000

export class SunshineMonitorService {
  private intervalId: NodeJS.Timeout | null = null
  private isPolling = false
  private previousStatus: SunshineStatus | null = null
  private recoveryTimeoutId: NodeJS.Timeout | null = null
  private watchdogTimeoutId: NodeJS.Timeout | null = null
  private isFirstPoll = true
  /** True when stop was initiated by Eclipse (not by localhost or crash) */
  private userInitiatedStop = false

  async startPolling(intervalMs = 3000): Promise<void> {
    if (this.isPolling) {
      return
    }

    this.isPolling = true
    this.isFirstPoll = true

    const poll = async () => {
      try {
        const status: SunshineStatus = await window.electronAPI.sunshine.getStatus()

        // On first poll, sync preset if Sunshine is already online
        // This handles the case where user starts Eclipse with Sunshine already running
        if (this.isFirstPoll && (status === 'ONLINE' || status === 'STREAMING')) {
          console.log('[SunshineMonitor] First poll - Sunshine is online, syncing active preset...')
          this.syncActivePreset()
        }
        this.isFirstPoll = false

        // Detect stream end: transition from STREAMING to any other status
        if (this.previousStatus === 'STREAMING' && status !== 'STREAMING') {
          console.log('[SunshineMonitor] Stream ended, scheduling recovery check in', RECOVERY_DELAY_MS, 'ms')
          this.scheduleRecoveryCheck()
        }

        // Detect Sunshine restart: transition from OFFLINE to ONLINE
        // This can happen when user restarts Sunshine or modifies config via localhost
        if (this.previousStatus === 'OFFLINE' && (status === 'ONLINE' || status === 'STREAMING')) {
          console.log('[SunshineMonitor] Sunshine came online, syncing active preset...')
          // Cancel any pending recovery - Sunshine is back, no need to clean up
          this.cancelRecoveryCheck()
          // Cancel any pending watchdog - Sunshine is back
          this.cancelWatchdog()
          this.syncActivePreset()
        }

        // Detect unexpected Sunshine shutdown: transition from ONLINE to OFFLINE
        // Watchdog: auto-restart Sunshine if it was not user-initiated
        if (this.previousStatus === 'ONLINE' && status === 'OFFLINE') {
          if (this.userInitiatedStop) {
            console.log('[SunshineMonitor] Sunshine stopped (user-initiated), no auto-restart')
            this.userInitiatedStop = false // Reset flag
          } else {
            console.log('[SunshineMonitor] Sunshine stopped unexpectedly, scheduling watchdog restart in', WATCHDOG_DELAY_MS, 'ms')
            this.scheduleWatchdogRestart()
          }
        }

        // Cancel recovery if a new stream starts (new stream = fresh state)
        if (this.previousStatus !== 'STREAMING' && status === 'STREAMING') {
          console.log('[SunshineMonitor] New stream started, canceling any pending recovery')
          this.cancelRecoveryCheck()
        }

        // Update tray state based on Sunshine status (Story 9.1)
        // Set tray state based on final status (handles initial state and any unhandled cases)
        this.updateTrayState(status)

        this.previousStatus = status
        useAppStore.getState().setSunshineStatus(status)
      } catch (error) {
        console.error('[SunshineMonitor] Failed to get status:', error)
      }
    }

    await poll()

    this.intervalId = setInterval(poll, intervalMs)
  }

  stopPolling(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    if (this.recoveryTimeoutId) {
      clearTimeout(this.recoveryTimeoutId)
      this.recoveryTimeoutId = null
    }
    if (this.watchdogTimeoutId) {
      clearTimeout(this.watchdogTimeoutId)
      this.watchdogTimeoutId = null
    }
    this.isPolling = false
  }

  /**
   * Mark that the next stop is user-initiated (from Eclipse UI)
   * Called by SunshineControlService before calling stop()
   * This prevents the watchdog from auto-restarting Sunshine
   */
  markUserInitiatedStop(): void {
    console.log('[SunshineMonitor] Marking next stop as user-initiated')
    this.userInitiatedStop = true
  }

  isActive(): boolean {
    return this.isPolling
  }

  /**
   * Sync active preset with Sunshine config
   * Called when Sunshine comes online (after restart or manual config change)
   */
  private async syncActivePreset(): Promise<void> {
    try {
      await useSunshinePresetStore.getState().detectAndSyncActivePreset()
    } catch (error) {
      console.error('[SunshineMonitor] Failed to sync active preset:', error)
    }
  }

  /**
   * Cancel any pending recovery check
   * Called when Sunshine comes back online or a new stream starts
   */
  private cancelRecoveryCheck(): void {
    if (this.recoveryTimeoutId) {
      console.log('[SunshineMonitor] Canceling pending recovery check')
      clearTimeout(this.recoveryTimeoutId)
      this.recoveryTimeoutId = null
    }
  }

  /**
   * Schedule a recovery check after a delay
   * If the UNDO script ran successfully, the state file will be gone
   * If it didn't (crash/unexpected termination), we clean up
   */
  private scheduleRecoveryCheck(): void {
    // Cancel any existing scheduled recovery
    this.cancelRecoveryCheck()

    this.recoveryTimeoutId = setTimeout(async () => {
      this.recoveryTimeoutId = null

      try {
        console.log('[SunshineMonitor] Checking for orphaned stream state...')
        const result = await window.electronAPI.recovery.checkAndCleanup()

        if (result.recovered) {
          console.log('[SunshineMonitor] Recovery performed:', result.details)
        } else {
          console.log('[SunshineMonitor] No recovery needed (UNDO script ran successfully)')
        }
      } catch (error) {
        console.error('[SunshineMonitor] Recovery check failed:', error)
      }
    }, RECOVERY_DELAY_MS)
  }

  /**
   * Cancel any pending watchdog restart
   * Called when Sunshine comes back online by itself
   */
  private cancelWatchdog(): void {
    if (this.watchdogTimeoutId) {
      console.log('[SunshineMonitor] Canceling pending watchdog restart')
      clearTimeout(this.watchdogTimeoutId)
      this.watchdogTimeoutId = null
    }
  }

  /**
   * Schedule a watchdog restart after a delay
   * This handles the case where Sunshine is restarted via localhost:47990
   * but doesn't restart itself (portable version needs config path)
   */
  private scheduleWatchdogRestart(): void {
    // Cancel any existing watchdog
    this.cancelWatchdog()

    this.watchdogTimeoutId = setTimeout(async () => {
      this.watchdogTimeoutId = null

      try {
        // Double-check that Sunshine is still offline
        const currentStatus = await window.electronAPI.sunshine.getStatus()
        if (currentStatus === 'OFFLINE') {
          console.log('[SunshineMonitor] Watchdog: Sunshine still offline, auto-restarting...')
          const result = await window.electronAPI.sunshine.start()
          if (result.success) {
            console.log('[SunshineMonitor] Watchdog: Sunshine restarted successfully')
          } else {
            console.error('[SunshineMonitor] Watchdog: Failed to restart Sunshine:', result.error)
          }
        } else {
          console.log('[SunshineMonitor] Watchdog: Sunshine came back by itself, status:', currentStatus)
        }
      } catch (error) {
        console.error('[SunshineMonitor] Watchdog: Error during restart:', error)
      }
    }, WATCHDOG_DELAY_MS)
  }

  /**
   * Update tray state based on Sunshine status
   * Maps: STREAMING → playing, ONLINE → pausing, OFFLINE/AUTH_REQUIRED → locked
   */
  private updateTrayState(status: SunshineStatus): void {
    switch (status) {
      case 'STREAMING':
        window.electronAPI.tray.setState('playing')
        break
      case 'ONLINE':
        window.electronAPI.tray.setState('pausing')
        break
      case 'OFFLINE':
      case 'AUTH_REQUIRED':
        window.electronAPI.tray.setState('locked')
        break
    }
  }
}

export const sunshineMonitor = new SunshineMonitorService()
