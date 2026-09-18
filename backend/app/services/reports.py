"""
Generates downloadable analytics reports for the officer/admin dashboard
— a CSV of raw complaint data, and a summary PDF report with the same
stats shown on the Dashboard page. Both are built from live database
data at request time; nothing here is cached or fabricated.
"""
import csv
import io
from datetime import datetime, timezone

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable

from app.services.priority import compute_priority_score

FOREST = colors.HexColor("#1B4332")
PAPER = colors.HexColor("#F6F3EC")
LINE = colors.HexColor("#DDD6C4")
TEXT_MUTED = colors.HexColor("#6B6858")

ISSUE_LABELS = {
    "pothole": "Pothole",
    "garbage_dump": "Garbage Dump",
    "broken_streetlight": "Broken Streetlight",
    "blocked_drain": "Blocked Drain",
    "damaged_footpath": "Damaged Footpath",
}

STATUS_LABELS = {
    "SUBMITTED": "Submitted",
    "PENDING_REVIEW": "Pending Review",
    "OFFICER_REVIEW": "Officer Review",
    "ASSIGNED": "Assigned",
    "IN_PROGRESS": "In Progress",
    "RESOLVED": "Resolved",
    "REOPENED": "Reopened",
    "REJECTED": "Rejected",
    "OVERDUE": "Overdue",
}


def generate_csv(complaints) -> str:
    """Returns CSV text — one row per complaint, ready for Excel/Sheets."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "Tracking ID",
            "Issue Type",
            "Status",
            "Department",
            "AI Confidence",
            "Upvotes",
            "Dispute Count",
            "Priority Score",
            "Citizen Name",
            "Citizen Email",
            "Assigned Officer",
            "Latitude",
            "Longitude",
            "Created At",
            "Resolved At",
        ]
    )
    for c in complaints:
        writer.writerow(
            [
                c.tracking_id,
                ISSUE_LABELS.get(c.issue_type, c.issue_type or "Unclassified"),
                "OVERDUE" if c.is_overdue() else c.status,
                c.department or "",
                f"{c.ai_confidence:.2f}" if c.ai_confidence is not None else "",
                c.upvote_count,
                c.dispute_count,
                compute_priority_score(c),
                c.citizen.name if c.citizen else "",
                c.citizen.email if c.citizen else "",
                c.assigned_officer.name if c.assigned_officer else "",
                c.latitude,
                c.longitude,
                c.created_at.isoformat() if c.created_at else "",
                c.resolved_at.isoformat() if c.resolved_at else "",
            ]
        )
    return output.getvalue()


def _styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="ReportTitle", fontName="Helvetica-Bold", fontSize=20, textColor=FOREST, spaceAfter=8))
    styles.add(ParagraphStyle(name="ReportSubtitle", fontName="Helvetica", fontSize=10.5, textColor=TEXT_MUTED, spaceAfter=14))
    styles.add(ParagraphStyle(name="ReportSectionTitle", fontName="Helvetica-Bold", fontSize=13, textColor=FOREST, spaceBefore=16, spaceAfter=8))
    styles.add(ParagraphStyle(name="ReportBody", fontName="Helvetica", fontSize=9.5, leading=13.5, textColor=colors.HexColor("#16211C")))
    styles.add(ParagraphStyle(name="ReportCell", fontName="Helvetica", fontSize=8.5, leading=11))
    styles.add(ParagraphStyle(name="ReportCellHeader", fontName="Helvetica-Bold", fontSize=8.5, leading=11, textColor=colors.white))
    return styles


def _table(data, col_widths):
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), FOREST),
                ("GRID", (0, 0), (-1, -1), 0.5, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PAPER]),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return t


def generate_pdf(complaints, stats, date_range_label, generated_by) -> bytes:
    """Returns PDF bytes — a summary analytics report matching the
    dashboard's own stats, plus a complaint listing table."""
    buffer = io.BytesIO()
    styles = _styles()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=18 * mm,
        bottomMargin=16 * mm,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        title="SwachhSeva Analytics Report",
    )

    story = []
    story.append(Paragraph("SwachhSeva — Analytics Report", styles["ReportTitle"]))
    story.append(
        Paragraph(
            f"{date_range_label} &nbsp;|&nbsp; Generated {datetime.now(timezone.utc).strftime('%d %b %Y, %H:%M UTC')} "
            f"by {generated_by}",
            styles["ReportSubtitle"],
        )
    )
    story.append(HRFlowable(width="100%", thickness=0.75, color=LINE, spaceAfter=10))

    story.append(Paragraph("Summary", styles["ReportSectionTitle"]))
    summary_rows = [
        [Paragraph("Metric", styles["ReportCellHeader"]), Paragraph("Count", styles["ReportCellHeader"])],
        ["Total complaints", str(stats["total"])],
        ["Pending review", str(stats["pending_review"])],
        ["In progress", str(stats["in_progress"])],
        ["Resolved", str(stats["resolved"])],
        ["Overdue", str(stats["overdue"])],
        ["Escalated", str(stats["escalated"])],
        ["Disputed / Reopened", str(stats["disputed"])],
    ]
    story.append(_table(summary_rows, col_widths=[100 * mm, 60 * mm]))

    if stats["by_department"]:
        story.append(Paragraph("By Department", styles["ReportSectionTitle"]))
        dept_rows = [[Paragraph("Department", styles["ReportCellHeader"]), Paragraph("Count", styles["ReportCellHeader"])]]
        for dept, count in stats["by_department"].items():
            dept_rows.append([dept, str(count)])
        story.append(_table(dept_rows, col_widths=[100 * mm, 60 * mm]))

    if stats["by_issue_type"]:
        story.append(Paragraph("By Category", styles["ReportSectionTitle"]))
        issue_rows = [[Paragraph("Issue Type", styles["ReportCellHeader"]), Paragraph("Count", styles["ReportCellHeader"])]]
        for issue, count in stats["by_issue_type"].items():
            issue_rows.append([ISSUE_LABELS.get(issue, issue), str(count)])
        story.append(_table(issue_rows, col_widths=[100 * mm, 60 * mm]))

    if complaints:
        story.append(Paragraph(f"Complaint Listing ({len(complaints)})", styles["ReportSectionTitle"]))
        listing_rows = [
            [
                Paragraph("Tracking ID", styles["ReportCellHeader"]),
                Paragraph("Issue", styles["ReportCellHeader"]),
                Paragraph("Status", styles["ReportCellHeader"]),
                Paragraph("Department", styles["ReportCellHeader"]),
                Paragraph("Filed", styles["ReportCellHeader"]),
            ]
        ]
        for c in complaints:
            listing_rows.append(
                [
                    Paragraph(c.tracking_id, styles["ReportCell"]),
                    Paragraph(ISSUE_LABELS.get(c.issue_type, c.issue_type or "Unclassified"), styles["ReportCell"]),
                    Paragraph(STATUS_LABELS.get("OVERDUE" if c.is_overdue() else c.status, c.status), styles["ReportCell"]),
                    Paragraph(c.department or "\u2014", styles["ReportCell"]),
                    Paragraph(c.created_at.strftime("%d/%m/%Y") if c.created_at else "", styles["ReportCell"]),
                ]
            )
        story.append(_table(listing_rows, col_widths=[32 * mm, 33 * mm, 33 * mm, 42 * mm, 20 * mm]))

    doc.build(story)
    return buffer.getvalue()
