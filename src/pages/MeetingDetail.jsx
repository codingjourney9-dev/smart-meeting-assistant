/**
 * ============================================================================
 * FILE: client/src/pages/MeetingDetail.jsx — PAST MEETING + SUMMARY PAGE
 *
 * PURPOSE:
 *   Read-only view of a finished meeting: its metadata, stored transcript,
 *   and the LLM summary. This page is pure "cold path" — REST only, no
 *   WebSocket, no microphone.
 *
 * DATA FLOW:
 *   on mount:  GET /api/meetings/:id          (apiClient.getMeeting)
 *              GET /api/meetings/:id/summary  (apiClient.getSummary)
 *   on demand: SummaryPanel.jsx fires POST /api/meetings/:id/summary
 *              -> summaryController -> summarizationService (Ollama)
 *
 * CONNECTIONS:
 *   - Rendered by:  client/src/App.jsx (route '/meeting/:meetingId')
 *   - Uses REST:    client/src/api/apiClient.js (getMeeting, getSummary)
 *   - Renders:      client/src/components/SummaryPanel.jsx
 *
 * ============================================================================
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMeeting, getSummary } from '../api/apiClient.js';
import SummaryPanel from '../components/SummaryPanel.jsx';

export default function MeetingDetail() {
  const { meetingId } = useParams();
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  // Load meeting metadata + any previously generated summary on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // REST: server/src/controllers/meetingController.getMeeting
        const m = await getMeeting(meetingId);
        if (!cancelled) setMeeting(m);

        // REST: server/src/controllers/summaryController.getSummary
        const s = await getSummary(meetingId);
        if (!cancelled) setSummary(s.summary); // null until generated
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => {
      cancelled = true; // avoid setState after unmount
    };
  }, [meetingId]);

  if (error) {
    return (
      <div className="panel">
        <p className="error">Failed to load meeting: {error}</p>
        <button onClick={() => navigate('/')}>← Back to Dashboard</button>
      </div>
    );
  }

  if (!meeting) return <div className="panel">Loading meeting…</div>;

  return (
    <div className="meeting-detail">
      <button onClick={() => navigate('/')}>← Back to Dashboard</button>

      <section className="panel">
        <h2>{meeting.title}</h2>
        <p>
          Status: <strong>{meeting.status}</strong> · Created:{' '}
          {new Date(meeting.createdAt).toLocaleString()}
        </p>

        {/* Stored transcript. Will be populated once audioSocket.js persists
            final segments via models/TranscriptSegment.js (server TODO). */}
        <h3>Transcript</h3>
        {meeting.transcript?.length ? (
          <div className="transcript-box">
            {meeting.transcript.map((seg, i) => (
              <p key={i}>{seg.text}</p>
            ))}
          </div>
        ) : (
          <p className="muted">
            No stored transcript yet — segments will appear here once MongoDB
            persistence is implemented (server/src/models/TranscriptSegment.js).
          </p>
        )}
      </section>

      {/* Summary display + "Generate Summary" trigger (Ollama via backend). */}
      <SummaryPanel
        meetingId={meetingId}
        summary={summary}
        onSummaryGenerated={setSummary}
      />
    </div>
  );
}
