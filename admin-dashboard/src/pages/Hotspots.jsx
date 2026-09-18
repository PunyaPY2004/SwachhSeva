import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchHotspots } from "../api/complaints";

const ISSUE_LABELS = {
  pothole: "Pothole",
  garbage_dump: "Garbage Dump",
  broken_streetlight: "Broken Streetlight",
  blocked_drain: "Blocked Drain",
  damaged_footpath: "Damaged Footpath",
};

const SEVERITY_CLASS = {
  Moderate: "badge-pending",
  High: "badge-overdue",
  Critical: "badge-rejected",
};

export default function Hotspots() {
  const navigate = useNavigate();
  const [hotspots, setHotspots] = useState([]);
  const [minSize, setMinSize] = useState(3);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minSize]);

  function load() {
    setLoading(true);
    fetchHotspots({ minSize })
      .then(setHotspots)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  return (
    <>
      <div className="page-header">
        <div className="page-eyebrow">Pattern Analysis</div>
        <h1 className="page-title">Recurring Hotspots</h1>
        <p className="page-subtitle">
          Locations where the same type of issue keeps being reported — including complaints
          already marked resolved. A recurring pattern usually means the underlying problem
          needs real infrastructure investment, not another one-off patch.
        </p>
      </div>

      <div className="filter-bar">
        <select className="filter-select" value={minSize} onChange={(e) => setMinSize(Number(e.target.value))}>
          <option value={2}>Minimum 2 reports</option>
          <option value={3}>Minimum 3 reports</option>
          <option value={4}>Minimum 4 reports</option>
          <option value={5}>Minimum 5 reports</option>
        </select>
        <button className="btn btn-secondary" onClick={load}>
          ⟳ Refresh
        </button>
      </div>

      {loading ? (
        <div className="loading-state">Scanning for patterns…</div>
      ) : error ? (
        <div className="empty-state">{error}</div>
      ) : hotspots.length === 0 ? (
        <div className="card">
          <p className="empty-state">
            No recurring hotspots detected at this threshold — that's a good sign. Try lowering
            the minimum report count above if you expect to see more.
          </p>
        </div>
      ) : (
        hotspots.map((h, i) => (
          <div className="card" key={i} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h3 className="card-title" style={{ marginBottom: 4 }}>
                  {ISSUE_LABELS[h.issue_type] || h.issue_type}
                </h3>
                <p className="muted" style={{ fontSize: 12.5 }}>
                  📍 {h.latitude.toFixed(5)}, {h.longitude.toFixed(5)}
                </p>
              </div>
              <span className={`badge ${SEVERITY_CLASS[h.severity] || "badge-default"}`}>
                {h.severity}
              </span>
            </div>

            <div className="ledger-strip" style={{ marginTop: 14, marginBottom: 14 }}>
              <div className="ledger-item">
                <div className="ledger-number">{h.complaint_count}</div>
                <div className="ledger-label">Reports</div>
              </div>
              <div className="ledger-item">
                <div className="ledger-number accent-signal">{h.resolved_count}</div>
                <div className="ledger-label">Currently Resolved</div>
              </div>
              <div className="ledger-item">
                <div className="ledger-number accent-alert">{h.reopened_count}</div>
                <div className="ledger-label">Disputed / Recurred</div>
              </div>
            </div>

            {h.reopened_count > 0 && (
              <div className="demo-banner" style={{ marginBottom: 14 }}>
                ⚠️ At least one report here was disputed or reopened — a past fix likely didn't
                hold. Worth escalating to a permanent infrastructure fix rather than another
                patch.
              </div>
            )}

            <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
              First reported {new Date(h.first_reported_at).toLocaleDateString("en-IN")} · Most
              recent {new Date(h.last_reported_at).toLocaleDateString("en-IN")}
            </p>

            <table className="registry-table">
              <thead>
                <tr>
                  <th>Tracking ID</th>
                  <th>Status</th>
                  <th>Filed</th>
                </tr>
              </thead>
              <tbody>
                {h.complaints.map((c) => (
                  <tr key={c.id} onClick={() => navigate(`/complaints/${c.id}`)}>
                    <td className="tracking-mono">{c.tracking_id}</td>
                    <td>{c.status.replace("_", " ")}</td>
                    <td>{new Date(c.created_at).toLocaleDateString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </>
  );
}
