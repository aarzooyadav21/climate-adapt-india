import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import { Flame, Loader2, AlertTriangle, Wind, Droplets, Thermometer } from "lucide-react";
import { HUDPanel, HUDHeader, HUDBody } from "@/components/HUDPanel";
import { ProvenanceBadge } from "@/components/ProvenanceBadge";
import { KPITile } from "@/components/KPITile";
import AdvisorPanel from "@/components/AdvisorPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

// Fire risk color ramp (low → extreme)
const FIRE_RAMP = [
  { stop: 0.0, color: [34, 197, 94],   label: "low" },        // green
  { stop: 0.3, color: [234, 179, 8],   label: "moderate" },   // amber
  { stop: 0.45, color: [249, 115, 22], label: "high" },       // orange
  { stop: 0.6, color: [239, 68, 68],   label: "very_high" },  // red
  { stop: 0.75, color: [127, 29, 29],  label: "extreme" },    // dark red
];

const CAT_COLOR = {
  low:        "text-[hsl(var(--state-success))]",
  moderate:   "text-[hsl(var(--state-warning))]",
  high:       "text-[hsl(var(--state-warning))]",
  very_high:  "text-[hsl(var(--state-critical))]",
  extreme:    "text-[hsl(var(--state-critical))]",
};

const CAT_LABEL = {
  low: "Low", moderate: "Moderate", high: "High", very_high: "Very High", extreme: "Extreme",
};

