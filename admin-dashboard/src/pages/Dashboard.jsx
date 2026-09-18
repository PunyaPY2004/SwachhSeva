import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { fetchStats, downloadExport, fetchCitizenLeaderboard } from "../api/complaints";

const ISSUE_LABELS = {
  pothole: "Pothole",
  garbage_dump: "Garbage Dump",
  broken_streetlight: "Broken Streetlight",
  blocked_drain: "Blocked Drain",
  damaged_footpath: "Damaged Footpath",
};

const STATUS_LABELS = {
  SUBMITTED: "Submitted",
  PENDING_REVIEW: "Pending Review",
  OFFICER_REVIEW: "Officer Review",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  REOPENED: "Reopened (Disputed)",
  REJECTED: "Rejected",
};

const PIE_COLORS = ["#1b4332", "#c9822c", "#52796f", "#a63a2c", "#2d6a4f", "#8a6fae"];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [exportStart, setExportStart] = useState("");
  const [exportEnd, setExportEnd] = useState("");
  const [exporting, setExporting] = useState(null); // "csv" | "pdf" | null

  const [topCitizens, setTopCitizens] = useState([]);

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    fetchCitizenLeaderboard(5)
      .then(setTopCitizens)
      .catch(() => {}); // non-critical widget — fail silently
  }, []);

  if (loading) return <div className="loading-state">Loading dashboard…</div>;
  if (error) return <div className="empty-state">{error}</div>;

  const statusData = Object.entries(stats.by_status || {}).map(([key, value]) => ({
    name: STATUS_LABELS[key] || key,
    value,
  }));

  const departmentData = Object.entries(stats.by_department || {}).map(([key, value]) => ({
    name: key,
    count: value,
  }));

  const issueData = Object.entries(stats.by_issue_type || {}).map(([key, value]) => ({
    name: ISSUE_LABELS[key] || key,
    count: value,
  }));

  async function handleExport(format) {
    setExporting(format);
    try {
      await downloadExport(format, { start: exportStart || undefined, end: exportEnd || undefined });
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setExporting(null);
    }
  }

  return (
    <>
      <div className="page-header">
        <div className="page-eyebrow">Registry Overview</div>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">A running tally of civic complaints across your jurisdiction.</p>
      </div>

      <div className="ledger-strip">
        <div className="ledger-item">
          <div className="ledger-number">{stats.total}</div>
          <div className="ledger-label">Total</div>
        </div>
        <div className="ledger-item">
          <div className="ledger-number accent-saffron">{stats.pending_review}</div>
          <div className="ledger-label">Pending Review</div>
        </div>
        <div className="ledger-item">
          <div className="ledger-number">{stats.in_progress}</div>
          <div className="ledger-label">In Progress</div>
        </div>
        <div className="ledger-item">
          <div className="ledger-number accent-signal">{stats.resolved}</div>
          <div className="ledger-label">Resolved</div>
        </div>
        <div className="ledger-item">
          <div className="ledger-number accent-alert">{stats.overdue}</div>
          <div className="ledger-label">Overdue</div>
        </div>
        <div className="ledger-item">
          <div className="ledger-number accent-alert">{stats.disputed}</div>
          <div className="ledger-label">Disputed</div>
        </div>
      </div>

      <div className="chart-grid">
        <div className="card">
          <h3 className="card-title">Complaints by Status</h3>
          {statusData.length === 0 ? (
            <p className="empty-state">No complaints yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" height={40} wrapperStyle={{ fontSize: 12 }} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h3 className="card-title">Complaints by Department</h3>
          {departmentData.length === 0 ? (
            <p className="empty-state">Nothing routed yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={departmentData} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#1b4332" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Complaints by Category</h3>
        {issueData.length === 0 ? (
          <p className="empty-state">No AI-classified complaints yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={issueData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#c9822c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card">
        <h3 className="card-title">🏆 Top Citizen Reporters</h3>
        {topCitizens.length === 0 ? (
          <p className="empty-state">No citizen activity yet.</p>
        ) : (
          <table className="registry-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Citizen</th>
                <th>Reports</th>
                <th>Resolved</th>
                <th>Accurate Upvotes</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {topCitizens.map((c, i) => (
                <tr key={c.citizen_id} style={{ cursor: "default" }}>
                  <td>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}</td>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td>{c.reports_submitted}</td>
                  <td>{c.reports_resolved}</td>
                  <td>{c.accurate_upvotes}</td>
                  <td style={{ fontWeight: 700, color: "var(--forest)" }}>{c.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3 className="card-title">Export Reports</h3>
        <div className="filter-bar" style={{ alignItems: "center", marginBottom: 0 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label style={{ marginBottom: 4 }}>From (optional)</label>
            <input type="date" value={exportStart} onChange={(e) => setExportStart(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label style={{ marginBottom: 4 }}>To (optional)</label>
            <input type="date" value={exportEnd} onChange={(e) => setExportEnd(e.target.value)} />
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => handleExport("csv")}
            disabled={exporting !== null}
            style={{ alignSelf: "flex-end" }}
          >
            {exporting === "csv" ? "Downloading…" : "⬇ Download CSV"}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => handleExport("pdf")}
            disabled={exporting !== null}
            style={{ alignSelf: "flex-end" }}
          >
            {exporting === "pdf" ? "Downloading…" : "⬇ Download PDF Report"}
          </button>
        </div>
        <p className="muted" style={{ fontSize: 11.5, marginTop: 10, marginBottom: 0 }}>
          Leave both dates blank to export everything. CSV gives you raw complaint data for
          spreadsheets; the PDF is a formatted summary report.
        </p>
      </div>
    </>
  );
}
