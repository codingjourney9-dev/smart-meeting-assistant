# 🍃 MongoDB Setup Guide — From Absolute Zero

Goal: give your app a real database so meetings/transcripts SURVIVE
restarts. Time needed: ~10 minutes. Cost: $0 (free tier, no card needed).

---

## Part 0: What is MongoDB and why do we need it? (1 min read)

Right now, your backend keeps meetings in its MEMORY. Memory is wiped
every time the server stops. A DATABASE is a separate program whose only
job is to store data permanently on disk.

- **MongoDB** = the database program we're using (the "M" in MERN).
- **MongoDB Atlas** = MongoDB's official cloud service. Instead of
  installing the database on your computer, MongoDB the company runs it
  on their servers and you connect to it over the internet. We use this
  because there is NOTHING to install — you just sign up on a website.
- **Connection string (URI)** = a special web address + password, like
  `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/...`
  Your backend reads this from the `.env` file and uses it to find and
  log into YOUR database.

So the whole task is: (1) create a free database on Atlas's website,
(2) copy its connection string, (3) paste it into `server/.env`,
(4) restart the backend. That's it.

WHERE each part happens:
- Parts 1-5: in your WEB BROWSER (atlas website)
- Part 6:    in a TEXT EDITOR (Notepad is fine)
- Part 7:    in your TERMINAL (the server one)

---

## Part 1: Create a free Atlas account  [BROWSER]

1. Go to:  https://www.mongodb.com/cloud/atlas/register
2. Sign up — easiest is "Sign up with Google", or use email + password.
3. You may get a short questionnaire ("what are you building?" etc.) —
   answers don't matter, pick anything or skip.

## Part 2: Create your free database cluster  [BROWSER]

A "cluster" is just Atlas's word for "your database server".

1. You'll land on a "Deploy your cluster" type screen (Atlas usually
   shows it right after signup; otherwise click "+ Create" / "Build a
   Database").
2. IMPORTANT: choose the FREE option — it's labeled **M0** or "Free".
   Do NOT pick anything that shows a price.
3. Provider/Region: leave defaults, or pick a region near you
   (e.g. Mumbai for India). Closer = faster.
4. Cluster name: leave "Cluster0".
5. Click **Create Deployment** (or "Create Cluster").
6. Wait 1-3 minutes while it spins up.

## Part 3: Create a database USER  [BROWSER]

This is the username/password your APP uses to log into the database.
(Separate from your Atlas website login!)

Atlas usually pops this up automatically right after creating the
cluster ("Connect to Cluster0" / Security Quickstart):

1. It suggests a username (or type one, e.g. `meetingapp`).
2. Click "autogenerate password" or type your own.
   ⚠️ Use ONLY letters and numbers in the password — symbols like
   @ : / # break the connection string format.
3. 📝 WRITE BOTH DOWN NOW. The password is shown only once.
4. Click **Create Database User**.

(If you missed the popup: left sidebar → "Database Access" →
"+ Add New Database User" → Password method → fill in → role
"Read and write to any database" → Add User.)

## Part 4: Allow your computer to connect  [BROWSER]

Atlas blocks ALL computers by default. You must allow yours:

1. Left sidebar → **Network Access** (under "Security").
2. Click **+ Add IP Address**.
3. Click **"ALLOW ACCESS FROM ANYWHERE"** (it fills in 0.0.0.0/0).
   (Fine for development; we'd tighten this for a real product.)
4. Click **Confirm** and wait for the entry to say "Active".

⚠️ Skipping this part causes the #1 most common error later
("Could not connect / server selection timed out").

## Part 5: Copy your connection string  [BROWSER]

1. Left sidebar → **Database** (or "Clusters") → click **Connect**
   button on Cluster0.
2. Choose **Drivers** (sometimes shown as "Connect your application").
3. You'll see a string like:

   mongodb+srv://meetingapp:<db_password>@cluster0.ab1cd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0

4. Click the copy icon. Paste it somewhere temporarily (Notepad).

## Part 6: Put it in your .env file  [TEXT EDITOR]

1. Open the file:  smart-meeting-assistant/server/.env
   (Right-click → Open with → Notepad. If you don't see a file called
   ".env", enable File Explorer → View → "File name extensions" and
   "Hidden items". It's the file named exactly `.env`, NOT `.env.example`.)

2. Find the line starting with:  MONGODB_URI=

3. Replace that whole line with your string, after making TWO edits:

   EDIT A — replace `<db_password>` (including the < >) with the real
            password from Part 3.
   EDIT B — insert the database name `smart-meeting-assistant` between
            the `/` and the `?`.

   BEFORE (template):
   mongodb+srv://meetingapp:<db_password>@cluster0.ab1cd.mongodb.net/?retryWrites=true&w=majority

   AFTER (what yours should look like):
   MONGODB_URI=mongodb+srv://meetingapp:MyPass123@cluster0.ab1cd.mongodb.net/smart-meeting-assistant?retryWrites=true&w=majority

   ✔ no spaces anywhere, all one line, starts with MONGODB_URI=

4. Save the file (Ctrl+S) and close Notepad.

## Part 7: Install + restart the backend  [TERMINAL]

In your SERVER terminal (the one in the `server` folder):

1. If the server is running, stop it: press Ctrl+C, type Y, Enter.
2. Install the new database library (one time):

       npm install

3. Start again:

       npm run dev

✅ SUCCESS — the boot log now contains a NEW line:

       [db] Mongoose connected to MongoDB

❌ If instead you get an error after ~10 seconds, see Troubleshooting.

## Part 8: The victory test 🎉

1. Frontend still running? (client terminal: `npm run dev`)
2. Browser → http://localhost:5173 → record a short meeting → Stop.
3. Now RESTART the backend on purpose: Ctrl+C, Y, `npm run dev`.
4. Refresh the browser. Your meeting is STILL THERE in Past Meetings —
   and clicking it now shows the stored transcript. Before MongoDB,
   a restart erased everything. That's persistence!

(Bonus: in Atlas → Database → Browse Collections, you can SEE your
data: `meetings` and `transcriptsegments` collections.)

---

## Troubleshooting

| Error in terminal                                  | Cause / Fix |
|----------------------------------------------------|-------------|
| `bad auth : authentication failed`                 | Wrong username/password in the URI. Re-check Part 3 credentials; ensure you replaced `<db_password>` INCLUDING the angle brackets. |
| `Could not connect` / `Server selection timed out` | Part 4 skipped or not Active yet — allow 0.0.0.0/0 in Network Access. Also possible: firewall/VPN blocking, or school/office network — try a mobile hotspot. |
| `querySrv ENOTFOUND` / `ENODATA`                   | Typo in the cluster address part of the URI — re-copy from Atlas (Part 5). |
| `MONGODB_URI is not set`                           | The .env edit didn't save, file is named wrong (must be exactly `.env`), or you edited `.env.example` instead. |
| `Cannot find module 'mongoose'`                    | Run `npm install` inside the `server` folder (Part 7 step 2). |
| Password has @ or : or / in it                     | Atlas needs those "URL-encoded". Easiest fix: Database Access → Edit user → set a new letters+numbers-only password. |