function colorForScore(score) {
  if (score == null) return "rgba(150,150,150,0.25)";
  let lo = FIRE_RAMP[0], hi = FIRE_RAMP[FIRE_RAMP.length - 1];
  for (let i = 0; i < FIRE_RAMP.length - 1; i++) {
    if (score >= FIRE_RAMP[i].stop && score <= FIRE_RAMP[i+1].stop) {
      lo = FIRE_RAMP[i]; hi = FIRE_RAMP[i+1]; break;
    }
  }
  const t = (score - lo.stop) / Math.max(0.0001, (hi.stop - lo.stop));
  const c = lo.color.map((v, idx) => Math.round(v + (hi.color[idx] - v) * Math.max(0, Math.min(1, t))));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function FitIndia() {
  const map = useMap();
  useEffect(() => { map.fitBounds([[6.5, 68], [37, 97]], { padding: [10, 10] }); }, []); // eslint-disable-line
  return null;
}

export default function FireRisk() {
  const [data, setData] = useState(null);
  const [geo, setGeo] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [narrative, setNarrative] = useState(null);
  const [loadingNarr, setLoadingNarr] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [fr, g] = await Promise.all([
          api.get("/hazards/fire-risk"),
          api.get("/geo/india/states"),
        ]);
        setData(fr.data);
        setGeo(g.data);
      } catch (e) { setErr("Failed to load fire risk data."); }
    })();
  }, []);

  const byCode = useMemo(() => {
    const m = {};
    (data?.states || []).forEach((s) => { m[s.code] = s; });
    return m;
  }, [data]);

  const counts = useMemo(() => {
    const c = { low: 0, moderate: 0, high: 0, very_high: 0, extreme: 0 };
    (data?.states || []).forEach((s) => { if (c[s.category] != null) c[s.category]++; });
    return c;
  }, [data]);

  const styleFeature = (feature) => {
    const code = feature.properties.code;
    const row = byCode[code];
    const isHover = hovered?.code === code;
    return {
      fillColor: row ? colorForScore(row.score) : "rgba(150,150,150,0.2)",
      fillOpacity: row ? 0.72 : 0.15,
      color: isHover ? "#fbbf24" : "rgba(220, 240, 255, 0.35)",
      weight: isHover ? 2 : 0.6,
    };
  };

  const onEachFeature = (feature, layer) => {
    const code = feature.properties.code;
    layer.on({
      mouseover: () => setHovered(byCode[code] || { code, name: feature.properties.name }),
      mouseout: () => setHovered(null),
    });
  };

  const loadNarrative = async () => {
    setLoadingNarr(true);
    try {
      const { data: nd } = await api.get("/hazards/fire-risk/narrative");
      setNarrative(nd.narrative || nd);
    } catch { setNarrative({ headline: "Narrative unavailable", public_advisory: "AI service temporarily unavailable. Please retry." }); }
    finally { setLoadingNarr(false); }
  };

  const ranked = (data?.states || []).slice(0, 12);

  return (
    <div data-testid="fire-risk-page" className="p-4 md:p-6 space-y-4">
      <div>
        <div className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground">// Forest & Fire Hazards</div>
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Flame className="w-5 h-5 text-[hsl(var(--state-warning))]" /> Fire Weather Index — Live
        </h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPITile dataTestId="fire-kpi-monitored" label="States Monitored" value={data?.states?.length} />
        <KPITile dataTestId="fire-kpi-at-risk" label="At Risk (high+)" value={data?.count_at_risk}
          status={(data?.count_at_risk ?? 0) > 0 ? "stress" : "favorable"} />
        <KPITile dataTestId="fire-kpi-max" label="Peak FWI Score" value={data?.max_score?.toFixed(2)}
          status={(data?.max_score ?? 0) >= 0.6 ? "stress" : (data?.max_score ?? 0) >= 0.45 ? "caution" : "favorable"} />
        <KPITile dataTestId="fire-kpi-extreme" label="Extreme Category" value={counts.extreme}
          status={counts.extreme > 0 ? "stress" : "favorable"} />
      </div>

      {err && (
        <div className="text-xs text-[hsl(var(--state-critical))] font-mono">{err}</div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <HUDPanel className="lg:col-span-2">
          <HUDHeader title="Choropleth: Fire Weather Index" subtitle="FWI-lite (T·H·P·W) per state — hover for details"
            right={<div className="flex gap-2"><ProvenanceBadge source="NASA POWER" /><ProvenanceBadge source="Open-Meteo" /></div>} />
          <HUDBody className="p-0">
            <div data-testid="fire-map" className="relative w-full" style={{ height: "58vh" }}>
              <MapContainer center={[22.5, 80.5]} zoom={4.5} minZoom={3} maxZoom={8} scrollWheelZoom={true}
                style={{ height: "100%", width: "100%", background: "hsl(222 35% 5%)" }}>
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap &copy; CARTO' />
                <FitIndia />
                {geo && data && (
                  <GeoJSON key={`fire-${hovered?.code || "none"}`} data={geo} style={styleFeature} onEachFeature={onEachFeature} />
                )}
              </MapContainer>

              {/* Legend */}
              <div data-testid="fire-legend" className="absolute bottom-3 left-3 z-[400] hud-panel px-3 py-2 max-w-[320px]">
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5">
                  FWI-lite Score · <span className="text-foreground">0.0 – 1.0</span>
                </div>
                <div className="flex h-2.5 rounded-sm overflow-hidden border border-border/60" style={{
                  background: `linear-gradient(to right, ${FIRE_RAMP.map((s) => `rgb(${s.color.join(",")})`).join(",")})`
                }} />
                <div className="flex justify-between mt-1 text-[10px] font-mono text-muted-foreground">
                  <span>low</span><span>moderate</span><span>high</span><span>v-high</span><span>extreme</span>
                </div>
              </div>

              {/* Hover card */}
              {hovered && byCode[hovered.code] && (
                <div data-testid="fire-hover-card" className="absolute top-3 left-3 z-[400] hud-panel px-3 py-2.5 min-w-[220px]">
                  <div className="text-[10px] tracking-[0.16em] uppercase text-muted-foreground">FWI · {hovered.zone}</div>
                  <div className="text-sm font-semibold mt-0.5">{hovered.name}</div>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="font-mono text-xl" style={{ color: colorForScore(hovered.score) }}>{hovered.score?.toFixed(2)}</span>
                    <span className={cn("text-[11px] uppercase font-mono", CAT_COLOR[hovered.category])}>{CAT_LABEL[hovered.category]}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-mono text-muted-foreground">
                    <span className="flex items-center gap-1"><Thermometer className="w-3 h-3" />Tmax {hovered.tmax_30d ?? "—"}°C</span>
                    <span className="flex items-center gap-1"><Droplets className="w-3 h-3" />RH {hovered.humidity_now ?? "—"}%</span>
                    <span className="flex items-center gap-1"><Wind className="w-3 h-3" />Wind {hovered.wind_now ?? "—"} m/s</span>
                    <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" />30d rain {hovered.precip_30d ?? "—"} mm</span>
                  </div>
                </div>
              )}
            </div>
          </HUDBody>
        </HUDPanel>

        <HUDPanel>
          <HUDHeader title="Top States by FWI" subtitle="Highest risk first" />
          <HUDBody className="p-0">
            {!data ? (
              <div className="py-10 flex items-center justify-center text-muted-foreground text-xs">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> loading…
              </div>
            ) : (
              <ul data-testid="fire-ranked-list" className="divide-y divide-border/50 max-h-[58vh] overflow-y-auto">
                {ranked.map((s) => (
                  <li key={s.code} data-testid="fire-ranked-row" className="flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-white/5">
                    <div className="min-w-0">
                      <div className="text-sm truncate">{s.name}</div>
                      <div className="text-[10px] font-mono uppercase text-muted-foreground">{s.zone} · {s.code}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono tabular-nums text-sm" style={{ color: colorForScore(s.score) }}>{s.score.toFixed(2)}</span>
                      <Badge variant="outline" className={cn("text-[10px] uppercase font-mono", CAT_COLOR[s.category])}>{CAT_LABEL[s.category]}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </HUDBody>
        </HUDPanel>
      </div>

      <HUDPanel>
        <HUDHeader title="AI Fire-Risk Narrative" subtitle="Grounded in live observations"
          right={
            <Button data-testid="fire-narrative-btn" variant="outline" size="sm" onClick={loadNarrative}
              className="text-[11px] font-mono border-border/80 hover:bg-white/5">
              {loadingNarr ? "Generating…" : "Generate narrative"}
            </Button>
          } />
        <HUDBody>
          {!narrative ? (
            <div className="text-sm text-muted-foreground">Click “Generate narrative” for an AI-written advisory based on the current FWI map.</div>
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
            </div>
          )}
        </HUDBody>
      </HUDPanel>

      <AdvisorPanel />
    </div>
  );
}
