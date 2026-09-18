# Troubleshooting

Common problems, why they happen, and how to fix them. Several of these
are things we actually hit and solved while building this project.

---

**Problem:** `npm : The term 'npm' is not recognized...`
**Cause:** Node.js isn't installed, or wasn't added to your PATH.
**Solution:** Install Node.js from https://nodejs.org (LTS version), then
close and reopen your terminal.

---

**Problem:** `python : The term 'python' is not recognized...`
**Cause:** Python isn't installed, or "Add to PATH" wasn't checked during install.
**Solution:** Reinstall Python from https://python.org, and check "Add
python.exe to PATH" on the first setup screen.

---

**Problem:** `pip install` fails with permission errors
**Cause:** Trying to install outside a virtual environment, or venv isn't activated.
**Solution:** Make sure you see `(venv)` at the start of your terminal
prompt. If not: `venv\Scripts\activate`

---

**Problem:** `ModuleNotFoundError: No module named 'X'` when running the backend
**Cause:** Dependencies not installed, or wrong virtual environment active.
**Solution:** Confirm `(venv)` is active, then `pip install -r requirements.txt`

---

**Problem:** PostgreSQL: `connection refused` / `could not connect to server`
**Cause:** PostgreSQL service isn't running, or wrong host/port in `DATABASE_URL`.
**Solution:** Check the PostgreSQL service is running (Windows Services
app → look for "postgresql-x64-16"). Confirm `DATABASE_URL` in `.env`
matches what you set up (see `DATABASE_SETUP.md`).

---

**Problem:** `Port 5000 already in use` (or 5173, 8081, etc.)
**Cause:** A previous run of the server is still active in another terminal.
**Solution:** Find and close the old terminal, or on Windows:
```
netstat -ano | findstr :5000
taskkill /PID <the_pid_shown> /F
```

---

**Problem:** Flask server starts but the mobile app can't reach it
**Cause:** The classic one — `localhost` on your phone means the phone
itself, not your PC.
**Solution:** In `mobile/utils/config.js`, set `API_BASE_URL` to your
PC's actual LAN IP (find it with `ipconfig` → "IPv4 Address" under your
Wi-Fi adapter), not `localhost`. Also confirm your phone and PC are on
the same Wi-Fi network.

---

**Problem:** Expo Go shows "Project is incompatible with this version of Expo Go"
**Cause:** Expo Go on your phone auto-updated to a newer SDK than your
project uses.
**Solution:** Either upgrade the project (`npx expo install expo@latest`
then `npx expo install --fix`), or — more reliably — build a custom
development client with EAS (`eas build --profile development --platform
android`), which permanently avoids this mismatch. See the mobile app's
setup history for the exact commands if you hit this again.

---

**Problem:** APK downloaded but "App not installed" on your phone
**Cause:** Usually a corrupted download, a storage permission block, or
a conflicting existing install.
**Solution:** Check Settings → Apps for a leftover broken install and
remove it; re-download the APK fresh; or install via USB with `adb
install <path-to-apk>` instead of downloading directly on the phone —
this bypasses most on-device install blockers.

---

**Problem:** Camera/location permission denied and the feature just doesn't work
**Cause:** Permission was denied once and Android remembers that choice.
**Solution:** Settings → Apps → SwachhSeva → Permissions → enable
Camera and Location manually.

---

**Problem:** AI model not found / backend stuck in Demo Mode after training
**Cause:** Wrong `AI_MODEL_PATH` in `.env`, or the model wasn't actually
saved to `backend/models/civic_classifier.keras`.
**Solution:** Check the file actually exists at that exact path. Restart
the Flask server after placing the model — it's only loaded once, at
first use, not watched live.

---

**Problem:** TensorFlow install is extremely slow or fails
**Cause:** It's a genuinely large package (~500MB+), and older pip
versions can struggle with dependency resolution.
**Solution:** Upgrade pip first (`python -m pip install --upgrade pip`),
then retry. Be patient — a slow but eventually-successful install is normal.

---

**Problem:** Training crashes with `Unknown image file format`
**Cause:** One or more files in your dataset aren't actually valid
images despite having a `.jpg`/`.png` extension — common with images
saved from a browser that are secretly WebP, or failed/partial downloads.
**Solution:** Run a validation pass before training:
```python
from PIL import Image
import os
for root, dirs, files in os.walk('dataset'):
    for f in files:
        if f.lower().endswith(('.jpg', '.jpeg', '.png')):
            path = os.path.join(root, f)
            try:
                Image.open(path).verify()
            except Exception:
                print('BAD:', path)
```
Delete or replace whatever it reports.

---

**Problem:** CORS errors in the browser console (admin dashboard can't reach backend)
**Cause:** Usually just means the backend isn't running, or you're
hitting the wrong port.
**Solution:** Confirm the backend is running and `VITE_API_BASE_URL` in
the dashboard's `.env` points at the right host:port. The backend
already has CORS enabled for all origins, so this is rarely an actual
CORS policy issue despite the error message.

---

**Problem:** JWT errors — `422 UNPROCESSABLE ENTITY` or `Signature verification failed`
**Cause:** Usually a stale/mismatched token, often after `JWT_SECRET_KEY`
changed in `.env` (which invalidates all previously-issued tokens).
**Solution:** Log out and log back in to get a fresh token.

---

**Problem:** Database errors after pulling new code (`no such column`, etc.)
**Cause:** The database schema is out of date with the current models.
**Solution:** For this project's simple setup, easiest fix is dropping
and recreating tables: back up any data you care about, then delete
`instance/swachhseva.db` (SQLite) or drop/recreate the Postgres database,
then `flask --app run init-db` again.

---

**Problem:** Android Studio / emulator problems
**Cause:** Emulator setup is genuinely finicky and out of scope for most
of this project's testing.
**Solution:** Prefer testing on a real Android phone via Expo Go / your
custom dev client — it's more reliable and matches your actual demo
environment anyway.
