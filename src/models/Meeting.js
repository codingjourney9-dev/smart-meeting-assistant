/**
 * ============================================================================
 * FILE: server/src/models/Meeting.js — MEETING DATA MODEL (Mongoose)
 *
 * PURPOSE:
 *   Defines the MongoDB schema for one meeting session: its title, lifecycle
 *   status, and the LLM-generated summary. The transcript itself lives in a
 *   separate collection (TranscriptSegment.js) because live transcription
 *   produces many small writes — embedding them here would bloat the doc.
 *
 *   ✅ IMPLEMENTED: schema is live (formerly a commented-out placeholder).
 *   ✅ UPDATED: More flexible summary arrays to handle LLM output quirks.
 *
 * CONNECTIONS:
 *   - Requires the connection made in:  server/src/config/db.js
 *   - Used by:
 *       * controllers/meetingController.js (CRUD)
 *       * controllers/summaryController.js (saving the summary)
 *   - Related model: models/TranscriptSegment.js
 *     (segments reference Meeting via their `meetingId` field)
 *   - The `_id` of this document is the `meetingId` that travels through
 *     the ENTIRE system: REST URLs (/api/meetings/:id) AND the WebSocket
 *     query string (ws://localhost:5000/audio?meetingId=<id>).
 *
 * FUTURE INTEGRATIONS:
 *   - TODO: Add a `userId` field (ref: 'User') when authentication arrives.
 * ============================================================================
 */

import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },

    // Lifecycle: recording -> completed -> summarized
    status: {
      type: String,
      enum: ['recording', 'completed', 'summarized'],
      default: 'recording',
    },

    // Structured output of services/summarizationService.js (Ollama).
    // Shape mirrors what SummaryPanel.jsx renders on the frontend.
    // Using flexible defaults to handle LLM output quirks.
    summary: {
      overview: { type: String, default: '' },
      keyPoints: { type: [String], default: [] },
      actionItems: { type: [String], default: [] },
      decisions: { type: [String], default: [] },
    },

    durationSeconds: { type: Number, default: 0 },

    // TODO: userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true } // adds createdAt / updatedAt automatically
);

export const Meeting = mongoose.model('Meeting', meetingSchema);
