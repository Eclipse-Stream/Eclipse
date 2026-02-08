// useDisplayStore.ts - Story 3.2/3.3/3.4: Store unifié pour la gestion des écrans
// Gère: écrans physiques, écran Eclipse, presets utilisateur, état actif

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  VDDStatus,
  PhysicalScreen,
  EclipseScreen,
  ScreenPreset,
  CreatePresetData,
  UpdatePresetData,
} from "@domain/types";

// Génère un UUID simple pour les presets
function generateId(): string {
  return crypto.randomUUID();
}

// Écran Eclipse par défaut (hardcodé, non modifiable)
const DEFAULT_ECLIPSE_SCREEN: EclipseScreen = {
  type: "eclipse",
  name: "Écran Eclipse",
  deviceId: "", // Sera rempli dynamiquement avec le Device ID VDD
  resolution: { width: 1920, height: 1080 },
  refreshRate: 60,
};

interface DisplayStore {
  // === État VDD ===
  vddStatus: VDDStatus;
  isLoading: boolean;
  vddDeviceId: string | null; // Device ID du VDD (partagé par Eclipse + presets)

  // === Écrans ===
  physicalScreens: PhysicalScreen[];
  eclipseScreen: EclipseScreen;
  presets: ScreenPreset[];

  // === État actif ===
  // ID du preset actuellement allumé (null = aucun VDD actif)
  activePresetId: string | null;

  // === Actions VDD ===
  setVddStatus: (status: VDDStatus) => void;
  setLoading: (loading: boolean) => void;
  refreshVddStatus: () => Promise<void>;
  refreshDeviceId: () => Promise<void>;
  disableVdd: () => Promise<void>;

  // === Actions Écrans ===
  refreshPhysicalScreens: () => Promise<void>;

  // === Actions Presets CRUD (Story 3.3) ===
  addPreset: (data: CreatePresetData) => ScreenPreset;
  updatePreset: (id: string, data: UpdatePresetData) => void;
  deletePreset: (id: string) => void;

  // === Actions Activation (Story 3.4) ===
  /**
   * Active un preset (allume le VDD avec sa résolution)
   * - Si VDD OFF → enable + setResolution
   * - Si VDD ON (autre preset) → updateConfig (bascule fluide)
   */
  activatePreset: (presetId: string) => Promise<void>;

  /**
   * Désactive le preset actif (éteint le VDD)
   */
  deactivatePreset: () => Promise<void>;
}

