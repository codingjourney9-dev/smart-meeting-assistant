/**
 * ============================================================================
 * FILE: server/src/services/summarizationService.js — LLM SUMMARY SERVICE
 *
 * PURPOSE:
 *   Encapsulates ALL LLM logic for turning a finished meeting transcript
 *   into a structured summary (overview, key points, action items,
 *   decisions). Controllers never talk to the LLM directly — they call
 *   `generateMeetingSummary(transcriptText)`.
 *
 *   ✅ IMPLEMENTED: Ollama (local model) — runs entirely on YOUR computer.
 *   No API keys, no internet required, no quotas, 100% FREE.
 *
 *   Ollama runs at http://localhost:11434 by default. We use the llama3
 *   model (downloaded via `ollama pull llama3`).
 *
 *   🛟 SAFETY FALLBACK: if Ollama isn't running, we return the old stub
 *   summary instead of crashing — the app always works.
 *
 * CONNECTIONS:
 *   - Called by:  server/src/controllers/summaryController.js
 *                 (triggered by POST /api/meetings/:meetingId/summary)
 *   - Reads:      Ollama local API at http://localhost:11434
 *   - No API key needed — everything is local!
 *
 * HOW IT WORKS:
 *   1. We send the transcript + a prompt to Ollama
 *   2. Ollama runs the llama3 model locally on your computer
 *   3. It returns a structured JSON summary
 *   4. We parse and return it to the controller
 * ============================================================================
 */

import { env } from '../config/env.js';

// Ollama's local API endpoint (default port)
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

// Model to use — must be downloaded first: `ollama pull llama3`
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';

/**
 * Generate a structured summary for one meeting transcript.
 *
 * @param {string} transcriptText - Full plain-text transcript of the meeting.
 * @returns {Promise<{ overview: string, keyPoints: string[],
 *                     actionItems: string[], decisions: string[] }>}
 */
export async function generateMeetingSummary(transcriptText) {
  console.log(`[llm] Ollama summarization starting (${transcriptText.length} chars of transcript)`);
  console.log(`[llm] Using model: ${OLLAMA_MODEL} at ${OLLAMA_URL}`);

  // --------------------------------------------------------------------------
  // Check if Ollama is running
  // --------------------------------------------------------------------------
  try {
    const healthCheck = await fetch(`${OLLAMA_URL}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    if (!healthCheck.ok) {
      throw new Error('Ollama not responding');
    }

    console.log('[llm] Ollama is running, proceeding with summarization...');
  } catch (err) {
    console.warn(
      '[llm] Ollama is not running or not reachable. ' +
      'Make sure Ollama is installed and running (check system tray for llama icon). ' +
      'Returning STUB summary.'
    );
    return stubSummary();
  }

  // --------------------------------------------------------------------------
  // Build the prompt for structured JSON output
  // --------------------------------------------------------------------------
  const prompt = `You are a meeting summarization assistant. Analyze this meeting transcript and extract:

1. A 2-4 sentence overview of what was discussed
2. Key points (main topics covered)
3. Action items (tasks that need to be done, with who is responsible if mentioned)
4. Decisions (things that were explicitly agreed upon)

IMPORTANT: You MUST respond with ONLY valid JSON in this exact format:
{
  "overview": "2-4 sentence overview here",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "actionItems": ["action 1 - who is responsible", "action 2"],
  "decisions": ["decision 1", "decision 2"]
}

If a section has no content, use an empty array []. Do not add any text before or after the JSON.

MEETING TRANSCRIPT:
${transcriptText}`;

  // --------------------------------------------------------------------------
  // Call Ollama's API
  // --------------------------------------------------------------------------
  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: prompt,
        stream: false, // Wait for complete response
        format: 'json', // Force JSON output
        options: {
          temperature: 0.3, // Factual, low-creativity
          num_predict: 1000, // Max tokens for response
        }
      }),
      signal: AbortSignal.timeout(300000) // 5 minute timeout for first run (model loading)
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      console.error(`[llm] Ollama API error ${response.status}:`, errBody.slice(0, 300));
      throw new Error(
        `Ollama API error (HTTP ${response.status}). ` +
        'Make sure Ollama is running and the model is downloaded.'
      );
    }

    const data = await response.json();

    // Ollama returns: { response: "{ \"overview\": ... }", ... }
    const jsonText = data?.response;
    if (!jsonText) {
      console.error('[llm] Unexpected Ollama response:', JSON.stringify(data).slice(0, 300));
      throw new Error('Ollama returned an unexpected response.');
    }

    console.log('[llm] Raw Ollama response received, parsing...');

    const summary = JSON.parse(jsonText);

    // Helper function to ensure a field is an array of strings
    // Sometimes the model returns strings that look like arrays, or uses single quotes
    function ensureStringArray(field) {
      if (!field) return [];
      
      // If it's already an array, clean it up
      if (Array.isArray(field)) {
        return field.map(item => {
          // If an item is a string that looks like an array, parse it
          if (typeof item === 'string' && item.trim().startsWith('[')) {
            try {
              // Replace single quotes with double quotes for valid JSON
              const fixed = item.replace(/'/g, '"');
              const parsed = JSON.parse(fixed);
              return Array.isArray(parsed) ? parsed : [item];
            } catch {
              return [item];
            }
          }
          return typeof item === 'string' ? item : String(item);
        }).flat(); // Flatten nested arrays
      }
      
      // If it's a string that looks like an array, try to parse it
      if (typeof field === 'string' && field.trim().startsWith('[')) {
        try {
          const fixed = field.replace(/'/g, '"');
          const parsed = JSON.parse(fixed);
          return Array.isArray(parsed) ? parsed : [field];
        } catch {
          return [field];
        }
      }
      
      // Otherwise, wrap in array
      return [String(field)];
    }

    console.log('[llm] Ollama summary generated successfully!');

    // Normalize: guarantee all fields exist and are proper arrays
    return {
      overview: summary.overview || '',
      keyPoints: ensureStringArray(summary.keyPoints),
      actionItems: ensureStringArray(summary.actionItems),
      decisions: ensureStringArray(summary.decisions),
    };

  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      console.error('[llm] Ollama request timed out. This usually means:');
      console.error('  1. First run - model is loading into memory (try again in 1 minute)');
      console.error('  2. Model is too large for your computer');
      console.error('  3. Try a faster model: ollama pull phi3');
      throw new Error(
        'Ollama request timed out. First run? Wait 1 minute and try again. ' +
        'For faster results, use: ollama pull phi3'
      );
    }
    if (err.name === 'SyntaxError') {
      // JSON parse failed — the model might have returned malformed JSON
      console.error('[llm] Failed to parse Ollama response as JSON:', err.message);
      throw new Error('Ollama returned invalid JSON. Try again or use a different model.');
    }
    throw err;
  }
}

/**
 * Stub summary — returned when Ollama isn't available.
 */
function stubSummary() {
  return {
    overview:
      'STUB SUMMARY: Ollama is not running. Start Ollama (check your system tray ' +
      'for the llama icon) and make sure you ran: ollama pull llama3',
    keyPoints: ['Ollama is not running', 'Install and start Ollama to get real summaries'],
    actionItems: ['Install Ollama from https://ollama.ai', 'Run: ollama pull llama3'],
    decisions: ['Use local AI for privacy and zero cost'],
  };
}
