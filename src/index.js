/**
 * ============================================================================
 * FILE: server/src/index.js  — BACKEND ENTRY POINT
 *
 * PURPOSE:
 *   Boots the entire backend. Creates ONE http.Server and attaches:
 *     1. Express app (REST API on /api)
 *     2. WebSocket server for audio transcription (/audio)
 *     3. Socket.io server for video signaling (/socket.io)
 *
 *   One port (5000), three protocols (HTTP, WebSocket, Socket.io).
 *
 * CONNECTIONS:
 *   - Imports: ./app.js, ./websocket/audioSocket.js, ./websocket/videoSignaling.js
 *   - Talked to by:
 *       * REST: client/src/api/apiClient.js
 *       * Audio WS: client/src/hooks/useTranscriptionSocket.js
 *       * Video Socket.io: client/src/hooks/useVideoCall.js
 *
 * ============================================================================
 */

import http from 'node:http';
import { app } from './app.js';
import { attachAudioWebSocketServer } from './websocket/audioSocket.js';
import { attachVideoSignalingServer } from './websocket/videoSignaling.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';

async function main() {
  // 1) Connect to MongoDB FIRST (fail-fast).
  await connectDatabase();

  // 2) Create the single shared HTTP server.
  const httpServer = http.createServer(app);

  // 3) Attach WebSocket server for live audio streaming (transcription).
  attachAudioWebSocketServer(httpServer);

  // 4) Attach Socket.io server for video call signaling.
  attachVideoSignalingServer(httpServer, env.CLIENT_ORIGIN);

  // 5) Start listening.
  httpServer.listen(env.PORT, () => {
    console.log('============================================================');
    console.log(`[server] REST API listening on  http://localhost:${env.PORT}/api`);
    console.log(`[server] Audio WebSocket on     ws://localhost:${env.PORT}/audio`);
    console.log(`[server] Video Signaling on     http://localhost:${env.PORT}/socket.io`);
    console.log(`[server] Allowed CORS origin:   ${env.CLIENT_ORIGIN}`);
    console.log('============================================================');
  });

  // 6) Graceful shutdown.
  const shutdown = async (signal) => {
    console.log(`\n[server] Received ${signal}. Shutting down gracefully...`);
    httpServer.close();
    await disconnectDatabase();
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[server] Fatal startup error:', err);
  process.exit(1);
});
