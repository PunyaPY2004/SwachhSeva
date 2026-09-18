from datetime import datetime, timedelta, timezone

from flask import current_app


def route_complaint(issue_type: str):
    """
    Given an AI-detected issue_type, returns (department, sla_days, sla_deadline).
    Returns (None, None, None) if the issue_type is unrecognized (e.g. during
    a low-confidence / pending-review complaint where routing hasn't happened yet).
    """
    routing = current_app.config["DEPARTMENT_ROUTING"]
    if issue_type not in routing:
        return None, None, None

    department, sla_days = routing[issue_type]
    deadline = datetime.now(timezone.utc) + timedelta(days=sla_days)
    return department, sla_days, deadline


def route_manually(issue_type: str):
    """
    Used when an officer manually confirms/overrides the issue type for a
    complaint that came in as PENDING_REVIEW (low AI confidence).
    Raises ValueError if issue_type isn't one of the known categories.
    """
    routing = current_app.config["DEPARTMENT_ROUTING"]
    if issue_type not in routing:
        valid = ", ".join(routing.keys())
        raise ValueError(f"Unknown issue_type '{issue_type}'. Must be one of: {valid}.")
    return route_complaint(issue_type)
