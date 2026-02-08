import type { CredentialService } from '../services/credential-service';

interface SunshineAPI {
  changeCredentials: (data: {
    currentUsername: string;
    currentPassword: string;
    newUsername: string;
    newPassword: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

export class UpdateCredentialsUseCase {
  constructor(
    private credentialService: CredentialService,
    private sunshineAPI: SunshineAPI,
    private storeUpdate: (username?: string) => void
  ) {}

  async updateUsername(newUsername: string): Promise<void> {
    const currentCreds = await this.credentialService.getCredentials();
    if (!currentCreds) {
      throw new Error('No credentials found');
    }

    // Step 1: Change credentials on Sunshine using /api/password
    const result = await this.sunshineAPI.changeCredentials({
      currentUsername: currentCreds.username,
      currentPassword: currentCreds.password,
      newUsername: newUsername,
      newPassword: currentCreds.password, // Password stays the same
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to change credentials on Sunshine');
    }

    // Step 2: Save credentials locally
    await this.credentialService.saveCredentials(newUsername, currentCreds.password);

    // Step 3: Update UI state
    this.storeUpdate(newUsername);
  }

  async updatePassword(newPassword: string): Promise<void> {
    const currentCreds = await this.credentialService.getCredentials();
    if (!currentCreds) {
      throw new Error('No credentials found');
    }

    // Step 1: Change credentials on Sunshine using /api/password
    const result = await this.sunshineAPI.changeCredentials({
      currentUsername: currentCreds.username,
      currentPassword: currentCreds.password,
      newUsername: currentCreds.username, // Username stays the same
      newPassword: newPassword,
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to change credentials on Sunshine');
    }

    // Step 2: Save credentials locally
    await this.credentialService.saveCredentials(currentCreds.username, newPassword);

    // Step 3: Update UI state
    this.storeUpdate();
  }

  async updateBoth(newUsername: string, newPassword: string): Promise<void> {
    const currentCreds = await this.credentialService.getCredentials();
    if (!currentCreds) {
      throw new Error('No credentials found');
    }

    // Step 1: Change credentials on Sunshine using /api/password
    const result = await this.sunshineAPI.changeCredentials({
      currentUsername: currentCreds.username,
      currentPassword: currentCreds.password,
      newUsername: newUsername,
      newPassword: newPassword,
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to change credentials on Sunshine');
    }

    // Step 2: Save credentials locally
    await this.credentialService.saveCredentials(newUsername, newPassword);

    // Step 3: Update UI state
    this.storeUpdate(newUsername);
  }
}
