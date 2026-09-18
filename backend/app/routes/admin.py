import os
from datetime import datetime, timezone

from flask import Blueprint, request, jsonify, current_app, Response
from sqlalchemy import func

from app.extensions import db
from app.models import Complaint, VALID_STATUSES
from app.utils.decorators import roles_required, get_current_user
from app.utils.validators import save_image
from app.services.routing import route_manually
from app.services.sla import get_overdue_complaints
from app.services.priority import compute_priority_score
from app.services.reports import generate_csv, generate_pdf
from app.services.hotspots import detect_hotspots

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


def _visible_complaints_query(user):
    """Admins see everything. Officers see complaints in their own department
    plus anything already assigned directly to them."""
    query = Complaint.query
    if user.role == "officer":
        conditions = []
        if user.department:
            conditions.append(Complaint.department == user.department)
        conditions.append(Complaint.assigned_officer_id == user.id)
        query = query.filter(db.or_(*conditions))
    return query


@admin_bp.get("/complaints")
@roles_required("officer", "admin")
def list_all_complaints():
    user = get_current_user()
    query = _visible_complaints_query(user)

    status_filter = request.args.get("status")
    department_filter = request.args.get("department")
    issue_filter = request.args.get("issue_type")
    sort = request.args.get("sort")  # "priority" or unset (defaults to newest-first)

    if status_filter:
        if status_filter.upper() == "OVERDUE":
            ids = [c.id for c in get_overdue_complaints()]
            query = query.filter(Complaint.id.in_(ids))
        else:
            query = query.filter_by(status=status_filter.upper())
    if department_filter:
        query = query.filter_by(department=department_filter)
    if issue_filter:
        query = query.filter_by(issue_type=issue_filter)

    complaints = query.order_by(Complaint.created_at.desc()).all()

    results = []
    for c in complaints:
        entry = c.to_dict(include_citizen=True)
        entry["priority_score"] = compute_priority_score(c)
        results.append(entry)

    if sort == "priority":
        results.sort(key=lambda e: e["priority_score"], reverse=True)

    return jsonify(results), 200


@admin_bp.get("/complaints/<int:complaint_id>")
@roles_required("officer", "admin")
def get_admin_complaint(complaint_id):
    complaint = Complaint.query.get(complaint_id)
    if complaint is None:
        return jsonify({"error": "not_found", "message": "Complaint not found."}), 404
    entry = complaint.to_dict(include_citizen=True)
    entry["priority_score"] = compute_priority_score(complaint)
    return jsonify(entry), 200


