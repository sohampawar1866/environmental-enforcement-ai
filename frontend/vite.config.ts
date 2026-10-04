import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load environment variables from the repository root (../)
  const env = loadEnv(mode, '../', '');

  // Full Backend URL from .env (e.g. http://localhost:8000)
  const backendTarget = env.VITE_BACKEND_URL || env.BACKEND_URL || 'http://localhost:8000';
  const frontendPort = Number(env.VITE_PORT || env.PORT || 5173);

  return {
    plugins: [react()],
    envDir: '../', // Read .env from repo root
    server: {
      port: frontendPort,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
