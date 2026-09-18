from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.utils.decorators import get_current_user
from app.services.engagement import get_leaderboard, get_full_ranked_list, citizen_score_breakdown

leaderboard_bp = Blueprint("leaderboard", __name__, url_prefix="/api/leaderboard")


@leaderboard_bp.get("/citizens")
@jwt_required()
def citizens_leaderboard():
    """Top citizen reporters by engagement score. Visible to any logged-in
    user — citizens, officers, and admins alike — since the whole point
    is public recognition of active, useful reporters."""
    limit = request.args.get("limit", default=10, type=int)
    limit = max(1, min(limit, 100))
    return jsonify(get_leaderboard(limit=limit)), 200


@leaderboard_bp.get("/me")
@jwt_required()
def my_engagement():
    """The current user's own score, breakdown, and rank — only
    meaningful for citizen accounts. Officers/admins get a clear
    'not applicable' response rather than a confusing empty result."""
    user = get_current_user()
    if user is None:
        return jsonify({"error": "unauthorized"}), 401

    if user.role != "citizen":
        return jsonify(
            {"applicable": False, "message": "Engagement scores are tracked for citizen accounts."}
        ), 200

    ranked = get_full_ranked_list()
    entry = None
    rank = None
    for i, row in enumerate(ranked):
        if row["citizen_id"] == user.id:
            entry = row
            rank = i + 1
            break

    if entry is None:
        entry = {"citizen_id": user.id, "name": user.name, **citizen_score_breakdown(user.id)}

    entry["applicable"] = True
    entry["rank"] = rank
    entry["total_citizens"] = len(ranked)
    return jsonify(entry), 200
