/**
 * ============================================================================
 * FILE: server/src/routes/meetingRoutes.js — MEETINGS REST ROUTES
 *
 * PURPOSE:
 *   Declares the URL surface for meeting CRUD. Routes contain ZERO business
 *   logic — they only map HTTP verbs/paths to controller functions.
 *
 * ROUTES (mounted at /api/meetings by server/src/app.js):
 *   POST   /api/meetings        -> create a meeting (called by the frontend
 *                                  BEFORE recording starts, so the WebSocket
 *                                  has a meetingId to tag audio with)
 *   GET    /api/meetings        -> list all meetings (MeetingList.jsx)
 *   GET    /api/meetings/:id    -> one meeting + transcript (MeetingDetail.jsx)
 *   DELETE /api/meetings/:id    -> delete a meeting
 *
 * CONNECTIONS:
 *   - Mounted by:   server/src/app.js  at '/api/meetings'
 *   - Delegates to: server/src/controllers/meetingController.js
 *   - Called from the frontend by: client/src/api/apiClient.js
 *     (createMeeting, listMeetings, getMeeting, deleteMeeting)
 *
 * FUTURE INTEGRATIONS:
 *   - TODO: Add auth middleware per-route here when users are introduced,
 *     e.g. router.post('/', requireAuth, createMeeting);
 * ============================================================================
 */

import { Router } from 'express';
import {
  createMeeting,
  listMeetings,
  getMeeting,
  deleteMeeting,
} from '../controllers/meetingController.js';

const router = Router();

router.post('/', createMeeting);      // POST   /api/meetings
router.get('/', listMeetings);        // GET    /api/meetings
router.get('/:id', getMeeting);       // GET    /api/meetings/:id
router.delete('/:id', deleteMeeting); // DELETE /api/meetings/:id

export default router;
