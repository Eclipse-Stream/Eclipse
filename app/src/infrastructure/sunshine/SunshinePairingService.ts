// Infrastructure Layer - SunshinePairingService
// Gère les opérations de pairing avec les clients Moonlight via l'API Sunshine
// Endpoints: /api/clients, /api/pin

import axios, { type AxiosError } from 'axios'
import https from 'https'
import type {
  MoonlightClient,
  ClientsListResult,
  PairingResult,
  ClientOperationResult,
} from '@domain/types'

export class SunshinePairingService {
  private readonly baseUrl: string
  private readonly timeout: number
  private readonly httpsAgent: https.Agent
  private authHeader: string | null = null

  constructor(baseUrl = 'https://localhost:47990', timeout = 10000) {
    this.baseUrl = baseUrl
    this.timeout = timeout
    this.httpsAgent = new https.Agent({
      rejectUnauthorized: false, // Sunshine uses self-signed cert
    })
  }

  setCredentials(username: string, password: string): void {
    const token = Buffer.from(`${username}:${password}`).toString('base64')
    this.authHeader = `Basic ${token}`
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {}
    if (this.authHeader) {
      headers['Authorization'] = this.authHeader
    }
    return headers
  }

  /**
   * Récupère la liste des clients Moonlight appairés
   * Endpoint: GET /api/clients/list
   * Ref: https://docs.lizardbyte.dev/projects/sunshine/latest/md_docs_2api.html
   */
  async listClients(): Promise<ClientsListResult> {
    const endpoint = `${this.baseUrl}/api/clients/list`

    try {
      const response = await axios.get(endpoint, {
        timeout: this.timeout,
        httpsAgent: this.httpsAgent,
        headers: this.getHeaders(),
        validateStatus: () => true,
      })

      console.log('[SunshinePairingService] listClients response:', response.status, response.data)

      if (response.status === 200) {
        const clients = this.parseClientsResponse(response.data)
        return { success: true, clients }
      }

      if (response.status === 401 || response.status === 403) {
        return { success: false, clients: [], error: 'Authentification requise' }
      }

      return { success: false, clients: [], error: `Erreur: ${response.status}` }

    } catch (error: unknown) {
      const axiosError = error as AxiosError
      console.error('[SunshinePairingService] Failed to list clients:', axiosError.message)

      if (axiosError.code === 'ECONNREFUSED') {
        return { success: false, clients: [], error: 'Sunshine n\'est pas accessible' }
      }

      return { success: false, clients: [], error: axiosError.message }
    }
  }

  /**
   * Parse la réponse des clients depuis Sunshine
   * Format attendu: { named_certs: [{ name: string, uuid?: string }] } ou { clients: [...] }
   */
  private parseClientsResponse(data: unknown): MoonlightClient[] {
    const clients: MoonlightClient[] = []

    if (!data || typeof data !== 'object') {
      return clients
    }

    const obj = data as Record<string, unknown>

    // Sunshine uses "named_certs" for the list of paired clients
    if (Array.isArray(obj.named_certs)) {
      for (const cert of obj.named_certs) {
        if (cert && typeof cert === 'object') {
          const c = cert as Record<string, unknown>
          clients.push({
            uuid: String(c.uuid || c.name || ''),
            name: String(c.name || 'Unknown'),
          })
        }
      }
    }

    // Alternative format: clients array
    if (Array.isArray(obj.clients)) {
      for (const client of obj.clients) {
        if (client && typeof client === 'object') {
          const c = client as Record<string, unknown>
          clients.push({
            uuid: String(c.uuid || c.id || c.name || ''),
            name: String(c.name || 'Unknown'),
          })
        }
      }
    }

    return clients
  }

