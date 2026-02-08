/**
 * Eclipse Services - Story 9.5
 *
 * Exporte les services du main process pour les notifications et le monitoring.
 */
export { NotificationService, notificationService } from './notification-service';
export { SunshineEventMonitor, sunshineEventMonitor, type StreamState } from './sunshine-event-monitor';
export { StreamNotificationBridge, streamNotificationBridge } from './stream-notification-bridge';
