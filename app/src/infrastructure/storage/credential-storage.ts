import { safeStorage, app } from "electron";
import * as fs from "fs/promises";
import * as path from "path";
import type { ICredentialStorage } from "../../domain/interfaces";

/**
 * Secure credential storage using Electron safeStorage (Windows DPAPI)
 * Stores encrypted credentials in %APPDATA%/Eclipse/credentials.enc
 *
 * IMPORTANT: On utilise explicitement "Eclipse" (majuscule) pour cohérence
 * avec les autres fichiers de config (scripts, presets, etc.)
 */
export class CredentialStorage implements ICredentialStorage {
  private readonly storageDir: string;
  private readonly storageFile: string;

  constructor() {
    // IMPORTANT: Utiliser "Eclipse" avec majuscule pour cohérence avec le reste de l'app
    // (EclipseScriptsService, recovery-handlers, etc. utilisent tous %APPDATA%/Eclipse/)
    this.storageDir = path.join(process.env.APPDATA || '', 'Eclipse');
    this.storageFile = path.join(this.storageDir, "credentials.enc");
  }

  /**
   * Check if encryption is available
   */
  isAvailable(): boolean {
    return safeStorage.isEncryptionAvailable();
  }

  /**
   * Save encrypted credentials to file
   * @param key - Storage key (e.g., "sunshine-credentials")
   * @param value - Value to encrypt and store
   */
  async save(key: string, value: string): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error("Encryption not available");
    }

    // Ensure directory exists
    await fs.mkdir(this.storageDir, { recursive: true });

    // Load existing data
    const data = await this.loadStorageFile();

    // Encrypt the value
    const encryptedBuffer = safeStorage.encryptString(value);
    const base64Encrypted = encryptedBuffer.toString("base64");

    // Store encrypted value
    data[key] = base64Encrypted;

    // Write back to file
    await fs.writeFile(this.storageFile, JSON.stringify(data, null, 2), "utf-8");
  }

  /**
   * Load and decrypt credentials from file
   * @param key - Storage key
   * @returns Decrypted value or null if not found
   */
  async load(key: string): Promise<string | null> {
    if (!this.isAvailable()) {
      throw new Error("Encryption not available");
    }

    try {
      const data = await this.loadStorageFile();

      if (!data[key]) {
        return null;
      }

      // Decrypt the value
      const encryptedBuffer = Buffer.from(data[key], "base64");
      const decryptedValue = safeStorage.decryptString(encryptedBuffer);

      return decryptedValue;
    } catch (error: any) {
      if (error.code === "ENOENT") {
        return null; // File doesn't exist yet
      }
      throw error;
    }
  }

  /**
   * Delete stored credentials
   * @param key - Storage key
   */
  async delete(key: string): Promise<void> {
    try {
      const data = await this.loadStorageFile();
      delete data[key];
      await fs.writeFile(this.storageFile, JSON.stringify(data, null, 2), "utf-8");
    } catch (error: any) {
      if (error.code === "ENOENT") {
        // File doesn't exist, nothing to delete
        return;
      }
      throw error;
    }
  }

  /**
   * Load storage file or return empty object
   */
  private async loadStorageFile(): Promise<Record<string, string>> {
    try {
      const content = await fs.readFile(this.storageFile, "utf-8");
      return JSON.parse(content);
    } catch (error: any) {
      if (error.code === "ENOENT") {
        return {}; // File doesn't exist yet
      }
      throw error;
    }
  }
}

// Singleton instance
let instance: CredentialStorage | null = null;

/**
 * Get singleton instance of CredentialStorage
 */
export function getCredentialStorage(): CredentialStorage {
  if (!instance) {
    instance = new CredentialStorage();
  }
  return instance;
}
