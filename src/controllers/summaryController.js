/**
 * ============================================================================
 * FILE: server/src/controllers/summaryController.js — SUMMARY BUSINESS LOGIC
 *
 * PURPOSE:
 *   Orchestrates summary generation: fetch the meeting's transcript from
 *   MongoDB, hand it to the summarization service, persist the result on
 *   the Meeting document, and return it as JSON.
 *
 *   ✅ IMPLEMENTED: real MongoDB reads/writes (formerly stubbed).
 *   ⏳ STILL STUBBED: the LLM itself — summarizationService.js returns
 *   placeholder text until the OpenAI step.
 *
 * FLOW (the full round trip):
 *   1. User clicks "Generate Summary" in client/src/components/SummaryPanel.jsx
 *   2. -> client/src/api/apiClient.js  POST /api/meetings/:id/summary
 *   3. -> routes/summaryRoutes.js  ->  THIS controller
 *   4. -> loads transcript segments (models/TranscriptSegment.js)  ✅
 *   5. -> services/summarizationService.js (OpenAI — TODO)
 *   6. -> saves summary on the Meeting doc (models/Meeting.js)     ✅
 *   7. -> JSON response renders in SummaryPanel.jsx
 *
 * CONNECTIONS:
 *   - Invoked by:  server/src/routes/summaryRoutes.js
 *   - Calls:       server/src/services/summarizationService.js
 *   - Uses models: server/src/models/Meeting.js,
 *                  server/src/models/TranscriptSegment.js
 *   - Errors funnel to: server/src/middleware/errorHandler.js
 * ============================================================================
 */

import { generateMeetingSummary } from '../services/summarizationService.js';
import { Meeting } from '../models/Meeting.js';
import { TranscriptSegment } from '../models/TranscriptSegment.js';

/**
 * POST /api/meetings/:meetingId/summary
 * Generates (or regenerates) the LLM summary for a finished meeting.
 */
export async function generateSummary(req, res, next) {
  try {
    const { meetingId } = req.params;

    // Make sure the meeting exists before doing any work.
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Load the real transcript: every final segment, in spoken order.
    // (These were persisted live by websocket/audioSocket.js.)
    const segments = await TranscriptSegment.find({ meetingId, isFinal: true })
      .sort({ timestamp: 1 })
      .lean();
    const transcriptText = segments.map((s) => s.text).join(' ');

    if (!transcriptText) {
      return res.status(422).json({
        error:
          'No transcript to summarize — record some audio for this meeting first.',
      });
    }

    // Delegate the LLM work to the service layer (OpenAI lives THERE, not here).
    const summary = await generateMeetingSummary(transcriptText);

    // Persist the summary on the Meeting document so GET /summary can serve
    // it later without re-running the (expensive) LLM call.
    meeting.summary = summary;
    meeting.status = 'summarized';
    await meeting.save();

    res.status(201).json({ meetingId, summary });
  } catch (err) {
    next(err); // -> middleware/errorHandler.js
  }
}

/**
 * GET /api/meetings/:meetingId/summary
 * Returns a previously generated summary (used by MeetingDetail.jsx on load).
 */
export async function getSummary(req, res, next) {
  try {
    const { meetingId } = req.params;

    const meeting = await Meeting.findById(meetingId).select('summary').lean();
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // summary is null/undefined until generateSummary has run — the frontend
    // (MeetingDetail.jsx) treats that as "show the Generate button".
    res.json({ meetingId, summary: meeting.summary?.overview ? meeting.summary : null });
  } catch (err) {
    next(err);
  }
}
