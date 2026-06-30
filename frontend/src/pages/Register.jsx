import { useState, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Satellite, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HUDPanel } from "@/components/HUDPanel";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ROLES = [
  { id: "policymaker", title: "Policymaker", desc: "Water, urban heat, climate-risk briefings." },
  { id: "scientist",   title: "Scientist",   desc: "Full datasets, scenarios, exports, provenance." },
  { id: "farmer",      title: "Farmer",      desc: "Crop suitability, sowing window, advisory." },
];

export default function Register() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { register } = useAuth();
  const initialRole = useMemo(() => {
    const r = params.get("role");
    return ROLES.find((x) => x.id === r) ? r : "scientist";
  }, [params]);
  const [role, setRole] = useState(initialRole);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", organization: "", state_code: "" });
  const [loading, setLoading] = useState(false);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await register({ ...form, role });
      toast.success(`Welcome to Bharat Climate Twin, ${u.full_name}`);
      navigate("/app");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Registration failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-25 pointer-events-none" />

      <div className="hidden lg:block relative">
        <img src="https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1600&q=80"
             alt="space" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, hsl(222 35% 6% / 0.65), hsl(222 35% 6% / 0.9))" }} />
        <div className="relative z-10 h-full flex flex-col justify-between p-10">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-md border border-border/80 bg-card/70 flex items-center justify-center">
              <Satellite className="w-4 h-4 text-[hsl(var(--primary))]" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-[0.16em] uppercase">Bharat Climate Twin</div>
              <div className="text-[10px] text-muted-foreground tracking-wider">JOIN THE MISSION</div>
            </div>
          </Link>
          <div>
            <div className="text-xs tracking-[0.2em] uppercase text-[hsl(var(--india-saffron))]">// Onboard</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight max-w-md">Three roles. Three command consoles.</h2>
            <p className="mt-3 text-sm text-muted-foreground max-w-md leading-relaxed">
              Choose your role — the platform tailors dashboards, advisory tone, and alerts to your priorities.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-10">
        <HUDPanel className="w-full max-w-lg" glow="cyan">
          <div className="p-7">
            <div className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">// New Operator</div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Create your account</h1>

            <div data-testid="auth-role-selector" className="mt-5 grid grid-cols-3 gap-2">
              {ROLES.map((r) => (
                <button key={r.id} type="button"
                  data-testid={`register-role-${r.id}`}
                  onClick={() => setRole(r.id)}
                  className={cn("text-left px-3 py-2.5 rounded-md border transition-colors",
                    role === r.id
                      ? "border-[hsl(var(--primary)/0.6)] bg-[hsl(var(--primary)/0.10)]"
                      : "border-border/70 hover:bg-white/5")}>
                  <div className="text-xs font-semibold tracking-wider uppercase">{r.title}</div>
                  <div className="text-[10px] text-muted-foreground mt-1 leading-snug">{r.desc}</div>
                </button>
              ))}
            </div>

            <form data-testid="register-form" onSubmit={onSubmit} className="mt-5 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs tracking-wider uppercase text-muted-foreground">Full Name</Label>
                <Input data-testid="register-name" required value={form.full_name} onChange={(e) => update("full_name", e.target.value)}
                       placeholder="Dr. Priya Sharma" className="font-mono bg-input/40 border-border" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs tracking-wider uppercase text-muted-foreground">Email</Label>
                  <Input data-testid="register-email" type="email" required value={form.email} onChange={(e) => update("email", e.target.value)}
                         placeholder="you@agency.in" className="font-mono bg-input/40 border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs tracking-wider uppercase text-muted-foreground">Password</Label>
                  <Input data-testid="register-password" type="password" required minLength={6} value={form.password} onChange={(e) => update("password", e.target.value)}
                         placeholder="min 6 chars" className="font-mono bg-input/40 border-border" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs tracking-wider uppercase text-muted-foreground">Organization</Label>
                  <Input data-testid="register-org" value={form.organization} onChange={(e) => update("organization", e.target.value)}
                         placeholder="IITM Pune / MoEFCC / Krishak Samiti" className="font-mono bg-input/40 border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs tracking-wider uppercase text-muted-foreground">State Code</Label>
                  <Input data-testid="register-state" value={form.state_code} onChange={(e) => update("state_code", e.target.value.toUpperCase())}
                         placeholder="DL / MH / GJ" maxLength={2} className="font-mono bg-input/40 border-border" />
                </div>
              </div>
              <Button data-testid="register-submit" type="submit" disabled={loading}
                className="w-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.92)] hud-glow-cyan">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Create Account <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>

            <div className="mt-5 text-xs text-muted-foreground">
              Already have an account?{" "}
              <Link data-testid="register-go-login" to="/login" className="text-[hsl(var(--primary))] hover:underline">Login</Link>
            </div>
          </div>
        </HUDPanel>
      </div>
    </div>
  );
}
