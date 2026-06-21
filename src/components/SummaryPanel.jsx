/**
 * ============================================================================
 * FILE: client/src/components/SummaryPanel.jsx — LLM SUMMARY UI
 *
 * PURPOSE:
 *   Displays the structured meeting summary (overview / key points / action
 *   items / decisions) and owns the "Generate Summary" button that triggers
 *   the backend LLM pipeline.
 *
 * WHAT THE BUTTON ACTUALLY DOES (full round trip):
 *   click -> apiClient.generateSummary(meetingId)
 *         -> POST http://localhost:5000/api/meetings/:id/summary  [REST]
 *         -> server routes/summaryRoutes.js
 *         -> server controllers/summaryController.generateSummary
 *         -> server services/summarizationService.js
 *            (TODO: Call OpenAI API for meeting summary there)
 *         -> JSON summary returned and rendered below.
 *
 * CONNECTIONS:
 *   - Rendered by:  client/src/pages/MeetingDetail.jsx
 *   - Uses REST:    client/src/api/apiClient.js (generateSummary)
 *   - Summary shape mirrors the schema in server models/Meeting.js:
 *       { overview, keyPoints[], actionItems[], decisions[] }
 * ============================================================================
 */

import { useState } from 'react';
import { generateSummary } from '../api/apiClient.js';

export default function SummaryPanel({ meetingId, summary, onSummaryGenerated }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /** Fire the backend LLM pipeline (OpenAI — currently a server-side stub). */
  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      // REST: POST /api/meetings/:id/summary (see file header for full path).
      const result = await generateSummary(meetingId);
      onSummaryGenerated(result.summary); // lift state up to MeetingDetail.jsx
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel summary-panel">
      <h3>AI Summary</h3>

      {!summary && (
        <button onClick={handleGenerate} disabled={loading}>
          {loading ? 'Summarizing… (LLM call in progress)' : '✨ Generate Summary'}
        </button>
      )}

      {error && <p className="error">Summary failed: {error}</p>}

      {summary && (
        <div className="summary-content">
          <h4>Overview</h4>
          <p>{summary.overview}</p>

          <h4>Key Points</h4>
          <ul>
            {summary.keyPoints?.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>

          <h4>Action Items</h4>
          <ul>
            {summary.actionItems?.map((item, i) => (
              <li key={i}>☐ {item}</li>
            ))}
          </ul>

          <h4>Decisions</h4>
          <ul>
            {summary.decisions?.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>

          {/* Allow regeneration after the first summary exists. */}
          <button onClick={handleGenerate} disabled={loading}>
            {loading ? 'Regenerating…' : '↻ Regenerate'}
          </button>
        </div>
      )}
    </section>
  );
}
