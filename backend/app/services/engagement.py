"""
Computes a citizen's civic engagement score — a lightweight gamification
layer to encourage genuine participation, not just complaint volume.
Like the priority-score formula, this is intentionally transparent and
explainable rather than a hidden black box:

    score = reports_submitted * 5
          + reports_resolved * 15    (their own complaints that got fixed)
          + accurate_upvotes * 3     (upvotes on complaints that later
                                       turned out to be real and got resolved)

Resolved complaints/upvotes are worth more than just submitting, since
that rewards genuinely useful reports over spamming the app. Nothing
here is stored — it's computed live from existing complaint and upvote
records each time it's requested, the same way priority scores are.
"""
from app.extensions import db
from app.models import User, Complaint, ComplaintUpvote

POINTS_PER_SUBMISSION = 5
POINTS_PER_RESOLUTION = 15
POINTS_PER_ACCURATE_UPVOTE = 3


def citizen_score_breakdown(citizen_id: int) -> dict:
    reports_submitted = Complaint.query.filter_by(citizen_id=citizen_id).count()
    reports_resolved = Complaint.query.filter_by(citizen_id=citizen_id, status="RESOLVED").count()

    accurate_upvotes = (
        db.session.query(ComplaintUpvote)
        .join(Complaint, ComplaintUpvote.complaint_id == Complaint.id)
        .filter(ComplaintUpvote.citizen_id == citizen_id, Complaint.status == "RESOLVED")
        .count()
    )

    score = (
        reports_submitted * POINTS_PER_SUBMISSION
        + reports_resolved * POINTS_PER_RESOLUTION
        + accurate_upvotes * POINTS_PER_ACCURATE_UPVOTE
    )

    return {
        "reports_submitted": reports_submitted,
        "reports_resolved": reports_resolved,
        "accurate_upvotes": accurate_upvotes,
        "score": score,
    }


def get_full_ranked_list() -> list[dict]:
    """Every citizen, ranked highest score first. Used both for the
    leaderboard display and for looking up one citizen's rank."""
    citizens = User.query.filter_by(role="citizen").all()
    results = []
    for c in citizens:
        breakdown = citizen_score_breakdown(c.id)
        results.append({"citizen_id": c.id, "name": c.name, **breakdown})
    results.sort(key=lambda r: r["score"], reverse=True)
    return results


def get_leaderboard(limit: int = 10) -> list[dict]:
    return get_full_ranked_list()[:limit]
