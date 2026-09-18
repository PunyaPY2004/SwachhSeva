"""
Detects "recurring hotspots" — locations where the same type of civic
issue keeps being reported, even across complaints that were already
marked resolved. A single pothole complaint is normal; the same spot
getting reported as a pothole 3+ times (especially if some were
"fixed" and it kept coming back, or a citizen disputed the fix) is a
signal that the underlying infrastructure needs real investment, not
another patch.

This is deliberately separate from the real-time duplicate check in
complaints.py — that one stops a citizen from filing a duplicate of an
*currently open* complaint. This one looks across a location's entire
history, resolved complaints included, to spot a recurring pattern.

Clustering approach: simple, explainable BFS/connected-components
grouping by Haversine distance — no external geospatial library needed,
and easy to reason about at this project's scale (dozens to low
hundreds of complaints, not millions).
"""
from collections import defaultdict

from app.utils.geo import distance_meters

DEFAULT_MIN_CLUSTER_SIZE = 3
DEFAULT_RADIUS_METERS = 100


def _build_cluster_summary(issue_type, members):
    lat = sum(m.latitude for m in members) / len(members)
    lng = sum(m.longitude for m in members) / len(members)

    resolved_count = sum(1 for m in members if m.status == "RESOLVED")
    # A complaint counts as "evidence this didn't hold" if it was disputed
    # at any point, or is currently sitting reopened.
    reopened_count = sum(1 for m in members if m.status == "REOPENED" or m.dispute_count > 0)

    created_dates = [m.created_at for m in members if m.created_at]
    first_reported = min(created_dates) if created_dates else None
    last_reported = max(created_dates) if created_dates else None

    count = len(members)
    if count >= 7:
        severity = "Critical"
    elif count >= 5:
        severity = "High"
    else:
        severity = "Moderate"

    return {
        "issue_type": issue_type,
        "latitude": lat,
        "longitude": lng,
        "complaint_count": count,
        "resolved_count": resolved_count,
        "reopened_count": reopened_count,
        "first_reported_at": first_reported.isoformat() if first_reported else None,
        "last_reported_at": last_reported.isoformat() if last_reported else None,
        "severity": severity,
        "complaints": [
            {
                "id": m.id,
                "tracking_id": m.tracking_id,
                "status": m.status,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in members
        ],
    }


def detect_hotspots(complaints, min_cluster_size=DEFAULT_MIN_CLUSTER_SIZE, radius_meters=DEFAULT_RADIUS_METERS):
    """
    complaints: list of Complaint objects (any status — resolved
    complaints matter here, unlike the duplicate-check).

    Returns a list of cluster summaries, sorted by complaint_count
    descending, for clusters that met the minimum size threshold.
    """
    by_issue = defaultdict(list)
    for c in complaints:
        if c.issue_type:
            by_issue[c.issue_type].append(c)

    clusters = []
    for issue_type, group in by_issue.items():
        n = len(group)
        visited = [False] * n

        for i in range(n):
            if visited[i]:
                continue
            cluster_indices = [i]
            visited[i] = True
            queue = [i]
            while queue:
                cur = queue.pop()
                for j in range(n):
                    if visited[j]:
                        continue
                    d = distance_meters(
                        group[cur].latitude, group[cur].longitude, group[j].latitude, group[j].longitude
                    )
                    if d <= radius_meters:
                        visited[j] = True
                        cluster_indices.append(j)
                        queue.append(j)

            if len(cluster_indices) >= min_cluster_size:
                members = [group[k] for k in cluster_indices]
                clusters.append(_build_cluster_summary(issue_type, members))

    clusters.sort(key=lambda c: c["complaint_count"], reverse=True)
    return clusters
