# Testing Checklist

A step-by-step pass through every feature, useful before your demo/viva
so you know everything still works. Check items off as you go.

## Authentication
- [ ] Citizen can register with a new email
- [ ] Registering with an already-used email is rejected with a clear error
- [ ] Citizen can log in with correct credentials
- [ ] Login with wrong password is rejected
- [ ] Citizen stays logged in after closing/reopening the app (session persists)
- [ ] Logout works and returns to the login screen

## Complaint Submission (Mobile App)
- [ ] Camera capture works and shows a preview
- [ ] Gallery picker works and shows a preview
- [ ] Submitting without a photo shows a validation error
- [ ] Submitting without location shows a validation error
- [ ] Location permission prompt appears and, once granted, captures real coordinates
- [ ] Description field is optional — submission works with it empty
- [ ] Successful submission shows a tracking ID (format `SW-2026-XXXXX`)
- [ ] If no AI model is loaded: submission shows "Demo Mode" banner and status "Pending Review"
- [ ] If an AI model is loaded and confidence ≥60%: shows a predicted issue + confidence %, status "Assigned", department + SLA shown
- [ ] If confidence <60%: status is "Pending Review" (even with a model loaded)

## Citizen Tracking
- [ ] "My Complaints" list shows all of the citizen's own complaints
- [ ] Status filter chips (Pending/Assigned/In Progress/Resolved) work
- [ ] Tapping a complaint opens its full details
- [ ] Complaint details show photo, tracking ID, status, location, description
- [ ] A citizen cannot see another citizen's complaints (test with two accounts)

## Officer/Admin Dashboard
- [ ] Only officer/admin accounts can log in (citizen credentials are rejected)
- [ ] Dashboard stats (total/pending/in-progress/resolved/overdue) match reality
- [ ] Charts render without errors, even with very little data
- [ ] Complaints table lists all complaints, filterable by status
- [ ] Clicking a complaint opens its detail page
- [ ] Manually classifying an unclassified complaint correctly assigns department + SLA
- [ ] Changing status (e.g. to "In Progress") saves and persists on refresh
- [ ] Officer remarks save and are visible to the citizen in the mobile app
- [ ] Uploading a resolution photo + marking "Resolved" works
- [ ] After resolving, the citizen's app immediately reflects "Resolved" + resolution photo
- [ ] Map view plots complaint locations correctly (pin position matches submitted GPS coords)

## Department Routing (test each mapping)
- [ ] Pothole → Roads & Infrastructure, 5-day SLA
- [ ] Garbage Dump → Solid Waste Management, 2-day SLA
- [ ] Broken Streetlight → Electrical Department, 3-day SLA
- [ ] Blocked Drain → Drainage & Sewerage, 3-day SLA
- [ ] Damaged Footpath → Civil Works Division, 7-day SLA

## AI Model (if trained)
- [ ] `/api/health` shows `ai_model_loaded: true` after placing a trained model
- [ ] A new submission gets a real (non-null) predicted class and confidence
- [ ] `evaluate.py` runs without errors and produces `metrics.json` + `confusion_matrix.png`
- [ ] Metrics look sane (not suspiciously perfect if your dataset is large/varied — flag this
      honestly rather than assume it means the model is production-ready)

## Security
- [ ] API requests without a token are rejected (try a route without the Authorization header)
- [ ] An expired/invalid token is rejected
- [ ] Uploading a non-image file (e.g. a `.txt` renamed to `.jpg`) is rejected by validation
- [ ] Uploading an oversized file is rejected (check `MAX_UPLOAD_MB` in `.env`)
- [ ] `.env` files are NOT committed to git (check with `git status` before pushing)

## Cross-device
- [ ] Mobile app connects successfully over Wi-Fi to the backend (not just localhost)
- [ ] Backend and dashboard both reachable from a different device on the same network (if demoing on a projector/second machine)
