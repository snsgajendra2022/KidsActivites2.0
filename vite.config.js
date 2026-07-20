/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Injects Firebase web config into firebase-messaging-sw.js so the SW can
 * initialize on cold start (postMessage alone is too late for background push).
 */
function firebaseMessagingSwPlugin(env) {
  const swFileName = 'firebase-messaging-sw.js';
  const templatePath = path.resolve(__dirname, 'scripts', 'firebase-messaging-sw.template.js');

  function buildSwSource() {
    let source = fs.readFileSync(templatePath, 'utf8');
    const config = {
      apiKey: env.VITE_FIREBASE_API_KEY || '',
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
      projectId: env.VITE_FIREBASE_PROJECT_ID || 'kidsactivities-25696',
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: env.VITE_FIREBASE_APP_ID || '',
    };
    const injection = `self.__FIREBASE_CONFIG__ = ${JSON.stringify(config)};\n`;
    return injection + source;
  }

  return {
    name: 'firebase-messaging-sw-inject',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0];
        if (url !== `/${swFileName}`) {
          next();
          return;
        }
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Service-Worker-Allowed', '/');
        res.setHeader('Cache-Control', 'no-cache');
        res.end(buildSwSource());
      });
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: swFileName,
        source: buildSwSource(),
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss(), firebaseMessagingSwPlugin(env)],
    define: {
      global: 'globalThis',
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.js'],
      globals: true,
    },
    optimizeDeps: {
      include: ['react-photo-sphere-viewer', '@photo-sphere-viewer/core'],
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: [
        'kidsactivities.snssystem.com',
        'sns.localhost',
        'localhost',
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
        'sns.localhost',
        'localhost',
        '161.35.132.9',
      ],
    },
  };
});
