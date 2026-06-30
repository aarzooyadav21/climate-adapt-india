import { useEffect, useState } from "react";
import { Droplets, Loader2 } from "lucide-react";
import { HUDPanel, HUDHeader, HUDBody } from "@/components/HUDPanel";
import { ProvenanceBadge } from "@/components/ProvenanceBadge";
import { KPITile } from "@/components/KPITile";
import AdvisorPanel from "@/components/AdvisorPanel";
import IndiaMap from "@/components/IndiaMap";
import { ExportMenu } from "@/components/ExportMenu";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const CAT_COLOR = {
  extreme_drought: "bg-[hsl(0_84%_58%/0.18)] text-[hsl(0_84%_70%)] border-[hsl(0_84%_58%/0.4)]",
  severe_drought:  "bg-[hsl(14_84%_56%/0.18)] text-[hsl(14_84%_72%)] border-[hsl(14_84%_56%/0.4)]",
  moderate_drought:"bg-[hsl(34_92%_56%/0.18)] text-[hsl(34_92%_70%)] border-[hsl(34_92%_56%/0.4)]",
  normal:          "bg-[hsl(152_62%_52%/0.16)] text-[hsl(152_62%_65%)] border-[hsl(152_62%_52%/0.4)]",
  moderately_wet:  "bg-[hsl(184_92%_55%/0.14)] text-[hsl(184_92%_72%)] border-[hsl(184_92%_55%/0.4)]",
  very_wet:        "bg-[hsl(204_92%_60%/0.14)] text-[hsl(204_92%_72%)] border-[hsl(204_92%_60%/0.4)]",
  extremely_wet:   "bg-[hsl(220_92%_60%/0.14)] text-[hsl(220_92%_72%)] border-[hsl(220_92%_60%/0.4)]",
};

export default function Drought() {
  const [data, setData] = useState(null);
  const [narrative, setNarrative] = useState(null);
  const [loadingNarr, setLoadingNarr] = useState(false);

  useEffect(() => {
    api.get("/drought/index").then((r) => setData(r.data));
  }, []);

  const loadNarrative = async () => {
    setLoadingNarr(true);
    try {
      const { data: nd } = await api.get("/drought/narrative");
      setNarrative(nd.narrative);
    } finally { setLoadingNarr(false); }
  };

  const atRisk = (data?.states || []).filter((s) => s.category !== "normal" && s.category.includes("drought"));
  const wet = (data?.states || []).filter((s) => s.category.includes("wet"));

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row gap-2 md:items-end md:justify-between">
        <div>
          <div className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground">// Drought Monitor</div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">SPI-Style Drought Severity</h1>
        </div>
        <ExportMenu
          dataTestId="drought-export"
          label="Export Data"
          options={[{ label: "Drought Index (all states)", endpoint: "/export/drought", params: {}, filenameBase: "drought_index_india" }]}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPITile dataTestId="drought-states-risk" label="States at Drought Risk" value={atRisk.length} status={atRisk.length > 0 ? "caution" : "favorable"} />
        <KPITile dataTestId="drought-wet" label="Wet States" value={wet.length} status="favorable" />
        <KPITile dataTestId="drought-extreme" label="Extreme Drought" value={atRisk.filter(s => s.category === "extreme_drought").length} status={atRisk.filter(s => s.category === "extreme_drought").length ? "stress" : "favorable"} />
        <KPITile dataTestId="drought-severe" label="Severe Drought" value={atRisk.filter(s => s.category === "severe_drought").length} status={atRisk.filter(s => s.category === "severe_drought").length ? "stress" : "favorable"} />
      </div>

      <div className="grid lg:grid-cols-12 gap-4">
        <HUDPanel className="lg:col-span-7">
          <HUDHeader title="India Drought Heatmap" subtitle="SPI proxy on 90-day precipitation vs LPA"
            right={<ProvenanceBadge source="Open-Meteo ERA5" />} />
          <div className="p-2">
            <IndiaMap height="60vh" layerOverride="drought" />
          </div>
        </HUDPanel>

        <HUDPanel className="lg:col-span-5">
          <HUDHeader title="State Categorisation" subtitle="All 36 states/UTs" right={<ProvenanceBadge source="IMD-style" />} />
          <HUDBody className="max-h-[60vh] overflow-y-auto">
            {!data ? (
              <div className="py-10 flex items-center justify-center text-muted-foreground text-xs"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> loading…</div>
            ) : (
              <div className="space-y-1.5">
                {data.states.sort((a, b) => a.spi - b.spi).map((s) => (
                  <div key={s.code} className="flex items-center justify-between px-3 py-2 rounded-md border border-border/60 bg-card/50">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground w-6">{s.code}</span>
                      <span className="text-sm">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] tabular-nums">SPI {s.spi >= 0 ? "+" : ""}{s.spi}</span>
                      <Badge variant="outline" className={cn("font-mono uppercase text-[10px]", CAT_COLOR[s.category])}>
                        {s.category.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </HUDBody>
        </HUDPanel>
      </div>

      <HUDPanel>
        <HUDHeader title="AI Drought Briefing" subtitle="Impacts and recommendations"
          right={<button data-testid="drought-narrative-btn" onClick={loadNarrative} className="text-[11px] font-mono px-3 py-1.5 rounded-md border border-border/80 hover:bg-white/5">{loadingNarr ? "Generating…" : "Generate narrative"}</button>} />
        <HUDBody>
          {!narrative ? (
            <div className="text-sm text-muted-foreground">Click “Generate narrative” to fetch an AI-written drought situation briefing.</div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="text-foreground font-medium">{narrative.headline}</div>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Agricultural Impact</div>
                  <div>{narrative.agricultural_impact}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Water Impact</div>
                  <div>{narrative.water_impact}</div>
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Recommendations</div>
                <ul className="list-disc ml-5">{(narrative.recommendations || []).map((r, i) => <li key={i}>{r}</li>)}</ul>
              </div>
              {!!(narrative.states_at_risk || []).length && (
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">States At Risk</div>
                  <div className="flex flex-wrap gap-1.5">
                    {narrative.states_at_risk.map((s, i) => (
                      <Badge key={i} variant="outline" className={cn("font-mono uppercase text-[10px]", CAT_COLOR[s.category])}>{s.name} · {s.category?.replace(/_/g, " ")}</Badge>
                    ))}
                  </div>
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
