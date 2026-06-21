/**
 * ============================================================================
 * FILE: server/src/app.js  — EXPRESS APPLICATION (REST LAYER ONLY)
 *
 * PURPOSE:
 *   Defines the Express app: global middleware (CORS, JSON parsing, logging)
 *   and mounts every REST route group under /api. This file deliberately
 *   contains NO WebSocket logic and does NOT call .listen() — the shared
 *   http.Server in src/index.js does that, so the WS server can share port 5000.
 *
 * CONNECTIONS:
 *   - Imported by:  server/src/index.js (attached to the shared http.Server)
 *   - Mounts:
 *       * /api/meetings           -> server/src/routes/meetingRoutes.js
 *       * /api/meetings/:id/...   -> server/src/routes/summaryRoutes.js
 *   - Consumed by the frontend through:
 *       * client/vite.config.js proxy:  browser "/api/*" -> http://localhost:5000/api/*
 *       * client/src/api/apiClient.js   (the fetch wrapper)
 *   - Error funnel:  server/src/middleware/errorHandler.js (must be LAST).
 *
 * FUTURE INTEGRATIONS:
 *   - Add auth middleware (e.g. JWT) here, BEFORE the route mounts, when
 *     user accounts are introduced.
 * ============================================================================
 */

import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import meetingRoutes from './routes/meetingRoutes.js';
import summaryRoutes from './routes/summaryRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export const app = express();

// ---------------------------------------------------------------------------
// GLOBAL MIDDLEWARE
// ---------------------------------------------------------------------------

// CORS: allow the React dev server (http://localhost:5173) to call us directly.
// (In dev the Vite proxy usually makes this unnecessary, but it keeps direct
// fetches and production same-origin deployments flexible.)
app.use(cors({ origin: env.CLIENT_ORIGIN }));

// Parse JSON request bodies (e.g. POST /api/meetings { title: "..." }).
app.use(express.json({ limit: '2mb' }));

// Tiny request logger so we can watch the frontend <-> backend traffic.
app.use((req, _res, next) => {
  console.log(`[http] ${req.method} ${req.originalUrl}`);
  next();
});

// ---------------------------------------------------------------------------
// HEALTH CHECK — hit http://localhost:5000/api/health to verify the server
// is alive. client/src/api/apiClient.js exposes checkHealth() for this.
// ---------------------------------------------------------------------------
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'smart-meeting-assistant-server', time: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// REST ROUTE MOUNTS
// ---------------------------------------------------------------------------

// Meetings CRUD: create/list/get meetings.   -> routes/meetingRoutes.js
app.use('/api/meetings', meetingRoutes);

// Summaries: generate/fetch LLM summaries.   -> routes/summaryRoutes.js
// (Mounted on the same base path; summaryRoutes handles /:meetingId/summary.)
app.use('/api/meetings', summaryRoutes);

// ---------------------------------------------------------------------------
// 404 + CENTRAL ERROR HANDLER (must be registered LAST)
// ---------------------------------------------------------------------------
app.use(notFoundHandler);
app.use(errorHandler);
