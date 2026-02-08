# Store Architecture - Eclipse V2

## Overview

Le store global de l'application utilise **Zustand** avec le middleware **devtools** pour le debugging.

## Structure Actuelle (Epic 1)

```typescript
interface AppState {
  currentPage: Page;
  setPage: (page: Page) => void;
}
```

### État de Navigation

- `currentPage`: Page actuellement affichée ('dashboard' | 'settings' | 'applications' | 'help')
- `setPage(page)`: Action pour changer de page

## Architecture Extensible

Le store est conçu pour évoluer avec l'application. Voici la roadmap des futurs états :

### Epic 2 - Sunshine Service
```typescript
sunshineStatus: {
  isInstalled: boolean;
  isRunning: boolean;
  version: string | null;
}
setSunshineStatus: (status: SunshineStatus) => void;
startSunshine: () => Promise<void>;
stopSunshine: () => Promise<void>;
```

### Epic 3 - Virtual Display Driver
```typescript
vddState: {
  isInstalled: boolean;
  isActive: boolean;
  currentResolution: Resolution | null;
  guid: string | null;
}
setVddState: (state: VddState) => void;
toggleVdd: (enabled: boolean) => Promise<void>;
```

### Epic 4 - Screen Presets
```typescript
screenPresets: ScreenPreset[];
activeScreenPreset: string | null;
addScreenPreset: (preset: ScreenPreset) => void;
updateScreenPreset: (id: string, preset: Partial<ScreenPreset>) => void;
deleteScreenPreset: (id: string) => void;
applyScreenPreset: (id: string) => Promise<void>;
```

### Epic 5 - Sunshine Presets
```typescript
sunshinePresets: SunshinePreset[];
activeSunshinePreset: string | null;
addSunshinePreset: (preset: SunshinePreset) => void;
updateSunshinePreset: (id: string, preset: Partial<SunshinePreset>) => void;
deleteSunshinePreset: (id: string) => void;
applySunshinePreset: (id: string) => Promise<void>;
```

## Migration vers Slices

Quand le store deviendra trop volumineux (>200 lignes), migrer vers le pattern de slices :

```typescript
// store/slices/navigationSlice.ts
export const createNavigationSlice: StateCreator<AppState, [], [], NavigationSlice> = (set) => ({
  currentPage: 'dashboard',
  setPage: (page) => set({ currentPage: page }, false, 'setPage'),
});

// store/appStore.ts
export const useAppStore = create<AppState>()(
  devtools(
    (...a) => ({
      ...createNavigationSlice(...a),
      ...createSunshineSlice(...a),
      ...createVddSlice(...a),
    }),
    { name: 'eclipse-store' }
  )
);
```

## Debugging

Le store est configuré avec Redux DevTools :
- Nom du store : `eclipse-store`
- Toutes les actions sont nommées pour faciliter le debugging
- Utiliser Redux DevTools Extension dans le navigateur pour inspecter l'état

## Tests

Tous les tests du store se trouvent dans `appStore.test.ts`.
Coverage actuel : **100%** (objectif : ≥ 90%)

### Commandes de test
```bash
npm run test              # Run tests in watch mode
npm run test:ui           # Run tests with UI
npm run test:coverage     # Run tests with coverage report
```

## Références

- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Zustand Slices Pattern](https://github.com/pmndrs/zustand/blob/main/docs/guides/slices-pattern.md)
- Story 1.6: Store Zustand et architecture état global
