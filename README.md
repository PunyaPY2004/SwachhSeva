# Running SwachhSeva Without Typing Terminal Commands

Three parts, do them in order. Part 1 is quick and immediately useful.
Parts 2-4 take about 30-45 minutes total but mean your PC becomes
optional after that.

---

## Part 1 — Batch files (2 minutes, do this now)

1. Copy `backend/start-backend.bat` into your `F:\SwachhSeva\backend\` folder.
2. Copy `admin-dashboard/start-dashboard.bat` into `F:\SwachhSeva\admin-dashboard\`.
3. Copy `mobile/start-mobile-dev.bat` into `F:\SwachhSeva\mobile\`.
4. Right-click each `.bat` file → Send to → Desktop (create shortcut).

Now you just double-click a desktop icon instead of opening a terminal
and typing commands. This alone solves "I don't want to type commands"
for local development — but your PC still needs to be on and running
for the mobile app / dashboard to reach the backend. Parts 2-4 remove
that dependency entirely.

---

## Part 2 — Deploy the backend to Render (free, permanent URL)

This gives your backend a real internet address (like
`https://swachhseva-backend.onrender.com`) that works with your PC
completely off.

### 2.1 Push your project to GitHub (if it isn't already)
```
cd F:\SwachhSeva
git init
git add .
git commit -m "SwachhSeva"
```
Create a new repository on github.com, then:
```
git remote add origin https://github.com/<your-username>/SwachhSeva.git
git branch -M main
git push -u origin main
```

### 2.2 Add gunicorn to your backend
Open `backend/requirements.txt` and add this line:
```
gunicorn==22.0.0
```
(Gunicorn is the production web server Render uses to run your Flask
app — `python run.py` is fine for local dev, but isn't meant for
production hosting.)

### 2.3 Create a Render account
Go to https://render.com → Sign up (free) → connect your GitHub account.

### 2.4 Deploy using the included blueprint
1. Copy `render.yaml` (included in this zip) into the **root** of your
   `SwachhSeva` repo (same level as the `backend`, `mobile`,
   `admin-dashboard` folders), then commit and push it.
2. On Render: **New +** → **Blueprint** → select your `SwachhSeva`
   repo → Render will detect `render.yaml` and show you a preview of
   what it's about to create (one web service + one free PostgreSQL
   database) → click **Apply**.
3. Wait for the build to finish (a few minutes the first time).

If you'd rather not use a blueprint file, you can do it manually
instead: **New +** → **PostgreSQL** (name it `swachhseva-db`, free
plan) → then **New +** → **Web Service** → connect your repo → set
**Root Directory** to `backend` → **Build Command**:
`pip install -r requirements.txt` → **Start Command**:
`gunicorn run:app --bind 0.0.0.0:$PORT` → add an environment variable
`DATABASE_URL` and paste in the **Internal Connection String** shown
on your `swachhseva-db` database's page → add another environment
variable `JWT_SECRET_KEY` with any long random string as the value.

### 2.5 Set up the database (one-time)
Once deployed, open your web service on Render → **Shell** tab (a
browser-based terminal, no local setup needed) → run:
```
flask --app run init-db
flask --app run create-admin
```
Follow the prompts to create your admin account.

### 2.6 Test it
Visit `https://<your-service-name>.onrender.com/api/health` in a
browser — you should see `{"status": "ok", ...}`.

**Important free-tier quirk:** Render's free web services "sleep"
after 15 minutes of no traffic, and the first request after that takes
30-60 seconds to wake back up. This is fine for normal use (it wakes
up automatically), but if you're demoing live, open the health-check
URL a minute before you start so it's already awake.

---

## Part 3 — Point your apps at the cloud backend

### Dashboard
Edit `admin-dashboard/.env`:
```
VITE_API_BASE_URL=https://<your-service-name>.onrender.com/api
```
You can now deploy the dashboard itself too (optional) — Render, or
Netlify/Vercel, all support static React builds for free, following
the same "connect your GitHub repo" flow.

### Mobile app
Edit `mobile/utils/config.js`:
```js
export const API_BASE_URL = "https://<your-service-name>.onrender.com/api";
```

---

## Part 4 — Build a standalone mobile APK (no PC, no Metro, ever)

Right now your mobile app needs `npx expo start --dev-client` running
on your PC because it's a **development build**. A **standalone
build** bundles everything into the APK itself — install once, and it
never needs your PC again, exactly like any other Android app.

```
cd F:\SwachhSeva\mobile
eas build --profile preview --platform android
```

This uploads your project to Expo's build servers and, after a few
minutes, gives you a download link for a real, installable `.apk`
file. Install that on your phone (same way you installed the dev
client earlier via `adb install`, or just download it directly on the
phone from the link). Since `config.js` now points at your Render URL
from Part 3, this standalone app works from anywhere, on any network,
with your laptop closed.

---

## After this, your daily workflow is:
- **Local development/testing**: double-click the `.bat` files from Part 1.
- **Showing someone the app / your guide / viva**: just open the
  installed APK on your phone and the dashboard URL in a browser —
  nothing running on your PC required at all.
