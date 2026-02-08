// Domain Layer - ISunshineClient Interface
// Contract for Sunshine service communication

import type { SunshineStatus } from '@domain/types/sunshine'

export interface ISunshineClient {
  /**
   * Get the current status of the Sunshine service
   * @returns Promise resolving to the current SunshineStatus
   */
  getStatus(): Promise<SunshineStatus>

  /**
   * Set credentials for authentication
   * @param username Sunshine username
   * @param password Sunshine password
   */
  setCredentials(username: string, password: string): void

  /**
   * Update Sunshine configuration with new credentials
   * @param credentials New credentials to apply
   * @returns Promise resolving to success status
   */
  updateConfig(credentials: { username: string; password: string }): Promise<{ success: boolean }>
}
