/**
 * ============================================================================
 * FILE: client/vite.config.js — VITE DEV SERVER + BACKEND PROXY
 *
 * PURPOSE:
 *   Configures the React dev server (http://localhost:5173) and — crucially —
 *   the PROXY that bridges frontend and backend in development:
 *
 *     Browser fetch('/api/meetings')
 *       -> Vite dev server (:5173)
 *       -> proxied to Express backend  http://localhost:5000/api/meetings
 *
 *   This means client/src/api/apiClient.js can use relative '/api' URLs with
 *   no CORS configuration and no hardcoded backend host.
 *
 *   NOTE ON WEBSOCKETS: the live-audio WebSocket does NOT go through this
 *   proxy. client/src/hooks/useTranscriptionSocket.js connects DIRECTLY to
 *   ws://localhost:5000/audio (configurable via VITE_WS_URL in client/.env).
 *
 * CONNECTIONS:
 *   - Proxies to:  server/src/index.js (port 5000, see server/.env PORT)
 *   - Used by every fetch in: client/src/api/apiClient.js
 * ============================================================================
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // must match CLIENT_ORIGIN in server/.env for CORS
    proxy: {
      // Forward every /api/* request to the Express backend (server/src/app.js).
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
