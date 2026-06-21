/**
 * ============================================================================
 * FILE: server/src/routes/summaryRoutes.js — SUMMARY REST ROUTES
 *
 * PURPOSE:
 *   Declares the URL surface for LLM-generated meeting summaries. Kept
 *   separate from meetingRoutes.js because summarization is a distinct
 *   concern (it triggers an expensive OpenAI call, not simple CRUD).
 *
 * ROUTES (mounted at /api/meetings by server/src/app.js):
 *   POST /api/meetings/:meetingId/summary
 *        -> generate (or regenerate) a summary from the stored transcript.
 *           Fired by the "Generate Summary" button in
 *           client/src/components/SummaryPanel.jsx.
 *   GET  /api/meetings/:meetingId/summary
 *        -> fetch a previously generated summary (MeetingDetail.jsx).
 *
 * CONNECTIONS:
 *   - Mounted by:   server/src/app.js  at '/api/meetings'
 *   - Delegates to: server/src/controllers/summaryController.js
 *   - Called from the frontend by: client/src/api/apiClient.js
 *     (generateSummary, getSummary)
 * ============================================================================
 */

import { Router } from 'express';
import { generateSummary, getSummary } from '../controllers/summaryController.js';

const router = Router();

router.post('/:meetingId/summary', generateSummary); // POST /api/meetings/:id/summary
router.get('/:meetingId/summary', getSummary);       // GET  /api/meetings/:id/summary

export default router;
