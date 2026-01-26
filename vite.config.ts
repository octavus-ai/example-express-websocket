import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 8888,
    proxy: {
      '/api': {
        target: 'http://localhost:8889',
        changeOrigin: true,
      },
      '/octavus': {
        target: 'http://localhost:8889',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist/client',
  },
});
