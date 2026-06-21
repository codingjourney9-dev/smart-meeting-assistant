/**
 * ============================================================================
 * FILE: client/src/components/MeetingList.jsx — PAST MEETINGS LIST
 *
 * PURPOSE:
 *   Fetches and renders the history of all meetings, with click-through to
 *   the detail page and delete buttons. Pure REST consumer — no WebSocket.
 *
 * DATA FLOW:
 *   on mount:    apiClient.listMeetings()
 *                -> GET http://localhost:5000/api/meetings (via Vite proxy)
 *                -> server routes/meetingRoutes.js
 *                -> server controllers/meetingController.listMeetings
 *                -> (future) models/Meeting.js query; currently in-memory stub
 *   on delete:   apiClient.deleteMeeting(id) -> DELETE /api/meetings/:id
 *   on click:    onOpenMeeting(id) -> App.jsx navigates to /meeting/:id
 *
 * CONNECTIONS:
 *   - Rendered by:  client/src/pages/Dashboard.jsx
 *   - Uses REST:    client/src/api/apiClient.js (listMeetings, deleteMeeting)
 *   - Navigation callback comes from: client/src/pages/Dashboard.jsx
 *
 * ============================================================================
 */

import { useEffect, useState, useCallback } from 'react';
import { listMeetings, deleteMeeting } from '../api/apiClient.js';

export default function MeetingList({ onOpenMeeting }) {
  const [meetings, setMeetings] = useState([]);
  const [error, setError] = useState(null);

  /** Load (or reload) the meeting history from the backend. */
  const refresh = useCallback(async () => {
    try {
      setError(null);
      // REST: GET /api/meetings -> meetingController.listMeetings
      const data = await listMeetings();
      setMeetings(data);
    } catch (err) {
      // Most common cause in dev: the server on :5000 isn't running.
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDelete = async (id) => {
    // REST: DELETE /api/meetings/:id -> meetingController.deleteMeeting
    await deleteMeeting(id);
    refresh();
  };

  if (error) {
    return (
      <p className="error">
        Could not load meetings: {error} (Is the backend running on port 5000?)
      </p>
    );
  }

  if (meetings.length === 0) {
    return <p className="muted">No meetings yet — record your first one above!</p>;
  }

  return (
    <ul className="meeting-list">
      {meetings.map((m) => (
        <li key={m._id} className="meeting-item">
          {/* Opens pages/MeetingDetail.jsx via Dashboard.jsx navigation */}
          <button className="meeting-link" onClick={() => onOpenMeeting(m._id)}>
            <strong>{m.title}</strong>
            <span className="muted">
              {' '}
              · {m.status} · {new Date(m.createdAt).toLocaleString()}
            </span>
          </button>
          <button className="btn-delete" onClick={() => handleDelete(m._id)}>
            🗑
          </button>
        </li>
      ))}
    </ul>
  );
}
