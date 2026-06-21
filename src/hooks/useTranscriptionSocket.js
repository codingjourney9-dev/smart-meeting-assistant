/**
 * ============================================================================
 * FILE: client/src/hooks/useTranscriptionSocket.js — LIVE WEBSOCKET HOOK
 *
 * PURPOSE:
 *   The frontend half of the real-time "hot path". Manages the WebSocket to
 *   the backend audio endpoint:
 *
 *     ws://localhost:5000/audio?meetingId=<id>
 *
 *   UPSTREAM   (browser -> server): binary audio chunks via sendAudioChunk()
 *              (chunks come from useAudioRecorder.js, wired in Dashboard.jsx)
 *   DOWNSTREAM (server -> browser): JSON transcript events, accumulated into
 *              React state that components/LiveTranscript.jsx renders live.
 *
 * WIRE PROTOCOL (must match server/src/websocket/audioSocket.js exactly):
 *   receive: { type: 'ready' }
 *            { type: 'transcript', text, isFinal, timestamp }
 *            { type: 'error', message }
 *   send:    binary frames (audio Blobs)  +  { type: 'stop' } control message
 *
 * CONNECTIONS:
 *   - Used by:       client/src/pages/Dashboard.jsx
 *   - Server peer:   server/src/websocket/audioSocket.js (path /audio)
 *   - Endpoint URL:  import.meta.env.VITE_WS_URL (client/.env, defaults to
 *                    ws://localhost:5000/audio — port set in server/.env)
 *   - State consumed by: client/src/components/LiveTranscript.jsx
 *
 * FUTURE INTEGRATIONS:
 *   - TODO: Add automatic reconnect with exponential backoff for flaky
 *     networks (re-open socket, re-send meetingId, resume streaming).
 * ============================================================================
 */

import { useRef, useState, useCallback } from 'react';

// Endpoint hosted by server/src/index.js + websocket/audioSocket.js.
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000/audio';

export function useTranscriptionSocket() {
  const socketRef = useRef(null);

  // 'idle' | 'connecting' | 'open' | 'closed' | 'error'
  const [status, setStatus] = useState('idle');

  // Finalized transcript lines (isFinal === true) — the permanent record.
  const [segments, setSegments] = useState([]);

  // The in-progress (interim) phrase Deepgram is still revising — gives the
  // live "words appearing as you speak" effect in LiveTranscript.jsx.
  const [interimText, setInterimText] = useState('');

  /** Open the socket for a given meeting. Resolves when the server is ready. */
  const connect = useCallback((meetingId) => {
    return new Promise((resolve, reject) => {
      setStatus('connecting');

      // meetingId ties this audio stream to the Meeting created via
      // POST /api/meetings (see apiClient.createMeeting / Dashboard.jsx).
      const socket = new WebSocket(`${WS_URL}?meetingId=${meetingId}`);
      socketRef.current = socket;

      socket.onopen = () => setStatus('open');

      socket.onmessage = (event) => {
        // All server->client frames are JSON (see audioSocket.js protocol).
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case 'ready':
            // Server accepted us — safe to start streaming audio.
            resolve();
            break;

          case 'transcript':
            if (msg.isFinal) {
              // Promote to the permanent transcript; clear the interim line.
              setSegments((prev) => [
                ...prev,
                { text: msg.text, timestamp: msg.timestamp },
              ]);
              setInterimText('');
            } else {
              // Interim result — overwrite the "currently speaking" line.
              setInterimText(msg.text);
            }
            break;

          case 'error':
            console.error('[ws] Server error:', msg.message);
            break;

          default:
            console.warn('[ws] Unknown message type:', msg.type);
        }
      };

      socket.onerror = () => {
        setStatus('error');
        reject(new Error('WebSocket connection failed — is the server on :5000?'));
      };

      socket.onclose = () => setStatus('closed');
    });
  }, []);

  /** Stream one binary audio chunk (Blob from useAudioRecorder) upstream. */
  const sendAudioChunk = useCallback((chunk) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(chunk); // binary frame -> audioSocket.js
    }
  }, []);

  /** Politely end the session: tell the server to stop, then close. */
  const disconnect = useCallback(() => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'stop' })); // control frame
      socket.close(1000, 'Client finished recording');
    }
    socketRef.current = null;
  }, []);

  /** Wipe transcript state (when starting a brand-new recording). */
  const resetTranscript = useCallback(() => {
    setSegments([]);
    setInterimText('');
  }, []);

  return {
    status,
    segments,
    interimText,
    connect,
    sendAudioChunk,
    disconnect,
    resetTranscript,
  };
}
