import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchComplaints } from "../api/complaints";
import StatusBadge from "../components/StatusBadge";
import { imageUrl } from "../api/client";

const ISSUE_LABELS = {
  pothole: "Pothole",
  garbage_dump: "Garbage Dump",
  broken_streetlight: "Broken Streetlight",
  blocked_drain: "Blocked Drain",
  damaged_footpath: "Damaged Footpath",
};

const STATUS_OPTIONS = [
  ["ALL", "All Statuses"],
  ["PENDING_REVIEW", "Pending Review"],
  ["ASSIGNED", "Assigned"],
  ["IN_PROGRESS", "In Progress"],
  ["RESOLVED", "Resolved"],
  ["REOPENED", "Reopened (Disputed)"],
  ["OVERDUE", "Overdue"],
  ["REJECTED", "Rejected"],
];

export default function Complaints() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [status, setStatus] = useState("ALL");
  const [sort, setSort] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    load();
  }, [status, sort]);

  function load() {
    setLoading(true);
    fetchComplaints({ status, sort: sort === "priority" ? "priority" : undefined })
      .then(setComplaints)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  return (
    <>
      <div className="page-header">
        <div className="page-eyebrow">Registry</div>
        <h1 className="page-title">Complaints</h1>
        <p className="page-subtitle">Every complaint filed within your jurisdiction.</p>
      </div>

      <div className="filter-bar">
        <select className="filter-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUS_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select className="filter-select" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="newest">Sort: Newest First</option>
          <option value="priority">Sort: Priority (urgent first)</option>
        </select>
        <button className="btn btn-secondary" onClick={load}>
          ⟳ Refresh
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="loading-state">Loading complaints…</div>
        ) : error ? (
          <div className="empty-state">{error}</div>
        ) : complaints.length === 0 ? (
          <div className="empty-state">No complaints match this filter.</div>
        ) : (
          <table className="registry-table">
            <thead>
              <tr>
                <th>Photo</th>
                <th>Tracking ID</th>
                <th>Issue</th>
                <th>Department</th>
                <th>Status</th>
                <th>🔥 Confirmed</th>
                {sort === "priority" && <th>Priority</th>}
                <th>Citizen</th>
                <th>Filed</th>
              </tr>
            </thead>
            <tbody>
              {complaints.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/complaints/${c.id}`)}
                  style={c.is_escalated ? { borderLeft: "3px solid var(--alert)" } : undefined}
                >
                  <td>
                    <img
                      src={imageUrl(c.image_path)}
                      alt=""
                      style={{ width: 42, height: 42, borderRadius: 6, objectFit: "cover" }}
                    />
                  </td>
                  <td className="tracking-mono">{c.tracking_id}</td>
                  <td>{c.issue_type ? ISSUE_LABELS[c.issue_type] || c.issue_type : "Unclassified"}</td>
                  <td>{c.department || "—"}</td>
                  <td>
                    <StatusBadge status={c.is_escalated ? "OVERDUE" : c.status} />
                  </td>
                  <td>{c.upvote_count > 1 ? c.upvote_count : "—"}</td>
                  {sort === "priority" && (
                    <td style={{ fontWeight: 700 }}>{c.priority_score}</td>
                  )}
                  <td>{c.citizen?.name || "—"}</td>
                  <td>{new Date(c.created_at).toLocaleDateString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
