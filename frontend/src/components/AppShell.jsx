import { NavLink, useNavigate } from "react-router-dom";
import { Outlet } from "react-router-dom";
import {
  Activity, CloudRain, Flame, Droplets, FlaskConical, Bot,
  Sprout, Building2, Sun, LogOut, Satellite, Wind, Layers3,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { MissionClock } from "@/components/MissionClock";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/app",                 label: "Mission Control", icon: Activity },
  { to: "/app/monsoon",         label: "Monsoon Tracker", icon: CloudRain },
  { to: "/app/extremes",        label: "Extreme Weather", icon: Flame },
  { to: "/app/drought",         label: "Drought Monitor", icon: Droplets },
  { to: "/app/scenarios",       label: "Scenario Simulator", icon: FlaskConical },
  { to: "/app/sectors/agriculture", label: "Agriculture",   icon: Sprout },
  { to: "/app/sectors/water",   label: "Water Resources",  icon: Wind },
  { to: "/app/sectors/urban",   label: "Urban Heat",       icon: Building2 },
  { to: "/app/sectors/energy",  label: "Energy",           icon: Sun },
  { to: "/app/advisor",         label: "AI Climate Advisor", icon: Bot },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => { logout(); navigate("/login"); };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 hud-panel rounded-none border-x-0 border-t-0 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="relative w-8 h-8 rounded-md border border-border/80 bg-card/70 flex items-center justify-center">
                <Satellite className="w-4 h-4 text-[hsl(var(--primary))]" />
                <div className="absolute inset-0 rounded-md" style={{ boxShadow: "var(--hud-glow-cyan)" }} />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold tracking-[0.16em] uppercase">Bharat Climate Twin</div>
                <div className="text-[10px] text-muted-foreground tracking-wider">MISSION CONTROL · v1.0</div>
              </div>
            </div>
            <div className="hidden md:block h-6 w-px bg-border/60 mx-2" />
            <MissionClock />
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
              <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--state-success))]" />NASA POWER</span>
              <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--state-success))]" />Open-Meteo</span>
              <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--state-success))]" />ERA5</span>
              <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--state-success))]" />IMD-style</span>
            </div>
            <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider border-[hsl(var(--india-saffron)/0.5)] text-[hsl(var(--india-saffron))]">
              {user?.role}
            </Badge>
            <div className="hidden md:flex flex-col text-right leading-tight">
              <span className="text-xs font-medium">{user?.full_name}</span>
              <span className="text-[10px] text-muted-foreground font-mono">{user?.email}</span>
            </div>
            <Button data-testid="logout-button" variant="ghost" size="sm" onClick={onLogout}
                    className="text-muted-foreground hover:text-foreground border border-border/60">
              <LogOut className="w-3.5 h-3.5 mr-1.5" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        <aside data-testid="side-nav" className="hidden md:flex flex-col w-60 border-r border-border/80 bg-card/40 backdrop-blur-sm">
          <div className="px-3 py-3 border-b border-border/60 flex items-center gap-2">
            <Layers3 className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground">Modules</span>
          </div>
          <nav className="flex-1 overflow-y-auto py-2 px-2">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.to === "/app"}
                data-testid={`nav-${n.label.toLowerCase().replace(/\s+/g, "-")}`}
                className={({ isActive }) => cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                  "text-muted-foreground hover:text-foreground hover:bg-white/5",
                  isActive && "bg-[hsl(var(--primary)/0.10)] text-foreground border border-[hsl(var(--primary)/0.30)]"
                )}
              >
                <n.icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{n.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="px-3 py-3 border-t border-border/60 text-[10px] text-muted-foreground font-mono">
            <div>Build: BCT-1.0.0</div>
            <div>Powered by NASA POWER, Open-Meteo, ERA5</div>
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
