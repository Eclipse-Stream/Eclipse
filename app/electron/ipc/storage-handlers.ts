import { ipcMain } from 'electron';
import { IPC_CHANNELS } from './channels';
import { getCredentialStorage } from '../../src/infrastructure/storage/credential-storage';

/**
 * Register IPC handlers for secure storage operations
 */
export function registerStorageHandlers(): void {
  const storage = getCredentialStorage();

  // Save credentials
  ipcMain.handle(IPC_CHANNELS.STORAGE_SAVE_CREDENTIALS, async (_, { key, value }: { key: string; value: string }) => {
    try {
      await storage.save(key, value);
      return { success: true };
    } catch (error: any) {
      console.error('[Storage] Failed to save credentials:', error);
      return { success: false, error: error.message };
    }
  });

  // Load credentials
  ipcMain.handle(IPC_CHANNELS.STORAGE_LOAD_CREDENTIALS, async (_, key: string) => {
    try {
      const value = await storage.load(key);
      return { success: true, data: value };
    } catch (error: any) {
      console.error('[Storage] Failed to load credentials:', error);
      return { success: false, error: error.message };
    }
  });

  // Delete credentials
  ipcMain.handle(IPC_CHANNELS.STORAGE_DELETE_CREDENTIALS, async (_, key: string) => {
    try {
      await storage.delete(key);
      return { success: true };
    } catch (error: any) {
      console.error('[Storage] Failed to delete credentials:', error);
      return { success: false, error: error.message };
    }
  });

  // Check availability
  ipcMain.handle(IPC_CHANNELS.STORAGE_IS_AVAILABLE, () => {
    return storage.isAvailable();
  });
}
