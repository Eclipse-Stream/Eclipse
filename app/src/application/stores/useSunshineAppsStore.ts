// useSunshineAppsStore.ts - Story 7.2: Store pour les applications Sunshine
// Gère: CRUD apps, état de chargement, protection Eclipse app

import { create } from "zustand";
import type { SunshineApp, CreateAppData } from "@domain/types";
import { APP_CONSTANTS } from "@domain/types";

/**
 * Interface du store Sunshine Apps (Story 7.2)
 * Simplifié: toutes les apps créées via Eclipse ont les scripts Eclipse de base
 */
interface SunshineAppsStore {
  // === État ===
  /** Liste des applications Sunshine */
  apps: SunshineApp[];
  /** Chargement en cours */
  isLoading: boolean;
  /** Dernière erreur */
  error: string | null;

  // === Actions CRUD ===
  /**
   * Charge les applications depuis le repository via IPC
   */
  loadApps: () => Promise<void>;

  /**
   * Ajoute une nouvelle application avec scripts Eclipse
   * @param data Données de création (nom, exePath optionnel, icône optionnelle)
   */
  addApp: (data: CreateAppData) => Promise<void>;

  /**
   * Met à jour une application existante
   * @param name Nom de l'application à modifier
   * @param updates Champs à mettre à jour
   */
  updateApp: (name: string, updates: Partial<SunshineApp>) => Promise<void>;

  /**
   * Supprime une application
   * @param name Nom de l'application à supprimer
   * @throws Refuse si c'est l'application Eclipse
   */
  deleteApp: (name: string) => Promise<void>;

  // === Helpers ===
  /**
   * Récupère une application par son nom
   */
  getAppByName: (name: string) => SunshineApp | undefined;

  /**
   * Vérifie si c'est l'application Eclipse (non supprimable)
   */
  isEclipseApp: (name: string) => boolean;

  /**
   * Vérifie si l'app est gérée par Eclipse (a un marqueur ECLIPSE_MANAGED_APP dans prep-cmd)
   */
  isEclipseManagedApp: (app: SunshineApp) => boolean;

  // === Actions État ===
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useSunshineAppsStore = create<SunshineAppsStore>()((set, get) => ({
  // === État initial ===
  apps: [],
  isLoading: false,
  error: null,

  // === Actions CRUD ===
  loadApps: async () => {
    const { setLoading, setError } = get();
    setLoading(true);
    setError(null);

    try {
      const result = await window.electronAPI.sunshineApps.read();
      set({ apps: result.apps ?? [] });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur de chargement des apps";
      setError(message);
      console.error("[SunshineAppsStore] loadApps error:", error);
    } finally {
      setLoading(false);
    }
  },

  addApp: async (data: CreateAppData) => {
    const { setLoading, setError, loadApps } = get();
    setLoading(true);
    setError(null);

    try {
      // Simplifié: toutes les apps Eclipse ont les scripts de base
      // Le script détecte la config active automatiquement
      const prepCmd = await window.electronAPI.scripts.generatePrepCmd();
      const workingDir = data.exePath ? data.exePath.split(/[/\\]/).slice(0, -1).join("\\") : "";

      const newApp: SunshineApp = {
        name: data.name,
        cmd: data.exePath || "",
        "image-path": data.iconBase64 || "",
        "working-dir": workingDir,
        "prep-cmd": prepCmd,
        detached: [],
        output: "", // Pas d'output fixe - la config active détermine l'écran
        "exclude-global-prep-cmd": "false",
        elevated: "false",
        "auto-detach": "true",
        "wait-all": "true",
        "exit-timeout": "5",
      };

      const result = await window.electronAPI.sunshineApps.add(newApp);

      if (!result.success) {
        throw new Error(result.error || "Échec de l'ajout de l'application");
      }

      // Recharger la liste pour avoir l'état synchronisé
      await loadApps();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur lors de l'ajout";
      setError(message);
      console.error("[SunshineAppsStore] addApp error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  },

  updateApp: async (name: string, updates: Partial<SunshineApp>) => {
    const { setLoading, setError, loadApps } = get();
    setLoading(true);
    setError(null);

    try {
      const result = await window.electronAPI.sunshineApps.update(name, updates);

      if (!result.success) {
        throw new Error(result.error || "Échec de la mise à jour");
      }

      // Recharger la liste pour avoir l'état synchronisé
      await loadApps();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur lors de la mise à jour";
      setError(message);
      console.error("[SunshineAppsStore] updateApp error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  },

  deleteApp: async (name: string) => {
    const { isEclipseApp, setLoading, setError, loadApps } = get();

    // Protection: Refuser la suppression de l'app Eclipse
    if (isEclipseApp(name)) {
      const errorMsg = `L'application "${APP_CONSTANTS.ECLIPSE_APP_NAME}" ne peut pas être supprimée`;
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    setLoading(true);
    setError(null);

    try {
      const result = await window.electronAPI.sunshineApps.delete(name);

      if (!result.success) {
        throw new Error(result.error || "Échec de la suppression");
      }

      // Recharger la liste pour avoir l'état synchronisé
      await loadApps();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur lors de la suppression";
      setError(message);
      console.error("[SunshineAppsStore] deleteApp error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  },

  // === Helpers ===
  getAppByName: (name: string) => {
    const { apps } = get();
    return apps.find((app) => app.name === name);
  },

  isEclipseApp: (name: string) => {
    return name === APP_CONSTANTS.ECLIPSE_APP_NAME;
  },

  /**
   * Vérifie si l'app est gérée par Eclipse (a un marqueur ECLIPSE_MANAGED_APP dans prep-cmd)
   */
  isEclipseManagedApp: (app: SunshineApp) => {
    const prepCmd = app["prep-cmd"];
    if (!prepCmd || prepCmd.length === 0) return false;

    for (const cmd of prepCmd) {
      if (cmd.do?.includes("ECLIPSE_MANAGED_APP")) {
        return true;
      }
    }
    return false;
  },

  // === Actions État ===
  setLoading: (loading: boolean) => set({ isLoading: loading }),
  setError: (error: string | null) => set({ error }),
  reset: () => set({ apps: [], isLoading: false, error: null }),
}));
