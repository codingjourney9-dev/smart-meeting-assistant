/**
 * ============================================================================
 * FILE: client/src/pages/Dashboard.jsx — LIVE RECORDING PAGE (MAIN VIEW)
 *
 * PURPOSE:
 *   The page where a meeting actually happens. It is the ORCHESTRATOR that
 *   wires the two hooks together into the full live pipeline:
 *
 *     [mic] useAudioRecorder.onChunk
 *        -> useTranscriptionSocket.sendAudioChunk
 *        -> ws://localhost:5000/audio                (binary upstream)
 *        -> server websocket/audioSocket.js
 *        -> server services/transcriptionService.js  (Deepgram)
 *        <- transcript JSON back down the socket     (downstream)
 *        -> components/LiveTranscript.jsx re-renders live
 *
 *   Recording lifecycle (start button click):
 *     1. POST /api/meetings (apiClient.createMeeting) -> get meetingId  [REST]
 *     2. socket.connect(meetingId)                                     [WS]
 *     3. recorder.startRecording(socket.sendAudioChunk)                [mic]
 *   Stop reverses it: stop mic -> send {type:'stop'} -> close socket.
 *
 * CONNECTIONS:
 *   - Rendered by:  client/src/App.jsx (route '/')
 *   - Uses hooks:   hooks/useAudioRecorder.js, hooks/useTranscriptionSocket.js
 *   - Uses REST:    api/apiClient.js (createMeeting)
 *   - Renders:      components/RecorderControls.jsx (start/stop UI)
 *                   components/LiveTranscript.jsx   (live text)
 *                   components/MeetingList.jsx      (history below)
 *
 * ============================================================================
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createMeeting } from '../api/apiClient.js';
import { useAudioRecorder } from '../hooks/useAudioRecorder.js';
import { useTranscriptionSocket } from '../hooks/useTranscriptionSocket.js';
import RecorderControls from '../components/RecorderControls.jsx';
import LiveTranscript from '../components/LiveTranscript.jsx';
import MeetingList from '../components/MeetingList.jsx';

export default function Dashboard() {
  const recorder = useAudioRecorder();
  const socket = useTranscriptionSocket();
  const navigate = useNavigate();

  const [activeMeeting, setActiveMeeting] = useState(null);
  const [busy, setBusy] = useState(false);

  /** START: REST create -> WS connect -> mic start. */
  const handleStart = async () => {
    setBusy(true);
    try {
      // 1. REST: create the Meeting record so the backend can tag the audio.
      //    (POST /api/meetings -> server/src/controllers/meetingController.js)
      const meeting = await createMeeting();
      setActiveMeeting(meeting);
      socket.resetTranscript();

      // 2. WS: open ws://localhost:5000/audio?meetingId=<id> and wait for
      //    the server's { type: 'ready' } ack (audioSocket.js).
      await socket.connect(meeting._id);

      // 3. MIC: start recording; every 250ms chunk goes straight upstream.
      //    THIS LINE is where the two hooks are fused into one pipeline.
      await recorder.startRecording(socket.sendAudioChunk);
    } catch (err) {
      console.error('[dashboard] Failed to start recording:', err);
      alert(`Could not start recording: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  /** STOP: mic off -> polite WS shutdown. Meeting stays selectable below. */
  const handleStop = () => {
    recorder.stopRecording();
    socket.disconnect(); // sends { type: 'stop' } then closes (audioSocket.js)
  };

  /** Navigate to meeting detail page (uses React Router) */
  const openMeeting = (meetingId) => {
    navigate(`/meeting/${meetingId}`);
  };

  return (
    <div className="dashboard">
      <section className="panel">
        <h2>Live Recording</h2>

        {/* Start/Stop buttons + status pill (components/RecorderControls.jsx) */}
        <RecorderControls
          isRecording={recorder.isRecording}
          busy={busy}
          socketStatus={socket.status}
          micError={recorder.error}
          onStart={handleStart}
          onStop={handleStop}
        />

        {/* Real-time transcript fed by the WebSocket downstream messages */}
        <LiveTranscript
          segments={socket.segments}
          interimText={socket.interimText}
          isRecording={recorder.isRecording}
        />

        {activeMeeting && !recorder.isRecording && (
          <button onClick={() => openMeeting(activeMeeting._id)}>
            View this meeting & generate summary →
          </button>
        )}
      </section>

      {/* Past meetings (REST: GET /api/meetings via MeetingList.jsx) */}
      <section className="panel">
        <h2>Past Meetings</h2>
        <MeetingList onOpenMeeting={openMeeting} />
      </section>
    </div>
  );
}
