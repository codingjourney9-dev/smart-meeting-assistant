/**
 * ============================================================================
 * FILE: server/src/controllers/meetingController.js — MEETINGS BUSINESS LOGIC
 *
 * PURPOSE:
 *   Implements the request handlers for meeting CRUD. Receives parsed HTTP
 *   requests from routes/meetingRoutes.js, reads/writes MongoDB via
 *   models/Meeting.js + models/TranscriptSegment.js, and returns JSON.
 *
 *   ✅ IMPLEMENTED: real Mongoose persistence (formerly an in-memory Map).
 *   Meetings now SURVIVE server restarts.
 *
 * CONNECTIONS:
 *   - Invoked by:    server/src/routes/meetingRoutes.js
 *   - Uses models:   server/src/models/Meeting.js
 *                    server/src/models/TranscriptSegment.js
 *   - Responses consumed by: client/src/api/apiClient.js ->
 *       Dashboard.jsx (createMeeting), MeetingList.jsx (listMeetings),
 *       MeetingDetail.jsx (getMeeting)
 *   - Errors funnel to: server/src/middleware/errorHandler.js (via next(err))
 * ============================================================================
 */

import { Meeting } from '../models/Meeting.js';
import { TranscriptSegment } from '../models/TranscriptSegment.js';

/**
 * POST /api/meetings
 * Body: { title?: string }
 * Called by the frontend BEFORE recording starts (Dashboard.jsx), so the
 * returned `_id` can be passed to ws://localhost:5000/audio?meetingId=<id>.
 */
export async function createMeeting(req, res, next) {
  try {
    const title = req.body?.title || `Meeting ${new Date().toLocaleString()}`;

    const meeting = await Meeting.create({ title, status: 'recording' });

    res.status(201).json(meeting);
  } catch (err) {
    next(err); // -> middleware/errorHandler.js
  }
}

/** GET /api/meetings — list for client/src/components/MeetingList.jsx */
export async function listMeetings(_req, res, next) {
  try {
    // Newest first; .lean() returns plain objects (faster, JSON-ready).
    const meetings = await Meeting.find().sort({ createdAt: -1 }).lean();
    res.json(meetings);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/meetings/:id — detail for client/src/pages/MeetingDetail.jsx
 * Joins the meeting doc with its transcript segments (separate collection,
 * see models/TranscriptSegment.js header for why) into the shape the
 * frontend expects: { ...meeting, transcript: [{ text, timestamp }] }.
 */
export async function getMeeting(req, res, next) {
  try {
    const meeting = await Meeting.findById(req.params.id).lean();
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Pull the stored transcript, oldest first (written by audioSocket.js).
    const transcript = await TranscriptSegment.find({
      meetingId: meeting._id,
      isFinal: true,
    })
      .sort({ timestamp: 1 })
      .select('text timestamp -_id')
      .lean();

    res.json({ ...meeting, transcript });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/meetings/:id — removes the meeting AND its transcript. */
export async function deleteMeeting(req, res, next) {
  try {
    const deleted = await Meeting.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Cascade: orphaned segments would pile up forever otherwise.
    await TranscriptSegment.deleteMany({ meetingId: req.params.id });

    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
