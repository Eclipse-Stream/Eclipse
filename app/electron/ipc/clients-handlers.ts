// IPC Handlers - Moonlight Clients / Pairing (Epic 6)
// Handles client pairing operations from renderer process

import { ipcMain } from 'electron'
import { IPC_CHANNELS } from './channels'
import { SunshinePairingService, SunshineConfigManager } from '../../src/infrastructure/sunshine'
import { ProcessManager } from '../../src/infrastructure/system/process-manager'
import { getCredentialStorage } from '../../src/infrastructure/storage/credential-storage'
import type { Credentials } from '../../src/domain/types'

const pairingService = new SunshinePairingService()
const configManager = new SunshineConfigManager()
const processManager = new ProcessManager()
const CREDENTIALS_KEY = 'sunshine-credentials'

/**
 * Charge les credentials et les configure sur le service
 */
async function loadCredentials(): Promise<void> {
  try {
    const storage = getCredentialStorage()
    if (storage.isAvailable()) {
      const credsJson = await storage.load(CREDENTIALS_KEY)
      if (credsJson) {
        const creds = JSON.parse(credsJson) as Credentials
        pairingService.setCredentials(creds.username, creds.password)
      }
    }
  } catch (error) {
    console.warn('[ClientsHandlers] Failed to load credentials:', error)
  }
}

export function registerClientsHandlers(): void {
  // Liste des clients appairés (Story 6.1)
  ipcMain.handle(IPC_CHANNELS.CLIENTS_LIST, async () => {
    await loadCredentials()
    return pairingService.listClients()
  })

  // Appairer un client via PIN (Story 6.2)
  ipcMain.handle(IPC_CHANNELS.CLIENTS_PAIR, async (_event, data: { pin: string; deviceName: string }) => {
    await loadCredentials()
    return pairingService.pairWithPin(data.pin, data.deviceName)
  })

  // Supprimer un client appairé (Story 6.3)
  ipcMain.handle(IPC_CHANNELS.CLIENTS_UNPAIR, async (_event, uuid: string) => {
    await loadCredentials()
    return pairingService.unpairClient(uuid)
  })

  // Récupérer le nom du serveur depuis sunshine.conf (Story 6.4)
  ipcMain.handle(IPC_CHANNELS.SERVER_GET_NAME, async () => {
    try {
      const config = await configManager.readConfig()
      // Sunshine utilise "sunshine_name" pour le nom du serveur
      return config.sunshine_name || 'Sunshine'
    } catch (error) {
      console.error('[ClientsHandlers] Failed to get server name:', error)
      return 'Sunshine'
    }
  })

  // Définir le nom du serveur dans sunshine.conf + restart (Story 6.4)
  ipcMain.handle(IPC_CHANNELS.SERVER_SET_NAME, async (_event, name: string) => {
    try {
      // Écrire dans sunshine.conf
      const writeResult = await configManager.writeConfig('sunshine_name', name)

      if (!writeResult.success) {
        return writeResult
      }

      console.log(`[ClientsHandlers] Server name updated to: ${name}`)

      // Redémarrer Sunshine pour appliquer le changement
      console.log('[ClientsHandlers] Restarting Sunshine to apply name change...')
      const restartResult = await processManager.restartSunshine()

      if (!restartResult.success) {
        return {
          success: true, // La config a été écrite, mais le restart a échoué
          error: `Nom enregistré, mais redémarrage échoué: ${restartResult.error}`
        }
      }

      console.log('[ClientsHandlers] Sunshine restarted successfully')
      return { success: true }

    } catch (error) {
      console.error('[ClientsHandlers] Failed to set server name:', error)
      return { success: false, error: 'Erreur lors de la modification du nom' }
    }
  })
}
