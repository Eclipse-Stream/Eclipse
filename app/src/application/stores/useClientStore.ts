// useClientStore.ts - Store Zustand pour les clients Moonlight (Epic 6)
// Gère l'état des clients appairés, pairing, et nom du serveur

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { MoonlightClient } from '@domain/types';

interface ClientStoreState {
  // Liste des clients appairés
  clients: MoonlightClient[];
  isLoadingClients: boolean;
  clientsError: string | null;

  // Nom du serveur Sunshine
  serverName: string;
  isLoadingServerName: boolean;

  // Actions
  fetchClients: () => Promise<void>;
  pairClient: (pin: string, deviceName: string) => Promise<{ success: boolean; error?: string }>;
  unpairClient: (uuid: string) => Promise<{ success: boolean; error?: string }>;
  fetchServerName: () => Promise<void>;
  setServerName: (name: string) => Promise<{ success: boolean; error?: string }>;
}

export const useClientStore = create<ClientStoreState>()(
  devtools(
    (set, get) => ({
      // Initial state
      clients: [],
      isLoadingClients: false,
      clientsError: null,
      serverName: 'Sunshine',
      isLoadingServerName: false,

      // Récupère la liste des clients appairés (Story 6.1 - AC1)
      fetchClients: async () => {
        set({ isLoadingClients: true, clientsError: null }, false, 'fetchClients/start');

        try {
          const result = await window.electronAPI.clients.list();

          if (result.success) {
            set({ clients: result.clients, isLoadingClients: false }, false, 'fetchClients/success');
          } else {
            set({
              clientsError: result.error || 'Erreur inconnue',
              isLoadingClients: false
            }, false, 'fetchClients/error');
          }
        } catch (error) {
          console.error('[ClientStore] fetchClients error:', error);
          set({
            clientsError: 'Erreur de communication',
            isLoadingClients: false
          }, false, 'fetchClients/exception');
        }
      },

      // Appaire un client via PIN (Story 6.2)
      pairClient: async (pin: string, deviceName: string) => {
        try {
          const result = await window.electronAPI.clients.pair(pin, deviceName);

          if (result.success) {
            // Rafraîchir la liste après appairage réussi (AC4)
            await get().fetchClients();
          }

          return { success: result.success, error: result.error };
        } catch (error) {
          console.error('[ClientStore] pairClient error:', error);
          return { success: false, error: 'Erreur de communication' };
        }
      },

      // Supprime un client appairé (Story 6.3)
      unpairClient: async (uuid: string) => {
        try {
          const result = await window.electronAPI.clients.unpair(uuid);

          if (result.success) {
            // Mise à jour optimiste + rafraîchissement
            set(
              (state) => ({ clients: state.clients.filter((c) => c.uuid !== uuid) }),
              false,
              'unpairClient/optimistic'
            );
            // Rafraîchir pour s'assurer de la synchronisation
            await get().fetchClients();
          }

          return { success: result.success, error: result.error };
        } catch (error) {
          console.error('[ClientStore] unpairClient error:', error);
          return { success: false, error: 'Erreur de communication' };
        }
      },

      // Récupère le nom du serveur (Story 6.4 - AC1)
      fetchServerName: async () => {
        set({ isLoadingServerName: true }, false, 'fetchServerName/start');

        try {
          const name = await window.electronAPI.clients.getServerName();
          set({ serverName: name, isLoadingServerName: false }, false, 'fetchServerName/success');
        } catch (error) {
          console.error('[ClientStore] fetchServerName error:', error);
          set({ isLoadingServerName: false }, false, 'fetchServerName/error');
        }
      },

      // Définit le nom du serveur (Story 6.4 - AC2)
      setServerName: async (name: string) => {
        try {
          const result = await window.electronAPI.clients.setServerName(name);

          if (result.success) {
            set({ serverName: name }, false, 'setServerName/success');
          }

          return { success: result.success, error: result.error };
        } catch (error) {
          console.error('[ClientStore] setServerName error:', error);
          return { success: false, error: 'Erreur de communication' };
        }
      },
    }),
    { name: 'client-store' }
  )
);
