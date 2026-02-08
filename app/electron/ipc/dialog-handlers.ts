// IPC Handlers - Dialog & File utilities
// Story 7.4: Handles file selection dialog and icon extraction

import { ipcMain, dialog, app, nativeImage, BrowserWindow } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { IPC_CHANNELS, type DialogSelectExeResult, type DialogSelectImageResult, type FileExtractIconResult } from './channels'

/**
 * Extrait un nom d'application lisible depuis un chemin d'exécutable
 * - Retire l'extension .exe
 * - Remplace _ et - par des espaces
 * - Capitalise chaque mot
 */
export function extractAppNameFromPath(exePath: string): string {
  const fileName = path.basename(exePath, '.exe')
  return fileName
    .replace(/[_-]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2') // CamelCase → espaces
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .trim()
}

export function registerDialogHandlers(): void {
  // Ouvre le sélecteur de fichier Windows pour choisir un .exe
  ipcMain.handle(IPC_CHANNELS.DIALOG_SELECT_EXE, async (): Promise<DialogSelectExeResult> => {
    try {
      const focusedWindow = BrowserWindow.getFocusedWindow()
      const options: Electron.OpenDialogOptions = {
        title: 'Sélectionner une application',
        filters: [
          { name: 'Exécutables', extensions: ['exe'] }
        ],
        properties: ['openFile']
      }

      const result = focusedWindow
        ? await dialog.showOpenDialog(focusedWindow, options)
        : await dialog.showOpenDialog(options)

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true }
      }

      return { success: true, path: result.filePaths[0] }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      console.error('[DialogHandlers] Failed to open file dialog:', errorMessage)
      return { success: false, error: errorMessage }
    }
  })

  // Story 7.7: Ouvre le sélecteur de fichier Windows pour choisir une image PNG
  ipcMain.handle(IPC_CHANNELS.DIALOG_SELECT_IMAGE, async (): Promise<DialogSelectImageResult> => {
    try {
      const focusedWindow = BrowserWindow.getFocusedWindow()
      const options: Electron.OpenDialogOptions = {
        title: 'Sélectionner une icône',
        filters: [
          { name: 'Images PNG', extensions: ['png'] }
        ],
        properties: ['openFile']
      }

      const result = focusedWindow
        ? await dialog.showOpenDialog(focusedWindow, options)
        : await dialog.showOpenDialog(options)

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true }
      }

      const imagePath = result.filePaths[0]

      // Lire le fichier et convertir en base64
      const imageBuffer = await fs.promises.readFile(imagePath)
      const base64 = imageBuffer.toString('base64')
      const imageBase64 = `data:image/png;base64,${base64}`

      return { success: true, imageBase64 }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      console.error('[DialogHandlers] Failed to open image dialog:', errorMessage)
      return { success: false, error: errorMessage }
    }
  })

  // Extrait l'icône d'un fichier .exe et la retourne en base64
  ipcMain.handle(IPC_CHANNELS.FILE_EXTRACT_ICON, async (_event, exePath: string): Promise<FileExtractIconResult> => {
    try {
      if (!exePath || typeof exePath !== 'string') {
        return { success: false, error: 'Chemin invalide' }
      }

      // Utiliser app.getFileIcon pour extraire l'icône
      const icon = await app.getFileIcon(exePath, { size: 'large' })

      if (icon.isEmpty()) {
        return { success: false, error: 'Icône non trouvée' }
      }

      // Convertir en PNG puis en base64
      const pngBuffer = icon.toPNG()
      const base64 = pngBuffer.toString('base64')
      const iconBase64 = `data:image/png;base64,${base64}`

      return { success: true, iconBase64 }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      console.error('[DialogHandlers] Failed to extract icon:', errorMessage)
      return { success: false, error: errorMessage }
    }
  })

  console.log('[DialogHandlers] Registered all handlers')
}
