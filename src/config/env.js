/**
 * ============================================================================
 * FILE: server/src/config/env.js
 *
 * PURPOSE:
 *   Single source of truth for ALL environment variables used by the backend.
 *   Loads `server/.env` via dotenv exactly once, validates/defaults values,
 *   and exports a frozen config object. No other file should read
 *   `process.env` directly — they import from here instead.
 *
 * CONNECTIONS:
 *   - Reads:      server/.env  (copy server/.env.example to create it)
 *   - Imported by:
 *       * server/src/index.js                  (PORT for the shared server)
 *       * server/src/app.js                    (CLIENT_ORIGIN for CORS)
 *       * server/src/config/db.js              (MONGODB_URI)
 *       * server/src/services/transcriptionService.js (DEEPGRAM_API_KEY)
 *       * server/src/services/summarizationService.js (uses Ollama, no key needed)
 *
 * FUTURE INTEGRATIONS:
 *   - When you add new third-party services, add their keys HERE first,
 *     then import `env` in the service file. Keeps secrets management in
 *     one auditable place.
 * ============================================================================
 */

import dotenv from 'dotenv';

// Load variables from server/.env into process.env (no-op if file missing).
dotenv.config();

export const env = Object.freeze({
  // Port shared by Express REST API AND the /audio WebSocket (src/index.js).
  PORT: parseInt(process.env.PORT || '5000', 10),

  // Allowed CORS origin — must match the Vite dev server (client/vite.config.js).
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',

  // 'development' | 'production' — used for error verbosity in errorHandler.js.
  NODE_ENV: process.env.NODE_ENV || 'development',

  // --------------------------------------------------------------------------
  // INTEGRATION KEYS
  // --------------------------------------------------------------------------

  // Used by src/config/db.js (Mongoose → MongoDB Atlas)
  MONGODB_URI: process.env.MONGODB_URI || '',

  // Used by src/services/transcriptionService.js (Deepgram SDK)
  DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY || '',

  // Ollama configuration (no key needed — runs locally)
  // OLLAMA_URL and OLLAMA_MODEL are read directly in summarizationService.js
  // Defaults: http://localhost:11434 and llama3

  // Legacy keys (kept for reference, not actively used)
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
});
