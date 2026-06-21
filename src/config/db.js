/**
 * ============================================================================
 * FILE: server/src/config/db.js
 *
 * PURPOSE:
 *   Owns the MongoDB connection lifecycle. Exposes `connectDatabase()`, which
 *   is called ONCE at boot from server/src/index.js BEFORE the HTTP server
 *   starts listening, so no request ever hits an unconnected database.
 *
 *   ✅ IMPLEMENTED: Mongoose now actually connects to MongoDB using the
 *   MONGODB_URI from server/.env. This was formerly the
 *   "TODO: Connect Mongoose to MongoDB here" stub.
 *
 * CONNECTIONS:
 *   - Imports env vars from:  server/src/config/env.js  (MONGODB_URI)
 *   - Called by:              server/src/index.js       (at startup)
 *   - Enables the Mongoose models in:
 *       * server/src/models/Meeting.js
 *       * server/src/models/TranscriptSegment.js
 *     (Models are usable only after this connection succeeds.)
 *
 * FUTURE INTEGRATIONS:
 *   - This remains the ONLY place that calls mongoose.connect(). If we later
 *     add connection pooling tweaks, retry logic, or read replicas, they go
 *     here and nowhere else.
 * ============================================================================
 */

import mongoose from 'mongoose';
import { env } from './env.js';

/**
 * Connect to MongoDB. Resolves when ready; throws on failure so index.js
 * can abort startup (fail-fast) instead of serving requests with no DB.
 */
export async function connectDatabase() {
  if (!env.MONGODB_URI) {
    throw new Error(
      'MONGODB_URI is not set. Copy server/.env.example to server/.env and ' +
        'fill in your MongoDB connection string (local or Atlas).'
    );
  }

  // Lifecycle logging — invaluable when debugging "why is the DB down?"
  mongoose.connection.on('connected', () =>
    console.log('[db] Mongoose connected to MongoDB'));
  mongoose.connection.on('error', (err) =>
    console.error('[db] Mongoose connection error:', err.message));
  mongoose.connection.on('disconnected', () =>
    console.warn('[db] Mongoose disconnected'));

  // serverSelectionTimeoutMS: fail after 10s instead of hanging forever if
  // the URI is wrong or the cluster is unreachable — keeps startup honest.
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });

  // After this resolves, Meeting.js and TranscriptSegment.js models are live.
}

/**
 * Graceful shutdown helper — called from index.js on SIGINT/SIGTERM so we
 * close the Mongo connection cleanly before the process exits.
 */
export async function disconnectDatabase() {
  await mongoose.disconnect();
  console.log('[db] Mongoose disconnected (graceful shutdown)');
}
