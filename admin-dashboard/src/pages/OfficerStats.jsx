import { useEffect, useState } from "react";
import { fetchOfficerStats } from "../api/complaints";

export default function OfficerStats() {
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOfficerStats()
      .then(setOfficers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="page-header">
        <div className="page-eyebrow">Performance</div>
        <h1 className="page-title">Officer Leaderboard</h1>
        <p className="page-subtitle">Resolution counts and average turnaround time, per officer.</p>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="loading-state">Loading…</div>
        ) : error ? (
          <div className="empty-state">
            {error.includes("forbidden") || error.includes("403")
              ? "This page is only available to admins."
              : error}
          </div>
        ) : officers.length === 0 ? (
          <div className="empty-state">No officer accounts found yet.</div>
        ) : (
          <table className="registry-table">
            <thead>
              <tr>
                <th>Officer</th>
                <th>Department</th>
                <th>Resolved</th>
                <th>Open</th>
                <th>Avg. Resolution Time</th>
              </tr>
            </thead>
            <tbody>
              {officers.map((o) => (
                <tr key={o.officer_id} style={{ cursor: "default" }}>
                  <td style={{ fontWeight: 600 }}>{o.name}</td>
                  <td>{o.department || "—"}</td>
                  <td>{o.resolved_count}</td>
                  <td>{o.open_count}</td>
                  <td>
                    {o.avg_resolution_hours != null
                      ? o.avg_resolution_hours < 24
                        ? `${o.avg_resolution_hours} hrs`
                        : `${(o.avg_resolution_hours / 24).toFixed(1)} days`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
