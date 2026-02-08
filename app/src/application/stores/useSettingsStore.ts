// useSettingsStore.ts - Store pour les paramètres globaux de l'application
// Séparé des presets : paramètres UI, langue, nom Sunshine, etc.
// Persisté dans Local Storage pour survivre aux réinstallations

import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Langues supportées par l'application */
export type AppLanguage = "fr" | "en";

/** État des paramètres globaux */
interface SettingsState {
  // === Paramètres ===

  /** Langue de l'interface (null = pas encore choisi, afficher dialog) */
  language: AppLanguage | null;

  /** Nom du serveur Sunshine (null = pas encore choisi, afficher dialog) */
  sunshineName: string | null;

  /** Indique si l'onboarding complet (incluant welcome) a été fait */
  onboardingCompleted: boolean;

  // === Actions ===

  /** Définit la langue de l'application */
  setLanguage: (language: AppLanguage) => void;

  /** Définit le nom du serveur Sunshine */
  setSunshineName: (name: string) => void;

  /** Marque l'onboarding comme terminé */
  setOnboardingCompleted: () => void;

  /** Réinitialise les paramètres (pour tests) */
  reset: () => void;
}

/** Valeurs initiales (premier lancement) */
const INITIAL_STATE = {
  language: null as AppLanguage | null,
  sunshineName: null as string | null,
  onboardingCompleted: false,
};

/**
 * Store Zustand pour les paramètres globaux de l'application
 *
 * Utilisation:
 * ```tsx
 * const language = useSettingsStore((state) => state.language);
 * const setLanguage = useSettingsStore((state) => state.setLanguage);
 * ```
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // === État initial ===
      ...INITIAL_STATE,

      // === Actions ===
      setLanguage: (language: AppLanguage) => {
        console.log("[SettingsStore] Setting language:", language);
        set({ language });
      },

      setSunshineName: (name: string) => {
        console.log("[SettingsStore] Setting sunshineName:", name);
        set({ sunshineName: name });
      },

      setOnboardingCompleted: () => {
        console.log("[SettingsStore] Marking onboarding as completed");
        set({ onboardingCompleted: true });
      },

      reset: () => {
        console.log("[SettingsStore] Resetting to initial state");
        set(INITIAL_STATE);
      },
    }),
    {
      name: "eclipse-settings-store",
      // Persister tous les paramètres
      partialize: (state) => ({
        language: state.language,
        sunshineName: state.sunshineName,
        onboardingCompleted: state.onboardingCompleted,
      }),
    }
  )
);

/**
 * Helpers pour vérifier si l'onboarding est nécessaire
 */
export const settingsSelectors = {
  /** Vérifie si la langue doit être demandée */
  needsLanguageSelection: (state: SettingsState) => state.language === null,

  /** Vérifie si le nom Sunshine doit être demandé */
  needsSunshineNameSetup: (state: SettingsState) => state.sunshineName === null,

  /** Vérifie si tout l'onboarding est complété (incluant welcome) */
  isOnboardingComplete: (state: SettingsState) => state.onboardingCompleted,

  /** Vérifie si le welcome dialog doit être affiché */
  needsWelcome: (state: SettingsState) =>
    state.language !== null && state.sunshineName !== null && !state.onboardingCompleted,
};
