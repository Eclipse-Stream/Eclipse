import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateCredentialsUseCase } from './update-credentials';
import type { CredentialService } from '../services/credential-service';

describe('UpdateCredentialsUseCase', () => {
  let useCase: UpdateCredentialsUseCase;
  let mockCredentialService: CredentialService;
  let mockSunshineAPI: any;
  let mockStoreUpdate: any;

  beforeEach(() => {
    mockCredentialService = {
      saveCredentials: vi.fn(),
      getCredentials: vi.fn(),
    } as any;

    mockSunshineAPI = {
      changeCredentials: vi.fn().mockResolvedValue({ success: true }),
    };

    mockStoreUpdate = vi.fn();

    useCase = new UpdateCredentialsUseCase(
      mockCredentialService,
      mockSunshineAPI,
      mockStoreUpdate
    );
  });

  describe('updateUsername', () => {
    it('should update username successfully following transaction order', async () => {
      const currentPassword = 'currentpass123';
      const newUsername = 'newuser';

      vi.mocked(mockCredentialService.getCredentials).mockResolvedValue({
        username: 'olduser',
        password: currentPassword,
      });

      vi.mocked(mockSunshineAPI.changeCredentials).mockResolvedValue({ success: true });
      vi.mocked(mockCredentialService.saveCredentials).mockResolvedValue(undefined);

      await useCase.updateUsername(newUsername);

      expect(mockSunshineAPI.changeCredentials).toHaveBeenCalledWith({
        currentUsername: 'olduser',
        currentPassword: currentPassword,
        newUsername: newUsername,
        newPassword: currentPassword,
      });
      expect(mockCredentialService.saveCredentials).toHaveBeenCalledWith(newUsername, currentPassword);
      expect(mockStoreUpdate).toHaveBeenCalledWith(newUsername);
    });

    it('should rollback if Sunshine update fails', async () => {
      const currentPassword = 'currentpass123';
      const newUsername = 'newuser';

      vi.mocked(mockCredentialService.getCredentials).mockResolvedValue({
        username: 'olduser',
        password: currentPassword,
      });

      vi.mocked(mockSunshineAPI.changeCredentials).mockResolvedValue({ success: false, error: 'Sunshine API error' });

      await expect(useCase.updateUsername(newUsername)).rejects.toThrow('Sunshine API error');

      expect(mockCredentialService.saveCredentials).not.toHaveBeenCalled();
      expect(mockStoreUpdate).not.toHaveBeenCalled();
    });

    it('should rollback if storage save fails after Sunshine update', async () => {
      const currentPassword = 'currentpass123';
      const newUsername = 'newuser';

      vi.mocked(mockCredentialService.getCredentials).mockResolvedValue({
        username: 'olduser',
        password: currentPassword,
      });

      vi.mocked(mockSunshineAPI.changeCredentials).mockResolvedValue({ success: true });
      vi.mocked(mockCredentialService.saveCredentials).mockRejectedValue(new Error('Storage error'));

      await expect(useCase.updateUsername(newUsername)).rejects.toThrow('Storage error');

      expect(mockStoreUpdate).not.toHaveBeenCalled();
    });
  });

  describe('updatePassword', () => {
    it('should update password successfully following transaction order', async () => {
      const currentUsername = 'testuser';
      const newPassword = 'newpass123';

      vi.mocked(mockCredentialService.getCredentials).mockResolvedValue({
        username: currentUsername,
        password: 'oldpass',
      });

      vi.mocked(mockSunshineAPI.changeCredentials).mockResolvedValue({ success: true });
      vi.mocked(mockCredentialService.saveCredentials).mockResolvedValue(undefined);

      await useCase.updatePassword(newPassword);

      expect(mockSunshineAPI.changeCredentials).toHaveBeenCalledWith({
        currentUsername: currentUsername,
        currentPassword: 'oldpass',
        newUsername: currentUsername,
        newPassword: newPassword,
      });
      expect(mockCredentialService.saveCredentials).toHaveBeenCalledWith(currentUsername, newPassword);
      expect(mockStoreUpdate).toHaveBeenCalled();
    });

    it('should rollback if Sunshine update fails', async () => {
      const newPassword = 'newpass123';

      vi.mocked(mockCredentialService.getCredentials).mockResolvedValue({
        username: 'testuser',
        password: 'oldpass',
      });

      vi.mocked(mockSunshineAPI.changeCredentials).mockResolvedValue({ success: false, error: 'Sunshine API error' });

      await expect(useCase.updatePassword(newPassword)).rejects.toThrow('Sunshine API error');

      expect(mockCredentialService.saveCredentials).not.toHaveBeenCalled();
      expect(mockStoreUpdate).not.toHaveBeenCalled();
    });
  });

  describe('updateBoth', () => {
    it('should update both username and password successfully', async () => {
      const newUsername = 'newuser';
      const newPassword = 'newpass123';

      vi.mocked(mockCredentialService.getCredentials).mockResolvedValue({
        username: 'olduser',
        password: 'oldpass',
      });

      vi.mocked(mockSunshineAPI.changeCredentials).mockResolvedValue({ success: true });
      vi.mocked(mockCredentialService.saveCredentials).mockResolvedValue(undefined);

      await useCase.updateBoth(newUsername, newPassword);

      expect(mockSunshineAPI.changeCredentials).toHaveBeenCalledWith({
        currentUsername: 'olduser',
        currentPassword: 'oldpass',
        newUsername: newUsername,
        newPassword: newPassword,
      });
      expect(mockCredentialService.saveCredentials).toHaveBeenCalledWith(newUsername, newPassword);
      expect(mockStoreUpdate).toHaveBeenCalledWith(newUsername);
    });
  });
});
