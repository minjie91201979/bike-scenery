import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: true,
    port: 5180,
    proxy: {
      '/ncm': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/ncm/, ''),
      },
    },
  },
  build: { target: 'es2020', chunkSizeWarningLimit: 1200 },
});
