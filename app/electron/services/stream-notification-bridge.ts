/**
 * StreamNotificationBridge - Story 9.5 (AC1, AC2, AC3)
 *
 * Connecte le SunshineEventMonitor aux notifications Eclipse.
 * Gère aussi le flag anti-doublon pour les notifications VDD.
 */
import { notificationService } from './notification-service';
import { sunshineEventMonitor } from './sunshine-event-monitor';

interface StreamStartedEvent {
  deviceName?: string;
}

export class StreamNotificationBridge {
  private _isStreamTriggeredVdd = false;

  // Bound handlers pour pouvoir les retirer
  private handleStreamStarted = (event: StreamStartedEvent) => {
    this._isStreamTriggeredVdd = true;
    notificationService.streamStarted(event.deviceName);
  };

  private handleStreamPaused = () => {
    notificationService.streamPaused();
  };

  private handleStreamEnded = () => {
    this._isStreamTriggeredVdd = false;
    notificationService.streamEnded();
  };

  /**
   * Flag indiquant si le VDD a été activé par un stream (pour anti-doublon)
   */
  get isStreamTriggeredVdd(): boolean {
    return this._isStreamTriggeredVdd;
  }

  /**
   * Initialise le bridge en connectant les événements aux notifications
   */
  init(): void {
    sunshineEventMonitor.on('stream-started', this.handleStreamStarted);
    sunshineEventMonitor.on('stream-paused', this.handleStreamPaused);
    sunshineEventMonitor.on('stream-ended', this.handleStreamEnded);
  }

  /**
   * Nettoie les listeners
   */
  destroy(): void {
    sunshineEventMonitor.off('stream-started', this.handleStreamStarted);
    sunshineEventMonitor.off('stream-paused', this.handleStreamPaused);
    sunshineEventMonitor.off('stream-ended', this.handleStreamEnded);
  }

  /**
   * Remet le flag anti-doublon à false manuellement
   */
  resetStreamTriggeredVdd(): void {
    this._isStreamTriggeredVdd = false;
  }
}

// Singleton pour utilisation globale
export const streamNotificationBridge = new StreamNotificationBridge();
