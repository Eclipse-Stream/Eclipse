// Platform detection utilities (Story 1.2)
// Used for OS-specific features like Mica/Acrylic effects

import os from 'node:os'

/**
 * Detect if running on Windows 11 (build >= 22000)
 * Windows 11 supports Mica/Acrylic background effects
 */
export function isWindows11(): boolean {
  if (process.platform !== 'win32') return false
  const release = os.release() // e.g., "10.0.22621"
  const parts = release.split('.')
  if (parts.length >= 3) {
    const build = parseInt(parts[2], 10)
    return build >= 22000
  }
  return false
}

/**
 * Detect if running on Windows 10
 */
export function isWindows10(): boolean {
  if (process.platform !== 'win32') return false
  return !isWindows11()
}

/**
 * Check if current OS supports transparency effects
 * Windows 11: Full Mica/Acrylic support
 * Windows 10: Limited transparency (no Mica)
 */
export function supportsTransparency(): boolean {
  return process.platform === 'win32'
}
