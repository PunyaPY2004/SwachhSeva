"""
Computes a simple, explainable priority score for sorting complaints in
the officer dashboard — not a black-box model, just a transparent
weighted formula so it's easy to justify in a viva:

    score = (upvote_count - 1) * 10      # community confirmations matter most
          + days_overdue * 15             # overdue complaints climb fast
          + age_in_days * 2               # older complaints get a gentle nudge
          + dispute_count * 25            # a disputed resolution is urgent —
                                             the officer's fix didn't hold

(upvote_count starts at 1 for the original report, so we subtract 1 to
only count *additional* confirmations from other citizens.)

This is intentionally simple and tunable — the weights (10/15/2/25) live
here in one place if you want to experiment with different priorities.
"""
from datetime import datetime, timezone


def compute_priority_score(complaint) -> int:
    if complaint.status in ("RESOLVED", "REJECTED"):
        return 0

    extra_confirmations = max(0, complaint.upvote_count - 1)
    overdue_component = complaint.days_overdue() * 15

    age_days = (datetime.now(timezone.utc) - complaint.created_at.replace(tzinfo=timezone.utc)).days
    age_component = age_days * 2

    dispute_component = complaint.dispute_count * 25

    return (extra_confirmations * 10) + overdue_component + age_component + dispute_component
