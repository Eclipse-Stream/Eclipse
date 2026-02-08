// appStore.ts - Global application state with Zustand (Story 1.6)
// Manages current page navigation state with devtools middleware
//
// ARCHITECTURE NOTES:
// This store uses a simple flat structure for now, but is designed to be
// extensible for future features. When the store grows, consider splitting
// into slices using Zustand's slice pattern.
//
// FUTURE SLICES (to be implemented in upcoming Epics):
// - sunshineSlice: Sunshine service status and control (Epic 2)
// - vddSlice: Virtual Display Driver state (Epic 3)
// - presetsSlice: Screen and Sunshine presets (Epic 4-5)
// - clientsSlice: Paired Moonlight clients (Epic 6)
// - appsSlice: Sunshine applications management (Epic 7)
//
// SLICE PATTERN EXAMPLE:
// export const useAppStore = create<AppState>()(
//   devtools(
//     (...a) => ({
//       ...createNavigationSlice(...a),
//       ...createSunshineSlice(...a),
//       ...createVddSlice(...a),
//     }),
//     { name: 'eclipse-store' }
//   )
// );

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import i18n, { changeLanguage } from '../../i18n';
import type { Page, SunshineStatus } from '@domain/types';
import { credentialService } from '../services/credential-service';

// Sunshine Health types (Story 10.2)
export type SunshineHealthStatus = 'HEALTHY' | 'MISSING' | 'CORRUPTED';

export interface SunshineHealthResult {
  status: SunshineHealthStatus;
  missingFiles?: string[];
  sunshinePath?: string;
}

interface AppState {
  // Navigation State (Epic 1)
  currentPage: Page;
  setPage: (page: Page) => void;

  // Sunshine State (Epic 2 - Story 2.1)
  sunshineStatus: SunshineStatus | null;
  setSunshineStatus: (status: SunshineStatus) => void;
  fetchSunshineStatus: () => Promise<void>;

  // Sunshine Installation Health (Story 10.2)
  sunshineInstalled: boolean | null; // null = checking, true = installed, false = missing/corrupted
  sunshineHealthResult: SunshineHealthResult | null;
  setSunshineInstalled: (installed: boolean) => void;
  checkSunshineHealth: () => Promise<SunshineHealthResult>;

  // Credential State (Epic 2 - Story 2.4, 2.5)
  hasCredentials: boolean;
  username: string | null;
  needsReauth: boolean; // True when local credentials are out of sync with Sunshine
  checkCredentials: () => Promise<void>;
  clearCredentials: () => Promise<void>; // Force re-authentication by clearing stored credentials

  // Language State (Epic 10 - Story 10.4)
  language: string;
  setLanguage: (lang: string) => void;

  // Future state properties will be added here as the application grows:
  // vddState?: VddState;                    // Epic 3
  // screenPresets?: ScreenPreset[];         // Epic 4
  // sunshinePresets?: SunshinePreset[];     // Epic 5
  // pairedClients?: MoonlightClient[];      // Epic 6
  // applications?: SunshineApp[];           // Epic 7
}

export const useAppStore = create<AppState>()(
  devtools(
    (set) => ({
      currentPage: 'dashboard',
      setPage: (page) => set({ currentPage: page }, false, 'setPage'),
      sunshineStatus: null,
      setSunshineStatus: (status) => set({ sunshineStatus: status }, false, 'setSunshineStatus'),
      fetchSunshineStatus: async () => {
        try {
          const status = await window.electronAPI.sunshine.getStatus();
          set({ sunshineStatus: status }, false, 'fetchSunshineStatus');
        } catch (error) {
          console.error('[AppStore] Failed to fetch Sunshine status:', error);
        }
      },
      // Sunshine Health (Story 10.2)
      sunshineInstalled: null,
      sunshineHealthResult: null,
      setSunshineInstalled: (installed) => set({ sunshineInstalled: installed }, false, 'setSunshineInstalled'),
      checkSunshineHealth: async () => {
        try {
          const result = await window.electronAPI.sunshine.checkHealth() as SunshineHealthResult;
          const isInstalled = result.status === 'HEALTHY';
          set({
            sunshineInstalled: isInstalled,
            sunshineHealthResult: result,
          }, false, 'checkSunshineHealth');
          return result;
        } catch (error) {
          console.error('[AppStore] Failed to check Sunshine health:', error);
          const errorResult: SunshineHealthResult = { status: 'CORRUPTED' };
          set({
            sunshineInstalled: false,
            sunshineHealthResult: errorResult,
          }, false, 'checkSunshineHealth');
          return errorResult;
        }
      },
      // Credentials
      hasCredentials: false,
      username: null,
      needsReauth: false,
      checkCredentials: async () => {
        try {
          const creds = await credentialService.getCredentials();
          if (creds) {
            set({ hasCredentials: true, username: creds.username }, false, 'checkCredentials');
          } else {
            set({ hasCredentials: false, username: null, needsReauth: false }, false, 'checkCredentials');
          }
        } catch (error) {
          console.error('[AppStore] Failed to check credentials:', error);
        }
      },
      clearCredentials: async () => {
        try {
          await credentialService.clearCredentials();
          set({ hasCredentials: false, username: null, needsReauth: false }, false, 'clearCredentials');
        } catch (error) {
          console.error('[AppStore] Failed to clear credentials:', error);
        }
      },
      // Language (Story 10.4)
      language: i18n.language,
      setLanguage: (lang) => {
        changeLanguage(lang);
        set({ language: lang }, false, 'setLanguage');
      },
    }),
    { name: 'eclipse-store' }
  )
);
