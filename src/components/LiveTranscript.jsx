/**
 * ============================================================================
 * FILE: client/src/components/LiveTranscript.jsx — REAL-TIME TRANSCRIPT VIEW
 *
 * PURPOSE:
 *   Renders the live transcript as words arrive over the WebSocket. Displays
 *   two layers:
 *     1. `segments`    — finalized lines (isFinal=true from Deepgram), stable.
 *     2. `interimText` — the phrase currently being spoken/revised, shown in
 *        a lighter style for the live "typing" effect.
 *   Auto-scrolls to the newest line. Purely presentational — props in,
 *   pixels out.
 *
 * DATA SOURCE (the full path of every word on this screen):
 *   mic -> useAudioRecorder -> ws://localhost:5000/audio
 *       -> server websocket/audioSocket.js
 *       -> server services/transcriptionService.js (Deepgram TODO; currently
 *          emits stub text so this UI is testable today)
 *       -> back down the SAME socket as { type:'transcript', ... }
 *       -> hooks/useTranscriptionSocket.js state
 *       -> THIS component re-renders
 *
 * CONNECTIONS:
 *   - Rendered by:  client/src/pages/Dashboard.jsx
 *   - Props from:   client/src/hooks/useTranscriptionSocket.js
 * ============================================================================
 */

import { useEffect, useRef } from 'react';

export default function LiveTranscript({ segments, interimText, isRecording }) {
  const bottomRef = useRef(null);

  // Keep the newest words in view as the transcript grows.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [segments, interimText]);

  return (
    <div className="live-transcript">
      <h3>
        Live Transcript{' '}
        {isRecording && <span className="recording-dot">● recording</span>}
      </h3>

      <div className="transcript-box">
        {segments.length === 0 && !interimText && (
          <p className="muted">
            {isRecording
              ? 'Listening… transcript will appear here.'
              : 'Press "Start Recording" to begin live transcription.'}
          </p>
        )}

        {/* Finalized lines (server sent isFinal: true) */}
        {segments.map((seg, i) => (
          <p key={i} className="final-line">
            {seg.text}
          </p>
        ))}

        {/* In-progress phrase (server sent isFinal: false) — lighter style */}
        {interimText && <p className="interim-line">{interimText}</p>}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
