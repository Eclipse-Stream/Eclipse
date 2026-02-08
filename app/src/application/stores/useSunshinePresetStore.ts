// useSunshinePresetStore.ts - Story 5.1: Store pour les presets Sunshine
// Gère: CRUD presets, preset Eclipse Default, état actif

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  SunshinePreset,
  CreateSunshinePresetData,
  UpdateSunshinePresetData,
} from "@domain/types";
import { DEFAULT_SUNSHINE_PRESET_VALUES, DEFAULT_FPS, DEFAULT_BITRATE, DEFAULT_ENCODER_PROFILE } from "@domain/types";

// Génère un UUID pour les presets
function generateId(): string {
  return crypto.randomUUID();
}

// Preset Eclipse Default (lecture seule, non modifiable)
const ECLIPSE_DEFAULT_PRESET: SunshinePreset = {
  id: "eclipse-default",
  name: "Eclipse Default",
  type: "simple",
  display: {
    mode: "enable",
    resolutionStrategy: "moonlight",
    fps: DEFAULT_FPS,
    bitrate: DEFAULT_BITRATE,
    encoderProfile: DEFAULT_ENCODER_PROFILE,
  },
  audio: {
    mode: "moonlight",
  },
  network: {
    upnp: false,
  },
  inputs: {
    keyboard: true,
    mouse: true,
    gamepad: true,
  },
  isReadOnly: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

interface SunshinePresetStore {
  // === État ===
  /** Liste des presets (inclut Eclipse Default) */
  presets: SunshinePreset[];
  /** ID du preset actuellement actif (appliqué à Sunshine) */
  activePresetId: string | null;
  /** Chargement en cours */
  isLoading: boolean;

  // === Actions CRUD ===
  /**
   * Ajoute un nouveau preset
   * @returns Le preset créé
   */
  addPreset: (data: CreateSunshinePresetData) => SunshinePreset;

  /**
   * Met à jour un preset existant
   * Si le preset est actif, il sera réappliqué automatiquement
   * @throws Si le preset est en lecture seule
   */
  updatePreset: (id: string, data: UpdateSunshinePresetData) => Promise<void>;

  /**
   * Supprime un preset
   * @throws Si le preset est en lecture seule
   */
  deletePreset: (id: string) => void;

  /**
   * Récupère un preset par son ID
   */
  getPresetById: (id: string) => SunshinePreset | undefined;

  // === Actions Activation ===
  /**
   * Active un preset (l'applique à Sunshine)
   * Note: L'application réelle sera implémentée dans Story 5.5
   */
  activatePreset: (id: string) => Promise<void>;

  /**
   * Désactive le preset actif
   */
  deactivatePreset: () => void;

  // === Actions État ===
  setLoading: (loading: boolean) => void;

  /**
   * Réinitialise le store aux valeurs par défaut
   */
  reset: () => void;

  // === Actions Détection ===
  /**
   * Détecte si la config Sunshine actuelle correspond à un preset
   * Si oui, active ce preset. Sinon, désactive le preset actif.
   * Appelé quand Sunshine redémarre ou au démarrage de l'app.
   */
  detectAndSyncActivePreset: () => Promise<void>;
}

export const useSunshinePresetStore = create<SunshinePresetStore>()(
  persist(
    (set, get) => ({
      // === État initial ===
      presets: [ECLIPSE_DEFAULT_PRESET],
      activePresetId: null,
      isLoading: false,

      // === Actions CRUD ===
      addPreset: (data: CreateSunshinePresetData) => {
        const { presets } = get();
        const now = new Date().toISOString();

        // Deep clone des objets imbriqués pour éviter les mutations partagées
        const newPreset: SunshinePreset = {
          id: generateId(),
          name: data.name,
          type: data.type ?? DEFAULT_SUNSHINE_PRESET_VALUES.type,
          display: {
            mode: data.display?.mode ?? DEFAULT_SUNSHINE_PRESET_VALUES.display.mode,
            screenId: data.display?.screenId ?? DEFAULT_SUNSHINE_PRESET_VALUES.display.screenId,
            deviceId: data.display?.deviceId,
            resolutionStrategy: data.display?.resolutionStrategy ?? DEFAULT_SUNSHINE_PRESET_VALUES.display.resolutionStrategy,
            fps: data.display?.fps ?? DEFAULT_SUNSHINE_PRESET_VALUES.display.fps,
            bitrate: data.display?.bitrate ?? DEFAULT_SUNSHINE_PRESET_VALUES.display.bitrate,
            encoderProfile: data.display?.encoderProfile ?? DEFAULT_SUNSHINE_PRESET_VALUES.display.encoderProfile,
            // Deep clone de manualResolution si présent
            ...(data.display?.manualResolution && {
              manualResolution: { ...data.display.manualResolution },
            }),
            ...(data.display?.manualRefreshRate !== undefined && {
              manualRefreshRate: data.display.manualRefreshRate,
            }),
          },
          audio: {
            mode: data.audio?.mode ?? DEFAULT_SUNSHINE_PRESET_VALUES.audio.mode,
            deviceId: data.audio?.deviceId,
          },
          network: {
            upnp: data.network?.upnp ?? DEFAULT_SUNSHINE_PRESET_VALUES.network.upnp,
          },
          inputs: {
            keyboard: data.inputs?.keyboard ?? DEFAULT_SUNSHINE_PRESET_VALUES.inputs.keyboard,
            mouse: data.inputs?.mouse ?? DEFAULT_SUNSHINE_PRESET_VALUES.inputs.mouse,
            gamepad: data.inputs?.gamepad ?? DEFAULT_SUNSHINE_PRESET_VALUES.inputs.gamepad,
          },
          // Deep clone de expert si présent
          expert: data.expert ? { ...data.expert } : undefined,
          isReadOnly: false,
          createdAt: now,
          updatedAt: now,
        };

        console.log("[SunshinePresetStore] Adding preset:", newPreset.name, newPreset);

        const newPresets = [...presets, newPreset];
        console.log("[SunshinePresetStore] All presets after add:", newPresets.map(p => ({ id: p.id, name: p.name, fps: p.display.fps, bitrate: p.display.bitrate })));

        set({ presets: newPresets });
        
        // Exporter les presets pour les scripts DO/UNDO
        window.electronAPI.scripts.exportPresets(newPresets).catch(console.error);
        
        return newPreset;
      },

      updatePreset: async (id: string, data: UpdateSunshinePresetData) => {
        const { presets, activePresetId, activatePreset } = get();
        const preset = presets.find((p) => p.id === id);

        if (!preset) {
          throw new Error(`Preset ${id} not found`);
        }

        if (preset.isReadOnly) {
          throw new Error(`Preset "${preset.name}" is read-only`);
        }

        console.log("[SunshinePresetStore] Updating preset:", id, data);

        const now = new Date().toISOString();

        const updatedPresets = presets.map((p) => {
          if (p.id !== id) return p;

          // Deep clone pour éviter les mutations partagées
          const updated: SunshinePreset = {
            ...p,
            name: data.name ?? p.name,
            type: data.type ?? p.type,
            display: {
              ...p.display,
              ...(data.display && {
                mode: data.display.mode ?? p.display.mode,
                screenId: data.display.screenId ?? p.display.screenId,
                deviceId: data.display.deviceId ?? p.display.deviceId,
                resolutionStrategy: data.display.resolutionStrategy ?? p.display.resolutionStrategy,
                fps: data.display.fps ?? p.display.fps,
                bitrate: data.display.bitrate ?? p.display.bitrate,
                encoderProfile: data.display.encoderProfile ?? p.display.encoderProfile,
                // Deep clone de manualResolution si présent
                ...(data.display.manualResolution && {
                  manualResolution: { ...data.display.manualResolution },
                }),
                ...(data.display.manualRefreshRate !== undefined && {
                  manualRefreshRate: data.display.manualRefreshRate,
                }),
              }),
            },
            audio: data.audio
              ? { mode: data.audio.mode ?? p.audio.mode, deviceId: data.audio.deviceId ?? p.audio.deviceId }
              : { ...p.audio },
            network: data.network
              ? { upnp: data.network.upnp ?? p.network.upnp }
              : { ...p.network },
            inputs: data.inputs
              ? {
                  keyboard: data.inputs.keyboard ?? p.inputs.keyboard,
                  mouse: data.inputs.mouse ?? p.inputs.mouse,
                  gamepad: data.inputs.gamepad ?? p.inputs.gamepad,
                }
              : { ...p.inputs },
            // Deep clone de expert si présent
            expert: "expert" in data
              ? (data.expert ? { ...data.expert } : undefined)
              : (p.expert ? { ...p.expert } : undefined),
            updatedAt: now,
          };

          console.log("[SunshinePresetStore] Updated preset:", updated.name, updated);
          return updated;
        });

        console.log("[SunshinePresetStore] All presets after update:", updatedPresets.map(p => ({ id: p.id, name: p.name, fps: p.display.fps })));

        set({ presets: updatedPresets });
        
        // Exporter les presets pour les scripts DO/UNDO
        window.electronAPI.scripts.exportPresets(updatedPresets).catch(console.error);

        // Fix 5.6: Si le preset modifié est actif, le réappliquer pour que les changements prennent effet
        if (activePresetId === id) {
          console.log("[SunshinePresetStore] Preset actif modifié, réapplication...");
          await activatePreset(id);
        }
      },

      deletePreset: (id: string) => {
        const { presets, activePresetId } = get();
        const preset = presets.find((p) => p.id === id);

        if (!preset) {
          throw new Error(`Preset ${id} not found`);
        }

        if (preset.isReadOnly) {
          throw new Error(`Preset "${preset.name}" cannot be deleted`);
        }

        // Si le preset supprimé est actif, désactiver
        if (activePresetId === id) {
          set({ activePresetId: null });
        }

        const remainingPresets = presets.filter((p) => p.id !== id);
        set({ presets: remainingPresets });
        
        // Exporter les presets pour les scripts DO/UNDO
        window.electronAPI.scripts.exportPresets(remainingPresets).catch(console.error);
      },

      getPresetById: (id: string) => {
        const { presets } = get();
        return presets.find((p) => p.id === id);
      },

      // === Actions Activation ===
      activatePreset: async (id: string) => {
        const { presets, setLoading } = get();
        const preset = presets.find((p) => p.id === id);

        if (!preset) {
          throw new Error(`Preset ${id} not found`);
        }

        setLoading(true);
        try {
          console.log("[SunshinePresetStore] Activating preset:", preset.name);

          // Story 5.5: Appliquer le preset via IPC (Flush + Apply + Restart)
          // D'abord, récupérer la config actuelle si le preset a des champs "keep"
          let currentConfig: Record<string, string> | undefined;
          if (preset.expert) {
            const hasKeepFields = Object.values(preset.expert).some(
              (v) => v === "__KEEP__"
            );
            if (hasKeepFields) {
              const detectResult = await window.electronAPI.sunshinePreset.detectConfig();
              if (detectResult.success && detectResult.config) {
                currentConfig = detectResult.config;
              }
            }
          }

          // Appliquer le preset
          const result = await window.electronAPI.sunshinePreset.apply({
            preset,
            currentConfig,
          });

          if (!result.success) {
            console.error("[SunshinePresetStore] Failed to apply preset:", result.error);
            throw new Error(result.error || "Erreur lors de l'application du preset");
          }

          console.log("[SunshinePresetStore] Preset applied successfully");
          set({ activePresetId: id });

          // Exporter la config Sunshine actuelle pour les scripts DO/UNDO
          // Le script pourra ainsi savoir quelle config est active
          const sunshineConfig = await window.electronAPI.sunshineConfig.readConfig();
          await window.electronAPI.scripts.exportSunshineConfig(sunshineConfig);

          // Exporter l'ID du preset actif pour les scripts
          await window.electronAPI.scripts.exportActivePreset(id);
        } finally {
          setLoading(false);
        }
      },

      deactivatePreset: () => {
        set({ activePresetId: null });
        // Exporter null pour indiquer qu'aucun preset n'est actif
        window.electronAPI.scripts.exportActivePreset(null).catch(console.error);
      },

      // === Actions État ===
      setLoading: (loading: boolean) => set({ isLoading: loading }),

      reset: () => {
        set({
          presets: [ECLIPSE_DEFAULT_PRESET],
          activePresetId: null,
          isLoading: false,
        });
      },

      // === Actions Détection ===
      detectAndSyncActivePreset: async () => {
        const { presets, activePresetId } = get();

        try {
          console.log("[SunshinePresetStore] Detecting active preset from Sunshine config...");

          // 1. Lire la config Sunshine actuelle
          const sunshineConfig = await window.electronAPI.sunshineConfig.readConfig();
          if (!sunshineConfig || Object.keys(sunshineConfig).length === 0) {
            console.log("[SunshinePresetStore] No Sunshine config found");
            return;
          }

          console.log("[SunshinePresetStore] Current Sunshine config:", {
            output_name: sunshineConfig.output_name || "(empty)",
            dd_configuration_option: sunshineConfig.dd_configuration_option || "(empty)",
            fps: sunshineConfig.fps || sunshineConfig.minimum_fps_target || "60",
            max_bitrate: sunshineConfig.max_bitrate || "35",
          });

          // 2. Exporter la config Sunshine pour les scripts DO/UNDO
          // Ceci garantit que le script DO a toujours la config réelle, même si modifiée via localhost
          await window.electronAPI.scripts.exportSunshineConfig(sunshineConfig);

          // 3. Chercher TOUS les presets correspondants via IPC
          const result = await window.electronAPI.sunshinePreset.findMatchingPreset(presets);

          if (!result.success) {
            console.error("[SunshinePresetStore] Find matching preset failed:", result.error);
            return;
          }

          const matchingIds = result.presetIds || [];
          console.log(`[SunshinePresetStore] Found ${matchingIds.length} matching presets:`, matchingIds);

          if (matchingIds.length === 0) {
            // Aucun preset ne correspond → config manuelle
            if (activePresetId !== null) {
              console.log("[SunshinePresetStore] Config doesn't match any preset, clearing active preset");
              set({ activePresetId: null });
              window.electronAPI.scripts.exportActivePreset(null).catch(console.error);
            } else {
              console.log("[SunshinePresetStore] No preset was active, nothing to clear");
            }
          } else if (matchingIds.length === 1) {
            // Un seul preset correspond → l'utiliser
            const newActiveId = matchingIds[0];
            if (activePresetId !== newActiveId) {
              console.log(`[SunshinePresetStore] Config matches single preset: ${newActiveId}`);
              set({ activePresetId: newActiveId });
              window.electronAPI.scripts.exportActivePreset(newActiveId).catch(console.error);
            } else {
              console.log("[SunshinePresetStore] Already synced with correct preset");
            }
          } else {
            // Plusieurs presets correspondent → garder le preset actif s'il est dans la liste
            if (activePresetId && matchingIds.includes(activePresetId)) {
              console.log(`[SunshinePresetStore] Multiple matches, keeping current active preset: ${activePresetId}`);
              // Le preset actif est dans la liste, on le garde
            } else {
              // Prendre le premier de la liste
              const newActiveId = matchingIds[0];
              console.log(`[SunshinePresetStore] Multiple matches, selecting first: ${newActiveId}`);
              set({ activePresetId: newActiveId });
              window.electronAPI.scripts.exportActivePreset(newActiveId).catch(console.error);
            }
          }
        } catch (error) {
          console.error("[SunshinePresetStore] Failed to detect active preset:", error);
        }
      },
    }),
    {
      name: "eclipse-sunshine-preset-store",
      // Persister les presets et l'ID actif
      partialize: (state) => ({
        presets: state.presets,
        activePresetId: state.activePresetId,
      }),
      // Merge avec le preset Eclipse Default si absent
      // Bug Fix 6: Activer Eclipse Default au premier lancement
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<SunshinePresetStore>;
        const presets = persisted.presets ?? [];

        // S'assurer que Eclipse Default est toujours présent
        const hasEclipseDefault = presets.some(
          (p) => p.id === "eclipse-default"
        );
        const mergedPresets = hasEclipseDefault
          ? presets
          : [ECLIPSE_DEFAULT_PRESET, ...presets];

        // Bug Fix 6: Premier lancement = pas de state persisté = activer Eclipse Default
        // Si activePresetId n'est pas défini dans le state persisté, c'est le premier lancement
        const activePresetId = persisted.activePresetId !== undefined
          ? persisted.activePresetId
          : "eclipse-default";  // Premier lancement → activer Eclipse Default

        console.log("[SunshinePresetStore] Merge - activePresetId:", activePresetId, 
          persisted.activePresetId === undefined ? "(first launch)" : "(from persisted)");

        return {
          ...currentState,
          ...persisted,
          presets: mergedPresets,
          activePresetId,
        };
      },
    }
  )
);
