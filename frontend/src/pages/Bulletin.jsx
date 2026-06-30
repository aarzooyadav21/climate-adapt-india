import { useEffect, useMemo, useState } from "react";
import { FileText, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { HUDPanel, HUDHeader, HUDBody } from "@/components/HUDPanel";
import { ProvenanceBadge } from "@/components/ProvenanceBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { useAppState } from "@/context/AppStateContext";
import AdvisorPanel from "@/components/AdvisorPanel";
import api from "@/lib/api";

const ROLE_OPTIONS = [
  { value: "farmer",      label: "Farmer (Plain advisory)" },
  { value: "policymaker", label: "Policymaker (Executive brief)" },
  { value: "scientist",   label: "Scientist (Technical bulletin)" },
];

export default function Bulletin() {
  const { user } = useAuth();
  const { selectedState, setSelectedState } = useAppState();
  const [states, setStates] = useState([]);
  const [role, setRole] = useState((user?.role || "scientist").toLowerCase());
  const [code, setCode] = useState(selectedState?.code || "MH");
  const [bulletin, setBulletin] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  // Role choice: farmers can only see farmer bulletin
  const allowedRoles = user?.role === "farmer"
    ? ROLE_OPTIONS.filter((r) => r.value === "farmer")
    : ROLE_OPTIONS;

  useEffect(() => {
    api.get("/climate/states").then((r) => setStates(r.data.states || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedState?.code && selectedState.code !== code) setCode(selectedState.code);
  }, [selectedState]); // eslint-disable-line

  const generate = async () => {
    if (!code) return;
    setLoading(true); setErr(null);
    try {
      const { data } = await api.get("/bulletin", { params: { state_code: code, role } });
      setBulletin(data);
      const s = states.find((x) => x.code === code);
      if (s) setSelectedState({ code: s.code, name: s.name, lat: s.lat, lon: s.lon });
    } catch (e) {
      setErr(e?.response?.data?.detail || "Bulletin generation failed.");
      setBulletin(null);
    } finally { setLoading(false); }
  };

  const formatted = useMemo(() => {
    if (!bulletin?.bulletin_text) return null;
    // Split into paragraphs; preserve simple headings
    return bulletin.bulletin_text.split(/\n{2,}/).map((p, i) => p.trim()).filter(Boolean);
  }, [bulletin]);

  return (
    <div data-testid="bulletin-page" className="p-4 md:p-6 space-y-4">
      <div>
        <div className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground">// Daily AI Bulletin</div>
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight flex items-center gap-2">
          <FileText className="w-5 h-5 text-[hsl(var(--primary))]" /> Climate Bulletin — Tailored Brief
        </h1>
        <div className="text-[11px] font-mono text-muted-foreground mt-1">
          Generated from live NASA POWER + Open-Meteo + ERA5 + IMD-style climatology · Grounded, no invented numbers.
        </div>
      </div>

      <HUDPanel>
        <HUDHeader title="Bulletin Controls" subtitle="Choose audience tone and state focus" />
        <HUDBody>
          <div className="grid md:grid-cols-3 gap-3 items-end">
            <div>
              <div className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground mb-1">State / UT</div>
              <Select value={code} onValueChange={setCode}>
                <SelectTrigger data-testid="bulletin-state-select" className="font-mono text-xs">
                  <SelectValue placeholder="Select state…" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {states.map((s) => (
                    <SelectItem key={s.code} value={s.code} className="font-mono text-xs">
                      {s.name} <span className="text-muted-foreground">· {s.code}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground mb-1">Audience</div>
              <Select value={role} onValueChange={setRole} disabled={user?.role === "farmer"}>
                <SelectTrigger data-testid="bulletin-role-select" className="font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allowedRoles.map((r) => (
                    <SelectItem key={r.value} value={r.value} className="font-mono text-xs">{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Button data-testid="bulletin-generate-btn" onClick={generate} disabled={loading || !code}
                className="w-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.92)] hud-glow-cyan">
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…</> : <><Sparkles className="w-4 h-4 mr-2" /> Generate Bulletin</>}
              </Button>
            </div>
          </div>
        </HUDBody>
      </HUDPanel>

      {err && (
        <div data-testid="bulletin-error" className="text-xs text-[hsl(var(--state-critical))] font-mono px-1">{err}</div>
      )}

      <HUDPanel>
        <HUDHeader
          title={bulletin ? `${bulletin.state.name} — ${bulletin.date_ist}` : "Bulletin Output"}
          subtitle={bulletin ? `Audience: ${bulletin.role.toUpperCase()} · IST` : "Output will appear here"}
          right={
            <div className="flex items-center gap-2">
              {bulletin && (
                <>
                  <Badge variant="outline" className="font-mono text-[10px] uppercase">{bulletin.role}</Badge>
                  <Button data-testid="bulletin-refresh-btn" variant="ghost" size="sm" onClick={generate}
                    className="text-[11px] font-mono text-muted-foreground hover:text-foreground">
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> Regenerate
                  </Button>
                </>
              )}
            </div>
          }
        />
        <HUDBody>
          {!bulletin && !loading && (
            <div data-testid="bulletin-empty" className="text-sm text-muted-foreground py-6 text-center">
              Select a state and click <span className="text-foreground font-medium">Generate Bulletin</span> to produce a grounded brief.
            </div>
          )}
          {loading && (
            <div className="py-12 flex items-center justify-center text-muted-foreground text-xs">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Composing bulletin from live observations…
            </div>
          )}
          {formatted && (
            <article data-testid="bulletin-text" className="prose prose-invert max-w-none text-sm leading-relaxed space-y-3">
              {formatted.map((p, i) => (
                <p key={i} className="whitespace-pre-wrap text-foreground/90">{p}</p>
              ))}
            </article>
          )}
          {bulletin?.provenance && (
            <div className="mt-5 pt-3 border-t border-border/50">
              <div className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground mb-1.5">Data Provenance</div>
              <div className="flex flex-wrap gap-1.5">
                {bulletin.provenance.map((p, i) => <ProvenanceBadge key={i} source={p.source} />)}
              </div>
            </div>
          )}
        </HUDBody>
      </HUDPanel>

      <AdvisorPanel />
    </div>
  );
}
