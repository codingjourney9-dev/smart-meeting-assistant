/**
 * ============================================================================
 * FILE: client/src/hooks/useAudioRecorder.js — MICROPHONE CAPTURE HOOK
 *
 * PURPOSE:
 *   Owns everything about the browser microphone:
 *     1. Requests mic permission (navigator.mediaDevices.getUserMedia).
 *     2. Records audio with MediaRecorder (audio/webm;codecs=opus).
 *     3. Emits a binary audio chunk every TIMESLICE_MS via the onChunk
 *        callback — the caller decides what to do with it.
 *
 *   This hook knows NOTHING about WebSockets. Separation of concerns:
 *     useAudioRecorder  = produce audio chunks
 *     useTranscriptionSocket = transport chunks to the backend
 *   pages/Dashboard.jsx wires the two together (recorder.onChunk -> socket.send).
 *
 * CONNECTIONS:
 *   - Used by:  client/src/pages/Dashboard.jsx
 *   - Its chunks are forwarded (by Dashboard) into:
 *       client/src/hooks/useTranscriptionSocket.js
 *       -> ws://localhost:5000/audio
 *       -> server/src/websocket/audioSocket.js
 *       -> server/src/services/transcriptionService.js (Deepgram TODO)
 *
 * FUTURE INTEGRATIONS:
 *   - TODO: If Deepgram requires raw PCM (linear16) instead of opus, replace
 *     MediaRecorder with an AudioWorklet that downsamples to 16kHz PCM here.
 *     Keep the same onChunk contract so nothing downstream changes.
 * ============================================================================
 */

import { useRef, useState, useCallback } from 'react';

// One chunk every 250ms — small enough for low-latency live transcription,
// large enough to avoid flooding the WebSocket with tiny frames.
const TIMESLICE_MS = 250;

export function useAudioRecorder() {
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Start capturing mic audio.
   * @param {(chunk: Blob) => void} onChunk - called every TIMESLICE_MS with a
   *        binary audio Blob. Dashboard.jsx passes the WebSocket sender here.
   */
  const startRecording = useCallback(async (onChunk) => {
    setError(null);
    try {
      // 1. Ask the user for microphone access (browser permission prompt).
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 2. Record as webm/opus — broadly supported and Deepgram-compatible.
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      mediaRecorderRef.current = recorder;

      // 3. Every TIMESLICE_MS, hand the chunk to the caller. In Dashboard.jsx
      //    this pushes it straight onto ws://localhost:5000/audio.
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) onChunk(event.data);
      };

      recorder.start(TIMESLICE_MS);
      setIsRecording(true);
    } catch (err) {
      // Most common cause: user denied the mic permission prompt.
      setError(err.message || 'Microphone access failed');
      setIsRecording(false);
    }
  }, []);

  /** Stop recording and release the microphone (turns off the tab mic icon). */
  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.state !== 'inactive' &&
      mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    mediaRecorderRef.current = null;
    streamRef.current = null;
    setIsRecording(false);
  }, []);

  return { isRecording, error, startRecording, stopRecording };
}
