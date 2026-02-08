// IPC Handlers - Sunshine
// Handles Sunshine-related IPC calls from renderer process

import { ipcMain } from 'electron'
import https from 'https'
import axios from 'axios'
import { IPC_CHANNELS } from './channels'
import { SunshineClient, sunshineHealthChecker, sunshineInstaller, sunshinePathsService } from '../../src/infrastructure/sunshine'
import { getCredentialStorage } from '../../src/infrastructure/storage/credential-storage'
import type { Credentials } from '../../src/domain/types'

// HTTPS agent for self-signed certificates (Sunshine uses self-signed)
const httpsAgent = new https.Agent({ rejectUnauthorized: false })

const sunshineClient = new SunshineClient()
const CREDENTIALS_KEY = 'sunshine-credentials'

export function registerSunshineHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.SUNSHINE_GET_STATUS, async () => {
    // Try to load credentials first
    try {
      const storage = getCredentialStorage()
      if (storage.isAvailable()) {
        const credsJson = await storage.load(CREDENTIALS_KEY)
        if (credsJson) {
          const creds = JSON.parse(credsJson) as Credentials
          sunshineClient.setCredentials(creds.username, creds.password)
        }
      }
    } catch (error) {
      console.warn('[SunshineHandlers] Failed to load credentials:', error)
      // Continue without credentials - might get AUTH_REQUIRED
    }

    const status = await sunshineClient.getStatus()
    return status
  })

  ipcMain.handle(IPC_CHANNELS.SUNSHINE_UPDATE_CREDENTIALS, async (_event, credentials: Credentials) => {
    try {
      const result = await sunshineClient.updateConfig(credentials)
      return { success: result.success }
    } catch (error: any) {
      console.error('[SunshineHandlers] Failed to update credentials:', error)
      return { success: false, error: error.message }
    }
  })

  // Test if credentials are valid
  ipcMain.handle(IPC_CHANNELS.SUNSHINE_TEST_CREDENTIALS, async (_event, credentials: Credentials) => {
    try {
      const result = await sunshineClient.testCredentials(credentials.username, credentials.password)
      return result
    } catch (error: any) {
      console.error('[SunshineHandlers] Failed to test credentials:', error)
      return { success: false, error: error.message }
    }
  })

  // Change credentials on Sunshine (requires current + new credentials)
  ipcMain.handle(IPC_CHANNELS.SUNSHINE_CHANGE_CREDENTIALS, async (_event, data: {
    currentUsername: string;
    currentPassword: string;
    newUsername: string;
    newPassword: string;
  }) => {
    try {
      const result = await sunshineClient.changeCredentials(
        data.currentUsername,
        data.currentPassword,
        data.newUsername,
        data.newPassword
      )
      return result
    } catch (error: any) {
      console.error('[SunshineHandlers] Failed to change credentials:', error)
      return { success: false, error: error.message }
    }
  })

  // Set initial credentials on Sunshine (first time setup via API POST)
  // This is used when Sunshine has no credentials configured (setup mode)
  ipcMain.handle(IPC_CHANNELS.SUNSHINE_SET_INITIAL_CREDENTIALS, async (_event, credentials: Credentials) => {
    const baseUrl = 'https://localhost:47990'
    console.log(`[SunshineHandlers] Setting initial credentials for user: ${credentials.username}`)

    try {
      // Step 1: Wait for Sunshine API to be ready (poll /api/config)
      const maxAttempts = 30
      let apiReady = false

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const response = await axios.get(`${baseUrl}/api/config`, {
            timeout: 2000,
            httpsAgent,
            validateStatus: () => true,
          })
          // 200 = no auth required (setup mode), 401 = auth required (already configured)
          if (response.status === 200 || response.status === 401) {
            console.log(`[SunshineHandlers] API ready after ${attempt} attempts (status: ${response.status})`)
            apiReady = true
            break
          }
        } catch (e: any) {
          if (e.code !== 'ECONNREFUSED') {
            console.log(`[SunshineHandlers] Waiting for API... attempt ${attempt}/${maxAttempts}`)
          }
        }
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      if (!apiReady) {
        return { success: false, error: 'Sunshine API not reachable after 30 seconds' }
      }

      // Step 2: POST to /api/password to set initial credentials
      const response = await axios.post(`${baseUrl}/api/password`, {
        currentUsername: '',
        currentPassword: '',
        newUsername: credentials.username,
        newPassword: credentials.password,
        confirmNewPassword: credentials.password
      }, {
        timeout: 10000,
        httpsAgent,
        headers: { 'Content-Type': 'application/json' },
        validateStatus: () => true,
      })

      console.log('[SunshineHandlers] Initial credentials response:', response.status, response.data)

      if (response.status === 200) {
        sunshineClient.setCredentials(credentials.username, credentials.password)
        return { success: true }
      }

      if (response.status === 401) {
        return { success: false, error: 'Sunshine already has credentials configured. Use reconnect mode.' }
      }

      return { success: false, error: `Sunshine API error: ${response.status}` }

    } catch (error: any) {
      console.error('[SunshineHandlers] Failed to set initial credentials:', error)
      return { success: false, error: error.message }
    }
  })

  // Check Sunshine installation health (Story 10.2)
  ipcMain.handle(IPC_CHANNELS.SUNSHINE_CHECK_HEALTH, async () => {
    try {
      const result = sunshineHealthChecker.checkSunshineInstallation()
      return result
    } catch (error: any) {
      console.error('[SunshineHandlers] Failed to check Sunshine health:', error)
      return { status: 'CORRUPTED', error: error.message }
    }
  })

  // Reinstall Sunshine from bundled resources (Story 10.2)
  ipcMain.handle(IPC_CHANNELS.SUNSHINE_REINSTALL, async () => {
    try {
      const result = await sunshineInstaller.reinstallSunshine()
      return result
    } catch (error: any) {
      console.error('[SunshineHandlers] Failed to reinstall Sunshine:', error)
      return { success: false, error: error.message }
    }
  })

  // Check if Sunshine has credentials configured (Epic 11 - reinstall with AppData)
  // This checks if credentials.json exists and has data in Sunshine config folder
  ipcMain.handle(IPC_CHANNELS.SUNSHINE_HAS_CREDENTIALS_CONFIGURED, async () => {
    try {
      const hasCredentials = sunshinePathsService.hasCredentialsConfigured()
      console.log(`[SunshineHandlers] Sunshine has credentials configured: ${hasCredentials}`)
      return { hasCredentials }
    } catch (error: any) {
      console.error('[SunshineHandlers] Failed to check Sunshine credentials:', error)
      return { hasCredentials: false, error: error.message }
    }
  })
}
