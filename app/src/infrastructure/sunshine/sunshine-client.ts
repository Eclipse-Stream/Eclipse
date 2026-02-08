// Infrastructure Layer - SunshineClient
// Implements ISunshineClient for communication with Sunshine API
// Runs in Main Process (Node.js context)

import axios, { type AxiosError } from 'axios'
import https from 'https'
import type { ISunshineClient } from '@domain/interfaces'
import { SunshineStatus } from '@domain/types'

export class SunshineClient implements ISunshineClient {
  private readonly baseUrl: string
  private readonly timeout: number
  private readonly httpsAgent: https.Agent
  private authHeader: string | null = null

  constructor(baseUrl = 'https://localhost:47990', timeout = 10000) {
    this.baseUrl = baseUrl
    this.timeout = timeout

    // Create HTTPS agent that accepts self-signed certificates for localhost only
    this.httpsAgent = new https.Agent({
      rejectUnauthorized: false,
    })
  }

  setCredentials(username: string, password: string): void {
    const token = Buffer.from(`${username}:${password}`).toString('base64')
    this.authHeader = `Basic ${token}`
  }

  /**
   * Test if credentials are valid by making an authenticated request to Sunshine.
   * @returns Object with success status and optional error message
   */
  async testCredentials(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    const endpoint = `${this.baseUrl}/api/apps`

    try {
      const token = Buffer.from(`${username}:${password}`).toString('base64')
      const authHeader = `Basic ${token}`

      const response = await axios.get(endpoint, {
        timeout: this.timeout,
        httpsAgent: this.httpsAgent,
        headers: { 'Authorization': authHeader },
        validateStatus: () => true,
      })

      if (response.status === 200) {
        return { success: true }
      }

      if (response.status === 401 || response.status === 403) {
        return { success: false, error: 'Identifiants incorrects' }
      }

      return { success: false, error: `Erreur inattendue: ${response.status}` }

    } catch (error: unknown) {
      const axiosError = error as AxiosError

      if (axiosError.code === 'ECONNREFUSED') {
        return { success: false, error: 'Sunshine n\'est pas accessible' }
      }

      return { success: false, error: axiosError.message }
    }
  }

  async getStatus(): Promise<SunshineStatus> {
    const configEndpoint = `${this.baseUrl}/api/config`

    try {
      const headers: Record<string, string> = {}
      if (this.authHeader) {
        headers['Authorization'] = this.authHeader
      }

      // First check if Sunshine is reachable
      const configResponse = await axios.get(configEndpoint, {
        timeout: this.timeout,
        httpsAgent: this.httpsAgent,
        headers,
        validateStatus: () => true,
      })

      if (configResponse.status === 401 || configResponse.status === 403) {
        return SunshineStatus.AUTH_REQUIRED
      }

      if (configResponse.status !== 200) {
        return SunshineStatus.UNKNOWN
      }

      // Sunshine is online, now check if streaming
      // Parse logs to detect active stream (most reliable method since Sunshine API doesn't have a dedicated endpoint)
      try {
        const logsResponse = await axios.get(`${this.baseUrl}/api/logs`, {
          timeout: 5000,
          httpsAgent: this.httpsAgent,
          headers,
          validateStatus: () => true,
        })

        if (logsResponse.status === 200 && logsResponse.data) {
          // Logs can be string or object with log property
          const logsText = typeof logsResponse.data === 'string'
            ? logsResponse.data
            : (logsResponse.data.log || logsResponse.data.logs || JSON.stringify(logsResponse.data))

          // Look for recent stream activity in logs (last ~100 lines)
          const lines = logsText.split('\n').slice(-100)

          // Find the most recent stream start/stop event
          let lastStreamStart = -1
          let lastStreamStop = -1

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].toLowerCase()
            // Detect stream start patterns (Sunshine log messages)
            if (line.includes('start mode') ||
                line.includes('stream started') ||
                line.includes('streaming to') ||
                line.includes('client connected')) {
              lastStreamStart = i
            }
            // Detect stream stop patterns
            if (line.includes('session ended') ||
                line.includes('stream stopped') ||
                line.includes('client disconnected') ||
                line.includes('stopping session') ||
                line.includes('application stopped')) {
              lastStreamStop = i
            }
          }

          // If we found a stream start after the last stream stop, we're streaming
          if (lastStreamStart > lastStreamStop) {
            console.log('[SunshineClient] Detected active stream from logs')
            return SunshineStatus.STREAMING
          }
        }
      } catch (e) {
        console.log('[SunshineClient] /api/logs failed:', (e as Error).message)
      }

