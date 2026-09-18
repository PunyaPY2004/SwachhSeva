import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { fetchHeatmap } from "../api/complaints";
import HeatmapLayer from "../components/HeatmapLayer";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

// Leaflet's default marker icons don't resolve correctly under Vite's
// bundler by default — wire them up explicitly.
const defaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

const STATUS_COLOR = {
  PENDING_REVIEW: "#c9822c",
  ASSIGNED: "#2c4a72",
  IN_PROGRESS: "#5a3a80",
  RESOLVED: "#1f5138",
  OVERDUE: "#7d2a1f",
};

export default function MapView() {
  const navigate = useNavigate();
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("markers"); // "markers" | "heatmap"
  const [excludeResolved, setExcludeResolved] = useState(true);

  useEffect(() => {
    fetchHeatmap()
      .then(setPoints)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const center =
    points.length > 0 ? [points[0].latitude, points[0].longitude] : [12.9716, 77.5946]; // Bengaluru fallback

  const visiblePoints = excludeResolved
    ? points.filter((p) => p.status !== "RESOLVED" && p.status !== "REJECTED")
    : points;

  // Each complaint contributes its upvote_count worth of "heat" (starts
  // at 1 for the original report) — a confirmed complaint with several
  // upvotes stands out more than a single lone report, visually
  // surfacing community-validated hotspots.
  const heatPoints = visiblePoints.map((p) => [p.latitude, p.longitude, p.upvote_count || 1]);

  return (
    <>
      <div className="page-header">
        <div className="page-eyebrow">Field View</div>
        <h1 className="page-title">Complaint Map</h1>
        <p className="page-subtitle">
          {viewMode === "heatmap"
            ? "Density of civic complaints — darker areas have more (or more-confirmed) reports."
            : "Every reported location across your jurisdiction, at a glance."}
        </p>
      </div>

      <div className="filter-bar">
        <button
          className={`btn ${viewMode === "markers" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setViewMode("markers")}
        >
          📍 Markers
        </button>
        <button
          className={`btn ${viewMode === "heatmap" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setViewMode("heatmap")}
        >
          🔥 Heatmap
        </button>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            marginLeft: 8,
            color: "var(--text-muted)",
          }}
        >
          <input
            type="checkbox"
            checked={excludeResolved}
            onChange={(e) => setExcludeResolved(e.target.checked)}
          />
          Exclude resolved complaints
        </label>
      </div>

      {loading ? (
        <div className="loading-state">Loading map…</div>
      ) : error ? (
        <div className="empty-state">{error}</div>
      ) : (
        <div className="map-wrap">
          <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {viewMode === "heatmap" && heatPoints.length > 0 && <HeatmapLayer points={heatPoints} />}

            {viewMode === "markers" &&
              visiblePoints.map((p) => (
                <Marker key={p.id} position={[p.latitude, p.longitude]}>
                  <Popup>
                    <strong>{p.tracking_id}</strong>
                    <br />
                    {p.issue_type || "Unclassified"}
                    <br />
                    <span style={{ color: STATUS_COLOR[p.status] || "#333" }}>{p.status}</span>
                    {p.upvote_count > 1 && (
                      <>
                        <br />
                        🔥 {p.upvote_count} confirmations
                      </>
                    )}
                    <br />
                    <button
                      onClick={() => navigate(`/complaints/${p.id}`)}
                      style={{
                        marginTop: 6,
                        fontSize: 12,
                        background: "#1b4332",
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        padding: "4px 8px",
                        cursor: "pointer",
                      }}
                    >
                      View details
                    </button>
                  </Popup>
                </Marker>
              ))}
          </MapContainer>
        </div>
      )}
    </>
  );
}
