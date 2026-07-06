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
    port: 5173,
  },
});