  /**
   * Appaire un nouveau client via code PIN
   * Endpoint: POST /api/pin avec { pin, name }
   * Ref: https://docs.lizardbyte.dev/projects/sunshine/latest/md_docs_2api.html
   */
  async pairWithPin(pin: string, deviceName: string): Promise<PairingResult> {
    const endpoint = `${this.baseUrl}/api/pin`

    try {
      const response = await axios.post(endpoint,
        { pin, name: deviceName },
        {
          timeout: this.timeout,
          httpsAgent: this.httpsAgent,
          headers: {
            ...this.getHeaders(),
            'Content-Type': 'application/json',
          },
          validateStatus: () => true,
        }
      )

      console.log('[SunshinePairingService] pairWithPin response:', response.status, response.data)

      if (response.status === 200) {
        return {
          success: true,
          clientName: deviceName,
        }
      }

      if (response.status === 400) {
        return { success: false, error: 'Code PIN invalide ou expiré' }
      }

      if (response.status === 401 || response.status === 403) {
        return { success: false, error: 'Authentification requise' }
      }

      return { success: false, error: `Erreur: ${response.status}` }

    } catch (error: unknown) {
      const axiosError = error as AxiosError
      console.error('[SunshinePairingService] Failed to pair with PIN:', axiosError.message)

      if (axiosError.code === 'ECONNREFUSED') {
        return { success: false, error: 'Sunshine n\'est pas accessible' }
      }

      return { success: false, error: axiosError.message }
    }
  }

  /**
   * Supprime un client appairé
   * Endpoint: POST /api/clients/unpair avec { uuid }
   * ou DELETE /api/clients/{uuid} selon version Sunshine
   */
  async unpairClient(uuid: string): Promise<ClientOperationResult> {
    // Try POST /api/clients/unpair first (Sunshine convention)
    const unpairEndpoint = `${this.baseUrl}/api/clients/unpair`

    try {
      const response = await axios.post(unpairEndpoint,
        { uuid },
        {
          timeout: this.timeout,
          httpsAgent: this.httpsAgent,
          headers: {
            ...this.getHeaders(),
            'Content-Type': 'application/json',
          },
          validateStatus: () => true,
        }
      )

      console.log('[SunshinePairingService] unpairClient response:', response.status, response.data)

      if (response.status === 200) {
        return { success: true }
      }

      if (response.status === 404) {
        return { success: false, error: 'Client non trouvé' }
      }

      if (response.status === 401 || response.status === 403) {
        return { success: false, error: 'Authentification requise' }
      }

      return { success: false, error: `Erreur: ${response.status}` }

    } catch (error: unknown) {
      const axiosError = error as AxiosError
      console.error('[SunshinePairingService] Failed to unpair client:', axiosError.message)

      if (axiosError.code === 'ECONNREFUSED') {
        return { success: false, error: 'Sunshine n\'est pas accessible' }
      }

      return { success: false, error: axiosError.message }
    }
  }

  /**
   * Récupère le nom du serveur Sunshine depuis la config
   */
  async getServerName(): Promise<string> {
    const endpoint = `${this.baseUrl}/api/config`

    try {
      const response = await axios.get(endpoint, {
        timeout: this.timeout,
        httpsAgent: this.httpsAgent,
        headers: this.getHeaders(),
        validateStatus: () => true,
      })

      if (response.status === 200 && response.data) {
        const data = response.data as Record<string, unknown>
        // Sunshine config key for server name
        return String(data.sunshine_name || data.name || 'Sunshine')
      }

      return 'Sunshine'

    } catch (error: unknown) {
      console.error('[SunshinePairingService] Failed to get server name:', error)
      return 'Sunshine'
    }
  }

  /**
   * Définit le nom du serveur Sunshine
   * Note: Nécessite probablement un restart de Sunshine pour prendre effet
   */
  async setServerName(name: string): Promise<ClientOperationResult> {
    const endpoint = `${this.baseUrl}/api/config`

    try {
      const response = await axios.post(endpoint,
        { sunshine_name: name },
        {
          timeout: this.timeout,
          httpsAgent: this.httpsAgent,
          headers: {
            ...this.getHeaders(),
            'Content-Type': 'application/json',
          },
          validateStatus: () => true,
        }
      )

      console.log('[SunshinePairingService] setServerName response:', response.status, response.data)

      if (response.status === 200) {
        return { success: true }
      }

      if (response.status === 401 || response.status === 403) {
        return { success: false, error: 'Authentification requise' }
      }

      return { success: false, error: `Erreur: ${response.status}` }

    } catch (error: unknown) {
      const axiosError = error as AxiosError
      console.error('[SunshinePairingService] Failed to set server name:', axiosError.message)

      return { success: false, error: axiosError.message }
    }
  }
}

// Singleton instance
export const sunshinePairingService = new SunshinePairingService()
