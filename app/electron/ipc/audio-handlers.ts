// IPC Handlers - Audio
// Story 5.3: Handles audio device detection via Sunshine audio-info.exe
// Lists available audio sinks for preset configuration

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from './channels';
import { SunshineAudioService } from '../../src/infrastructure/sunshine';

// Singleton instance of the audio service
const audioService = new SunshineAudioService();

export function registerAudioHandlers(): void {
  // Get all audio devices (sinks + sources)
  ipcMain.handle(IPC_CHANNELS.AUDIO_GET_DEVICES, async () => {
    try {
      const result = await audioService.getAudioDevices();
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('[AudioHandlers] Failed to get audio devices:', error);
      return {
        success: false,
        devices: [],
        error: errorMessage,
      };
    }
  });

  // Get only audio sinks (output devices for streaming)
  ipcMain.handle(IPC_CHANNELS.AUDIO_GET_SINKS, async () => {
    try {
      const result = await audioService.getAudioSinks();
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('[AudioHandlers] Failed to get audio sinks:', error);
      return {
        success: false,
        devices: [],
        error: errorMessage,
      };
    }
  });
}
