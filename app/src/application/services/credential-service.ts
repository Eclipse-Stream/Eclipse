import type { Credentials } from '../../domain/types';

export class CredentialService {
  private readonly STORAGE_KEY = 'sunshine-credentials';

  /**
   * Check if secure storage is available
   */
  async isAvailable(): Promise<boolean> {
    return window.electronAPI.storage.isAvailable();
  }

  /**
   * Save credentials securely
   * @param username Sunshine username
   * @param password Sunshine password
   */
  async saveCredentials(username: string, password: string): Promise<void> {
    const credentials = { username, password };
    const serialized = JSON.stringify(credentials);
    
    const result = await window.electronAPI.storage.save(this.STORAGE_KEY, serialized);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to save credentials');
    }
  }

  /**
   * Retrieve credentials
   * @returns Credentials object or null if not found
   */
  async getCredentials(): Promise<Credentials | null> {
    const result = await window.electronAPI.storage.load(this.STORAGE_KEY);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to load credentials');
    }

    if (!result.data) {
      return null;
    }

    try {
      return JSON.parse(result.data) as Credentials;
    } catch (e) {
      console.error('Failed to parse credentials:', e);
      return null;
    }
  }

  /**
   * Check if credentials exist
   */
  async hasCredentials(): Promise<boolean> {
    const creds = await this.getCredentials();
    return creds !== null;
  }

  /**
   * Delete stored credentials
   */
  async clearCredentials(): Promise<void> {
    const result = await window.electronAPI.storage.delete(this.STORAGE_KEY);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete credentials');
    }
  }
}

// Singleton instance
export const credentialService = new CredentialService();
