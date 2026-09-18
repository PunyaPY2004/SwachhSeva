from datetime import datetime, timezone

from app.models.complaint import Complaint


def get_overdue_complaints():
    """
    Returns all complaints whose SLA deadline has passed and which are not
    already RESOLVED or REJECTED. Call this from an admin endpoint or a
    scheduled job (see training/README or the Celery notes in a later part).
    """
    now = datetime.now(timezone.utc)
    candidates = Complaint.query.filter(
        Complaint.sla_deadline.isnot(None),
        Complaint.status.notin_(["RESOLVED", "REJECTED"]),
    ).all()
    return [c for c in candidates if c.sla_deadline.replace(tzinfo=timezone.utc) < now]
