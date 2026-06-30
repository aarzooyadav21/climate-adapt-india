import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Sprout, Wind, Building2, Sun, Loader2 } from "lucide-react";
import { HUDPanel, HUDHeader, HUDBody } from "@/components/HUDPanel";
import { ProvenanceBadge } from "@/components/ProvenanceBadge";
import { Badge } from "@/components/ui/badge";
import StateSelector from "@/components/StateSelector";
import AdvisorPanel from "@/components/AdvisorPanel";
import { useAppState } from "@/context/AppStateContext";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

const SECTOR_META = {
  agriculture: { title: "Agriculture", icon: Sprout, color: "hsl(152 62% 52%)", desc: "Crop suitability, sowing window, agro-advisory" },
  water:       { title: "Water Resources", icon: Wind, color: "hsl(184 92% 55%)", desc: "Rainfall, ET, water stress, reservoir proxy" },
  urban:       { title: "Urban Heat", icon: Building2, color: "hsl(34 92% 56%)", desc: "Heat index, UHI proxy, humidity" },
  energy:      { title: "Energy", icon: Sun, color: "hsl(204 92% 60%)", desc: "Solar/wind potential, demand stress days" },
};

const STATUS_BADGE = {
  favorable: "bg-[hsl(var(--state-success)/0.16)] text-[hsl(var(--state-success))] border-[hsl(var(--state-success)/0.4)]",
  caution:   "bg-[hsl(var(--state-warning)/0.16)] text-[hsl(var(--state-warning))] border-[hsl(var(--state-warning)/0.4)]",
  stress:    "bg-[hsl(var(--state-critical)/0.16)] text-[hsl(var(--state-critical))] border-[hsl(var(--state-critical)/0.4)]",
};

export default function SectorPage() {
  const { sector } = useParams();
  const { selectedState } = useAppState();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const meta = SECTOR_META[sector] || SECTOR_META.agriculture;
  const Icon = meta.icon;

  useEffect(() => {
    if (!selectedState) return;
    setLoading(true);
    api.get(`/sectors/${sector}`, { params: { state_code: selectedState.code } })
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, [sector, selectedState]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-md border border-border/80 bg-card/70 flex items-center justify-center" style={{ boxShadow: `0 0 0 1px ${meta.color}30, 0 0 24px ${meta.color}1A` }}>
            <Icon className="w-5 h-5" style={{ color: meta.color }} />
          </div>
          <div>
            <div className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground">// Sector Dashboard</div>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight">{meta.title}</h1>
            <div className="text-xs text-muted-foreground">{meta.desc}</div>
          </div>
        </div>
        <StateSelector />
      </div>

      <HUDPanel>
        <HUDHeader title={`${meta.title} · ${selectedState?.name || "—"}`} subtitle="Key indicators"
          right={<div className="flex gap-2">{(data?.provenance || []).map((p, i) => <ProvenanceBadge key={i} source={p.source} />)}</div>} />
        <HUDBody>
          {loading ? (
            <div className="py-10 flex items-center justify-center text-muted-foreground text-xs"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> loading…</div>
          ) : !data ? (
            <div className="py-8 text-muted-foreground text-sm">No data.</div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {data.indicators.map((it, i) => (
                <div key={i} className="hud-panel p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{it.name}</div>
                    <Badge variant="outline" className={cn("font-mono uppercase text-[10px]", STATUS_BADGE[it.status])}>{it.status}</Badge>
                  </div>
                  <div className="font-mono text-xl tabular-nums">{it.value}</div>
                </div>
              ))}
            </div>
          )}
        </HUDBody>
      </HUDPanel>

      {data?.narrative && (
        <HUDPanel>
          <HUDHeader title="AI Sector Advisory" subtitle="Claude-grounded interpretation" />
          <HUDBody className="space-y-3 text-sm">
            <div className="text-foreground font-medium">{data.narrative.headline}</div>
            <div className="text-muted-foreground text-sm">{data.narrative.current_state}</div>
            {!!(data.narrative.recommendations || []).length && (
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Recommendations</div>
                <ul className="list-disc ml-5">{data.narrative.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>
              </div>
            )}
            {!!(data.narrative.key_indicators || []).length && (
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Key Indicators (LLM)</div>
                <div className="flex flex-wrap gap-1.5">
                  {data.narrative.key_indicators.map((k, i) => (
                    <Badge key={i} variant="outline" className={cn("font-mono uppercase text-[10px]", STATUS_BADGE[k.status])}>{k.name}: {k.value}</Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="text-[10px] font-mono text-muted-foreground">Confidence: {data.narrative.confidence}</div>
          </HUDBody>
        </HUDPanel>
      )}

      <AdvisorPanel />
    </div>
  );
}
