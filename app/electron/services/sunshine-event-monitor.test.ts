import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Use vi.hoisted to make mock available before hoisted vi.mock
const { mockExistsSync } = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
}));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: mockExistsSync,
    },
    existsSync: mockExistsSync,
  };
});

vi.mock('../../src/infrastructure/sunshine', () => ({
  SunshineClient: vi.fn().mockImplementation(function() {
    return {
      getStatus: vi.fn(),
      setCredentials: vi.fn(),
    };
  }),
}));

// Mock credential storage
vi.mock('../../src/infrastructure/storage/credential-storage', () => ({
  getCredentialStorage: vi.fn().mockReturnValue({
    isAvailable: vi.fn().mockReturnValue(false),
    load: vi.fn().mockResolvedValue(null),
  }),
}));

import { SunshineEventMonitor } from './sunshine-event-monitor';

/**
 * Unit tests for SunshineEventMonitor (Story 9.5 - AC7)
 *
 * Tests du monitoring de l'état de streaming Sunshine avec polling.
 * Utilise le fichier d'état Eclipse (%TEMP%\eclipse_state.json) pour
 * une détection fiable synchronisée avec les scripts DO/UNDO.
 */
describe('SunshineEventMonitor', () => {
  let monitor: SunshineEventMonitor;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Par défaut, pas de fichier d'état = idle
    mockExistsSync.mockReturnValue(false);
    monitor = new SunshineEventMonitor();
  });

  afterEach(() => {
    monitor.stop();
    vi.useRealTimers();
  });

  describe('Class Structure', () => {
    it('should instantiate SunshineEventMonitor', () => {
      expect(monitor).toBeInstanceOf(SunshineEventMonitor);
    });

    it('should have start method', () => {
      expect(typeof monitor.start).toBe('function');
    });

    it('should have stop method', () => {
      expect(typeof monitor.stop).toBe('function');
    });

    it('should have getCurrentState method', () => {
      expect(typeof monitor.getCurrentState).toBe('function');
    });

    it('should be an EventEmitter', () => {
      expect(typeof monitor.on).toBe('function');
      expect(typeof monitor.emit).toBe('function');
    });
  });

  describe('Initial State', () => {
    it('should start with idle state', () => {
      expect(monitor.getCurrentState()).toBe('idle');
    });

    it('should not be running initially', () => {
      expect(monitor.isRunning()).toBe(false);
    });
  });

  describe('Polling (AC7)', () => {
    it('should start polling when start() is called', async () => {
      monitor.start();

      expect(monitor.isRunning()).toBe(true);
    });

    it('should check state file immediately on start', async () => {
      monitor.start();
      await vi.advanceTimersToNextTimerAsync();

      expect(mockExistsSync).toHaveBeenCalled();
    });

    it('should poll every 4 seconds (within 3-5 sec range)', async () => {
      monitor.start();

      // First immediate check
      await vi.advanceTimersToNextTimerAsync();
      const initialCalls = mockExistsSync.mock.calls.length;
      expect(initialCalls).toBeGreaterThanOrEqual(1);

      // Advance 4 seconds for next poll
      await vi.advanceTimersByTimeAsync(4000);
      const afterFirstPoll = mockExistsSync.mock.calls.length;
      expect(afterFirstPoll).toBeGreaterThan(initialCalls);

      // Advance another 4 seconds
      await vi.advanceTimersByTimeAsync(4000);
      const afterSecondPoll = mockExistsSync.mock.calls.length;
      expect(afterSecondPoll).toBeGreaterThan(afterFirstPoll);
    });

    it('should stop polling when stop() is called', async () => {
      monitor.start();
      await vi.advanceTimersToNextTimerAsync();

      monitor.stop();

      expect(monitor.isRunning()).toBe(false);

      // Advance time and verify no more calls
      const callCount = mockExistsSync.mock.calls.length;
      await vi.advanceTimersByTimeAsync(10000);
      expect(mockExistsSync).toHaveBeenCalledTimes(callCount);
    });

    it('should not start twice if already running', () => {
      monitor.start();
      monitor.start();

      expect(monitor.isRunning()).toBe(true);
    });
  });

  describe('State Detection via File', () => {
    it('should detect streaming when state file exists', async () => {
      // Start without file
      mockExistsSync.mockReturnValue(false);
      monitor.start();
      await vi.advanceTimersToNextTimerAsync();
      expect(monitor.getCurrentState()).toBe('idle');

      // File appears (DO script ran)
      mockExistsSync.mockReturnValue(true);
      await vi.advanceTimersByTimeAsync(4000);
      expect(monitor.getCurrentState()).toBe('streaming');
    });

    it('should detect idle when state file does not exist', async () => {
      // Start with file (streaming)
      mockExistsSync.mockReturnValue(true);
      monitor.start();
      await vi.advanceTimersToNextTimerAsync();
      await vi.advanceTimersByTimeAsync(4000);
      expect(monitor.getCurrentState()).toBe('streaming');

      // File removed (UNDO script ran)
      mockExistsSync.mockReturnValue(false);
      await vi.advanceTimersByTimeAsync(4000);
      expect(monitor.getCurrentState()).toBe('idle');
    });
  });

  describe('State Transitions', () => {
    it('should emit stream-started when file appears (DO script ran)', async () => {
      const handler = vi.fn();
      monitor.on('stream-started', handler);

      // Start without file
      mockExistsSync.mockReturnValue(false);
      monitor.start();
      await vi.advanceTimersToNextTimerAsync();

      // File appears (DO script)
      mockExistsSync.mockReturnValue(true);
      await vi.advanceTimersByTimeAsync(4000);

      expect(handler).toHaveBeenCalledWith({ deviceName: undefined });
      expect(monitor.getCurrentState()).toBe('streaming');
    });

    it('should emit stream-ended when file disappears (UNDO script ran)', async () => {
      const handler = vi.fn();
      monitor.on('stream-ended', handler);

      // Start with file (streaming)
      mockExistsSync.mockReturnValue(true);
      monitor.start();
      await vi.advanceTimersToNextTimerAsync();
      await vi.advanceTimersByTimeAsync(4000);

      // File removed (UNDO script)
      mockExistsSync.mockReturnValue(false);
      await vi.advanceTimersByTimeAsync(4000);

      expect(handler).toHaveBeenCalled();
      expect(monitor.getCurrentState()).toBe('idle');
    });

    it('should not emit events when state does not change', async () => {
      const startHandler = vi.fn();
      const endHandler = vi.fn();
      monitor.on('stream-started', startHandler);
      monitor.on('stream-ended', endHandler);

      mockExistsSync.mockReturnValue(false);
      monitor.start();
      await vi.advanceTimersToNextTimerAsync();

      // Poll again with same state (no file)
      await vi.advanceTimersByTimeAsync(4000);
      await vi.advanceTimersByTimeAsync(4000);

      expect(startHandler).not.toHaveBeenCalled();
      expect(endHandler).not.toHaveBeenCalled();
    });

    it('should handle rapid state changes', async () => {
      const startHandler = vi.fn();
      const endHandler = vi.fn();
      monitor.on('stream-started', startHandler);
      monitor.on('stream-ended', endHandler);

      mockExistsSync.mockReturnValue(false);
      monitor.start();
      await vi.advanceTimersToNextTimerAsync();

      // Start stream
      mockExistsSync.mockReturnValue(true);
      await vi.advanceTimersByTimeAsync(4000);
      expect(startHandler).toHaveBeenCalledTimes(1);

      // End stream
      mockExistsSync.mockReturnValue(false);
      await vi.advanceTimersByTimeAsync(4000);
      expect(endHandler).toHaveBeenCalledTimes(1);

      // Start again
      mockExistsSync.mockReturnValue(true);
      await vi.advanceTimersByTimeAsync(4000);
      expect(startHandler).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should continue polling even if existsSync throws', async () => {
      mockExistsSync.mockImplementationOnce(() => {
        throw new Error('File system error');
      });

      monitor.start();
      await vi.advanceTimersToNextTimerAsync();

      // Should continue running
      expect(monitor.isRunning()).toBe(true);

      const callsAfterError = mockExistsSync.mock.calls.length;

      // Next poll should work
      mockExistsSync.mockReturnValue(false);
      await vi.advanceTimersByTimeAsync(4000);

      // Should have polled again after the error
      expect(mockExistsSync.mock.calls.length).toBeGreaterThan(callsAfterError);
    });

    it('should default to idle state on error', async () => {
      mockExistsSync.mockImplementation(() => {
        throw new Error('File system error');
      });

      monitor.start();
      await vi.advanceTimersToNextTimerAsync();

      expect(monitor.getCurrentState()).toBe('idle');
    });

    it('should not emit events on error', async () => {
      const handler = vi.fn();
      monitor.on('stream-started', handler);
      monitor.on('stream-ended', handler);

      mockExistsSync.mockImplementation(() => {
        throw new Error('File system error');
      });
      monitor.start();
      await vi.advanceTimersToNextTimerAsync();

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Synchronization with Scripts', () => {
    it('should sync with DO script execution (file creation)', async () => {
      const startHandler = vi.fn();
      monitor.on('stream-started', startHandler);

      // Simulate: Eclipse starts, no stream
      mockExistsSync.mockReturnValue(false);
      monitor.start();
      await vi.advanceTimersToNextTimerAsync();
      expect(startHandler).not.toHaveBeenCalled();

      // Simulate: Sunshine executes DO script, creates state file
      mockExistsSync.mockReturnValue(true);
      await vi.advanceTimersByTimeAsync(4000);

      // Eclipse detects stream started
      expect(startHandler).toHaveBeenCalledTimes(1);
    });

    it('should sync with UNDO script execution (file deletion)', async () => {
      const endHandler = vi.fn();
      monitor.on('stream-ended', endHandler);

      // Simulate: Stream is active
      mockExistsSync.mockReturnValue(true);
      monitor.start();
      await vi.advanceTimersToNextTimerAsync();
      await vi.advanceTimersByTimeAsync(4000);

      // Simulate: Sunshine executes UNDO script, deletes state file
      mockExistsSync.mockReturnValue(false);
      await vi.advanceTimersByTimeAsync(4000);

      // Eclipse detects stream ended (synchronized with Sunshine notification)
      expect(endHandler).toHaveBeenCalledTimes(1);
    });
  });
});
