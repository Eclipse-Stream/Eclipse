import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CredentialService } from './credential-service';

// Mock the window.electronAPI
const mockStorage = {
  save: vi.fn(),
  load: vi.fn(),
  delete: vi.fn(),
  isAvailable: vi.fn(),
};

global.window = {
  electronAPI: {
    storage: mockStorage,
  },
} as any;

describe('CredentialService', () => {
  let service: CredentialService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CredentialService();
  });

  describe('isAvailable', () => {
    it('should return true when storage is available', async () => {
      mockStorage.isAvailable.mockResolvedValue(true);
      const result = await service.isAvailable();
      expect(result).toBe(true);
      expect(mockStorage.isAvailable).toHaveBeenCalled();
    });

    it('should return false when storage is not available', async () => {
      mockStorage.isAvailable.mockResolvedValue(false);
      const result = await service.isAvailable();
      expect(result).toBe(false);
    });
  });

  describe('saveCredentials', () => {
    it('should save credentials successfully', async () => {
      mockStorage.save.mockResolvedValue({ success: true });
      await service.saveCredentials('user', 'pass');
      
      // Should save combined/serialized credentials
      // The service might combine user/pass into a single JSON string before saving
      expect(mockStorage.save).toHaveBeenCalledWith(
        'sunshine-credentials', 
        expect.stringContaining('"username":"user"')
      );
      expect(mockStorage.save).toHaveBeenCalledWith(
        'sunshine-credentials', 
        expect.stringContaining('"password":"pass"')
      );
    });

    it('should throw error when save fails', async () => {
      mockStorage.save.mockResolvedValue({ success: false, error: 'Save failed' });
      await expect(service.saveCredentials('user', 'pass')).rejects.toThrow('Save failed');
    });
  });

  describe('getCredentials', () => {
    it('should return credentials when they exist', async () => {
      const mockCreds = JSON.stringify({ username: 'user', password: 'pass' });
      mockStorage.load.mockResolvedValue({ success: true, data: mockCreds });

      const result = await service.getCredentials();
      
      expect(result).toEqual({ username: 'user', password: 'pass' });
      expect(mockStorage.load).toHaveBeenCalledWith('sunshine-credentials');
    });

    it('should return null when no credentials exist', async () => {
      mockStorage.load.mockResolvedValue({ success: true, data: null });
      const result = await service.getCredentials();
      expect(result).toBeNull();
    });

    it('should throw error when load fails', async () => {
      mockStorage.load.mockResolvedValue({ success: false, error: 'Load failed' });
      await expect(service.getCredentials()).rejects.toThrow('Load failed');
    });
  });

  describe('hasCredentials', () => {
    it('should return true when credentials exist', async () => {
      mockStorage.load.mockResolvedValue({ success: true, data: '{}' });
      const result = await service.hasCredentials();
      expect(result).toBe(true);
    });

    it('should return false when credentials do not exist', async () => {
      mockStorage.load.mockResolvedValue({ success: true, data: null });
      const result = await service.hasCredentials();
      expect(result).toBe(false);
    });
  });

  describe('clearCredentials', () => {
    it('should delete credentials successfully', async () => {
      mockStorage.delete.mockResolvedValue({ success: true });
      await service.clearCredentials();
      expect(mockStorage.delete).toHaveBeenCalledWith('sunshine-credentials');
    });

    it('should throw error when delete fails', async () => {
      mockStorage.delete.mockResolvedValue({ success: false, error: 'Delete failed' });
      await expect(service.clearCredentials()).rejects.toThrow('Delete failed');
    });
  });
});
