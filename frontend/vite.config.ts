import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './src/lib/auth';

export default defineConfig(({ mode }) => {
  // Load environment variables from the repository root (../)
  const env = loadEnv(mode, '../', '');

  // Full Backend URL from .env (e.g. http://localhost:8000)
  const backendTarget = env.VITE_BACKEND_URL || env.BACKEND_URL || 'http://localhost:8000';
  const frontendPort = Number(env.VITE_PORT || env.PORT || 5173);

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'CivicClean · Field Warden',
          short_name: 'Field Warden',
          description: 'Rapid Municipal Environmental Enforcement Dispatch Terminal',
          theme_color: '#0b0f17',
          background_color: '#0b0f17',
          display: 'standalone',
          orientation: 'portrait',
          icons: [
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        },
      }),
      {
        name: 'better-auth',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url && req.url.startsWith('/api/auth')) {
              return toNodeHandler(auth)(req, res, next);
            }
            next();
          });
        },
      },
    ],
    envDir: '../', // Read .env from repo root
    server: {
      host: '0.0.0.0', // Expose to local network for mobile phone access
      port: frontendPort,
      proxy: {
        '/api/incidents': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
        '/api/evidence': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
        '/api/upload': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
        '/api/jobs': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
        '/api/video-jobs': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
        '/api/health': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
