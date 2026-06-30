import { useEffect, useState } from "react";
import { Flame, CloudRain, Wind, AlertTriangle, ShieldAlert, Loader2 } from "lucide-react";
import { HUDPanel, HUDHeader, HUDBody } from "@/components/HUDPanel";
import { ProvenanceBadge } from "@/components/ProvenanceBadge";
import { KPITile } from "@/components/KPITile";
import AdvisorPanel from "@/components/AdvisorPanel";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

const SEV_COLOR = {
  normal:   "border-l-[hsl(var(--muted-foreground))]",
  watch:    "border-l-[hsl(var(--state-info))]",
  warning:  "border-l-[hsl(var(--state-warning))]",
  critical: "border-l-[hsl(var(--state-critical))]",
};
const SEV_BADGE = {
  normal:   "text-muted-foreground",
  watch:    "text-[hsl(var(--state-info))]",
  warning:  "text-[hsl(var(--state-warning))]",
  critical: "text-[hsl(var(--state-critical))]",
};
const TYPE_ICON = { heatwave: Flame, flood: CloudRain, drought: AlertTriangle, coldwave: Wind, cyclone: Wind, thunderstorm: AlertTriangle };

export default function Extremes() {
  const [data, setData] = useState(null);
  const [narrative, setNarrative] = useState(null);
  const [loadingNarr, setLoadingNarr] = useState(false);

  useEffect(() => {
    api.get("/extremes/alerts").then((r) => setData(r.data));
  }, []);

  const loadNarrative = async () => {
    setLoadingNarr(true);
    try {
      const { data: nd } = await api.get("/extremes/narrative");
      setNarrative(nd.narrative);
    } finally { setLoadingNarr(false); }
  };

  const active = (data?.states || []).filter(s => s.alerts.length);
  const criticalCount = (data?.states || []).filter(s => s.severity === "critical").length;
  const warningCount = (data?.states || []).filter(s => s.severity === "warning").length;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <div className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground">// Extreme Weather</div>
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Real-time Alert Console</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPITile dataTestId="ext-monitored" label="States Monitored" value={data?.total_states_monitored} />
        <KPITile dataTestId="ext-with-alerts" label="States with Alerts" value={data?.states_with_alerts} sub="active"
          status={(data?.states_with_alerts ?? 0) > 5 ? "caution" : "favorable"} />
        <KPITile dataTestId="ext-warning" label="Warnings" value={warningCount} status={warningCount > 0 ? "caution" : "favorable"} />
        <KPITile dataTestId="ext-critical" label="Critical" value={criticalCount} status={criticalCount > 0 ? "stress" : "favorable"} />
      </div>

      <HUDPanel>
        <HUDHeader title="Active Alerts" subtitle={`${active.length} states reporting events`}
          right={<div className="flex gap-2"><ProvenanceBadge source="Open-Meteo" /><ProvenanceBadge source="Open-Meteo ERA5" /></div>} />
        <HUDBody>
          {!data ? (
            <div className="py-10 flex items-center justify-center text-muted-foreground text-xs"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> loading…</div>
          ) : active.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-sm">No active alerts across monitored states.</div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {active.map((s) => (
                <div data-testid="alert-tile" key={s.code} className={cn("rounded-md border border-border/70 bg-card/60 border-l-4 p-4", SEV_COLOR[s.severity])}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="font-medium">{s.name}</div>
                    <Badge variant="outline" className={cn("font-mono uppercase text-[10px]", SEV_BADGE[s.severity])}>{s.severity}</Badge>
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground mb-2">{s.zone} · Tmax ~ {s.current_temp_c ?? "—"}°C</div>
                  <ul className="space-y-1.5">
                    {s.alerts.map((a, i) => {
                      const Icon = TYPE_ICON[a.type] || ShieldAlert;
                      return (
                        <li key={i} className="flex items-start gap-2 text-xs">
                          <Icon className="w-3.5 h-3.5 mt-0.5 text-[hsl(var(--accent))]" />
                          <div>
                            <span className="font-mono uppercase text-[10px] text-muted-foreground mr-1.5">{a.type}</span>
                            <span className="text-foreground">{a.note}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </HUDBody>
      </HUDPanel>

      <HUDPanel>
        <HUDHeader title="AI Extremes Narrative" subtitle="Public-advisory framing"
          right={<button data-testid="extremes-narrative-btn" onClick={loadNarrative} className="text-[11px] font-mono px-3 py-1.5 rounded-md border border-border/80 hover:bg-white/5">{loadingNarr ? "Generating…" : "Generate narrative"}</button>} />
        <HUDBody>
          {!narrative ? (
            <div className="text-sm text-muted-foreground">Click “Generate narrative” for an AI-written public advisory based on current alerts.</div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="text-foreground font-medium">{narrative.headline}</div>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Public Advisory</div>
                  <div>{narrative.public_advisory}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Emerging Risks</div>
                  <ul className="list-disc ml-5">{(narrative.emerging_risks || []).map((r, i) => <li key={i}>{r}</li>)}</ul>
                </div>
              </div>
              {!!(narrative.active_alerts || []).length && (
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Active Alerts (LLM)</div>
                  <ul className="space-y-1">
                    {(narrative.active_alerts || []).map((a, i) => (
                      <li key={i} className="text-sm">
                        <Badge variant="outline" className={cn("mr-2 font-mono uppercase text-[10px]", SEV_BADGE[a.severity])}>{a.severity}</Badge>
                        <span className="text-foreground">{a.type}</span> · {a.region} — {a.note}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </HUDBody>
      </HUDPanel>

      <AdvisorPanel />
    </div>
  );
}
