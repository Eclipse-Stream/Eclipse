import { describe, it, expect, beforeEach } from 'vitest';
import { ProcessManager } from './process-manager';

/**
 * Unit tests for ProcessManager
 *
 * Note: These tests verify the class structure and basic behavior.
 * Integration tests would require actual Windows service access.
 */
describe('ProcessManager', () => {
  let processManager: ProcessManager;

  beforeEach(() => {
    processManager = new ProcessManager();
  });

  describe('Class Structure', () => {
    it('should instantiate ProcessManager', () => {
      expect(processManager).toBeInstanceOf(ProcessManager);
    });

    it('should have startSunshine method', () => {
      expect(typeof processManager.startSunshine).toBe('function');
    });

    it('should have stopSunshine method', () => {
      expect(typeof processManager.stopSunshine).toBe('function');
    });

    it('should have restartSunshine method', () => {
      expect(typeof processManager.restartSunshine).toBe('function');
    });
  });

  describe('Return Type Contracts', () => {
    it('startSunshine should return Promise<ServiceOperationResult>', async () => {
      const result = await processManager.startSunshine();

      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
      if (!result.success) {
        expect(result).toHaveProperty('error');
        expect(typeof result.error).toBe('string');
      }
    });

    it('stopSunshine should return Promise<ServiceOperationResult>', async () => {
      const result = await processManager.stopSunshine();

      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
      if (!result.success) {
        expect(result).toHaveProperty('error');
        expect(typeof result.error).toBe('string');
      }
    });

    it('restartSunshine should return Promise<ServiceOperationResult>', async () => {
      const result = await processManager.restartSunshine();

      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
      if (!result.success) {
        expect(result).toHaveProperty('error');
        expect(typeof result.error).toBe('string');
      }
    });
  });

  describe('Performance', () => {
    it('restartSunshine should attempt to complete operation', async () => {
      const startTime = Date.now();
      await processManager.restartSunshine();
      const duration = Date.now() - startTime;

      // Should return within reasonable time (5 seconds)
      expect(duration).toBeLessThan(5000);
    });
  });
});
