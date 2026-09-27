<div align="center">

# 🌱 SwachhSeva

### An AI Assisted Mobile System for Civic Issue Reporting and Intelligent Complaint Management

Citizens photograph a civic problem → AI identifies it and routes it to the right department with a deadline → officers fix it and upload proof → citizens can dispute fixes that didn't hold → admins see city-wide patterns.

![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.0-000000?logo=flask&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Render-4169E1?logo=postgresql&logoColor=white)
![React](https://img.shields.io/badge/React-Vite-61DAFB?logo=react&logoColor=black)
![Expo](https://img.shields.io/badge/Expo-SDK%2057-000020?logo=expo&logoColor=white)
![TensorFlow Lite](https://img.shields.io/badge/TensorFlow%20Lite-MobileNetV2-FF6F00?logo=tensorflow&logoColor=white)

**[Live Dashboard](https://swachhseva-dashboard.onrender.com)** · **[Backend API](https://swachhseva-backend.onrender.com/api/health)**

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [What Makes It Different](#-what-makes-it-different)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [AI Model](#-ai-model)
- [Complaint Lifecycle](#-complaint-lifecycle)
- [Project Structure](#-project-structure)
- [Getting Started (Local Development)](#-getting-started-local-development)
- [Deployment](#-deployment)
- [API Reference](#-api-reference)
- [Security](#-security)
- [Author](#-author)

---

## 🔎 Overview

Civic complaints such as potholes, garbage dumps, broken streetlights, blocked drains and damaged footpaths are often lost in manual processes: they reach the wrong department, have no deadline, get closed without proof, and the same problem keeps coming back.

**SwachhSeva** closes that loop with three connected applications:

| Component | Users | Description |
|---|---|---|
| 📱 **Mobile App** | Citizens | Report issues with a photo and GPS location, track status, confirm nearby reports, earn civic points, dispute unsatisfactory fixes |
| 🖥️ **Officer & Admin Console** | Officers, Admins | Manage department complaints, resolve with photo proof, view analytics, hotspots, maps and reports |
| ⚙️ **Backend API** | — | REST API with AI classification, department routing, SLA tracking, priority scoring and hotspot detection |

---

## ✨ Key Features

### 📱 Citizen Mobile App
- Register / log in securely
- Report an issue with a **photo** and **automatic GPS location**
- **Duplicate check** — before submitting, see open complaints within **100 m** and confirm one instead of filing a duplicate
- Track your complaints and their status in real time
- **Civic Score & Top Reporters leaderboard**
- **Dispute** a resolution that didn't actually fix the problem

### 🖥️ Officer & Admin Console
- **Department-scoped access** — officers only see complaints for their own department
- Complaint registry with status filters and **priority sorting**
- Classify, update status, assign officers and add remarks visible to the citizen
- Resolve with a mandatory **after photo**, shown side by side with the citizen's **before photo**
- **Dashboard statistics**, **complaint map**, **recurring hotspots**
- **Officer performance leaderboard** (complaints resolved, average resolution time)
- **PDF and CSV reports** for any date range

### ⚙️ Backend
- AI image classification with **confidence-gated auto-routing**
- Department assignment with **SLA deadlines**, automatic **overdue** and **escalation** detection
- Transparent **priority scoring**
- **Recurring hotspot detection**
- Persistent image storage (local disk + **Cloudinary** mirror)

---

## 💡 What Makes It Different

1. **Confidence-gated AI with a human in the loop** — the AI acts on its own only when it is confident (≥ 60%). Uncertain cases go to **Pending Review** for an officer, so mistakes are not auto-routed to the wrong department.
2. **Honest AI by design** — if the model is not loaded, the system never fabricates a prediction. The complaint is clearly marked *Demo Mode* and routed for manual classification.
3. **Edge-optimised deployment** — a MobileNetV2 model converted to **quantized TensorFlow Lite**, running on a 512 MB server where full TensorFlow could not.
4. **Community confirmation instead of duplicates** — nearby reports become confirmations, keeping data clean and measuring how many people an issue affects.
5. **Explainable priority score** — a simple, auditable formula rather than a black box:
   ```
   priority = (extra confirmations × 10)
            + (days overdue × 15)
            + (age in days × 2)
            + (disputes × 25)
   ```
   Resolved and rejected complaints score 0.
6. **Automatic SLA tracking** — every complaint gets a department-specific deadline and is flagged **Overdue** automatically, then **Escalated** once it is more than 2 days late.
7. **Proof of resolution** — a complaint cannot be resolved without an after photo.
8. **Citizen dispute & reopen** — citizens can contest a resolution; the complaint reopens with the reason recorded, and repeat disputes raise its priority.
9. **Recurring hotspot analytics** — detects locations where the same issue type keeps being reported (including already-resolved complaints), signalling a need for infrastructure investment rather than another one-off patch.
10. **Accountability on both sides** — civic points for citizens, measurable performance for officers.

---

## 🏗️ System Architecture

```
┌────────────────────┐        ┌──────────────────────────┐
│  Citizen Mobile    │        │  Officer & Admin Console │
│  App (Expo / RN)   │        │  (React + Vite)          │
│  Android APK       │        │  Render Static Site      │
└─────────┬──────────┘        └────────────┬─────────────┘
          │        HTTPS / JSON + JWT      │
          └───────────────┬────────────────┘
                          ▼
             ┌─────────────────────────────┐
             │     Flask REST API          │
             │     (Gunicorn on Render)    │
             │                             │
             │  • Auth & roles (JWT)       │
             │  • AI classifier (TFLite)   │
             │  • Routing & SLA            │
             │  • Priority & hotspots      │
             │  • PDF / CSV reports        │
             └──────┬──────────────┬───────┘
                    │              │
                    ▼              ▼
           ┌──────────────┐  ┌──────────────┐
           │  PostgreSQL  │  │  Cloudinary  │
           │  (Render)    │  │  (photos)    │
           └──────────────┘  └──────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Mobile** | React Native, Expo SDK 57, React Navigation, Axios, expo-image-picker, expo-location, EAS Build |
| **Web Console** | React, Vite, React Router |
| **Backend** | Python, Flask 3, Flask-SQLAlchemy, Flask-JWT-Extended, Flask-CORS, Gunicorn |
| **Database** | PostgreSQL (production), SQLite (local development) |
| **AI / ML** | TensorFlow / Keras (training), MobileNetV2 transfer learning, TensorFlow Lite + `ai-edge-litert` (inference), NumPy, Pillow |
| **Storage** | Cloudinary (persistent images) |
| **Reports** | ReportLab (PDF), CSV |
| **Security** | bcrypt, JWT |
| **Hosting** | Render (API, database, static site), Expo EAS (Android APK) |

---

## 🧠 AI Model

| Property | Value |
|---|---|
| Architecture | MobileNetV2 (transfer learning) |
| Input | 224 × 224 RGB image, normalised to [0, 1] |
| Classes | `pothole`, `garbage_dump`, `broken_streetlight`, `blocked_drain`, `damaged_footpath` |
| Deployment format | TensorFlow Lite with default (dynamic-range) quantization |
| Runtime | `ai-edge-litert` interpreter (falls back to TensorFlow's interpreter if unavailable) |
| Auto-routing threshold | 0.60 confidence |

**Routing**

| Predicted issue | Department |
|---|---|
| Pothole | Roads & Infrastructure |
| Garbage Dump | Solid Waste Management |
| Broken Streetlight | Electrical Department |
| Blocked Drain | Drainage & Sewerage |
| Damaged Footpath | Civil Works Division |

**Converting a trained model**

```bash
cd backend
python convert_to_tflite.py
# reads  models/civic_classifier.keras
# writes models/civic_classifier.tflite
```

The backend loads `models/civic_classifier.tflite` automatically on first prediction. No code changes are needed after retraining.

---

## 🔄 Complaint Lifecycle

```
                     ┌─────────────── confidence < 60% ───────────────┐
                     │                                                ▼
 Citizen reports ──► AI classifies ── confidence ≥ 60% ──► ASSIGNED   PENDING_REVIEW
                                                          (dept + SLA) (officer classifies)
                                                              │              │
                                                              ▼              │
                                                         IN_PROGRESS ◄───────┘
                                                              │
                                   past SLA deadline ──► OVERDUE ──► ESCALATED (> 2 days late)
                                                              │
                                                              ▼
                                                  RESOLVED (after photo required)
                                                              │
                                             citizen disputes │
                                                              ▼
                                                          REOPENED
```

Each complaint receives a tracking ID in the format `SW-YYYY-NNNNN`.

---

## 📁 Project Structure

```
SwachhSeva/
├── backend/                      # Flask REST API
│   ├── app/
│   │   ├── ai/                   # TFLite model loading & prediction
│   │   ├── models/               # SQLAlchemy models (User, Complaint, ComplaintUpvote)
│   │   ├── routes/               # auth, complaints, admin, leaderboard
│   │   ├── services/             # routing, SLA, priority, hotspots, reports, image storage
│   │   ├── utils/                # validators, decorators, tracking IDs, geo helpers
│   │   ├── config.py
│   │   └── __init__.py           # app factory
│   ├── models/                   # civic_classifier.tflite
│   ├── convert_to_tflite.py      # Keras → TFLite conversion
│   ├── requirements.txt
│   └── run.py                    # entry point + CLI commands
├── admin-dashboard/              # React + Vite officer & admin console
│   └── src/
│       ├── api/
│       ├── components/
│       └── pages/
└── mobile/                       # Expo / React Native citizen app
    ├── utils/config.js           # API base URL
    ├── app.json
    └── eas.json                  # EAS build profiles
```

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- An Android phone or emulator
- (Optional) A Cloudinary account for persistent image storage

### 1. Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

Create `backend/.env`:

```env
JWT_SECRET_KEY=replace-with-a-long-random-string
# Optional — defaults to a local SQLite database when omitted
DATABASE_URL=postgresql://user:password@host/dbname
# Optional — enables persistent image storage
CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
```

Generate a strong secret with:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Initialise the database and create accounts:

```bash
flask --app run init-db
flask --app run create-admin
flask --app run create-officer     # prompts for the officer's department
```

Start the server:

```bash
python run.py
# API available at http://127.0.0.1:5000/api/health
```

> **Windows note:** if `ai-edge-litert` has no wheel for your Python version, install `tensorflow` instead. The predictor falls back to TensorFlow's built-in TFLite interpreter automatically.

### 2. Officer & Admin Console

```bash
cd admin-dashboard
npm install
```

Create `admin-dashboard/.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:5000/api
```

```bash
npm run dev
# http://localhost:5173
```

### 3. Mobile App

```bash
cd mobile
npm install
```

Set the API address in `mobile/utils/config.js`:

```js
// Use your computer's LAN IP when testing on a physical phone
export const API_BASE_URL = "http://192.168.x.x:5000/api";
```

Build and install a standalone Android APK:

```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview
```

---

## ☁️ Deployment

| Service | Platform | Configuration |
|---|---|---|
| **Backend API** | Render Web Service | Root: `backend` · Build: `pip install -r requirements.txt` · Start: `gunicorn run:app --bind 0.0.0.0:$PORT` |
| **Database** | Render PostgreSQL | Linked via `DATABASE_URL` |
| **Console** | Render Static Site | Root: `admin-dashboard` · Build: `npm install && npm run build` · Publish: `dist` · Rewrite `/*` → `/index.html` |
| **Images** | Cloudinary | Linked via `CLOUDINARY_URL` |
| **Mobile** | Expo EAS | `eas build -p android --profile preview` produces an installable APK |

**Backend environment variables**

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET_KEY` | Yes | Signing key for login tokens (64+ random hex characters) |
| `CLOUDINARY_URL` | Recommended | Persistent photo storage — Render's free-tier disk is wiped on every restart |
| `AI_MODEL_PATH` | No | Overrides the default `models/civic_classifier.tflite` |

**Console environment variables**

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Backend API base URL, e.g. `https://swachhseva-backend.onrender.com/api` |

> **Note:** Render's free tier sleeps after 15 minutes of inactivity. The first request afterwards can take up to a minute. Open `/api/health` shortly before a demo to wake the server.

---

## 📡 API Reference

All endpoints except register, login, health and uploads require `Authorization: Bearer <token>`.

### Auth
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a citizen account |
| `POST` | `/api/auth/login` | Log in, returns a JWT |
| `GET` | `/api/auth/me` | Current user profile |

### Citizen Complaints
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/complaints` | Submit a complaint (multipart: `image`, `latitude`, `longitude`, `description`) |
| `POST` | `/api/complaints/check-nearby` | Open complaints within 100 m of a location |
| `POST` | `/api/complaints/<id>/upvote` | Confirm an existing complaint |
| `GET` | `/api/complaints` | List my complaints (`?status=` filter) |
| `GET` | `/api/complaints/<id>` | Complaint details |
| `PUT` | `/api/complaints/<id>` | Edit description (before processing starts) |
| `POST` | `/api/complaints/<id>/dispute` | Dispute a resolution |

### Officer & Admin
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/complaints` | List complaints (`status`, `department`, `issue_type`, `sort=priority`) |
| `GET` | `/api/admin/complaints/<id>` | Complaint details with priority score |
| `PUT` | `/api/admin/complaints/<id>/status` | Classify, change status, assign officer, add remarks |
| `POST` | `/api/admin/complaints/<id>/resolve` | Resolve with a resolution photo |
| `GET` | `/api/admin/stats` | Dashboard statistics |
| `GET` | `/api/admin/heatmap` | Complaint map points |
| `GET` | `/api/admin/hotspots` | Recurring hotspots (`min_size`, `radius`) |
| `GET` | `/api/admin/officers` | Officer list |
| `GET` | `/api/admin/officers/stats` | Officer performance (admin only) |
| `GET` | `/api/admin/export/csv` | CSV export (`start`, `end` as `YYYY-MM-DD`) |
| `GET` | `/api/admin/export/pdf` | PDF report (`start`, `end` as `YYYY-MM-DD`) |

### Leaderboard & System
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/leaderboard/citizens` | Top citizen reporters (`?limit=`) |
| `GET` | `/api/leaderboard/me` | My civic score and rank |
| `GET` | `/api/health` | Health check and AI model status |
| `GET` | `/uploads/<path>` | Complaint and resolution photos |

---

## 🔐 Security

- Passwords hashed with **bcrypt**
- **JWT** authentication with role claims (`citizen`, `officer`, `admin`)
- Public registration creates **citizen accounts only**; officer and admin accounts are created through the backend CLI
- Officers can access only their own department's complaints
- Uploaded images are verified as real images and re-encoded before storage
- Path-traversal protection on file serving
- Secrets are read from environment variables and never committed to the repository

---

## 👤 Author

**Punya P Y** — [@PunyaPY2004](https://github.com/PunyaPY2004)

<div align="center">

Built to make cities cleaner, one report at a time. 🌱

</div>
