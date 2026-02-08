import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import * as path from 'path';
import * as fs from 'fs';

// Import du script de nettoyage Sunshine
const { cleanSunshineConfig } = require('./scripts/clean-sunshine-config');

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    win32metadata: {
      requestedExecutionLevel: 'requireAdministrator',
    },
    extraResource: ['resources'],
  },
  rebuildConfig: {},
  hooks: {
    /**
     * Hook exécuté après la copie des fichiers mais avant le packaging final.
     * Nettoie la config Sunshine pour qu'elle soit propre pour un nouvel utilisateur.
     *
     * Cela permet de travailler en dev (npm start) sans polluer le build prod
     * avec des données personnelles (nom de PC, credentials, chemins hardcodés).
     *
     * L'app Eclipse fait le setup complet au premier lancement (main.ts).
     */
    packageAfterCopy: async () => {
      console.log('[Forge Hook] packageAfterCopy - Cleaning Sunshine config...');

      // Chemin direct vers les sources (app/resources/tools/Sunshine/config)
      // __dirname = dossier où se trouve forge.config.ts = app/
      const sunshineConfigDir = path.join(__dirname, 'resources', 'tools', 'Sunshine', 'config');

      console.log('[Forge Hook] Looking for config at:', sunshineConfigDir);

      if (fs.existsSync(sunshineConfigDir)) {
        cleanSunshineConfig(sunshineConfigDir);
        console.log('[Forge Hook] Sunshine config cleaned successfully');
      } else {
        console.log('[Forge Hook] ERROR: Sunshine config dir not found at:', sunshineConfigDir);
      }
    },
  },
  makers: [
    new MakerSquirrel({}),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'electron/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'electron/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
