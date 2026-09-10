import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: true,
    port: 5180,
    proxy: {
      // Browser CORS: same-origin /weapi → music.163.com (no local Node API).
      '/weapi': {
        target: 'https://music.163.com',
        changeOrigin: true,
        headers: {
          referer: 'https://music.163.com/',
          origin: 'https://music.163.com',
        },
      },
    },
  },
  build: { target: 'es2020', chunkSizeWarningLimit: 1200 },
});
