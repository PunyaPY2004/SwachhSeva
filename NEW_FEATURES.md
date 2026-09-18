# New Features Update

Three new features added on top of the original 5-layer project, fully
tested end-to-end against a live backend before packaging (not just
written — I seeded real data, hit every new endpoint, and confirmed the
exact JSON shapes match what the mobile app and dashboard expect).

## 1. Duplicate Detection + Community Upvoting

When a citizen submits a complaint, the backend checks (using the
Haversine formula — great-circle distance between two GPS points) for
any existing open complaint within 100 meters. If found, the mobile app
shows those nearby reports and lets the citizen **confirm** an existing
one instead of filing a duplicate. Each confirmation increments that
complaint's `upvote_count`.

Rules enforced (all tested):
- A citizen can't upvote the same complaint twice
- A citizen can't upvote their own complaint
- Only "open" complaints (not resolved/rejected) show up as nearby matches

**New backend endpoints:**
- `POST /api/complaints/check-nearby` — `{latitude, longitude}` → list of nearby open complaints with distance
- `POST /api/complaints/<id>/upvote` — confirms an existing complaint

**Mobile:** new `NearbyComplaintsScreen` — shown automatically after
capturing a photo + location, before final submission, if matches exist.

**Dashboard:** upvote count shown as a 🔥 column in the complaints table
and complaint detail page.

## 2. Priority Scoring + Escalation

A transparent, explainable formula (not a black box) ranks complaints
for officer triage:

```
priority_score = (upvotes - 1) × 10       # community confirmations
                + days_overdue × 15         # overdue climbs fast
                + age_in_days × 2           # gentle nudge for older ones
```

A complaint is marked **escalated** once it's more than 2 days past its
SLA deadline and still unresolved.

**Backend:** `GET /api/admin/complaints?sort=priority` sorts by this
score; `is_escalated` and `days_overdue` are included on every complaint;
`/api/admin/stats` now includes an `escalated` count.

**Dashboard:** a "Sort by Priority" option in the Complaints table, with
escalated rows highlighted by a red left border, and a Priority Score
shown on the complaint detail page.

**Mobile:** an "⚠️ Escalated" badge shows on complaint cards and details
when applicable.

## 3. Before/After Comparison + Officer Performance Stats

**Dashboard:** resolved complaints now show a side-by-side "Before /
After" photo comparison instead of just the resolution photo alone.

A new **Officer Leaderboard** page (admin-only, in the sidebar) shows
each officer's resolved count, currently-open count, and average
resolution time (in hours or days). Backed by a new endpoint:
`GET /api/admin/officers/stats`.

## Applying this update to your existing setup

Since you already have a working database with real complaints in it,
**don't delete your database** — instead run the migration command,
which adds the new column/table without losing any data:

```
flask --app run migrate-v2
```

Also new: a proper way to create officer accounts (previously only
`create-admin` existed):
```
flask --app run create-officer
```
Follow the prompts — it'll ask for the exact department name, which
must match one of: Roads & Infrastructure, Solid Waste Management,
Electrical Department, Drainage & Sewerage, Civil Works Division.

After migrating, restart your backend, `npm install` isn't needed for
mobile/dashboard (no new packages), just restart both dev servers to
pick up the new code.
