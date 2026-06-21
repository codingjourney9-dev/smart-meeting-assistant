/**
 * ============================================================================
 * FILE: server/src/websocket/audioSocket.js  — LIVE AUDIO WEBSOCKET SERVER
 *
 * PURPOSE:
 *   The real-time "hot path" of the whole application. Hosts a WebSocket
 *   endpoint at  ws://localhost:5000/audio  that:
 *     1. RECEIVES  binary audio chunks streamed from the browser microphone.
 *     2. (FUTURE)  Pipes those chunks into Deepgram's live transcription API
 *                  via services/transcriptionService.js.
 *     3. SENDS     JSON transcript events back DOWN the same socket so the
 *                  UI can render words as they are spoken.
 *
 * WIRE PROTOCOL (agreed contract with the frontend):
 *   Client -> Server:
 *     * Binary frames (ArrayBuffer): raw audio chunks (audio/webm;codecs=opus,
 *       produced by MediaRecorder in client/src/hooks/useAudioRecorder.js).
 *     * Text frames (JSON): control messages, e.g. {"type":"stop"}.
 *   Server -> Client (all JSON text frames):
 *     * { type: "ready" }                                   — socket accepted
 *     * { type: "transcript", text, isFinal, timestamp }    — live transcript
 *     * { type: "error", message }                          — recoverable error
 *
 * CONNECTIONS:
 *   - Attached to the shared http.Server by:  server/src/index.js
 *   - Counterpart on the frontend:
 *       client/src/hooks/useTranscriptionSocket.js
 *       (connects to ws://localhost:5000/audio?meetingId=<id>)
 *   - Will delegate audio to:  server/src/services/transcriptionService.js
 *   - Will persist segments via: server/src/models/TranscriptSegment.js
 *
 * FUTURE INTEGRATIONS:
 *   - Deepgram streaming session is created PER WebSocket connection (one
 *     browser tab = one socket = one Deepgram live session).
 * ============================================================================
 */

import { WebSocketServer } from 'ws';
import {
  createLiveTranscriptionSession,
} from '../services/transcriptionService.js';
// ✅ MongoDB persistence (models live only after config/db.js connects):
import { TranscriptSegment } from '../models/TranscriptSegment.js';
import { Meeting } from '../models/Meeting.js';

/**
 * Attach the /audio WebSocket server to the shared http.Server created in
 * src/index.js. Using `path: '/audio'` means only upgrade requests to that
 * exact path are accepted; everything else stays with Express.
 *
 * @param {import('node:http').Server} httpServer
 */
export function attachAudioWebSocketServer(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/audio' });

  wss.on('connection', (socket, request) => {
    // The frontend appends ?meetingId=<id> so we know which Meeting document
    // (models/Meeting.js) the incoming audio belongs to.
    const url = new URL(request.url, 'http://localhost');
    const meetingId = url.searchParams.get('meetingId') || 'unknown';

    console.log(`[ws] Client connected to /audio (meetingId=${meetingId})`);

    // ------------------------------------------------------------------------
    // TODO: Initialize the Deepgram live session here (one per connection).
    //
    // The transcription service (services/transcriptionService.js) will own
    // the Deepgram SDK. The callback below is how Deepgram results flow back
    // to THIS socket and onward to the browser:
    //
    //   const dgSession = await createLiveTranscriptionSession({
    //     onTranscript: ({ text, isFinal }) => {
    //       // 1. Push live text down to client/src/hooks/useTranscriptionSocket.js
    //       socket.send(JSON.stringify({
    //         type: 'transcript', text, isFinal, timestamp: Date.now(),
    //       }));
    //       // 2. TODO: Persist final segments to MongoDB via
    //       //    models/TranscriptSegment.js (only when isFinal === true).
    //     },
    //     onError: (err) => {
    //       socket.send(JSON.stringify({ type: 'error', message: err.message }));
    //     },
    //   });
    // ------------------------------------------------------------------------
    const dgSession = createLiveTranscriptionSession({
      meetingId,
      onTranscript: ({ text, isFinal }) => {
        const timestamp = Date.now();

        // 1. Push live text down to client/src/hooks/useTranscriptionSocket.js
        if (socket.readyState === socket.OPEN) {
          socket.send(
            JSON.stringify({ type: 'transcript', text, isFinal, timestamp })
          );
        }

        // 2. ✅ Persist FINAL segments to MongoDB (models/TranscriptSegment.js).
        //    Interim results are UI-only and never stored. Fire-and-forget
        //    with .catch so a slow DB write never blocks the live stream.
        if (isFinal) {
          TranscriptSegment.create({ meetingId, text, isFinal, timestamp }).catch(
            (err) => console.error('[ws] Failed to persist segment:', err.message)
          );
        }
      },
      onError: (err) => {
        if (socket.readyState === socket.OPEN) {
          socket.send(JSON.stringify({ type: 'error', message: err.message }));
        }
      },
    });

    // Tell the browser we're ready to receive audio.
    socket.send(JSON.stringify({ type: 'ready', meetingId }));

    socket.on('message', (data, isBinary) => {
      if (isBinary) {
        // BINARY FRAME = raw audio chunk from MediaRecorder (browser mic).
        // Forward it to the transcription service (-> Deepgram in future).
        dgSession.sendAudioChunk(data);
      } else {
        // TEXT FRAME = JSON control message from the client.
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'stop') {
            // Client clicked "Stop Recording" in RecorderControls.jsx.
            console.log(`[ws] Stop requested (meetingId=${meetingId})`);

            // ✅ Lifecycle update: recording -> completed (models/Meeting.js).
            Meeting.findByIdAndUpdate(meetingId, { status: 'completed' }).catch(
              (err) => console.error('[ws] Failed to mark completed:', err.message)
            );

            dgSession.close();
            socket.close(1000, 'Recording stopped by client');
          }
        } catch {
          console.warn('[ws] Received malformed control message, ignoring.');
        }
      }
    });

    socket.on('close', () => {
      console.log(`[ws] Client disconnected (meetingId=${meetingId})`);
      // Always tear down the (future) Deepgram session to avoid leaks/billing.
      dgSession.close();
    });

    socket.on('error', (err) => {
      console.error(`[ws] Socket error (meetingId=${meetingId}):`, err.message);
    });
  });

  console.log('[ws] Audio WebSocket server attached at path /audio');
  return wss;
}
