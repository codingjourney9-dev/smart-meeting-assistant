/**
 * ============================================================================
 * FILE: client/src/components/RecorderControls.jsx — START/STOP UI
 *
 * PURPOSE:
 *   Dumb presentational component: the Record/Stop buttons plus live status
 *   indicators (WebSocket state, mic errors). Contains ZERO recording or
 *   networking logic — all of that lives in pages/Dashboard.jsx and the two
 *   hooks. This component only receives props and fires callbacks.
 *
 * CONNECTIONS:
 *   - Rendered by:  client/src/pages/Dashboard.jsx
 *   - onStart prop  -> Dashboard.handleStart
 *       (which runs: POST /api/meetings -> WS connect to
 *        ws://localhost:5000/audio -> MediaRecorder start)
 *   - onStop prop   -> Dashboard.handleStop
 *       (mic stop -> WS {type:'stop'} -> socket close)
 *   - socketStatus prop comes from hooks/useTranscriptionSocket.js
 *   - micError prop comes from hooks/useAudioRecorder.js
 * ============================================================================
 */

export default function RecorderControls({
  isRecording,
  busy,
  socketStatus,
  micError,
  onStart,
  onStop,
}) {
  return (
    <div className="recorder-controls">
      {!isRecording ? (
        // Kicks off the whole pipeline — see Dashboard.handleStart.
        <button className="btn-record" onClick={onStart} disabled={busy}>
          {busy ? 'Starting…' : '● Start Recording'}
        </button>
      ) : (
        <button className="btn-stop" onClick={onStop}>
          ■ Stop Recording
        </button>
      )}

      {/* Live connection status from useTranscriptionSocket
          (ws://localhost:5000/audio — server/src/websocket/audioSocket.js) */}
      <span className={`ws-status ws-${socketStatus}`}>
        WebSocket: {socketStatus}
      </span>

      {/* Mic permission / hardware errors from useAudioRecorder */}
      {micError && <p className="error">Microphone error: {micError}</p>}
    </div>
  );
}
