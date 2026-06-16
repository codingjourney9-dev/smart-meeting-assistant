# 🔄 Guide: Setting Up the UPDATED Project (MongoDB version) — From Zero

You already had the app running once. Then we added a new feature
(real MongoDB saving). This guide explains how to get the NEW version
running on your computer, assuming nothing.

---

## Part 0: What's going on? (read this — it explains everything)

1. The FIRST version of the project you ran had a "fake" memory-only
   database. Restarting the server erased all meetings.
2. I then UPGRADED the code so it saves everything to MongoDB (a real
   database in the cloud that you created on the Atlas website).
3. Upgraded code = changed files. Your computer still had the OLD files,
   so you downloaded the project again — that's the new folder in your
   Downloads called something like:
   workspace-019ebb70-....\smart-meeting-assistant
4. THIS NEW FOLDER is your project from now on. The old folder is
   outdated — ignore it (don't delete it yet; your old .env with the
   database password is inside it and we can copy from it).

One more key concept, because it caused your last error:

   smart-meeting-assistant\     ← the WRAPPER folder. npm does NOT work here.
   ├── server\                  ← program #1 (backend).  npm works HERE.
   └── client\                  ← program #2 (website).  npm works HERE.

npm commands only work in a folder that contains a `package.json` file.
`server` and `client` each have one. The wrapper folder does not —
that's why you saw "Could not read package.json".

The .env files: each program has a "sticky note with settings" called
`.env`. Downloads NEVER include your personal .env (it holds your
password, so it's deliberately not shared). You must (re)create it once
in the new folder. Takes 1 minute.

---

## Part 1 (optional but recommended): Move the project out of Downloads

Downloads is a messy place to keep a project. Let's put it on the Desktop.

1. Open File Explorer → go to Downloads → open the folder named
   workspace-019ebb70-... (long random name).
2. Inside is `smart-meeting-assistant`. RIGHT-CLICK it → Copy.
3. Go to your Desktop → right-click empty space → Paste.

From now on, EVERYTHING happens in:  Desktop\smart-meeting-assistant
(If you skip this part, that's okay — just do all steps below in the
Downloads location instead, consistently.)

## Part 2: Terminal #1 — the backend (server)

### 2a. Open a terminal INSIDE the server folder
1. In File Explorer, go INTO Desktop\smart-meeting-assistant → INTO `server`.
   (You should see: package.json, src folder, .env.example)
2. Click the ADDRESS BAR at the top of File Explorer.
3. Type:  cmd   and press Enter.
4. A black window opens. Its prompt should END WITH  \server>
   ✔ Ends with \server>  → correct, continue.
   ✘ Ends with \smart-meeting-assistant>  → you're one level too high.
     Type:  cd server   and press Enter to step in.

### 2b. Install the libraries (one time per new folder)
Type:

    npm install

Wait ~30-60 seconds. Yellow warnings = fine. Red ERR! = paste it to me.
(This now also installs "mongoose" — the new library that talks to MongoDB.)

### 2c. Create the settings file with your database password
Type:

    notepad .env

Notepad asks "Cannot find... create new file?" → click YES.
Paste these 5 lines, then FIX the MONGODB_URI line (see below):

    PORT=5000
    CLIENT_ORIGIN=http://localhost:5173
    MONGODB_URI=PASTE_YOUR_ATLAS_STRING_HERE
    DEEPGRAM_API_KEY=your_deepgram_api_key_here
    OPENAI_API_KEY=your_openai_api_key_here

The MONGODB_URI line must be YOUR Atlas connection string — the long
mongodb+srv://... text. Two ways to get it:

  EASY WAY: you already made this line in the OLD project folder!
  Open a second Notepad: File → Open → navigate to the OLD
  smart-meeting-assistant\server folder → file type dropdown to
  "All Files (*.*)" → open `.env` → copy the whole MONGODB_URI line →
  paste it into the new file, replacing the placeholder line.

  FRESH WAY: Atlas website → Database → Connect → Drivers → copy the
  string → replace <db_password> with your real password → insert
  smart-meeting-assistant between the / and the ? →
  result looks like:
  MONGODB_URI=mongodb+srv://meetingapp:MyPass123@cluster0.ab1cd.mongodb.net/smart-meeting-assistant?retryWrites=true&w=majority

Save (Ctrl+S), close Notepad.

### 2d. Start the backend
Type:

    npm run dev

✅ SUCCESS looks like (note the NEW first line — this is the whole point):

    [db] Mongoose connected to MongoDB
    [ws] Audio WebSocket server attached at path /audio
    [server] REST API listening on  http://localhost:5000/api

❌ If you see "[db] STUB: Database connection skipped" → you are running
   the OLD folder's code. Check you're in the NEW folder.
❌ If you see "bad auth" → password in MONGODB_URI is wrong.
❌ If you see "Server selection timed out" → Atlas Network Access isn't
   allowing your computer (add 0.0.0.0/0 on the Atlas website).

LEAVE THIS WINDOW OPEN.

## Part 3: Terminal #2 — the frontend (client)

### 3a. Open a SECOND terminal inside the client folder
File Explorer → Desktop\smart-meeting-assistant → INTO `client` →
click address bar → type cmd → Enter. Prompt must end with \client>

### 3b. Run these (Enter after each):

    npm install

    notepad .env

(create new file → Yes → paste this ONE line → Ctrl+S → close)

    VITE_WS_URL=ws://localhost:5000/audio

then:

    npm run dev

✅ SUCCESS:

    VITE v5.x.x  ready in ___ ms
    ➜  Local:   http://localhost:5173/

LEAVE THIS WINDOW OPEN TOO.

## Part 4: Use the app + the persistence victory test 🎉

1. Browser → http://localhost:5173
2. ● Start Recording → Allow microphone → stub transcript lines appear.
3. ■ Stop Recording.
4. THE BIG TEST — restart the backend ON PURPOSE:
   - Go to Terminal 1 (server) → Ctrl+C → Y → Enter
   - Type: npm run dev → wait for "Mongoose connected"
   - Refresh the browser page.
   ✅ Your meeting is STILL in "Past Meetings" — and opening it shows
   the stored transcript. Old version would have lost it. That's the
   database working!
5. Bonus: Atlas website → Database → Browse Collections → you can SEE
   your meetings and transcript segments stored in the cloud.

## Daily routine from now on

    Terminal 1:  server folder → npm run dev
    Terminal 2:  client folder → npm run dev
    Browser:     http://localhost:5173

npm install / .env creation were one-time (per folder).

## Quick error decoder

| Message                                   | Meaning → Fix |
|-------------------------------------------|---------------|
| Could not read package.json (ENOENT)      | Wrong folder. cd server (or client) first. |
| 'npm' is not recognized                   | Node.js issue — reopen terminal / reinstall from nodejs.org. |
| [db] STUB: Database connection skipped    | Running OLD code — use the new downloaded folder. |
| bad auth : authentication failed          | Wrong DB password in MONGODB_URI. |
| Server selection timed out                | Atlas Network Access — allow 0.0.0.0/0. |
| MONGODB_URI is not set                    | .env missing/typo/not saved in server folder. |
| EADDRINUSE port 5000                      | Old server still running somewhere — close other terminals. |
| This site can't be reached (browser)      | One/both terminals not running. |
