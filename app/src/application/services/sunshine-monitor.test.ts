// Application Layer - SunshineMonitorService Tests
// Unit tests for SunshineMonitorService

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SunshineMonitorService } from './sunshine-monitor'
import { SunshineStatus } from '@domain/types'
import { useAppStore } from '@application/stores'

vi.mock('@application/stores', () => ({
  useAppStore: {
    getState: vi.fn(),
  },
}))

vi.mock('@application/stores/useSunshinePresetStore', () => ({
  useSunshinePresetStore: {
    getState: vi.fn().mockReturnValue({
      detectAndSyncActivePreset: vi.fn().mockResolvedValue(undefined),
    }),
  },
}))

describe('SunshineMonitorService', () => {
  let service: SunshineMonitorService
  let setSunshineStatusMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    service = new SunshineMonitorService()
    setSunshineStatusMock = vi.fn()
    
    vi.mocked(useAppStore.getState).mockReturnValue({
      setSunshineStatus: setSunshineStatusMock,
    } as any)

    global.window = {
      electronAPI: {
        sunshine: {
          getStatus: vi.fn().mockResolvedValue(SunshineStatus.ONLINE),
          start: vi.fn().mockResolvedValue({ success: true }),
        },
        tray: {
          setState: vi.fn().mockResolvedValue({ success: true }),
        },
        recovery: {
          checkAndCleanup: vi.fn().mockResolvedValue({ recovered: false }),
        },
      },
    } as any

    vi.useFakeTimers()
  })

  afterEach(() => {
    service.stopPolling()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('startPolling', () => {
    it('should start polling and update store with status', async () => {
      await service.startPolling(1000)

      expect((window.electronAPI as any).sunshine.getStatus).toHaveBeenCalled()
      expect(setSunshineStatusMock).toHaveBeenCalledWith(SunshineStatus.ONLINE)
    })

    it('should poll at specified interval', async () => {
      await service.startPolling(1000)

      // Initial call
      expect((window.electronAPI as any).sunshine.getStatus).toHaveBeenCalledTimes(1)

      // Advance time by interval
      await vi.advanceTimersByTimeAsync(1000)
      
      expect((window.electronAPI as any).sunshine.getStatus).toHaveBeenCalledTimes(2)
      
      // Advance time again
      await vi.advanceTimersByTimeAsync(1000)
      
      expect((window.electronAPI as any).sunshine.getStatus).toHaveBeenCalledTimes(3)
    })

    it('should not start polling if already polling', async () => {
      await service.startPolling(1000)
      await service.startPolling(1000)

      expect((window.electronAPI as any).sunshine.getStatus).toHaveBeenCalledTimes(1)
    })

    it('should handle errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked((window.electronAPI as any).sunshine.getStatus).mockRejectedValueOnce(
        new Error('Test error')
      )

      await service.startPolling(1000)

      expect(consoleErrorSpy).toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })
  })

  describe('stopPolling', () => {
    it('should stop polling', async () => {
      await service.startPolling(1000)
      service.stopPolling()

      const callCount = vi.mocked((window.electronAPI as any).sunshine.getStatus).mock.calls.length

      vi.advanceTimersByTime(2000)
      await vi.runAllTimersAsync()

      expect((window.electronAPI as any).sunshine.getStatus).toHaveBeenCalledTimes(callCount)
    })
  })

  describe('isActive', () => {
    it('should return false when not polling', () => {
      expect(service.isActive()).toBe(false)
    })

    it('should return true when polling', async () => {
      await service.startPolling(1000)
      expect(service.isActive()).toBe(true)
    })

    it('should return false after stopping', async () => {
      await service.startPolling(1000)
      service.stopPolling()
      expect(service.isActive()).toBe(false)
    })
  })
})
