import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Sidebar() {
  const { user, signOut } = useAuth();

  return (
    <aside className="sidebar">
      <div>
        <div className="sidebar-brand">🌱 SwachhSeva</div>
        <div className="sidebar-tag">Officer Console</div>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" end className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
          📊 Dashboard
        </NavLink>
        <NavLink to="/complaints" className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
          📋 Complaints
        </NavLink>
        <NavLink to="/map" className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
          🗺️ Map
        </NavLink>
        <NavLink to="/hotspots" className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
          🔥 Hotspots
        </NavLink>
        {user?.role === "admin" && (
          <NavLink to="/officers" className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
            🏅 Officer Leaderboard
          </NavLink>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <strong>{user?.name}</strong>
          {user?.role === "admin" ? "Administrator" : `Officer${user?.department ? " — " + user.department : ""}`}
        </div>
        <button className="logout-btn" onClick={signOut}>
          Log out
        </button>
      </div>
    </aside>
  );
}
