import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchComplaint, updateStatus, resolveComplaint, fetchOfficers } from "../api/complaints";
import { imageUrl } from "../api/client";
import StatusBadge from "../components/StatusBadge";

const ISSUE_OPTIONS = [
  ["pothole", "Pothole"],
  ["garbage_dump", "Garbage Dump"],
  ["broken_streetlight", "Broken Streetlight"],
  ["blocked_drain", "Blocked Drain"],
  ["damaged_footpath", "Damaged Footpath"],
];

const STATUS_OPTIONS = [
  "SUBMITTED",
  "PENDING_REVIEW",
  "OFFICER_REVIEW",
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLVED",
  "REOPENED",
  "REJECTED",
];

export default function ComplaintDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [issueType, setIssueType] = useState("");
  const [statusValue, setStatusValue] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);

  const [resolutionFile, setResolutionFile] = useState(null);
  const [resolving, setResolving] = useState(false);

  const [officers, setOfficers] = useState([]);
  const [assignedOfficerId, setAssignedOfficerId] = useState("");

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    fetchOfficers().then(setOfficers).catch(() => {});
  }, []);

  function load() {
    setLoading(true);
    fetchComplaint(id)
      .then((data) => {
        setComplaint(data);
        setIssueType(data.issue_type || "");
        setStatusValue(data.status);
        setRemarks(data.officer_remarks || "");
        setAssignedOfficerId(data.assigned_officer_id || "");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  async function handleSaveStatus(e) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    try {
      const payload = { status: statusValue, remarks };
      // Only send issue_type if the officer picked/changed a real classification.
      if (issueType && issueType !== complaint.issue_type) {
        payload.issue_type = issueType;
      }
      if (assignedOfficerId && Number(assignedOfficerId) !== complaint.assigned_officer_id) {
        payload.assigned_officer_id = Number(assignedOfficerId);
      }
      const updated = await updateStatus(id, payload);
      setComplaint(updated);
      setSaveMsg("Saved.");
    } catch (err) {
      setSaveMsg(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleResolve(e) {
    e.preventDefault();
    if (!resolutionFile) return;
    setResolving(true);
    try {
      const updated = await resolveComplaint(id, { file: resolutionFile, remarks });
      setComplaint(updated);
      setResolutionFile(null);
    } catch (err) {
      setSaveMsg(err.message);
    } finally {
      setResolving(false);
    }
  }

  if (loading) return <div className="loading-state">Loading complaint…</div>;
  if (error || !complaint) return <div className="empty-state">{error || "Not found."}</div>;

  const canResolve = complaint.status !== "RESOLVED" && complaint.status !== "REJECTED";

  return (
    <>
      <div className="page-header">
        <div className="page-eyebrow">Complaint Record</div>
        <h1 className="page-title tracking-mono" style={{ fontFamily: "var(--font-mono)", fontSize: 24 }}>
          {complaint.tracking_id}
        </h1>
        <p className="page-subtitle">
          Filed {new Date(complaint.created_at).toLocaleString("en-IN")} by{" "}
          {complaint.citizen?.name || "a citizen"}
        </p>
      </div>

      <div className="grid-2">
        <div>
          <div className="card">
            <img src={imageUrl(complaint.image_path)} alt="Complaint" className="detail-image" />

            {complaint.is_demo_prediction && (
              <div className="demo-banner" style={{ marginTop: 16 }}>
                ⚠️ AI model was not loaded when this complaint was submitted (Demo Mode). Classify it
                manually below.
              </div>
            )}

            {complaint.status === "REOPENED" && complaint.dispute_reason && (
              <div
                className="demo-banner"
                style={{ marginTop: 16, background: "var(--alert-soft)", borderColor: "#e0b8b0", color: "#7d2a1f" }}
              >
                ⚠️ <strong>Citizen disputed this resolution:</strong> "{complaint.dispute_reason}"
                {complaint.disputed_at && (
                  <span style={{ display: "block", marginTop: 4, fontSize: 11.5, opacity: 0.85 }}>
                    Disputed {new Date(complaint.disputed_at).toLocaleString("en-IN")}
                    {complaint.dispute_count > 1 ? ` — disputed ${complaint.dispute_count} times total` : ""}
                  </span>
                )}
              </div>
            )}

            <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <StatusBadge status={complaint.is_escalated ? "OVERDUE" : complaint.status} />
              {complaint.upvote_count > 1 && (
                <span className="badge badge-pending">🔥 {complaint.upvote_count} people confirmed this</span>
              )}
              {complaint.is_escalated && (
                <span className="badge badge-overdue">⚠️ Escalated — {complaint.days_overdue} day(s) overdue</span>
              )}
            </div>

            <div style={{ marginTop: 14 }}>
              <div className="detail-row">
                <span className="detail-label">Priority Score</span>
                <span className="detail-value">{complaint.priority_score ?? "—"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">AI Confidence</span>
                <span className="detail-value">
                  {complaint.ai_confidence != null ? `${Math.round(complaint.ai_confidence * 100)}%` : "—"}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Department</span>
                <span className="detail-value">{complaint.department || "Not yet assigned"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">SLA</span>
                <span className="detail-value">
                  {complaint.sla_days ? `${complaint.sla_days} days` : "—"}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">SLA Deadline</span>
                <span className="detail-value">
                  {complaint.sla_deadline ? new Date(complaint.sla_deadline).toLocaleDateString("en-IN") : "—"}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Location</span>
                <span className="detail-value">
                  {complaint.latitude.toFixed(5)}, {complaint.longitude.toFixed(5)}
                </span>
              </div>
            </div>
          </div>

          {complaint.description && (
            <div className="card">
              <h3 className="card-title">Citizen's Description</h3>
              <p style={{ fontSize: 14, lineHeight: 1.6 }}>{complaint.description}</p>
            </div>
          )}

          {complaint.resolution_photo && (
            <div className="card">
              <h3 className="card-title">Before &amp; After</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <p className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                    Before
                  </p>
                  <img src={imageUrl(complaint.image_path)} alt="Before" className="detail-image" style={{ maxHeight: 200 }} />
                </div>
                <div>
                  <p className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                    After
                  </p>
                  <img src={imageUrl(complaint.resolution_photo)} alt="Resolved" className="detail-image" style={{ maxHeight: 200 }} />
                </div>
              </div>
              {complaint.resolved_at && (
                <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
                  Resolved {new Date(complaint.resolved_at).toLocaleString("en-IN")}
                </p>
              )}
            </div>
          )}
        </div>

        <div>
          <div className="card">
            <h3 className="card-title">Classify &amp; Update</h3>
            <form onSubmit={handleSaveStatus}>
              <div className="field">
                <label>Issue Type</label>
                <select value={issueType} onChange={(e) => setIssueType(e.target.value)}>
                  <option value="">— Not classified —</option>
                  {ISSUE_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Status</label>
                <select value={statusValue} onChange={(e) => setStatusValue(e.target.value)}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Assigned Officer</label>
                <select value={assignedOfficerId} onChange={(e) => setAssignedOfficerId(e.target.value)}>
                  <option value="">— Unassigned —</option>
                  {officers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}{o.department ? ` (${o.department})` : ""}
                    </option>
                  ))}
                </select>
                {officers.length === 0 && (
                  <p className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
                    No officer accounts yet — create one with{" "}
                    <code>flask --app run create-officer</code>.
                  </p>
                )}
              </div>

              <div className="field">
                <label>Officer Remarks</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Notes visible to the citizen…"
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={saving}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
              {saveMsg && (
                <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
                  {saveMsg}
                </p>
              )}
            </form>
          </div>

          {canResolve && (
            <div className="card">
              <h3 className="card-title">Mark as Resolved</h3>
              <form onSubmit={handleResolve}>
                <div className="field">
                  <label>Resolution Photo</label>
                  <input
                    type="file"
                    accept="image/png, image/jpeg"
                    onChange={(e) => setResolutionFile(e.target.files[0] || null)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: "100%", background: "var(--signal)" }}
                  disabled={resolving || !resolutionFile}
                >
                  {resolving ? "Uploading…" : "✓ Mark Resolved"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
