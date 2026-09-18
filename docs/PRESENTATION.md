# Presentation & Viva Prep

## What is SwachhSeva?

SwachhSeva is a smart civic-issue reporting system. A citizen photographs
a problem — a pothole, garbage dump, broken streetlight, blocked drain,
or damaged footpath — from a mobile app. The app captures GPS location
automatically, an AI model classifies the issue from the photo, and the
system automatically routes the complaint to the right government
department with a deadline (SLA). An officer reviews it on a web
dashboard, updates its status as work progresses, and marks it resolved
with a photo once fixed — which the citizen sees reflected instantly in
their own app.

## 30-second explanation

"SwachhSeva lets citizens report civic problems — like potholes or
garbage dumps — by just taking a photo on their phone. An AI model
identifies what the issue is, the app captures the location automatically,
and the complaint gets routed to the right department with a deadline.
Officers manage and resolve complaints through a web dashboard, and
citizens can track progress in real time."

## 1-minute explanation

"SwachhSeva is a full-stack civic complaint system with three parts: a
mobile app for citizens, a Flask backend with a trained AI model, and a
web dashboard for officers.

When a citizen reports an issue, they take a photo and the app captures
their GPS location. The backend sends that photo through a MobileNetV2
image classifier — trained using transfer learning — which identifies
the issue type and a confidence score. If the AI is confident (above
60%), the complaint is automatically routed to the correct department
with a deadline calculated from a fixed SLA table. If confidence is low,
a human officer reviews it manually instead — so the AI never makes an
unreviewed low-confidence decision.

Officers use a web dashboard to see all complaints, filter by status,
view them on a map, and mark them resolved with a photo. The citizen's
app updates instantly to reflect that. The whole system uses JWT
authentication with role-based access — citizens, officers, and admins
each see only what they should."

## 2-minute explanation

Use the 1-minute version above, then add:

"On the technical side: the mobile app is built with React Native and
Expo, so it runs as a real Android app, not a website. The backend is
Flask with a PostgreSQL database (SQLite for local development), using
SQLAlchemy for the data models and Flask-JWT-Extended for authentication.

The AI model uses transfer learning on MobileNetV2 — we take the
pretrained ImageNet weights, freeze the base layers, and train a small
classification head on top for our five civic-issue categories. We also
fine-tune the top layers of the base model afterward at a low learning
rate, which usually improves accuracy further. We evaluated it on a
held-out test set — images the model never saw during training — and
computed real accuracy, precision, recall, and F1-score, plus a
confusion matrix, rather than just trusting training accuracy.

One design decision I'd highlight: if the AI model isn't available or
confidence is too low, the system never fakes a prediction — it
explicitly shows 'Demo Mode' or routes to manual review. That
human-in-the-loop safety net was a deliberate choice, not an oversight.

The admin dashboard is React with Vite, using Recharts for the
statistics charts and Leaflet/OpenStreetMap for the complaint map — no
Google Maps API key required, which keeps the project free to run."

## Why these technical choices? (quick answers)

- **Why AI/MobileNetV2?** It's a lightweight, mobile-friendly CNN
  architecture well-suited to transfer learning on a small dataset —
  gives reasonable accuracy without needing to train from scratch or
  needing a huge dataset.
- **Why transfer learning?** Training a CNN from scratch needs tens of
  thousands of images; transfer learning reuses features already learned
  from ImageNet (edges, textures, shapes) and only trains a small new
  head, which works with a much smaller dataset.
- **Why a confidence score, and why 60%?** A model prediction without a
  confidence check risks silently misrouting complaints. 60% is a
  reasonable middle ground — strict enough to catch clearly uncertain
  cases, loose enough that most decent predictions still get automated.
- **What happens when confidence is low?** Status becomes "Pending
  Review" and an officer manually classifies it — the system stays
  useful even when the AI isn't sure.
- **Why department routing is automatic?** Reduces manual triage work
  for officers and gives citizens an immediate sense of where their
  complaint is headed.
- **Why GPS?** Officers need to know exactly where to go — a
  text address alone is often ambiguous or missing.
- **Why PostgreSQL (and PostGIS mentioned in the original brief)?**
  PostgreSQL is a robust, free, open-source relational database well
  suited to structured data like users and complaints; PostGIS would add
  proper geographic query support (e.g. "complaints within 2km") if the
  project were extended further — this build stores raw lat/long, which
  is enough for the current map display and doesn't require PostGIS.
- **Why Flask?** Lightweight, simple to reason about for a project this
  size, with a mature ecosystem (SQLAlchemy, JWT, CORS) that covers
  everything needed here.
- **Why React Native/Expo for the mobile app?** Lets the app run as a
  genuine Android app (camera, GPS, native permissions) while writing in
  JavaScript/React, and Expo simplifies the build/run process
  significantly for a project like this.
- **Why JWT?** Stateless authentication — the server doesn't need to
  store session state, and the token itself carries the user's role for
  authorization checks.
- **Why Docker?** Makes the backend + database + dashboard reproducible
  and easy to run consistently across different machines, without
  everyone manually installing PostgreSQL, Node, and Python themselves.

## Honest caveats worth mentioning (this reads as more credible, not weaker)

- If your training dataset is small, be upfront about it: "the model
  performs well on this dataset, but a production system would need a
  much larger and more varied dataset to be reliable in the wild."
- The 60%-confidence human-in-the-loop design is a real safety feature —
  worth emphasizing as a deliberate engineering decision, not a
  limitation.
- Demo Mode (explicit, not a silent fake prediction) is also worth
  calling out as intentional design, if asked why it exists.
