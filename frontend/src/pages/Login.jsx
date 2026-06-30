import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Satellite, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HUDPanel } from "@/components/HUDPanel";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const DEMO = [
  { role: "Policymaker", email: "policymaker@test.in" },
  { role: "Scientist",   email: "scientist@test.in" },
  { role: "Farmer",      email: "farmer@test.in" },
];

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(email, password);
      toast.success(`Welcome back, ${u.full_name}`);
      navigate("/app");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Login failed");
    } finally { setLoading(false); }
  };

  const fillDemo = (e) => { setEmail(e); setPassword("Climate@2025"); };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-25 pointer-events-none" />

      <div className="hidden lg:block relative">
        <img src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=1600&q=80"
             alt="satellite" className="absolute inset-0 w-full h-full object-cover opacity-50" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, hsl(222 35% 6% / 0.65), hsl(222 35% 6% / 0.9))" }} />
        <div className="relative z-10 h-full flex flex-col justify-between p-10">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-md border border-border/80 bg-card/70 flex items-center justify-center">
              <Satellite className="w-4 h-4 text-[hsl(var(--primary))]" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-[0.16em] uppercase">Bharat Climate Twin</div>
              <div className="text-[10px] text-muted-foreground tracking-wider">MISSION CONTROL</div>
            </div>
          </Link>
          <div>
            <div className="text-xs tracking-[0.2em] uppercase text-[hsl(var(--primary))]">// Authentication</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight max-w-md">Access the national climate console.</h2>
            <p className="mt-3 text-sm text-muted-foreground max-w-md leading-relaxed">
              Real fetched observations from NASA POWER, Open-Meteo ERA5, ECMWF forecasts.
              AI grounded analysis. Provenance on every metric.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12">
        <HUDPanel className="w-full max-w-md" glow="cyan">
          <div className="p-7">
            <div className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">// Mission Login</div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Welcome back, operator.</h1>
            <form data-testid="login-form" onSubmit={onSubmit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs tracking-wider uppercase text-muted-foreground">Email</Label>
                <Input id="email" data-testid="login-email" type="email" required value={email}
                       onChange={(e) => setEmail(e.target.value)} placeholder="you@agency.gov.in"
                       className="font-mono bg-input/40 border-border" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs tracking-wider uppercase text-muted-foreground">Password</Label>
                <Input id="password" data-testid="login-password" type="password" required value={password}
                       onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                       className="font-mono bg-input/40 border-border" />
              </div>
              <Button data-testid="login-submit" type="submit" disabled={loading}
                className="w-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.92)] hud-glow-cyan">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Authenticate <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-border/60">
              <div className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground">Quick demo accounts</div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {DEMO.map((d) => (
                  <button key={d.email}
                    type="button"
                    data-testid={`demo-${d.role.toLowerCase()}`}
                    onClick={() => fillDemo(d.email)}
                    className="text-[11px] font-mono px-2 py-2 rounded-md border border-border/70 hover:bg-white/5 transition-colors text-left">
                    <div className="text-foreground">{d.role}</div>
                    <div className="text-muted-foreground truncate">{d.email}</div>
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-muted-foreground mt-2 font-mono">password: Climate@2025</div>
            </div>

            <div className="mt-6 text-xs text-muted-foreground">
              Don’t have an account?{" "}
              <Link data-testid="login-go-register" to="/register" className="text-[hsl(var(--primary))] hover:underline">Register</Link>
            </div>
          </div>
        </HUDPanel>
      </div>
    </div>
  );
}
