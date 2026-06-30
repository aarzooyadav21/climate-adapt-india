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

const Protected = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

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
                <Route path="/app" element={<Dashboard />} />
                <Route path="/app/monsoon" element={<Monsoon />} />
                <Route path="/app/extremes" element={<Extremes />} />
                <Route path="/app/drought" element={<Drought />} />
                <Route path="/app/scenarios" element={<Scenarios />} />
                <Route path="/app/sectors/:sector" element={<SectorPage />} />
                <Route path="/app/lab" element={<Lab />} />
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