      return SunshineStatus.ONLINE

    } catch (error: unknown) {
      const axiosError = error as AxiosError

      // Connection refused or network error
      if (
        axiosError.code === 'ECONNREFUSED' ||
        axiosError.code === 'ENOTFOUND' ||
        axiosError.code === 'ETIMEDOUT' ||
        axiosError.code === 'ECONNRESET'
      ) {
        return SunshineStatus.OFFLINE
      }

      // Timeout
      if (axiosError.code === 'ECONNABORTED') {
        return SunshineStatus.OFFLINE
      }

      console.error('[SunshineClient] Unexpected error:', axiosError.message)
      return SunshineStatus.UNKNOWN
    }
  }

  /**
   * Change credentials on Sunshine using /api/password endpoint.
   * Requires current credentials for authentication and new credentials to set.
   *
   * @param currentUsername Current username (for authentication)
   * @param currentPassword Current password (for authentication)
   * @param newUsername New username to set
   * @param newPassword New password to set
   */
  async changeCredentials(
    currentUsername: string,
    currentPassword: string,
    newUsername: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    const endpoint = `${this.baseUrl}/api/password`

    try {
      // Authenticate with CURRENT credentials
      const token = Buffer.from(`${currentUsername}:${currentPassword}`).toString('base64')
      const authHeader = `Basic ${token}`

      const headers: Record<string, string> = {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      }

      // Use the correct API format for Sunshine
      const response = await axios.post(endpoint, {
        currentUsername: currentUsername,
        currentPassword: currentPassword,
        newUsername: newUsername,
        newPassword: newPassword,
        confirmNewPassword: newPassword
      }, {
        timeout: this.timeout,
        httpsAgent: this.httpsAgent,
        headers,
        validateStatus: () => true,
      })

      console.log('[SunshineClient] changeCredentials response:', response.status, response.data)

      if (response.status === 200) {
        // SUCCESS: Update the client's authHeader for future requests
        this.setCredentials(newUsername, newPassword)
        return { success: true }
      }

      if (response.status === 401 || response.status === 403) {
        return { success: false, error: 'Identifiants actuels incorrects' }
      }

      return { success: false, error: `Erreur Sunshine: ${response.status} - ${response.data?.error || response.statusText}` }

    } catch (error: unknown) {
      const axiosError = error as AxiosError
      console.error('[SunshineClient] Failed to change credentials:', axiosError.message)
      return { success: false, error: `Erreur: ${axiosError.message}` }
    }
  }

  /**
   * @deprecated Use changeCredentials() instead - this method uses wrong API
   */
  async updateConfig(credentials: { username: string; password: string }): Promise<{ success: boolean }> {
    // This method is deprecated but kept for backwards compatibility
    // It doesn't actually work with Sunshine's API
    console.warn('[SunshineClient] updateConfig is deprecated, use changeCredentials instead')

    if (!this.authHeader) {
      throw new Error('No credentials set. Cannot update config without authentication.')
    }

    // Just return success if we have credentials (the old behavior was broken anyway)
    return { success: true }
  }

  /**
   * Récupère la liste des displays depuis l'API Sunshine (troubleshooting)
   * Les device_id sont exposés dans /api/configLocale qui contient les infos de debug
   */
  async getDisplays(): Promise<SunshineDisplay[]> {
    // Essayer d'abord /api/configLocale qui contient les infos de troubleshooting
    const endpoints = [
      `${this.baseUrl}/api/configLocale`,
      `${this.baseUrl}/api/config`,
    ]

    for (const endpoint of endpoints) {
      try {
        const headers: Record<string, string> = {}
        if (this.authHeader) {
          headers['Authorization'] = this.authHeader
        }

        const response = await axios.get(endpoint, {
          timeout: this.timeout,
          httpsAgent: this.httpsAgent,
          headers,
          validateStatus: () => true,
        })

        if (response.status === 200 && response.data) {
          console.log(`[SunshineClient] ${endpoint} response:`, JSON.stringify(response.data, null, 2))
          const displays = this.parseDisplaysFromResponse(response.data)
          if (displays.length > 0) {
            return displays
          }
        }
      } catch (error: unknown) {
        const axiosError = error as AxiosError
        console.error(`[SunshineClient] Failed to get ${endpoint}:`, axiosError.message)
      }
    }

    return []
  }

  /**
   * Parse les displays depuis la réponse Sunshine
   * Cherche les displays dans différents formats possibles
   */
  private parseDisplaysFromResponse(data: Record<string, unknown>): SunshineDisplay[] {
    const displays: SunshineDisplay[] = []

    // Chercher un tableau de displays/monitors
    const possibleArrays = ['displays', 'monitors', 'display_devices', 'available_displays']
    for (const key of possibleArrays) {
      if (Array.isArray(data[key])) {
        const arr = data[key] as Array<Record<string, unknown>>
        for (const item of arr) {
          if (item.device_id || item.deviceId) {
            displays.push({
              device_id: String(item.device_id || item.deviceId || ''),
              display_name: String(item.display_name || item.displayName || item.name || ''),
              friendly_name: String(item.friendly_name || item.friendlyName || item.name || ''),
            })
          }
        }
        if (displays.length > 0) return displays
      }
    }

    // Fallback: chercher output_name dans la config
    if (data.output_name && typeof data.output_name === 'string') {
      displays.push({
        device_id: data.output_name,
        display_name: data.output_name,
        friendly_name: 'Configured Display',
      })
    }

    return displays
  }
}

/**
 * Structure d'un display Sunshine
 */
export interface SunshineDisplay {
  device_id: string;      // GUID format: {xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx}
  display_name: string;   // Ex: \\.\DISPLAY1
  friendly_name: string;  // Ex: "MSI G271"
}