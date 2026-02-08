import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock de la classe Notification d'Electron
// Ces variables sont utilisées par référence dans vi.mock (hoisted)
const mockNotificationInstance = {
  show: vi.fn(),
};

vi.mock('electron', () => {
  // Create a class that can be called with 'new' using function keyword
  const NotificationClass = vi.fn().mockImplementation(function() {
    return mockNotificationInstance;
  });

  return {
    Notification: NotificationClass,
    nativeImage: {
      createFromPath: vi.fn().mockReturnValue({ isEmpty: () => false }),
    },
  };
});

vi.mock('node:path', () => ({
  default: {
    join: (...args: string[]) => args.join('/'),
  },
}));

import { NotificationService } from './notification-service';
import { Notification } from 'electron';

/**
 * Unit tests for NotificationService (Story 9.5)
 *
 * Tests des notifications Windows natives pour les événements Eclipse.
 */
describe('NotificationService', () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNotificationInstance.show.mockClear();
    notificationService = new NotificationService();
  });

  describe('Class Structure', () => {
    it('should instantiate NotificationService', () => {
      expect(notificationService).toBeInstanceOf(NotificationService);
    });

    it('should have show method', () => {
      expect(typeof notificationService.show).toBe('function');
    });

    it('should have streamStarted method', () => {
      expect(typeof notificationService.streamStarted).toBe('function');
    });

    it('should have streamPaused method', () => {
      expect(typeof notificationService.streamPaused).toBe('function');
    });

    it('should have streamEnded method', () => {
      expect(typeof notificationService.streamEnded).toBe('function');
    });

    it('should have vddEnabled method', () => {
      expect(typeof notificationService.vddEnabled).toBe('function');
    });

    it('should have vddDisabled method', () => {
      expect(typeof notificationService.vddDisabled).toBe('function');
    });
  });

  describe('show() method', () => {
    it('should create a Notification with title and body', () => {
      notificationService.show({
        title: 'Test Title',
        body: 'Test Body',
      });

      expect(Notification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Title',
          body: 'Test Body',
        })
      );
    });

    it('should call notification.show()', () => {
      notificationService.show({
        title: 'Test',
        body: 'Test',
      });

      expect(mockNotificationInstance.show).toHaveBeenCalled();
    });

    it('should include icon in notification', () => {
      notificationService.show({
        title: 'Test',
        body: 'Test',
      });

      expect(Notification).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: expect.anything(),
        })
      );
    });
  });

  describe('streamStarted() - AC1', () => {
    it('should show notification with title "Eclipse"', () => {
      notificationService.streamStarted();

      expect(Notification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Eclipse',
        })
      );
    });

    it('should show "Stream démarré" when no device name', () => {
      notificationService.streamStarted();

      expect(Notification).toHaveBeenCalledWith(
        expect.objectContaining({
          body: 'Stream démarré',
        })
      );
    });

    it('should show "Stream démarré vers [deviceName]" when device name provided', () => {
      notificationService.streamStarted('Shield TV');

      expect(Notification).toHaveBeenCalledWith(
        expect.objectContaining({
          body: 'Stream démarré vers Shield TV',
        })
      );
    });
  });

  describe('streamPaused() - AC2', () => {
    it('should show notification with title "Eclipse"', () => {
      notificationService.streamPaused();

      expect(Notification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Eclipse',
        })
      );
    });

    it('should show "Stream mis en pause"', () => {
      notificationService.streamPaused();

      expect(Notification).toHaveBeenCalledWith(
        expect.objectContaining({
          body: 'Stream mis en pause',
        })
      );
    });
  });

  describe('streamEnded() - AC3', () => {
    it('should show notification with title "Eclipse"', () => {
      notificationService.streamEnded();

      expect(Notification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Eclipse',
        })
      );
    });

    it('should show "Session terminée"', () => {
      notificationService.streamEnded();

      expect(Notification).toHaveBeenCalledWith(
        expect.objectContaining({
          body: 'Session terminée',
        })
      );
    });
  });

  describe('vddEnabled() - AC4', () => {
    it('should show notification with title "Eclipse"', () => {
      notificationService.vddEnabled('4K Gaming');

      expect(Notification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Eclipse',
        })
      );
    });

    it('should show "Écran [presetName] activé"', () => {
      notificationService.vddEnabled('4K Gaming');

      expect(Notification).toHaveBeenCalledWith(
        expect.objectContaining({
          body: 'Écran 4K Gaming activé',
        })
      );
    });

    it('should use different preset names', () => {
      notificationService.vddEnabled('1080p Standard');

      expect(Notification).toHaveBeenCalledWith(
        expect.objectContaining({
          body: 'Écran 1080p Standard activé',
        })
      );
    });
  });

  describe('vddDisabled() - AC5', () => {
    it('should show notification with title "Eclipse"', () => {
      notificationService.vddDisabled();

      expect(Notification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Eclipse',
        })
      );
    });

    it('should show "Écran virtuel désactivé"', () => {
      notificationService.vddDisabled();

      expect(Notification).toHaveBeenCalledWith(
        expect.objectContaining({
          body: 'Écran virtuel désactivé',
        })
      );
    });
  });
});
