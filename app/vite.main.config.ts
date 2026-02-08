import { defineConfig } from 'vite';
import path from 'node:path';

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    alias: {
      '@ui': path.resolve(__dirname, './src/ui'),
      '@application': path.resolve(__dirname, './src/application'),
      '@domain': path.resolve(__dirname, './src/domain'),
      '@infrastructure': path.resolve(__dirname, './src/infrastructure'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
  server: {
    watch: {
      // Ignorer le dossier Sunshine pour éviter les hot reloads quand sunshine.conf change
      ignored: ['**/resources/tools/**']
    }
  }
});