def _parse_date_range():
    """Reads optional ?start=YYYY-MM-DD&end=YYYY-MM-DD query params.
    Returns (start_dt, end_dt, label) — either datetime may be None if
    not provided, meaning "no lower/upper bound"."""
    start_str = request.args.get("start")
    end_str = request.args.get("end")

    start_dt = None
    end_dt = None
    try:
        if start_str:
            start_dt = datetime.strptime(start_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        if end_str:
            # Inclusive of the whole end day.
            end_dt = datetime.strptime(end_str, "%Y-%m-%d").replace(
                hour=23, minute=59, second=59, tzinfo=timezone.utc
            )
    except ValueError:
        return None, None, None  # caller treats this as a bad request

    if start_str and end_str:
        label = f"{start_str} to {end_str}"
    elif start_str:
        label = f"From {start_str}"
    elif end_str:
        label = f"Through {end_str}"
    else:
        label = "All time"

    return start_dt, end_dt, label


def _compute_stats_for(complaints):
    """Same shape as the /stats endpoint's response, but computed from an
    already-fetched, possibly date-filtered list of Complaint objects
    rather than re-querying the database."""
    by_status, by_department, by_issue_type = {}, {}, {}
    for c in complaints:
        status_key = "OVERDUE" if c.is_overdue() else c.status
        by_status[status_key] = by_status.get(status_key, 0) + 1
        if c.department:
            by_department[c.department] = by_department.get(c.department, 0) + 1
        if c.issue_type:
            by_issue_type[c.issue_type] = by_issue_type.get(c.issue_type, 0) + 1

    escalated_count = len([c for c in complaints if c.is_escalated()])

    return {
        "total": len(complaints),
        "by_status": by_status,
        "by_department": by_department,
        "by_issue_type": by_issue_type,
        "overdue": by_status.get("OVERDUE", 0),
        "escalated": escalated_count,
        "disputed": by_status.get("REOPENED", 0),
        "pending_review": by_status.get("PENDING_REVIEW", 0),
        "resolved": by_status.get("RESOLVED", 0),
        "in_progress": by_status.get("IN_PROGRESS", 0),
    }


@admin_bp.get("/export/csv")
@roles_required("officer", "admin")
def export_csv():
    user = get_current_user()
    start_dt, end_dt, label = _parse_date_range()
    if label is None:
        return jsonify({"error": "validation_error", "message": "Dates must be in YYYY-MM-DD format."}), 400

    query = _visible_complaints_query(user)
    if start_dt:
        query = query.filter(Complaint.created_at >= start_dt)
    if end_dt:
        query = query.filter(Complaint.created_at <= end_dt)
    complaints = query.order_by(Complaint.created_at.desc()).all()

    csv_text = generate_csv(complaints)
    filename = f"swachhseva_complaints_{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv"
    return Response(
        csv_text,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@admin_bp.get("/export/pdf")
@roles_required("officer", "admin")
def export_pdf():
    user = get_current_user()
    start_dt, end_dt, label = _parse_date_range()
    if label is None:
        return jsonify({"error": "validation_error", "message": "Dates must be in YYYY-MM-DD format."}), 400

    query = _visible_complaints_query(user)
    if start_dt:
        query = query.filter(Complaint.created_at >= start_dt)
    if end_dt:
        query = query.filter(Complaint.created_at <= end_dt)
    complaints = query.order_by(Complaint.created_at.desc()).all()

    stats = _compute_stats_for(complaints)
    pdf_bytes = generate_pdf(complaints, stats, label, generated_by=user.name)

    filename = f"swachhseva_report_{datetime.now(timezone.utc).strftime('%Y%m%d')}.pdf"
    return Response(
        pdf_bytes,
        mimetype="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@admin_bp.get("/stats")
@roles_required("officer", "admin")
def stats():
    user = get_current_user()
    base = _visible_complaints_query(user)

    total = base.count()
    by_status_rows = (
        db.session.query(Complaint.status, func.count(Complaint.id))
        .filter(Complaint.id.in_([c.id for c in base.all()]))
        .group_by(Complaint.status)
        .all()
    )
    by_status = {status: count for status, count in by_status_rows}

    by_department_rows = (
        db.session.query(Complaint.department, func.count(Complaint.id))
        .filter(Complaint.id.in_([c.id for c in base.all()]), Complaint.department.isnot(None))
        .group_by(Complaint.department)
        .all()
    )
    by_department = {dept: count for dept, count in by_department_rows}

    by_issue_rows = (
        db.session.query(Complaint.issue_type, func.count(Complaint.id))
        .filter(Complaint.id.in_([c.id for c in base.all()]), Complaint.issue_type.isnot(None))
        .group_by(Complaint.issue_type)
        .all()
    )
    by_issue_type = {issue: count for issue, count in by_issue_rows}

    overdue_count = len([c for c in get_overdue_complaints() if c.id in [b.id for b in base.all()]])
    escalated_count = len([c for c in base.all() if c.is_escalated()])
    disputed_count = by_status.get("REOPENED", 0)

    return jsonify(
        {
            "total": total,
            "by_status": by_status,
            "by_department": by_department,
            "by_issue_type": by_issue_type,
            "overdue": overdue_count,
            "escalated": escalated_count,
            "disputed": disputed_count,
            "pending_review": by_status.get("PENDING_REVIEW", 0),
            "resolved": by_status.get("RESOLVED", 0),
            "in_progress": by_status.get("IN_PROGRESS", 0),
        }
    ), 200


@admin_bp.put("/complaints/<int:complaint_id>/status")
@roles_required("officer", "admin")
def update_status(complaint_id):
    user = get_current_user()
    complaint = Complaint.query.get(complaint_id)
    if complaint is None:
        return jsonify({"error": "not_found", "message": "Complaint not found."}), 404

    data = request.get_json(silent=True) or {}
    new_status = (data.get("status") or "").upper().strip()
    issue_type = data.get("issue_type")
    remarks = data.get("remarks")
    assigned_officer_id = data.get("assigned_officer_id")

    if new_status and new_status not in VALID_STATUSES:
        return jsonify(
            {"error": "validation_error", "message": f"status must be one of: {', '.join(VALID_STATUSES)}"}
        ), 400

    # Officer manually classifying a PENDING_REVIEW / low-confidence complaint.
    if issue_type:
        try:
            department, sla_days, sla_deadline = route_manually(issue_type)
        except ValueError as exc:
            return jsonify({"error": "validation_error", "message": str(exc)}), 400
        complaint.issue_type = issue_type
        complaint.department = department
        complaint.sla_days = sla_days
        complaint.sla_deadline = sla_deadline
        if not new_status:
            new_status = "ASSIGNED"

    if new_status:
        complaint.status = new_status

    if remarks is not None:
        complaint.officer_remarks = remarks

    if assigned_officer_id is not None:
        complaint.assigned_officer_id = assigned_officer_id

    db.session.commit()
    return jsonify(complaint.to_dict(include_citizen=True)), 200


@admin_bp.post("/complaints/<int:complaint_id>/resolve")
@roles_required("officer", "admin")
def resolve_complaint(complaint_id):
    complaint = Complaint.query.get(complaint_id)
    if complaint is None:
        return jsonify({"error": "not_found", "message": "Complaint not found."}), 404

    if "resolution_photo" not in request.files:
        return jsonify({"error": "validation_error", "message": "A 'resolution_photo' file is required."}), 400

    try:
        relative_path = save_image(request.files["resolution_photo"], subfolder="resolutions")
    except ValueError as exc:
        return jsonify({"error": "validation_error", "message": str(exc)}), 400

    remarks = request.form.get("remarks")

    complaint.resolution_photo = relative_path
    complaint.status = "RESOLVED"
    complaint.resolved_at = datetime.now(timezone.utc)
    if remarks:
        complaint.officer_remarks = remarks

    db.session.commit()
    return jsonify(complaint.to_dict(include_citizen=True)), 200


@admin_bp.get("/officers")
@roles_required("officer", "admin")
def list_officers():
    """Lightweight list for populating an 'assign to officer' dropdown —
    just id/name/department, not full performance stats (see /officers/stats
    for that, which is admin-only)."""
    from app.models import User

    officers = User.query.filter_by(role="officer").order_by(User.name).all()
    return jsonify(
        [{"id": o.id, "name": o.name, "department": o.department} for o in officers]
    ), 200


@admin_bp.get("/officers/stats")
@roles_required("admin")
def officer_stats():
    """
    Per-officer performance: how many complaints each officer has
    resolved, and their average resolution time (from when the
    complaint was created to when it was marked resolved). Admin-only,
    since this is about evaluating officers rather than doing the work.
    """
    from app.models import User

    officers = User.query.filter_by(role="officer").all()
    results = []

    for officer in officers:
        resolved = Complaint.query.filter_by(
            assigned_officer_id=officer.id, status="RESOLVED"
        ).all()

        resolved_count = len(resolved)
        if resolved_count > 0:
            total_hours = sum(
                (c.resolved_at - c.created_at).total_seconds() / 3600.0
                for c in resolved
                if c.resolved_at is not None
            )
            avg_resolution_hours = round(total_hours / resolved_count, 1)
        else:
            avg_resolution_hours = None

        open_count = Complaint.query.filter(
            Complaint.assigned_officer_id == officer.id,
            Complaint.status.notin_(["RESOLVED", "REJECTED"]),
        ).count()

        results.append(
            {
                "officer_id": officer.id,
                "name": officer.name,
                "department": officer.department,
                "resolved_count": resolved_count,
                "open_count": open_count,
                "avg_resolution_hours": avg_resolution_hours,
            }
        )

    results.sort(key=lambda r: r["resolved_count"], reverse=True)
    return jsonify(results), 200


@admin_bp.get("/hotspots")
@roles_required("officer", "admin")
def hotspots():
    """
    Detects recurring problem locations — same issue type, same rough
    location, reported 3+ times (default), across the complaint's whole
    history including already-resolved ones. Unlike the real-time
    duplicate check, this is meant to be reviewed periodically (e.g.
    weekly), not on every submission.
    """
    user = get_current_user()
    min_size = request.args.get("min_size", default=3, type=int)
    radius = request.args.get("radius", default=100, type=int)

    min_size = max(2, min(min_size, 20))
    radius = max(20, min(radius, 1000))

    complaints = _visible_complaints_query(user).all()
    clusters = detect_hotspots(complaints, min_cluster_size=min_size, radius_meters=radius)
    return jsonify(clusters), 200


@admin_bp.get("/heatmap")
@roles_required("officer", "admin")
def heatmap():
    user = get_current_user()
    complaints = _visible_complaints_query(user).all()
    points = [
        {
            "id": c.id,
            "tracking_id": c.tracking_id,
            "latitude": c.latitude,
            "longitude": c.longitude,
            "issue_type": c.issue_type,
            "status": "OVERDUE" if c.is_overdue() else c.status,
            "department": c.department,
            "upvote_count": c.upvote_count,
        }
        for c in complaints
    ]
    return jsonify(points), 200