export const useDisplayStore = create<DisplayStore>()(
  persist(
    (set, get) => ({
      // === État initial ===
      vddStatus: "disabled",
      isLoading: false,
      vddDeviceId: null,
      physicalScreens: [],
      eclipseScreen: DEFAULT_ECLIPSE_SCREEN,
      presets: [],
      activePresetId: null,

      // === Mutations VDD ===
      setVddStatus: (status) => set({ vddStatus: status }),
      setLoading: (loading) => set({ isLoading: loading }),

      refreshVddStatus: async () => {
        try {
          const status = await window.electronAPI.vdd.getStatus();
          set({ vddStatus: status });

          // Toujours récupérer le Device ID VDD (même si désactivé, l'ID est persisté)
          const deviceGuid = await window.electronAPI.vdd.getDeviceGUID();
          if (deviceGuid) {
            const { eclipseScreen, presets } = get();
            
            // Mettre à jour l'écran Eclipse avec le device_id VDD
            const updatedEclipseScreen = {
              ...eclipseScreen,
              deviceId: deviceGuid,
            };
            
            // Mettre à jour tous les presets avec le même device_id VDD
            const updatedPresets = presets.map((preset) => ({
              ...preset,
              deviceId: deviceGuid,
            }));
            
            set({
              vddDeviceId: deviceGuid,
              eclipseScreen: updatedEclipseScreen,
              presets: updatedPresets,
            });
          }

          // Si VDD désactivé, reset activePresetId
          if (status === "disabled") {
            set({ activePresetId: null });
          }
        } catch (error) {
          console.error("[DisplayStore] Failed to refresh VDD status:", error);
          set({ vddStatus: "disabled", activePresetId: null });
        }
      },

      refreshDeviceId: async () => {
        const { setLoading } = get();
        setLoading(true);
        try {
          // Appelle le backend pour relancer la détection complète
          // (Enable VDD → Lire logs Sunshine → Récupérer ID → Disable VDD)
          const deviceId = await window.electronAPI.vdd.refreshDeviceId();
          
          if (deviceId) {
            const { eclipseScreen, presets } = get();
            
            // Mettre à jour l'écran Eclipse avec le nouveau device_id
            const updatedEclipseScreen = {
              ...eclipseScreen,
              deviceId: deviceId,
            };
            
            // Mettre à jour tous les presets avec le même device_id
            const updatedPresets = presets.map((preset) => ({
              ...preset,
              deviceId: deviceId,
            }));
            
            set({
              vddDeviceId: deviceId,
              eclipseScreen: updatedEclipseScreen,
              presets: updatedPresets,
            });
          }
          
          // Rafraîchir aussi les écrans physiques
          const screens = await window.electronAPI.display.getPhysicalDisplays();
          set({ physicalScreens: screens });
        } catch (error) {
          console.error("[DisplayStore] Failed to refresh device ID:", error);
        } finally {
          setLoading(false);
        }
      },

      disableVdd: async () => {
        const { setLoading, refreshVddStatus } = get();
        setLoading(true);
        try {
          const result = await window.electronAPI.vdd.disable();
          if (!result.success) {
            throw new Error(result.error || "Failed to disable VDD");
          }
          set({ activePresetId: null });
          await refreshVddStatus();
        } finally {
          setLoading(false);
        }
      },

      // === Actions Écrans ===
      refreshPhysicalScreens: async () => {
        try {
          const screens = await window.electronAPI.display.getPhysicalDisplays();
          set({ physicalScreens: screens });
        } catch (error) {
          console.error("[DisplayStore] Failed to refresh physical screens:", error);
        }
      },

      // === Actions Presets CRUD ===
      addPreset: (data: CreatePresetData) => {
        const { presets, vddDeviceId } = get();
        const now = new Date().toISOString();

        const newPreset: ScreenPreset = {
          type: "preset",
          id: generateId(),
          name: data.name,
          deviceId: vddDeviceId || "", // Même Device ID que le VDD
          resolution: data.resolution,
          refreshRate: data.refreshRate,
          createdAt: now,
          updatedAt: now,
        };

        set({ presets: [...presets, newPreset] });
        return newPreset;
      },

      updatePreset: (id: string, data: UpdatePresetData) => {
        const { presets } = get();
        const now = new Date().toISOString();

        set({
          presets: presets.map((preset) =>
            preset.id === id
              ? {
                  ...preset,
                  ...data,
                  updatedAt: now,
                }
              : preset
          ),
        });
      },

      deletePreset: (id: string) => {
        const { presets, activePresetId, disableVdd } = get();

        // Si le preset supprimé est actif, désactiver le VDD
        if (activePresetId === id) {
          disableVdd();
        }

        set({ presets: presets.filter((preset) => preset.id !== id) });
      },

      // === Actions Activation (Story 3.4) ===
      activatePreset: async (presetId: string) => {
        const { presets, vddStatus, setLoading, refreshVddStatus } = get();

        const preset = presets.find((p) => p.id === presetId);
        if (!preset) {
          throw new Error(`Preset ${presetId} not found`);
        }

        setLoading(true);
        try {
          const resolutionParams = {
            width: preset.resolution.width,
            height: preset.resolution.height,
            refreshRate: preset.refreshRate,
          };

          if (vddStatus === "enabled") {
            // Bascule intelligente: VDD déjà ON → juste changer la résolution
            console.log("[DisplayStore] VDD already ON, using updateConfig (bascule)");
            const result = await window.electronAPI.vdd.updateConfig(resolutionParams);
            if (!result.success) {
              throw new Error(result.error || "Failed to update config");
            }
          } else {
            // VDD OFF → enable puis setResolution
            console.log("[DisplayStore] VDD OFF, enabling and setting resolution");
            const enableResult = await window.electronAPI.vdd.enable();
            if (!enableResult.success) {
              throw new Error(enableResult.error || "Failed to enable VDD");
            }

            // Attendre que Windows détecte l'écran
            await new Promise((resolve) => setTimeout(resolve, 1500));

            const resResult = await window.electronAPI.vdd.setResolution(resolutionParams);
            if (!resResult.success) {
              throw new Error(resResult.error || "Failed to set resolution");
            }
          }

          // Mettre à jour l'état
          set({ activePresetId: presetId });
          await refreshVddStatus();
        } finally {
          setLoading(false);
        }
      },

      deactivatePreset: async () => {
        const { disableVdd } = get();
        await disableVdd();
      },
    }),
    {
      name: "eclipse-display-store",
      // Persister les presets, vddDeviceId ET activePresetId (pour TrayPanel - Story 9.3)
      partialize: (state) => ({
        presets: state.presets,
        vddDeviceId: state.vddDeviceId,
        activePresetId: state.activePresetId,
      }),
    }
  )
);
