import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import "@/App.css";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AppStateProvider } from "@/context/AppStateContext";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AppShell from "@/components/AppShell";
import Dashboard from "@/pages/Dashboard";
import Monsoon from "@/pages/Monsoon";
import Extremes from "@/pages/Extremes";
import Drought from "@/pages/Drought";
import Scenarios from "@/pages/Scenarios";
import SectorPage from "@/pages/Sectors";
import Advisor from "@/pages/Advisor";
import Lab from "@/pages/Lab";
import FarmerHome from "@/pages/FarmerHome";
import PolicymakerHome from "@/pages/PolicymakerHome";
import FireRisk from "@/pages/FireRisk";
import Cyclone from "@/pages/Cyclone";
import Bulletin from "@/pages/Bulletin";

const Protected = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// Pick the right home page based on role
function RoleHome() {
  const { user } = useAuth();
  if (user?.role === "farmer") return <FarmerHome />;
  if (user?.role === "policymaker") return <PolicymakerHome />;
  return <Dashboard />;
}

// Restrict pages by role (farmers don't see Lab/Scenarios/Drought etc.)
const ROLE_ACCESS = {
  scientist: new Set(["dashboard", "monsoon", "extremes", "drought", "scenarios", "lab", "sectors", "advisor", "fire", "cyclone", "bulletin"]),
  policymaker: new Set(["dashboard", "monsoon", "extremes", "drought", "scenarios", "sectors", "advisor", "fire", "cyclone", "bulletin"]),
  farmer: new Set(["sectors-agriculture", "advisor", "bulletin"]),
};

function RoleGate({ moduleKey, children }) {
  const { user } = useAuth();
  const allowed = ROLE_ACCESS[user?.role] || ROLE_ACCESS.scientist;
  if (!allowed.has(moduleKey)) return <Navigate to="/app" replace />;
  return children;
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.title = "Bharat Climate Twin — Mission Control";
  }, []);

  return (
    <div className="App min-h-screen">
      <AuthProvider>
        <AppStateProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                element={
                  <Protected>
                    <AppShell />
                  </Protected>
                }
              >
                <Route path="/app" element={<RoleHome />} />
                <Route path="/app/monsoon" element={<RoleGate moduleKey="monsoon"><Monsoon /></RoleGate>} />
                <Route path="/app/extremes" element={<RoleGate moduleKey="extremes"><Extremes /></RoleGate>} />
                <Route path="/app/drought" element={<RoleGate moduleKey="drought"><Drought /></RoleGate>} />
                <Route path="/app/scenarios" element={<RoleGate moduleKey="scenarios"><Scenarios /></RoleGate>} />
                <Route path="/app/sectors/:sector" element={<SectorPage />} />
                <Route path="/app/lab" element={<RoleGate moduleKey="lab"><Lab /></RoleGate>} />
                <Route path="/app/hazards/fire" element={<RoleGate moduleKey="fire"><FireRisk /></RoleGate>} />
                <Route path="/app/hazards/cyclone" element={<RoleGate moduleKey="cyclone"><Cyclone /></RoleGate>} />
                <Route path="/app/bulletin" element={<RoleGate moduleKey="bulletin"><Bulletin /></RoleGate>} />
                <Route path="/app/advisor" element={<Advisor />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster richColors position="top-right" theme="dark" />
        </AppStateProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
