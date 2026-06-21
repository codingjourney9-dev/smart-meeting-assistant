/**
 * ============================================================================
 * FILE: server/src/models/TranscriptSegment.js — TRANSCRIPT SEGMENT MODEL
 *
 * PURPOSE:
 *   Defines the MongoDB schema for ONE finalized piece of transcribed speech
 *   (roughly one utterance/sentence from Deepgram). A meeting's full
 *   transcript = all its segments sorted by timestamp. Kept in its own
 *   collection (instead of an array inside Meeting) because live
 *   transcription appends rapidly and segments can grow unbounded.
 *
 *   ✅ IMPLEMENTED: schema is live (formerly a commented-out placeholder).
 *
 * CONNECTIONS:
 *   - Requires the connection made in:  server/src/config/db.js
 *   - WRITTEN by:  server/src/websocket/audioSocket.js
 *       (every transcript event with isFinal === true is persisted)
 *   - READ by:     server/src/controllers/summaryController.js
 *       (joins all segments into one string for the OpenAI summarizer)
 *       and controllers/meetingController.js (getMeeting detail view)
 *   - `meetingId` references models/Meeting.js — it's the same id the
 *     browser passed in ws://localhost:5000/audio?meetingId=<id>.
 *
 * FUTURE INTEGRATIONS:
 *   - TODO: Add a `speaker` field when Deepgram diarization is enabled.
 * ============================================================================
 */

import mongoose from 'mongoose';

const transcriptSegmentSchema = new mongoose.Schema(
  {
    // Which meeting this speech belongs to (models/Meeting.js _id).
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meeting',
      required: true,
      index: true, // we always query "all segments for meeting X"
    },

    // The transcribed text (from services/transcriptionService.js).
    text: { type: String, required: true },

    // Only final results are persisted; interim ones are UI-only.
    isFinal: { type: Boolean, default: true },

    // Server-side capture time (ms epoch) — used to order the transcript.
    timestamp: { type: Number, required: true },

    // TODO: speaker: String  (Deepgram diarization)
  },
  { timestamps: true }
);

export const TranscriptSegment = mongoose.model(
  'TranscriptSegment',
  transcriptSegmentSchema
);
