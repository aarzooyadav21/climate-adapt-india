import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Satellite, CloudRain, Flame, Droplets, FlaskConical, Bot,
  Globe2, ArrowRight, ShieldCheck, Sparkles, Radar, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HUDPanel } from "@/components/HUDPanel";
import { MissionClock } from "@/components/MissionClock";
import { useAuth } from "@/context/AuthContext";

const FEATURES = [
  { icon: Globe2,       title: "India-wide Climate Map",        desc: "State-level layers fused from NASA POWER, Open-Meteo ERA5 and IMD-style climatology." },
  { icon: CloudRain,    title: "Monsoon Variability Tracker",   desc: "Real-time onset progress, rainfall departure from LPA across all 36 states/UTs." },
  { icon: Flame,        title: "Extreme Weather & Drought",     desc: "Heatwave, flood, cyclone and SPI-style drought detection with severity heatmap." },
  { icon: FlaskConical, title: "Scenario Simulator",            desc: "Run +1.5°C / +2°C / +3°C warming what-ifs with AI-narrated sector impact." },
  { icon: Bot,          title: "AI Climate Advisor",            desc: "Claude-powered analyst grounded in real fetched observations for any Indian location." },
  { icon: ShieldCheck,  title: "Data Provenance Everywhere",    desc: "Every metric carries source, dataset and run timestamp — trust by transparency." },
];

