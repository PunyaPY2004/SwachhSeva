from datetime import datetime, timezone

from app.extensions import db

# Valid status values across both the normal and AI-uncertain flows.
VALID_STATUSES = (
    "SUBMITTED",
    "PENDING_REVIEW",   # AI confidence was below threshold
    "OFFICER_REVIEW",   # an admin/officer is manually verifying
    "ASSIGNED",
    "IN_PROGRESS",
    "RESOLVED",
    "REOPENED",          # citizen disputed a resolution — see dispute fields below
    "REJECTED",
    "OVERDUE",
)


class Complaint(db.Model):
    __tablename__ = "complaints"

    id = db.Column(db.Integer, primary_key=True)
    tracking_id = db.Column(db.String(30), unique=True, nullable=False, index=True)

    citizen_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    citizen = db.relationship(
        "User", back_populates="complaints", foreign_keys=[citizen_id]
    )

    assigned_officer_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    assigned_officer = db.relationship("User", foreign_keys=[assigned_officer_id])

    image_path = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)

    # --- AI classification result ---
    issue_type = db.Column(db.String(50), nullable=True)
    ai_confidence = db.Column(db.Float, nullable=True)  # 0.0 - 1.0
    ai_probabilities = db.Column(db.JSON, nullable=True)  # {"pothole": 0.91, ...}
    is_demo_prediction = db.Column(db.Boolean, default=False)

    # --- Location ---
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)

    # --- Routing / SLA ---
    department = db.Column(db.String(100), nullable=True)
    sla_days = db.Column(db.Integer, nullable=True)
    sla_deadline = db.Column(db.DateTime, nullable=True)

    status = db.Column(db.String(30), nullable=False, default="SUBMITTED")
    officer_remarks = db.Column(db.Text, nullable=True)

    resolution_photo = db.Column(db.String(255), nullable=True)
    resolved_at = db.Column(db.DateTime, nullable=True)

    # --- Community confirmation ---
    # Starts at 1 (the original report counts as the first confirmation).
    # Other citizens nearby can "confirm" this complaint instead of filing
    # a duplicate — see ComplaintUpvote below and services/priority.py.
    upvote_count = db.Column(db.Integer, nullable=False, default=1)

    # --- Citizen dispute / reopen ---
    # If a citizen believes a "Resolved" complaint wasn't actually fixed,
    # they can dispute it — this reopens the complaint for the officer
    # and keeps a record of why, distinct from the original description.
    dispute_reason = db.Column(db.Text, nullable=True)
    disputed_at = db.Column(db.DateTime, nullable=True)
    dispute_count = db.Column(db.Integer, nullable=False, default=0)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    upvotes = db.relationship(
        "ComplaintUpvote", back_populates="complaint", cascade="all, delete-orphan"
    )

    def is_overdue(self) -> bool:
        if not self.sla_deadline or self.status in ("RESOLVED", "REJECTED"):
            return False
        return datetime.now(timezone.utc) > self.sla_deadline.replace(tzinfo=timezone.utc)

    def days_overdue(self) -> int:
        if not self.is_overdue():
            return 0
        deadline = self.sla_deadline.replace(tzinfo=timezone.utc)
        return (datetime.now(timezone.utc) - deadline).days

    def is_escalated(self) -> bool:
        """A complaint is considered escalated once it's more than 2 days
        past its SLA deadline and still unresolved — a simple, explainable
        rule rather than a hidden black-box threshold."""
        return self.days_overdue() > 2

    def to_dict(self, include_citizen: bool = False) -> dict:
        data = {
            "id": self.id,
            "tracking_id": self.tracking_id,
            "citizen_id": self.citizen_id,
            "image_path": self.image_path,
            "description": self.description,
            "issue_type": self.issue_type,
            "ai_confidence": self.ai_confidence,
            "ai_probabilities": self.ai_probabilities,
            "is_demo_prediction": self.is_demo_prediction,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "department": self.department,
            "sla_days": self.sla_days,
            "sla_deadline": self.sla_deadline.isoformat() if self.sla_deadline else None,
            "status": "OVERDUE" if self.is_overdue() else self.status,
            "officer_remarks": self.officer_remarks,
            "resolution_photo": self.resolution_photo,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "assigned_officer_id": self.assigned_officer_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "upvote_count": self.upvote_count,
            "is_escalated": self.is_escalated(),
            "days_overdue": self.days_overdue(),
            "dispute_reason": self.dispute_reason,
            "disputed_at": self.disputed_at.isoformat() if self.disputed_at else None,
            "dispute_count": self.dispute_count,
        }
        if include_citizen and self.citizen:
            data["citizen"] = {"name": self.citizen.name, "email": self.citizen.email}
        return data


class ComplaintUpvote(db.Model):
    """Records which citizen confirmed which complaint, so the same
    person can't upvote it twice, and so we know whose report was the
    original (excluded from being able to upvote their own)."""

    __tablename__ = "complaint_upvotes"
    __table_args__ = (db.UniqueConstraint("complaint_id", "citizen_id", name="uq_complaint_citizen_upvote"),)

    id = db.Column(db.Integer, primary_key=True)
    complaint_id = db.Column(db.Integer, db.ForeignKey("complaints.id"), nullable=False)
    citizen_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    complaint = db.relationship("Complaint", back_populates="upvotes")
