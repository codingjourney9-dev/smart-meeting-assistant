/**
 * ============================================================================
 * FILE: server/src/services/transcriptionService.js — SPEECH-TO-TEXT SERVICE
 *
 * PURPOSE:
 *   Encapsulates ALL speech-to-text (Deepgram) logic. The WebSocket layer
 *   (websocket/audioSocket.js) knows nothing about Deepgram — it just calls
 *   `createLiveTranscriptionSession()` and forwards audio chunks into it.
 *   This isolation means we could swap Deepgram for Whisper/AssemblyAI by
 *   editing ONLY this file.
 *
 *   ✅ IMPLEMENTED: real Deepgram live streaming (formerly the
 *   "TODO: Initialize Deepgram SDK here" stub).
 *
 *   🛟 SAFETY FALLBACK: if DEEPGRAM_API_KEY is missing/placeholder in
 *   server/.env, we automatically use the old stub session instead of
 *   crashing — so the app always runs, with or without a key.
 *
 * CONNECTIONS:
 *   - Called by:   server/src/websocket/audioSocket.js
 *                  (one session per connected browser tab)
 *   - Reads key:   server/src/config/env.js  (DEEPGRAM_API_KEY)
 *   - Emits results back to audioSocket.js via the onTranscript callback,
 *     which relays them to client/src/hooks/useTranscriptionSocket.js AND
 *     persists final segments via models/TranscriptSegment.js.
 *
 * HOW THE AUDIO FORMAT LINES UP (important to understand):
 *   The browser's MediaRecorder (client/src/hooks/useAudioRecorder.js)
 *   produces 'audio/webm;codecs=opus' chunks. Deepgram natively understands
 *   webm/opus containers, so we can forward the chunks AS-IS — no
 *   transcoding needed. interim_results gives the live "typing" effect.
 * ============================================================================
 */

import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { env } from '../config/env.js';

/** True only when a real-looking key is configured in server/.env. */
function hasRealKey() {
  return (
    !!env.DEEPGRAM_API_KEY &&
    env.DEEPGRAM_API_KEY !== 'your_deepgram_api_key_here'
  );
}

// Create the Deepgram client once (cheap, reused by every session).
// Lazily guarded: only constructed if a real key exists.
let deepgram = null;
function getDeepgramClient() {
  if (!deepgram) deepgram = createClient(env.DEEPGRAM_API_KEY);
  return deepgram;
}

/**
 * Create a live transcription session for ONE WebSocket connection.
 *
 * @param {object}   opts
 * @param {string}   opts.meetingId     - Which meeting this audio belongs to.
 * @param {function} opts.onTranscript  - ({ text, isFinal }) => void
 *                                        Called for every transcript event;
 *                                        audioSocket.js relays it to the browser.
 * @param {function} opts.onError       - (Error) => void
 * @returns {{ sendAudioChunk: (chunk: Buffer) => void, close: () => void }}
 */
export function createLiveTranscriptionSession({ meetingId, onTranscript, onError }) {
  // --------------------------------------------------------------------------
  // FALLBACK PATH: no API key yet -> keep the old stub behavior so the
  // whole app still works end-to-end without a Deepgram account.
  // --------------------------------------------------------------------------
  if (!hasRealKey()) {
    console.warn(
      '[stt] DEEPGRAM_API_KEY not set — using STUB transcripts. ' +
        'Add your key to server/.env for real transcription.'
    );
    return createStubSession({ meetingId, onTranscript });
  }

  // --------------------------------------------------------------------------
  // REAL PATH: open a Deepgram live (streaming) connection for this meeting.
  // One browser tab = one WebSocket = one Deepgram session.
  // --------------------------------------------------------------------------
  console.log(`[stt] Deepgram live session starting (meetingId=${meetingId})`);

  const dgConnection = getDeepgramClient().listen.live({
    model: 'nova-3',        // Deepgram's best general model
    language: 'en',         // TODO: make configurable per meeting
    smart_format: true,     // punctuation, numbers, etc.
    interim_results: true,  // live "typing" effect (isFinal=false events)
    // NOTE: no encoding/sample_rate params — Deepgram auto-detects the
    // webm/opus container produced by the browser's MediaRecorder.
  });

  // Audio chunks can arrive from the browser BEFORE Deepgram's socket is
  // open. Buffer them briefly and flush once ready, so no speech is lost.
  let dgReady = false;
  const pendingChunks = [];

  dgConnection.on(LiveTranscriptionEvents.Open, () => {
    dgReady = true;
    console.log(`[stt] Deepgram connection open (meetingId=${meetingId}), flushing ${pendingChunks.length} buffered chunks`);
    while (pendingChunks.length > 0) dgConnection.send(pendingChunks.shift());
  });

  // The main event: Deepgram sends transcript results (interim AND final).
  // We forward them to audioSocket.js, which (a) pushes them down the
  // browser WebSocket and (b) persists final ones to MongoDB.
  dgConnection.on(LiveTranscriptionEvents.Transcript, (event) => {
    const text = event.channel?.alternatives?.[0]?.transcript ?? '';
    if (text.trim()) {
      onTranscript({ text, isFinal: event.is_final === true });
    }
  });

  dgConnection.on(LiveTranscriptionEvents.Error, (err) => {
    console.error(`[stt] Deepgram error (meetingId=${meetingId}):`, err?.message || err);
    onError(new Error('Transcription service error: ' + (err?.message || 'unknown')));
  });

  dgConnection.on(LiveTranscriptionEvents.Close, () => {
    console.log(`[stt] Deepgram connection closed (meetingId=${meetingId})`);
  });

  return {
    /**
     * Receives one binary audio chunk from audioSocket.js (which received it
     * from the browser's MediaRecorder via ws://localhost:5000/audio) and
     * forwards it to Deepgram. Chunks arriving before Deepgram is ready are
     * buffered and flushed on Open.
     */
    sendAudioChunk(chunk) {
      if (dgReady) {
        dgConnection.send(chunk);
      } else {
        pendingChunks.push(chunk);
      }
    },

    /** Tear down the Deepgram session (called on socket close / stop).
     *  Always close upstream — leaks would keep billing meter running. */
    close() {
      try {
        dgConnection.requestClose();
      } catch {
        /* already closed — fine */
      }
    },
  };
}

/**
 * The original stub session — kept as the no-key fallback so the project
 * runs end-to-end at every stage of the tutorial. Emits a fake transcript
 * line every ~8 chunks (~2 seconds of audio).
 */
function createStubSession({ meetingId, onTranscript }) {
  let chunkCount = 0;
  return {
    sendAudioChunk() {
      chunkCount += 1;
      if (chunkCount % 8 === 0) {
        onTranscript({
          text: `[stub transcript] received ${chunkCount} audio chunks for meeting ${meetingId}...`,
          isFinal: true,
        });
      }
    },
    close() {
      console.log(`[stt] STUB session closed (meetingId=${meetingId}, chunks=${chunkCount})`);
    },
  };
}
