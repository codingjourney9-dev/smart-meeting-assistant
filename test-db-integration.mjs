/**
 * ============================================================================
 * FILE: server/test-db-integration.mjs — ONE-OFF INTEGRATION TEST (dev only)
 *
 * PURPOSE:
 *   Proves the new MongoDB layer works end-to-end WITHOUT needing Atlas:
 *   boots a real `mongod` (mongodb-memory-server), starts the actual app
 *   (index.js untouched — we just point MONGODB_URI at the test instance),
 *   then exercises: REST create -> WS audio stream -> transcript persistence
 *   -> summary -> SERVER RESTART -> data still there.
 *
 *   Run with:  node test-db-integration.mjs
 *   Safe to delete once you're connected to your own MongoDB.
 * ============================================================================
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import { spawn } from 'node:child_process';
import WebSocket from 'ws';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const api = (path, opts) =>
  fetch(`http://localhost:5000/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  }).then((r) => (r.status === 204 ? null : r.json()));

// 1. Boot a REAL mongod process (in-memory storage, real wire protocol).
const mongod = await MongoMemoryServer.create();
const uri = mongod.getUri('smart-meeting-assistant');
console.log('=== Real MongoDB running at:', uri);

const startServer = () => {
  const proc = spawn('node', ['src/index.js'], {
    env: { ...process.env, MONGODB_URI: uri },
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  return proc;
};

// 2. Start the actual app server against it.
let server = startServer();
await sleep(2500);

// 3. REST: create a meeting (what Dashboard.jsx does before recording).
const meeting = await api('/meetings', {
  method: 'POST',
  body: JSON.stringify({ title: 'Persistence Test Meeting' }),
});
console.log('\n=== Created meeting:', meeting._id, '-', meeting.title);

// 4. WS: stream fake audio chunks; stub transcriber emits transcripts which
//    audioSocket.js should now PERSIST to the TranscriptSegment collection.
await new Promise((resolve, reject) => {
  const ws = new WebSocket(`ws://localhost:5000/audio?meetingId=${meeting._id}`);
  let transcripts = 0;
  ws.on('open', () => {
    for (let i = 0; i < 16; i++) ws.send(Buffer.from('audio-' + i));
  });
  ws.on('message', (d) => {
    const msg = JSON.parse(d.toString());
    if (msg.type === 'transcript') {
      console.log('=== Live transcript event:', msg.text.slice(0, 60));
      if (++transcripts >= 2) ws.send(JSON.stringify({ type: 'stop' }));
    }
  });
  ws.on('close', resolve);
  ws.on('error', reject);
  setTimeout(() => reject(new Error('WS timeout')), 8000);
});
await sleep(500); // let fire-and-forget DB writes land

// 5. REST: transcript should now be readable back from MongoDB.
let detail = await api(`/meetings/${meeting._id}`);
console.log('\n=== Stored transcript segments:', detail.transcript.length);
console.log('=== Meeting status after stop:', detail.status);

// 6. REST: generate + persist a summary (stub LLM, real DB write).
const sum = await api(`/meetings/${meeting._id}/summary`, { method: 'POST' });
console.log('=== Summary saved, overview starts:', sum.summary.overview.slice(0, 50));

// 7. THE BIG TEST: kill the server, restart it, data must SURVIVE.
console.log('\n=== RESTARTING SERVER (the old in-memory version would lose everything) ===');
server.kill('SIGTERM');
await sleep(1000);
server = startServer();
await sleep(2500);

const after = await api(`/meetings/${meeting._id}`);
const sumAfter = await api(`/meetings/${meeting._id}/summary`);
console.log('\n=== AFTER RESTART ===');
console.log('Meeting found:        ', after.title, '| status:', after.status);
console.log('Transcript segments:  ', after.transcript.length);
console.log('Summary still stored: ', sumAfter.summary ? 'YES ✓' : 'NO ✗');

const pass =
  after.title === 'Persistence Test Meeting' &&
  after.transcript.length >= 2 &&
  !!sumAfter.summary;
console.log(pass ? '\n✅ ALL PERSISTENCE TESTS PASSED' : '\n❌ TEST FAILED');

server.kill('SIGTERM');
await mongod.stop();
process.exit(pass ? 0 : 1);
