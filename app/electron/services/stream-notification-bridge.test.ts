import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use vi.hoisted to define mocks before vi.mock is hoisted
const { mockStreamStarted, mockStreamPaused, mockStreamEnded, getMockMonitor } = vi.hoisted(() => {
  // Import EventEmitter synchronously (it's a built-in module)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { EventEmitter } = require('events');

  const mockStreamStarted = vi.fn();
  const mockStreamPaused = vi.fn();
  const mockStreamEnded = vi.fn();

  // Create the mock monitor
  const mockMonitor = new EventEmitter();
  mockMonitor.start = vi.fn();
  mockMonitor.stop = vi.fn();
  mockMonitor.getCurrentState = vi.fn().mockReturnValue('idle');
  mockMonitor.isRunning = vi.fn().mockReturnValue(false);

  return {
    mockStreamStarted,
    mockStreamPaused,
    mockStreamEnded,
    // Use a getter function because mockMonitor needs to be the same instance
    getMockMonitor: () => mockMonitor,
  };
});

// Get the mock monitor instance
const mockMonitor = getMockMonitor();

// Mock modules
vi.mock('./notification-service', () => ({
  notificationService: {
    streamStarted: (...args: unknown[]) => mockStreamStarted(...args),
    streamPaused: (...args: unknown[]) => mockStreamPaused(...args),
    streamEnded: (...args: unknown[]) => mockStreamEnded(...args),
    show: vi.fn(),
    vddEnabled: vi.fn(),
    vddDisabled: vi.fn(),
  },
}));

vi.mock('./sunshine-event-monitor', () => ({
  sunshineEventMonitor: getMockMonitor(),
}));

import { StreamNotificationBridge } from './stream-notification-bridge';

/**
 * Unit tests for StreamNotificationBridge (Story 9.5 - AC1, AC2, AC3)
 *
 * Tests de la connexion entre le monitor d'événements et les notifications.
 */
describe('StreamNotificationBridge', () => {
  let bridge: StreamNotificationBridge;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStreamStarted.mockClear();
    mockStreamPaused.mockClear();
    mockStreamEnded.mockClear();
    mockMonitor.removeAllListeners();
    bridge = new StreamNotificationBridge();
  });

  describe('Class Structure', () => {
    it('should instantiate StreamNotificationBridge', () => {
      expect(bridge).toBeInstanceOf(StreamNotificationBridge);
    });

    it('should have init method', () => {
      expect(typeof bridge.init).toBe('function');
    });

    it('should have destroy method', () => {
      expect(typeof bridge.destroy).toBe('function');
    });

    it('should have isStreamTriggeredVdd getter', () => {
      expect(typeof bridge.isStreamTriggeredVdd).toBe('boolean');
    });
  });

  describe('Notification on stream-started (AC1)', () => {
    it('should call notificationService.streamStarted when stream starts', () => {
      bridge.init();

      mockMonitor.emit('stream-started', { deviceName: undefined });

      expect(mockStreamStarted).toHaveBeenCalledWith(undefined);
    });

    it('should pass device name to notification', () => {
      bridge.init();

      mockMonitor.emit('stream-started', { deviceName: 'Shield TV' });

      expect(mockStreamStarted).toHaveBeenCalledWith('Shield TV');
    });

    it('should set isStreamTriggeredVdd to true when stream starts', () => {
      bridge.init();

      mockMonitor.emit('stream-started', { deviceName: undefined });

      expect(bridge.isStreamTriggeredVdd).toBe(true);
    });
  });

  describe('Notification on stream-paused (AC2)', () => {
    it('should call notificationService.streamPaused when stream pauses', () => {
      bridge.init();

      mockMonitor.emit('stream-paused');

      expect(mockStreamPaused).toHaveBeenCalled();
    });
  });

  describe('Notification on stream-ended (AC3)', () => {
    it('should call notificationService.streamEnded when stream ends', () => {
      bridge.init();

      mockMonitor.emit('stream-ended');

      expect(mockStreamEnded).toHaveBeenCalled();
    });

    it('should reset isStreamTriggeredVdd to false when stream ends', () => {
      bridge.init();

      // First start a stream to set the flag
      mockMonitor.emit('stream-started', { deviceName: undefined });
      expect(bridge.isStreamTriggeredVdd).toBe(true);

      // Then end the stream
      mockMonitor.emit('stream-ended');

      expect(bridge.isStreamTriggeredVdd).toBe(false);
    });
  });

  describe('Cleanup', () => {
    it('should remove listeners on destroy', () => {
      bridge.init();
      bridge.destroy();

      // Emit events after destroy
      mockMonitor.emit('stream-started', { deviceName: undefined });
      mockMonitor.emit('stream-ended');

      // Should not have been called
      expect(mockStreamStarted).not.toHaveBeenCalled();
      expect(mockStreamEnded).not.toHaveBeenCalled();
    });
  });
});
