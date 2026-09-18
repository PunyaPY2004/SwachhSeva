import os
from datetime import datetime, timezone

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models import Complaint, ComplaintUpvote
from app.utils.decorators import get_current_user
from app.utils.tracking import generate_tracking_id
from app.utils.validators import save_image
from app.utils.geo import distance_meters
from app.services.routing import route_complaint
from app.ai import predictor

complaints_bp = Blueprint("complaints", __name__, url_prefix="/api/complaints")

# How close two reports need to be to be considered "possibly the same issue".
NEARBY_RADIUS_METERS = 100


@complaints_bp.post("")
@jwt_required()
def submit_complaint():
    user = get_current_user()
    if user is None:
        return jsonify({"error": "unauthorized"}), 401

    if "image" not in request.files:
        return jsonify({"error": "validation_error", "message": "An 'image' file is required."}), 400

    try:
        lat = float(request.form.get("latitude"))
        lng = float(request.form.get("longitude"))
    except (TypeError, ValueError):
        return jsonify({"error": "validation_error", "message": "Valid 'latitude' and 'longitude' are required."}), 400

    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        return jsonify({"error": "validation_error", "message": "latitude/longitude out of range."}), 400

    description = (request.form.get("description") or "").strip() or None

    try:
        relative_path = save_image(request.files["image"])
    except ValueError as exc:
        return jsonify({"error": "validation_error", "message": str(exc)}), 400

    absolute_path = os.path.join(current_app.config["UPLOAD_FOLDER"], relative_path)
    result = predictor.predict(absolute_path)

    complaint = Complaint(
        tracking_id=generate_tracking_id(),
        citizen_id=user.id,
        image_path=relative_path,
        description=description,
        latitude=lat,
        longitude=lng,
        is_demo_prediction=result["demo_mode"],
    )

    if result["demo_mode"]:
        # No trained model available yet -> never fabricate a class.
        # A human officer must classify this complaint manually.
        complaint.status = "PENDING_REVIEW"
    else:
        complaint.issue_type = result["predicted_class"]
        complaint.ai_confidence = result["confidence"]
        complaint.ai_probabilities = result["probabilities"]

        threshold = current_app.config["AI_CONFIDENCE_THRESHOLD"]
        if result["confidence"] >= threshold:
            department, sla_days, sla_deadline = route_complaint(result["predicted_class"])
            complaint.department = department
            complaint.sla_days = sla_days
            complaint.sla_deadline = sla_deadline
            complaint.status = "ASSIGNED"
        else:
            complaint.status = "PENDING_REVIEW"

    db.session.add(complaint)
    db.session.commit()

    return jsonify(complaint.to_dict()), 201


@complaints_bp.post("/check-nearby")
@jwt_required()
def check_nearby():
    """
    Called BEFORE final submission (see mobile app's Report Issue flow):
    given a candidate location, returns any still-open complaints within
    NEARBY_RADIUS_METERS, so a citizen can confirm ("upvote") an existing
    report instead of filing a duplicate. This does a plain-Python
    distance check over unresolved complaints rather than a database
    geospatial query — perfectly fine at this project's scale, and avoids
    needing PostGIS.
    """
    user = get_current_user()
    if user is None:
        return jsonify({"error": "unauthorized"}), 401

    data = request.get_json(silent=True) or {}
    try:
        lat = float(data.get("latitude"))
        lng = float(data.get("longitude"))
    except (TypeError, ValueError):
        return jsonify({"error": "validation_error", "message": "Valid latitude and longitude are required."}), 400

    open_complaints = Complaint.query.filter(Complaint.status.notin_(["RESOLVED", "REJECTED"])).all()

    nearby = []
    for c in open_complaints:
        d = distance_meters(lat, lng, c.latitude, c.longitude)
        if d <= NEARBY_RADIUS_METERS:
            already_upvoted = ComplaintUpvote.query.filter_by(complaint_id=c.id, citizen_id=user.id).first() is not None
            entry = c.to_dict()
            entry["distance_meters"] = round(d, 1)
            entry["already_upvoted_by_me"] = already_upvoted or c.citizen_id == user.id
            nearby.append(entry)

    nearby.sort(key=lambda e: e["distance_meters"])
    return jsonify(nearby), 200


