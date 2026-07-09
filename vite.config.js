import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['react-photo-sphere-viewer', '@photo-sphere-viewer/core'],
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: [
      'kidsactivities.snssystem.com',
      '161.35.132.9',
    ],
    // Dev-only: disable HMR when accessed via HTTPS reverse proxy (no WS upgrade on nginx).
    hmr: process.env.VITE_DISABLE_HMR === 'true' ? false : undefined,
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: [
      'kidsactivities.snssystem.com',
      '161.35.132.9',
    ],
  },
});
