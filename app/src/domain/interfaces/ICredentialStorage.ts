/**
 * Storage interface for securely storing and retrieving credentials
 * using Electron safeStorage (Windows DPAPI)
 */
export interface ICredentialStorage {
  /**
   * Check if encryption is available
   * @returns true if safeStorage is available
   */
  isAvailable(): boolean;

  /**
   * Save encrypted credentials
   * @param key - Storage key (e.g., "sunshine-credentials")
   * @param value - Value to encrypt and store
   */
  save(key: string, value: string): Promise<void>;

  /**
   * Load and decrypt credentials
   * @param key - Storage key
   * @returns Decrypted value or null if not found
   */
  load(key: string): Promise<string | null>;

  /**
   * Delete stored credentials
   * @param key - Storage key
   */
  delete(key: string): Promise<void>;
}
