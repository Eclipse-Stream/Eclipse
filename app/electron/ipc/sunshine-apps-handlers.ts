// IPC Handlers - Sunshine Apps Repository
// Story 7.1 & 7.5: Handles apps.json read/write IPC calls from renderer process

import { ipcMain } from 'electron'
import { IPC_CHANNELS, type SunshineApp, type SunshineAppsFile, type SunshineAppsResult } from './channels'
import { SunshineAppsRepository } from '../../src/infrastructure/sunshine'

// Singleton instance du repository
const appsRepository = new SunshineAppsRepository()

/**
 * Story 7.5: Garantit l'existence de l'app Eclipse au démarrage
 * Appelé depuis main.ts après l'enregistrement des handlers
 */
export async function ensureEclipseAppExists(): Promise<void> {
  try {
    const result = await appsRepository.ensureEclipseAppExists()
    if (result.success) {
      console.log('[SunshineAppsHandlers] Eclipse app verified/created')
    } else {
      console.warn('[SunshineAppsHandlers] Failed to ensure Eclipse app:', result.error)
    }
  } catch (error) {
    console.error('[SunshineAppsHandlers] Error ensuring Eclipse app:', error)
  }
}

export function registerSunshineAppsHandlers(): void {
  // Retourne le chemin de apps.json détecté
  ipcMain.handle(IPC_CHANNELS.SUNSHINE_APPS_GET_PATH, async (): Promise<string | null> => {
    return appsRepository.getAppsPath()
  })

  // Lit toutes les applications de apps.json
  ipcMain.handle(IPC_CHANNELS.SUNSHINE_APPS_READ, async (): Promise<SunshineAppsFile> => {
    try {
      const result = await appsRepository.readApps()
      return result
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      console.error('[SunshineAppsHandlers] Failed to read apps:', errorMessage)
      // Retourner une structure vide en cas d'erreur pour éviter un crash côté renderer
      return { apps: [] }
    }
  })

  // Ajoute une nouvelle application
  ipcMain.handle(IPC_CHANNELS.SUNSHINE_APPS_ADD, async (_event, app: SunshineApp): Promise<SunshineAppsResult> => {
    try {
      const result = await appsRepository.addApp(app)
      return result
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      console.error('[SunshineAppsHandlers] Failed to add app:', errorMessage)
      return { success: false, error: errorMessage }
    }
  })

  // Met à jour une application existante
  ipcMain.handle(IPC_CHANNELS.SUNSHINE_APPS_UPDATE, async (_event, name: string, updates: Partial<SunshineApp>): Promise<SunshineAppsResult> => {
    try {
      const result = await appsRepository.updateApp(name, updates)
      return result
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      console.error('[SunshineAppsHandlers] Failed to update app:', errorMessage)
      return { success: false, error: errorMessage }
    }
  })

  // Supprime une application
  ipcMain.handle(IPC_CHANNELS.SUNSHINE_APPS_DELETE, async (_event, name: string): Promise<SunshineAppsResult> => {
    try {
      const result = await appsRepository.deleteApp(name)
      return result
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      console.error('[SunshineAppsHandlers] Failed to delete app:', errorMessage)
      return { success: false, error: errorMessage }
    }
  })

  // Crée un backup de apps.json
  ipcMain.handle(IPC_CHANNELS.SUNSHINE_APPS_BACKUP, async (): Promise<SunshineAppsResult> => {
    try {
      const result = await appsRepository.backupApps()
      return result
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      console.error('[SunshineAppsHandlers] Failed to backup apps:', errorMessage)
      return { success: false, error: errorMessage }
    }
  })

  // Restaure depuis le dernier backup
  ipcMain.handle(IPC_CHANNELS.SUNSHINE_APPS_RESTORE, async (): Promise<SunshineAppsResult> => {
    try {
      const result = await appsRepository.restoreFromBackup()
      return result
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      console.error('[SunshineAppsHandlers] Failed to restore apps:', errorMessage)
      return { success: false, error: errorMessage }
    }
  })

  console.log('[SunshineAppsHandlers] Registered all handlers')
}