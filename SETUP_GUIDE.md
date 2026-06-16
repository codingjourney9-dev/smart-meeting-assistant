# 🟢 Beginner Setup Guide — From Absolute Zero

This guide assumes you have NEVER run a development project before.
Follow it top to bottom. Total time: ~10-15 minutes.

---

## Part 0: Understand what you're about to do (1 minute)

This project is made of TWO separate programs that must BOTH be running
at the same time on YOUR computer:

1. **The backend (server folder)** — an invisible program that handles
   data, audio, and (later) AI. It runs on "port 5000".
2. **The frontend (client folder)** — the website/UI you see in your
   browser. It runs on "port 5173".

"localhost" simply means "my own computer". So `http://localhost:5173`
means: "browser, open the website being served by a program running on
THIS computer at port 5173." If that program isn't running, the browser
says "This site can't be reached" — that's all that error means.

A "terminal" (also called Command Prompt / PowerShell on Windows,
Terminal on Mac) is just a window where you type text commands instead
of clicking buttons. You will need TWO terminal windows open at once —
one per program.

---

## Part 1: Install Node.js (one time only)

Node.js is the engine that runs JavaScript outside the browser. Both
programs need it.

1. Go to https://nodejs.org
2. Download the big green **LTS** button (Long Term Support version).
3. Run the installer. Click Next/Next/Finish — defaults are fine.
4. **Verify it worked:**
   - Windows: press the Windows key, type `cmd`, press Enter.
   - Mac: press Cmd+Space, type `terminal`, press Enter.
   - In the window that opens, type: `node -v` and press Enter.
   - If you see a version number like `v20.11.0` → success.
   - If you see "not recognized" → close the terminal, reopen it, try
     again. Still failing? Restart the computer (the installer updates
     your system PATH and a restart guarantees it's picked up).

---

## Part 2: Get the project folder onto your computer

You need the `smart-meeting-assistant` folder saved somewhere you can
find it — e.g. your Desktop or Documents folder.

If you got it as a ZIP: right-click → "Extract All" first. You can NOT
run it from inside a zip.

Remember the location. Example used in this guide:
- Windows: `C:\Users\YourName\Desktop\smart-meeting-assistant`
- Mac:     `/Users/yourname/Desktop/smart-meeting-assistant`

---

## Part 3: Open Terminal #1 and start the BACKEND

### 3a. Open a terminal IN the right folder

Easiest way on **Windows**:
1. Open File Explorer and navigate INTO the `smart-meeting-assistant`
   folder, then INTO the `server` folder inside it.
2. Click the address bar at the top (where the folder path is shown).
3. Type `cmd` and press Enter.
4. A black window opens, already "inside" that folder. Done.

On **Mac**:
1. Open Terminal (Cmd+Space → "terminal").
2. Type `cd ` (with a space), then DRAG the `server` folder from Finder
   into the Terminal window — it pastes the path for you. Press Enter.

### 3b. Install the backend's dependencies (one time only)

Type this and press Enter:

    npm install

This downloads the libraries the backend needs (Express, etc.) into a
`node_modules` folder. Takes ~30 seconds. Warnings in yellow are fine;
only red "ERR!" lines are problems.

### 3c. Create the settings file (one time only)

Windows (cmd):        copy .env.example .env
Mac / PowerShell:     cp .env.example .env

This copies the settings template to a real settings file. The defaults
are already correct — you don't need to edit anything yet.

### 3d. Start the backend

    npm run dev

✅ SUCCESS looks like:

    [server] REST API listening on  http://localhost:5000/api
    [server] Audio WebSocket on     ws://localhost:5000/audio

⚠️ The line "[db] STUB: Database connection skipped" is NORMAL. Ignore it.

🚨 IMPORTANT: Leave this window OPEN. Minimize it if you want, but do
not close it and do not press Ctrl+C — that stops the backend.

---

## Part 4: Open Terminal #2 and start the FRONTEND

Open a SECOND terminal window, this time inside the `client` folder
(same trick as step 3a, but navigate into `client` instead of `server`).

Then run these three commands, pressing Enter after each:

    npm install

    copy .env.example .env     (Windows cmd)
    cp .env.example .env       (Mac / PowerShell)

    npm run dev

✅ SUCCESS looks like:

    VITE v5.x.x  ready in 300 ms
    ➜  Local:   http://localhost:5173/

🚨 Leave this window open too. You now have TWO terminals running.

---

## Part 5: Open the app

1. Open your browser (Chrome recommended).
2. Go to:  http://localhost:5173
3. You should see the dark "🎙️ Smart Meeting Assistant" page.
4. Click "● Start Recording".
5. The browser asks for microphone permission → click ALLOW.
6. Within ~2 seconds, grey "[stub transcript] received N audio chunks…"
   lines start appearing. THAT MEANS EVERYTHING WORKS — your real mic
   audio is streaming to the backend and responses are coming back live.
7. Click "■ Stop Recording", then "View this meeting & generate
   summary →", then "✨ Generate Summary" to see the placeholder
   AI summary.

(The transcripts say "stub" because the real Deepgram/OpenAI
integrations are the NEXT step of the project — the plumbing they'll
flow through is what you just verified.)

---

## Daily routine from now on

The `npm install` and `copy .env...` steps were ONE-TIME. From now on,
starting the app is just:

  Terminal 1:  cd into server  →  npm run dev
  Terminal 2:  cd into client  →  npm run dev
  Browser:     http://localhost:5173

To stop everything: press Ctrl+C in each terminal (or just close them).

---

## Troubleshooting

| What you see                              | What it means / fix |
|-------------------------------------------|---------------------|
| "npm is not recognized"                   | Node.js not installed or terminal opened before install finished. Reinstall from nodejs.org, reopen terminal, restart PC if needed. |
| "This site can't be reached" in browser   | One or both terminals aren't running. Check both show their ✅ success messages. |
| "EADDRINUSE ... 5000"                     | Another program is using port 5000. Close other dev projects, or ask for help changing the port. |
| "Cannot find module ..."                  | `npm install` wasn't run in THAT folder. cd into it and run it. |
| "ENOENT ... package.json"                 | Your terminal is in the wrong folder. You must be INSIDE `server` or `client`, not the parent folder. |
| Mic permission denied / no transcript     | Click the 🔒 icon left of the browser address bar → Site settings → Microphone → Allow → reload page. |
| Page loads but "Could not load meetings"  | Frontend is running but backend isn't. Check Terminal 1. |
