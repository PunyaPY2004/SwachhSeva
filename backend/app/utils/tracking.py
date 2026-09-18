from datetime import datetime, timezone

from sqlalchemy import func

from app.extensions import db
from app.models.complaint import Complaint


def generate_tracking_id() -> str:
    """
    Generates a tracking ID like SW-2026-00001.

    The sequence number resets every calendar year and is derived from
    how many complaints already exist for that year, computed inside the
    same transaction so two simultaneous submissions can't collide.
    """
    year = datetime.now(timezone.utc).year
    prefix = f"SW-{year}-"

    count = (
        db.session.query(func.count(Complaint.id))
        .filter(Complaint.tracking_id.like(f"{prefix}%"))
        .scalar()
    )

    next_number = count + 1
    candidate = f"{prefix}{next_number:05d}"

    # Guard against a rare race condition (two requests reading the same
    # count before either commits) by bumping the number until it's free.
    while Complaint.query.filter_by(tracking_id=candidate).first() is not None:
        next_number += 1
        candidate = f"{prefix}{next_number:05d}"

    return candidate
