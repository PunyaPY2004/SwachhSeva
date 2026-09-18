const LABELS = {
  SUBMITTED: "Submitted",
  PENDING_REVIEW: "Pending Review",
  OFFICER_REVIEW: "Officer Review",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  REOPENED: "Reopened (Disputed)",
  REJECTED: "Rejected",
  OVERDUE: "Overdue",
};

const CLASS_MAP = {
  SUBMITTED: "badge-default",
  PENDING_REVIEW: "badge-pending",
  OFFICER_REVIEW: "badge-pending",
  ASSIGNED: "badge-assigned",
  IN_PROGRESS: "badge-progress",
  RESOLVED: "badge-resolved",
  REOPENED: "badge-overdue",
  REJECTED: "badge-rejected",
  OVERDUE: "badge-overdue",
};

export default function StatusBadge({ status }) {
  const cls = CLASS_MAP[status] || "badge-default";
  const label = LABELS[status] || status;
  return (
    <span className={`badge ${cls}`}>
      <span className="badge-dot" />
      {label}
    </span>
  );
}
