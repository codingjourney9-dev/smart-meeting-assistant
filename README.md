# 🎙️ Smart Meeting Assistant — MERN Boilerplate

Live audio capture → real-time transcription → LLM summarization.

## Architecture at a Glance

```
┌─────────────────────────────┐                ┌──────────────────────────────────┐
│  CLIENT (React + Vite)      │                │  SERVER (Node + Express)         │
│  http://localhost:5173      │                │  http://localhost:5000           │
│                             │                │                                  │
│  useAudioRecorder (mic)     │  binary audio  │  websocket/audioSocket.js        │
│   └→ useTranscriptionSocket ├───────────────►│   └→ transcriptionService        │
│       (WS hot path)         │◄───────────────┤       [TODO: Deepgram SDK]       │
│                             │  transcripts   │                                  │
│  apiClient.js (REST)        │  JSON / REST   │  app.js → routes → controllers   │
│   └→ /api/* (Vite proxy)    ├───────────────►│   └→ summarizationService        │
│                             │◄───────────────┤       [TODO: OpenAI API]         │
│                             │                │   └→ models/ [TODO: Mongoose →   │
│                             │                │        MongoDB via config/db.js] │
└─────────────────────────────┘                └──────────────────────────────────┘
```

**Two communication channels:**

| Channel | Protocol | Endpoint | Used for |
|---|---|---|---|
| Hot path | WebSocket | `ws://localhost:5000/audio?meetingId=<id>` | Streaming mic audio up, live transcripts down |
| Cold path | REST/JSON | `http://localhost:5000/api/*` (Vite-proxied as `/api/*`) | Meetings CRUD, summary generation/fetch |

Both run on **one port (5000)** — `server/src/index.js` attaches Express and the
`ws` server to a single `http.Server`.

## Folder Map (every file has a header comment explaining its connections)

```
client/
  vite.config.js              /api proxy → :5000
  src/main.jsx → App.jsx      bootstrap + view routing
  src/api/apiClient.js        ALL REST calls live here
  src/hooks/useAudioRecorder.js        mic → 250ms audio chunks
  src/hooks/useTranscriptionSocket.js  WS client for /audio
  src/pages/Dashboard.jsx     wires mic + WS together (the orchestrator)
  src/pages/MeetingDetail.jsx transcript + summary view
  src/components/             RecorderControls, LiveTranscript, SummaryPanel, MeetingList

server/
  src/index.js                ONE http.Server: Express + WebSocket on :5000
  src/app.js                  middleware + /api route mounts
  src/websocket/audioSocket.js   WS endpoint /audio (the hot path)
  src/routes/ → controllers/  meetings + summaries REST
  src/services/transcriptionService.js   ← TODO: Deepgram SDK here
  src/services/summarizationService.js   ← TODO: OpenAI API here
  src/config/db.js                       ← TODO: Mongoose → MongoDB here
  src/models/Meeting.js, TranscriptSegment.js   schemas (commented, ready)
```

## Run It

```bash
# Terminal 1 — backend (port 5000)
cd server
cp .env.example .env
npm install
npm run dev

# Terminal 2 — frontend (port 5173)
cd client
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5173. The full pipeline works **today with stubs**:
clicking "Start Recording" streams real mic audio over the WebSocket, and the
server echoes stub transcript lines back so you can watch the round trip
before any API keys exist.

## Implementation Roadmap (the TODOs, in order)

1. **MongoDB** — `npm i mongoose` in `server/`, implement `src/config/db.js`,
   uncomment `src/models/*.js`, replace the in-memory Map in
   `controllers/meetingController.js`.
2. **Deepgram** — `npm i @deepgram/sdk`, implement
   `src/services/transcriptionService.js` (sketch provided in-file), persist
   final segments in `websocket/audioSocket.js`.
3. **OpenAI** — `npm i openai`, implement
   `src/services/summarizationService.js`, load real transcripts in
   `controllers/summaryController.js`.

Every TODO site is marked in-file with the exact implementation sketch.
