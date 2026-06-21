/**
 * ============================================================================
 * FILE: server/src/middleware/errorHandler.js — CENTRAL ERROR HANDLING
 *
 * PURPOSE:
 *   Two Express middlewares:
 *     1. notFoundHandler — catches any request that matched NO route (404).
 *     2. errorHandler    — the single funnel for every error passed to
 *        next(err) by controllers, returning consistent JSON.
 *
 * CONNECTIONS:
 *   - Registered LAST in:  server/src/app.js (order matters in Express!)
 *   - Receives errors from:
 *       * controllers/meetingController.js   (via next(err))
 *       * controllers/summaryController.js   (via next(err))
 *   - The JSON shape { error: string } is what client/src/api/apiClient.js
 *     expects when a response is not ok.
 *
 * FUTURE INTEGRATIONS:
 *   - TODO: Map Mongoose-specific errors here once MongoDB is wired up
 *     (e.g. CastError -> 400 "Invalid ID", ValidationError -> 422).
 *   - TODO: Plug in real logging/monitoring (pino, Sentry) here.
 * ============================================================================
 */

import { env } from '../config/env.js';

/** 404 for unmatched routes — registered just before errorHandler in app.js. */
export function notFoundHandler(req, res) {
  res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
}

/** Central error funnel. The 4-arg signature is how Express identifies it. */
export function errorHandler(err, _req, res, _next) {
  console.error('[error]', err);

  // ✅ Mongoose error mapping (models/Meeting.js, models/TranscriptSegment.js):
  // CastError = malformed ObjectId in a URL like /api/meetings/abc123.
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid ID format' });
  }
  // ValidationError = document failed schema rules (e.g. missing title).
  if (err.name === 'ValidationError') {
    return res.status(422).json({ error: err.message });
  }

  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal Server Error',
    // Stack traces only in development — never leak them in production.
    ...(env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
}
