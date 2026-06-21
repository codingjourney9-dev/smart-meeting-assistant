/**
 * ============================================================================
 * FILE: client/src/api/apiClient.js — REST CLIENT (THE "COLD PATH")
 *
 * PURPOSE:
 *   The ONLY place in the frontend that performs HTTP calls. Every component
 *   imports functions from here instead of calling fetch() directly, so the
 *   API surface is documented and changeable in one file.
 *
 *   All URLs are RELATIVE ('/api/...') — the Vite dev proxy
 *   (client/vite.config.js) forwards them to the Express backend at
 *   http://localhost:5000 (server/src/app.js). No CORS, no hardcoded hosts.
 *
 *   NOTE: Live audio does NOT go through this file. That is the WebSocket
 *   "hot path" — see client/src/hooks/useTranscriptionSocket.js.
 *
 * CONNECTIONS (frontend caller -> backend route -> backend controller):
 *   createMeeting()   -> POST   /api/meetings
 *                        (routes/meetingRoutes.js -> meetingController.createMeeting)
 *                        called by pages/Dashboard.jsx before recording starts
 *   listMeetings()    -> GET    /api/meetings        (components/MeetingList.jsx)
 *   getMeeting(id)    -> GET    /api/meetings/:id    (pages/MeetingDetail.jsx)
 *   deleteMeeting(id) -> DELETE /api/meetings/:id    (components/MeetingList.jsx)
 *   generateSummary() -> POST   /api/meetings/:id/summary
 *                        (routes/summaryRoutes.js -> summaryController ->
 *                         services/summarizationService.js -> OpenAI [TODO])
 *                        called by components/SummaryPanel.jsx
 *   getSummary(id)    -> GET    /api/meetings/:id/summary (pages/MeetingDetail.jsx)
 *   checkHealth()     -> GET    /api/health          (server/src/app.js)
 * ============================================================================
 */

const API_BASE = '/api'; // proxied by client/vite.config.js -> localhost:5000

/** Shared fetch wrapper: JSON in/out + consistent error handling. */
async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  // 204 No Content (e.g. DELETE) has no body to parse.
  if (res.status === 204) return null;

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Backend errors arrive as { error: "..." } — see server errorHandler.js.
    throw new Error(body.error || `Request failed: ${res.status} ${path}`);
  }
  return body;
}

// ---------------------------------------------------------------------------
// MEETINGS (server/src/routes/meetingRoutes.js)
// ---------------------------------------------------------------------------

/** Create a meeting BEFORE recording, to obtain the meetingId used by the WS. */
export const createMeeting = (title) =>
  request('/meetings', { method: 'POST', body: JSON.stringify({ title }) });

export const listMeetings = () => request('/meetings');

export const getMeeting = (id) => request(`/meetings/${id}`);

export const deleteMeeting = (id) =>
  request(`/meetings/${id}`, { method: 'DELETE' });

// ---------------------------------------------------------------------------
// SUMMARIES (server/src/routes/summaryRoutes.js)
// ---------------------------------------------------------------------------

/** Trigger LLM summarization on the backend (OpenAI — TODO server-side). */
export const generateSummary = (meetingId) =>
  request(`/meetings/${meetingId}/summary`, { method: 'POST' });

export const getSummary = (meetingId) =>
  request(`/meetings/${meetingId}/summary`);

// ---------------------------------------------------------------------------
// MISC
// ---------------------------------------------------------------------------

/** Ping the backend (server/src/app.js GET /api/health). */
export const checkHealth = () => request('/health');
