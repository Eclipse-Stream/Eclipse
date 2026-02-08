// Infrastructure Layer - SunshineClient Tests
// Unit tests for SunshineClient

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SunshineClient } from './sunshine-client'
import { SunshineStatus } from '@domain/types'
import axios from 'axios'

vi.mock('axios')

describe('SunshineClient', () => {
  let client: SunshineClient

  beforeEach(() => {
    client = new SunshineClient('https://localhost:47990', 1000)
    vi.clearAllMocks()
    // Suppress console.log in tests
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('setCredentials', () => {
    it('should set Authorization header in requests', async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        status: 200,
        data: {},
      } as any)

      client.setCredentials('user', 'pass')
      await client.getStatus()

      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Basic dXNlcjpwYXNz', // user:pass in base64
          }),
        })
      )
    })
  })

  describe('getStatus', () => {
    it('should return ONLINE when API responds with 200 OK', async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        status: 200,
        data: {},
      } as any)

      const status = await client.getStatus()
      expect(status).toBe(SunshineStatus.ONLINE)
    })

    it('should return AUTH_REQUIRED when API responds with 401', async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        status: 401,
        data: {},
      } as any)

      const status = await client.getStatus()
      expect(status).toBe(SunshineStatus.AUTH_REQUIRED)
    })

    it('should return AUTH_REQUIRED when API responds with 403', async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        status: 403,
        data: {},
      } as any)

      const status = await client.getStatus()
      expect(status).toBe(SunshineStatus.AUTH_REQUIRED)
    })

    it('should return OFFLINE when connection is refused', async () => {
      const error: any = new Error('connect ECONNREFUSED')
      error.code = 'ECONNREFUSED'
      vi.mocked(axios.get).mockRejectedValueOnce(error)

      const status = await client.getStatus()
      expect(status).toBe(SunshineStatus.OFFLINE)
    })

    it('should return OFFLINE when connection times out', async () => {
      const error: any = new Error('timeout')
      error.code = 'ETIMEDOUT'
      vi.mocked(axios.get).mockRejectedValueOnce(error)

      const status = await client.getStatus()
      expect(status).toBe(SunshineStatus.OFFLINE)
    })

    it('should return OFFLINE when request is aborted', async () => {
      const error: any = new Error('aborted')
      error.code = 'ECONNABORTED'
      vi.mocked(axios.get).mockRejectedValueOnce(error)

      const status = await client.getStatus()
      expect(status).toBe(SunshineStatus.OFFLINE)
    })

    it('should return OFFLINE when connection is reset', async () => {
      const error: any = new Error('connection reset')
      error.code = 'ECONNRESET'
      vi.mocked(axios.get).mockRejectedValueOnce(error)

      const status = await client.getStatus()
      expect(status).toBe(SunshineStatus.OFFLINE)
    })

    it('should return UNKNOWN for unexpected status codes', async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        status: 500,
        data: {},
      } as any)

      const status = await client.getStatus()
      expect(status).toBe(SunshineStatus.UNKNOWN)
    })

    it('should return UNKNOWN for unexpected errors', async () => {
      const error: any = new Error('Unexpected error')
      error.code = 'UNKNOWN_ERROR'
      vi.mocked(axios.get).mockRejectedValueOnce(error)

      const status = await client.getStatus()
      expect(status).toBe(SunshineStatus.UNKNOWN)
    })
  })
})
