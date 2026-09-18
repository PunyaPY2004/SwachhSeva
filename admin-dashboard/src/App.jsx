import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedLayout from "./components/ProtectedLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Complaints from "./pages/Complaints";
import ComplaintDetail from "./pages/ComplaintDetail";
import MapView from "./pages/MapView";
import OfficerStats from "./pages/OfficerStats";
import Hotspots from "./pages/Hotspots";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/complaints" element={<Complaints />} />
            <Route path="/complaints/:id" element={<ComplaintDetail />} />
            <Route path="/map" element={<MapView />} />
            <Route path="/officers" element={<OfficerStats />} />
            <Route path="/hotspots" element={<Hotspots />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
