/**
 * NotificationService - Story 9.5
 *
 * Service de notifications Windows natives pour les événements Eclipse.
 * Utilise l'API Notification d'Electron pour afficher des notifications système.
 */
import { Notification, nativeImage } from 'electron';
import path from 'node:path';

interface NotificationOptions {
  title: string;
  body: string;
}

export class NotificationService {
  private iconPath: string;

  constructor() {
    // L'icône est dans resources/icons/icon.png
    this.iconPath = path.join(__dirname, '../../resources/icons/icon.png');
  }

  /**
   * Affiche une notification Windows native
   */
  show(options: NotificationOptions): void {
    const notification = new Notification({
      title: options.title,
      body: options.body,
      icon: nativeImage.createFromPath(this.iconPath),
      silent: false,
    });

    notification.show();
  }

  /**
   * Notification: Stream démarré (AC1)
   * @param deviceName Nom de l'appareil client (optionnel)
   */
  streamStarted(deviceName?: string): void {
    this.show({
      title: 'Eclipse',
      body: deviceName ? `Stream démarré vers ${deviceName}` : 'Stream démarré',
    });
  }

  /**
   * Notification: Stream mis en pause (AC2)
   */
  streamPaused(): void {
    this.show({
      title: 'Eclipse',
      body: 'Stream mis en pause',
    });
  }

  /**
   * Notification: Session terminée (AC3)
   */
  streamEnded(): void {
    this.show({
      title: 'Eclipse',
      body: 'Session terminée',
    });
  }

  /**
   * Notification: VDD activé manuellement (AC4)
   * @param presetName Nom du preset VDD
   */
  vddEnabled(presetName: string): void {
    this.show({
      title: 'Eclipse',
      body: `Écran ${presetName} activé`,
    });
  }

  /**
   * Notification: VDD désactivé manuellement (AC5)
   */
  vddDisabled(): void {
    this.show({
      title: 'Eclipse',
      body: 'Écran virtuel désactivé',
    });
  }
}

// Singleton pour utilisation globale
export const notificationService = new NotificationService();
