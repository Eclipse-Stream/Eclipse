import { defineConfig } from 'vite';
import { resolve } from 'path';

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    alias: {
      '@ui': resolve(__dirname, 'src/ui'),
      '@application': resolve(__dirname, 'src/application'),
      '@domain': resolve(__dirname, 'src/domain'),
      '@infrastructure': resolve(__dirname, 'src/infrastructure'),
      '@shared': resolve(__dirname, 'src/shared')
    }
  },
  // Story 9.2: Multi-entry build for tray panel
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        trayPanel: resolve(__dirname, 'tray-panel.html')
      }
    }
  },
  esbuild: {
    jsx: 'automatic'
  },
  server: {
    watch: {
      // Ignorer le dossier Sunshine pour éviter les hot reloads quand sunshine.conf change
      ignored: ['**/resources/tools/**']
    }
  }
});
