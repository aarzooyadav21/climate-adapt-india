import { useEffect, useState } from "react";
import { Briefcase, AlertTriangle, ShieldAlert, Droplets, CloudRain, FileText, Loader2, Sparkles } from "lucide-react";
import { HUDPanel, HUDHeader, HUDBody } from "@/components/HUDPanel";
import { ProvenanceBadge } from "@/components/ProvenanceBadge";
import StateSelector from "@/components/StateSelector";
import AdvisorPanel from "@/components/AdvisorPanel";
import { ExportMenu } from "@/components/ExportMenu";
import { Badge } from "@/components/ui/badge";
import { useAppState } from "@/context/AppStateContext";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

const SEV_STYLE = {
  normal: "text-[hsl(var(--state-success))] border-[hsl(var(--state-success)/0.4)]",
  caution: "text-[hsl(var(--state-warning))] border-[hsl(var(--state-warning)/0.4)]",
  stress: "text-[hsl(var(--state-critical))] border-[hsl(var(--state-critical)/0.4)]",
};

export default function PolicymakerHome() {
  const { user } = useAuth();
  const { selectedState } = useAppState();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedState) return;
    setLoading(true);
    setData(null);
    api.get("/policymaker/brief", { params: { state_code: selectedState.code } })
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, [selectedState]);

  const ns = data?.national_summary;
  const priority = data?.top_priority_states || [];

  return (
    <div data-testid="policymaker-home" className="p-4 md:p-6 space-y-5">
      <div className="flex flex-col md:flex-row gap-3 md:items-end md:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-md border border-border/80 bg-card/70 flex items-center justify-center hud-glow-cyan">
            <Briefcase className="w-5 h-5 text-[hsl(var(--primary))]" />
          </div>
          <div>
            <div className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground">// Executive Brief</div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{user?.full_name?.split(" ").slice(-1)} · Policymaker Console</h1>
            <div className="text-sm text-muted-foreground mt-0.5">Focus state: <span className="text-foreground font-medium">{selectedState?.name || "—"}</span> · National daily climate-risk summary</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu
            dataTestId="policy-export" label="Export"
            options={[
              { label: "Drought Index (all states)", endpoint: "/export/drought", params: {}, filenameBase: "drought_index_india" },
              { label: "Monsoon Status (all states)", endpoint: "/export/monsoon", params: {}, filenameBase: "monsoon_status_india" },
              { label: `${selectedState?.name || "State"} Snapshot`, endpoint: "/export/snapshot", params: { state_code: selectedState?.code }, filenameBase: `snapshot_${selectedState?.code}` },
            ]}
          />
          <StateSelector />
        </div>
      </div>

      {/* National headline strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="hud-panel px-4 py-3">
          <div className="text-[10px] tracking-wider uppercase text-muted-foreground">National Monsoon</div>
          <div className="font-mono text-2xl tabular-nums mt-1">{ns ? `${ns.monsoon_departure_pct >= 0 ? "+" : ""}${ns.monsoon_departure_pct.toFixed(1)}%` : "—"}</div>
          <div className="text-[11px] text-muted-foreground capitalize">{ns?.monsoon_phase}</div>
        </div>
        <div className="hud-panel px-4 py-3">
          <div className="text-[10px] tracking-wider uppercase text-muted-foreground">States in Drought</div>
          <div className="font-mono text-2xl tabular-nums mt-1">{ns?.states_in_drought ?? "—"}</div>
          <div className="text-[11px] text-muted-foreground">moderate / severe / extreme</div>
        </div>
        <div className="hud-panel px-4 py-3">
          <div className="text-[10px] tracking-wider uppercase text-muted-foreground">Active Warnings</div>
          <div className="font-mono text-2xl tabular-nums mt-1">{ns?.states_with_warnings ?? "—"}</div>
          <div className="text-[11px] text-muted-foreground">of {ns?.states_monitored ?? "—"} monitored</div>
        </div>
        <div className="hud-panel px-4 py-3 col-span-2">
          <div className="text-[10px] tracking-wider uppercase text-muted-foreground">Top priority states</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {priority.length ? priority.map((p) => (
              <Badge key={p.code} variant="outline" className="font-mono text-[10px] uppercase border-[hsl(var(--state-critical)/0.4)] text-[hsl(var(--state-critical))]">
                {p.name} · {p.category.replace(/_/g, " ")}
              </Badge>
            )) : <div className="text-[11px] text-muted-foreground">No priority states today.</div>}
          </div>
        </div>
      </div>

      {/* AI Executive Brief */}
      <HUDPanel glow="cyan">
        <HUDHeader title="AI Executive Brief" subtitle="Policy-grade summary grounded in real fetched data"
          right={<Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider border-[hsl(var(--primary)/0.4)] text-[hsl(var(--primary))]"><Sparkles className="w-3 h-3 mr-1" /> Claude</Badge>} />
        <HUDBody>
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Compiling executive brief…</div>
          ) : data?.brief_text ? (
            <div className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">{data.brief_text}</div>
          ) : (
            <div className="text-sm text-muted-foreground">Brief not available right now.</div>
          )}
        </HUDBody>
      </HUDPanel>

      {/* Risk cards */}
      <HUDPanel>
        <HUDHeader title="Risk Indicators" subtitle="National + focus-state context" />
        <HUDBody className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(data?.risk_cards || []).map((c, i) => (
            <div key={i} data-testid={`policy-risk-card-${i}`} className="rounded-md border border-border/70 bg-card/60 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.label}</div>
                <Badge variant="outline" className={cn("font-mono text-[10px] uppercase", SEV_STYLE[c.severity])}>{c.severity}</Badge>
              </div>
              <div className="font-mono text-2xl tabular-nums mt-1">{c.big}</div>
              <div className="text-[11px] text-muted-foreground mt-1">{c.sub}</div>
            </div>
          ))}
        </HUDBody>
      </HUDPanel>

      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <span className="uppercase tracking-wider">Sources:</span>
        {(data?.provenance || []).map((p, i) => <ProvenanceBadge key={i} source={p.source} />)}
      </div>

      <AdvisorPanel />
    </div>
  );
}