@complaints_bp.post("/<int:complaint_id>/upvote")
@jwt_required()
def upvote_complaint(complaint_id):
    """A citizen confirms an existing complaint instead of filing a new
    one. One upvote per citizen per complaint; the original reporter
    can't upvote their own complaint (that's what submitting already meant)."""
    user = get_current_user()
    if user is None:
        return jsonify({"error": "unauthorized"}), 401

    complaint = Complaint.query.get(complaint_id)
    if complaint is None:
        return jsonify({"error": "not_found", "message": "Complaint not found."}), 404

    if complaint.status in ("RESOLVED", "REJECTED"):
        return jsonify({"error": "invalid_state", "message": "This complaint is already closed."}), 409

    if complaint.citizen_id == user.id:
        return jsonify({"error": "invalid_state", "message": "You can't upvote your own report."}), 409

    existing = ComplaintUpvote.query.filter_by(complaint_id=complaint_id, citizen_id=user.id).first()
    if existing is not None:
        return jsonify({"error": "invalid_state", "message": "You've already confirmed this complaint."}), 409

    db.session.add(ComplaintUpvote(complaint_id=complaint_id, citizen_id=user.id))
    complaint.upvote_count += 1
    db.session.commit()

    return jsonify(complaint.to_dict()), 200


@complaints_bp.get("")
@jwt_required()
def list_my_complaints():
    user = get_current_user()
    if user is None:
        return jsonify({"error": "unauthorized"}), 401

    status_filter = request.args.get("status")
    query = Complaint.query.filter_by(citizen_id=user.id)
    if status_filter:
        query = query.filter_by(status=status_filter.upper())

    complaints = query.order_by(Complaint.created_at.desc()).all()
    return jsonify([c.to_dict() for c in complaints]), 200


@complaints_bp.get("/<int:complaint_id>")
@jwt_required()
def get_complaint(complaint_id):
    user = get_current_user()
    if user is None:
        return jsonify({"error": "unauthorized"}), 401

    complaint = Complaint.query.get(complaint_id)
    if complaint is None:
        return jsonify({"error": "not_found", "message": "Complaint not found."}), 404

    if complaint.citizen_id != user.id and user.role not in ("officer", "admin"):
        return jsonify({"error": "forbidden", "message": "You cannot view this complaint."}), 403

    return jsonify(complaint.to_dict()), 200


@complaints_bp.put("/<int:complaint_id>")
@jwt_required()
def update_complaint(complaint_id):
    """
    Citizens may only edit the description, and only while the complaint
    hasn't yet been picked up by an officer (SUBMITTED / PENDING_REVIEW).
    Status changes are handled exclusively by officer/admin endpoints.
    """
    user = get_current_user()
    if user is None:
        return jsonify({"error": "unauthorized"}), 401

    complaint = Complaint.query.get(complaint_id)
    if complaint is None:
        return jsonify({"error": "not_found", "message": "Complaint not found."}), 404

    if complaint.citizen_id != user.id:
        return jsonify({"error": "forbidden", "message": "You cannot edit this complaint."}), 403

    if complaint.status not in ("SUBMITTED", "PENDING_REVIEW"):
        return jsonify(
            {"error": "invalid_state", "message": "This complaint is already being processed and can no longer be edited."}
        ), 409

    data = request.get_json(silent=True) or {}
    if "description" in data:
        complaint.description = (data.get("description") or "").strip() or None

    db.session.commit()
    return jsonify(complaint.to_dict()), 200


@complaints_bp.post("/<int:complaint_id>/dispute")
@jwt_required()
def dispute_complaint(complaint_id):
    """
    Lets the original citizen contest a resolution they don't believe
    actually fixed the issue — e.g. the resolution photo doesn't match
    reality, or the problem recurred immediately. Reopens the complaint
    for the officer and records why, rather than leaving the citizen with
    no recourse once something is marked Resolved.
    """
    user = get_current_user()
    if user is None:
        return jsonify({"error": "unauthorized"}), 401

    complaint = Complaint.query.get(complaint_id)
    if complaint is None:
        return jsonify({"error": "not_found", "message": "Complaint not found."}), 404

    if complaint.citizen_id != user.id:
        return jsonify({"error": "forbidden", "message": "You can only dispute your own complaints."}), 403

    if complaint.status != "RESOLVED":
        return jsonify(
            {"error": "invalid_state", "message": "Only resolved complaints can be disputed."}
        ), 409

    data = request.get_json(silent=True) or {}
    reason = (data.get("reason") or "").strip()
    if not reason:
        return jsonify({"error": "validation_error", "message": "Please explain why you're disputing this resolution."}), 400

    complaint.status = "REOPENED"
    complaint.dispute_reason = reason
    complaint.disputed_at = datetime.now(timezone.utc)
    complaint.dispute_count += 1

    db.session.commit()
    return jsonify(complaint.to_dict()), 200
