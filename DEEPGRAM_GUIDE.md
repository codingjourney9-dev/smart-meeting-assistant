# 🎙️ Deepgram Setup Guide — From Absolute Zero

Goal: replace the fake "[stub transcript]" lines with YOUR REAL WORDS,
transcribed live as you speak. Time: ~10 minutes. Cost: $0 — Deepgram
gives ~$200 of free credit on signup, no credit card needed.
(For reference: that's roughly 750+ HOURS of transcription. Plenty.)

---

## Part 0: What is Deepgram and what are we doing? (1 min read)

Deepgram is a company whose computers are very good at one thing:
listening to audio and typing out the words (speech-to-text).

Right now your app already streams your microphone audio to YOUR server
— but your server doesn't know how to "understand" audio, so it sends
back fake stub lines. After this guide:

  your mic → your server → Deepgram (understands it) → real words
  → back to your server → your screen, live

An "API key" is like a password that proves to Deepgram the requests
come from YOUR account. You'll get one from their website and put it on
your server's sticky note (.env file). Same routine as MongoDB, but
EASIER — no clusters, no network access, just one key.

⚠️ IMPORTANT: you also need UPDATED CODE FILES for this step (I rewrote
the transcription service). See Part 1.

WHERE each part happens:
- Part 1: File Explorer (copying updated files)
- Parts 2-3: WEB BROWSER (deepgram website)
- Part 4: TERMINAL + NOTEPAD (.env)
- Part 5: TERMINAL + BROWSER (the fun part)

---

## Part 1: Get the updated code files  [FILE EXPLORER]

The new download (from the workspace) has these changed files:

    server/package.json                            ← adds @deepgram/sdk
    server/src/services/transcriptionService.js    ← the real Deepgram code

Copy them from the fresh download over your existing copies in
Desktop\smart-meeting-assistant\server\  (same places).

⚠️ As always: do NOT touch/overwrite your server\.env file — that's
your sticky note with the MongoDB password. Downloads never contain it.

(Safest simple method: copy the whole downloaded `server\src` folder
over yours + the downloaded `server\package.json`. Your .env survives
because downloads don't include one.)

## Part 2: Create a free Deepgram account  [BROWSER]

1. Go to:  https://console.deepgram.com/signup
2. Sign up — Google login is easiest, or email + password.
3. You may get a small questionnaire — answers don't matter.
4. You land in the Deepgram "Console" (their dashboard). You should see
   a mention of your free credit (~$200).

## Part 3: Create your API key  [BROWSER]

1. In the Console, look in the left sidebar for **"API Keys"**.
   (If you don't see it: there may be a "Settings" or key icon — it's
   one click away from the main dashboard. Newer signups sometimes get
   a key shown right on the welcome screen — that works too.)
2. Click **"Create a New API Key"** (or similar button).
3. Name/friendly name: type anything, e.g.  meeting-assistant
4. Permissions/scope (if asked): leave default ("Member" / "Usage" is fine).
5. Expiration (if asked): "Never" or the longest option.
6. Click **Create Key**.
7. 🚨 THE KEY IS SHOWN ONLY ONCE — a long text like
   "a1b2c3d4e5f6..." (30-40 characters). Click COPY immediately and
   paste it somewhere safe (Notepad). If you lose it, no drama: just
   create another key.

## Part 4: Put the key in your .env  [TERMINAL + NOTEPAD]

1. Server terminal (the one in the `server` folder). If the server is
   running: Ctrl+C → Y → Enter to stop it.
2. Type:   notepad .env
3. Find the line:    DEEPGRAM_API_KEY=your_deepgram_api_key_here
4. Replace ONLY the part after the = with your real key:

       DEEPGRAM_API_KEY=a1b2c3d4e5f67890abcdef1234567890abcdef12

   ✔ no spaces, no quotes, all one line. Leave the other lines alone.
5. Ctrl+S to save, close Notepad.

## Part 5: Install + restart + SPEAK!  [TERMINAL + BROWSER]

1. In the server terminal:

       npm install        ← downloads the Deepgram library (one time)
       npm run dev

   ✅ Boot log should look the same as before (Mongoose connected, etc.)

2. Frontend running? (client terminal → npm run dev if not)

3. Browser → http://localhost:5173 → ● Start Recording → Allow mic.

4. NOW SPEAK. Say anything: "Hello, this is my first real transcription,
   today is Friday and this project is awesome."

5. 🤯 Watch your ACTUAL WORDS appear on screen:
   - grey italic text = Deepgram's live "rough draft" (interim results)
   - it solidifies into white final lines as you finish sentences

6. ■ Stop Recording → open the meeting → your real transcript is STORED
   (MongoDB!) → ✨ Generate Summary still gives a stub summary — that's
   the LAST remaining stub (OpenAI step, coming next).

### How to know which mode you're in (terminal tells you):

   REAL:  [stt] Deepgram live session starting (meetingId=...)
          [stt] Deepgram connection open ...
   STUB:  [stt] DEEPGRAM_API_KEY not set — using STUB transcripts.

---

## Troubleshooting

| Symptom | Cause / Fix |
|---|---|
| Still seeing "[stub transcript]..." lines | Key not loaded: .env not saved, still says your_deepgram_api_key_here, or server not restarted after editing. Also confirm Part 1 files were copied (terminal must NOT say "STUB transcription session started" — old code). |
| Terminal: "Deepgram error ... 401" or "Invalid credentials" | Key is wrong/incomplete — re-copy it, or create a fresh key in the Console. |
| Terminal: Deepgram error mentioning insufficient permissions | Key was created with too narrow scope — create a new key with default/Member permissions. |
| Words appear but slowly/with gaps | Normal on slow internet — audio goes to Deepgram's servers and back. Also make sure you speak clearly near the mic. |
| Nothing appears at all, no errors | Check the mic permission (🔒 icon in address bar), and that the WebSocket pill says "open". |
| "Cannot find module '@deepgram/sdk'" | npm install didn't run/finish in the server folder after copying the new package.json. |