const ROLES = [
  { id: "policymaker", title: "Policymaker", desc: "Water, urban heat and climate-risk briefings for decision-making." },
  { id: "scientist",   title: "Scientist",   desc: "Full datasets, scenarios, exports and provenance lineage." },
  { id: "farmer",      title: "Farmer",      desc: "Crop suitability, sowing window and agro-advisory for your state." },
];

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const goRole = (role) => navigate(`/register?role=${role}`);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Decorative grid + radar */}
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-[640px] h-[640px] rounded-full pointer-events-none opacity-50">
        <div className="relative w-full h-full rounded-full border border-[hsl(var(--primary)/0.18)]">
          <div className="radar-sweep rounded-full" />
        </div>
      </div>

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-10 py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-md border border-border/80 bg-card/70 flex items-center justify-center hud-glow-cyan">
            <Satellite className="w-4 h-4 text-[hsl(var(--primary))]" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-[0.16em] uppercase">Bharat Climate Twin</div>
            <div className="text-[10px] text-muted-foreground tracking-wider">AI-POWERED · NATIONAL DATASETS</div>
          </div>
        </div>
        <div className="hidden md:block"><MissionClock /></div>
        <div className="flex items-center gap-2">
          {user ? (
            <Button data-testid="landing-open-app" onClick={() => navigate("/app")} className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)]">
              Open Mission Control <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          ) : (
            <>
              <Button data-testid="landing-login" variant="ghost" onClick={() => navigate("/login")}>Login</Button>
              <Button data-testid="landing-signup" onClick={() => navigate("/register")} className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)]">
                Sign Up <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 px-6 md:px-10 pt-8 md:pt-14 pb-12 md:pb-20">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-[0.18em] border-[hsl(var(--india-saffron)/0.5)] text-[hsl(var(--india-saffron))] mb-5">
              <Sparkles className="w-3 h-3 mr-1.5" /> ATMA-NIRBHAR CLIMATE INTELLIGENCE
            </Badge>
            <motion.h1
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05]"
            >
              India’s Climate.<br />
              <span className="text-[hsl(var(--primary))]">Now a Living Digital Twin.</span>
            </motion.h1>
            <p className="mt-5 max-w-2xl text-base md:text-lg text-muted-foreground leading-relaxed">
              A high-fidelity, AI-powered virtual replica of India’s climate system — fusing
              NASA POWER, Open-Meteo ERA5 reanalysis, ECMWF forecasts, and IMD-style climatology
              with Claude-grade language models. Monitor monsoon variability, drought evolution
              and extreme weather in near-real-time. Run warming scenarios. Brief policy. Plan harvests.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button data-testid="hero-explore-twin" size="lg" onClick={() => navigate(user ? "/app" : "/register")}
                className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.92)] hud-glow-cyan">
                Explore the Twin <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button data-testid="hero-login" size="lg" variant="outline" onClick={() => navigate("/login")} className="border-border/80">
                Mission Login
              </Button>
              <div className="flex items-center gap-2 ml-2 text-[11px] font-mono text-muted-foreground">
                <Radar className="w-3.5 h-3.5 text-[hsl(var(--primary))]" /> 36 states/UTs · 4 data sources · AI grounded
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <HUDPanel className="relative aspect-[5/4] flex items-center justify-center" scanlines glow="cyan">
              <div className="absolute inset-0">
                <img
                  src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1600&q=80"
                  alt="Earth from space"
                  className="w-full h-full object-cover opacity-50"
                />
                <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 50% 50%, transparent 40%, hsl(222 35% 6% / 0.85) 90%)" }} />
              </div>
              <div className="relative z-10 text-center px-6">
                <div className="text-[10px] tracking-[0.24em] uppercase text-[hsl(var(--primary))]">Live Telemetry</div>
                <div className="mt-2 font-mono text-3xl md:text-4xl tabular-nums">28.6°N · 77.2°E</div>
                <div className="text-xs text-muted-foreground mt-1">Indian Subcontinent · Atmospheric Layer</div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-left">
                  <div className="hud-panel px-3 py-2">
                    <div className="text-[10px] text-muted-foreground">SURFACE T</div>
                    <div className="font-mono text-lg">38.4<span className="text-xs text-muted-foreground">°C</span></div>
                  </div>
                  <div className="hud-panel px-3 py-2">
                    <div className="text-[10px] text-muted-foreground">PRECIP 24h</div>
                    <div className="font-mono text-lg">0.0<span className="text-xs text-muted-foreground">mm</span></div>
                  </div>
                  <div className="hud-panel px-3 py-2">
                    <div className="text-[10px] text-muted-foreground">RH</div>
                    <div className="font-mono text-lg">38<span className="text-xs text-muted-foreground">%</span></div>
                  </div>
                </div>
              </div>
            </HUDPanel>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-6 md:px-10 pb-16">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold tracking-[0.2em] uppercase text-[hsl(var(--primary))]">// Capabilities</div>
          <h2 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight">A national-scale climate console, in your browser.</h2>
        </div>
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <HUDPanel className="h-full">
                <div className="p-5">
                  <div className="w-9 h-9 rounded-md flex items-center justify-center border border-border/80 bg-card mb-3">
                    <f.icon className="w-4 h-4 text-[hsl(var(--primary))]" />
                  </div>
                  <div className="text-sm font-semibold tracking-[0.14em] uppercase">{f.title}</div>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </HUDPanel>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Roles */}
      <section className="relative z-10 px-6 md:px-10 pb-20">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold tracking-[0.2em] uppercase text-[hsl(var(--india-saffron))]">// Built For</div>
          <h2 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight">Three roles. Three command consoles.</h2>
          <p className="mt-2 text-sm text-muted-foreground">Sign up as the role that fits your mission — the experience adapts to your priorities.</p>
        </div>
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          {ROLES.map((r) => (
            <HUDPanel key={r.id} className="group">
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold tracking-[0.16em] uppercase">{r.title}</div>
                  <Badge variant="outline" className="font-mono text-[10px] uppercase">/role</Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{r.desc}</p>
                <Button data-testid={`landing-role-cta-${r.id}`}
                  onClick={() => goRole(r.id)}
                  variant="outline" className="mt-5 w-full justify-between border-border/80 hover:bg-white/5">
                  Sign up as {r.title} <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </HUDPanel>
          ))}
        </div>
        <div className="mt-8 text-[11px] font-mono text-muted-foreground">
          Demo accounts (for quick exploration): <span className="text-foreground">policymaker@test.in</span> · <span className="text-foreground">scientist@test.in</span> · <span className="text-foreground">farmer@test.in</span> — password <span className="text-foreground">Climate@2025</span>
        </div>
      </section>

      <footer className="relative z-10 px-6 md:px-10 py-6 border-t border-border/60 flex flex-col md:flex-row gap-3 items-start md:items-center justify-between text-[11px] text-muted-foreground font-mono">
        <div>© {new Date().getFullYear()} Bharat Climate Twin — Mission Control. Built for India’s self-reliant climate intelligence.</div>
        <div className="flex gap-3">
          <span>Data: NASA POWER · Open-Meteo · ECMWF ERA5 · IMD-style</span>
        </div>
      </footer>
    </div>
  );
}
