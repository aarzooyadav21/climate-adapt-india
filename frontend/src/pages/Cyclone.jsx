import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import { Wind, AlertTriangle, Loader2, Waves, CloudRain } from "lucide-react";
import { HUDPanel, HUDHeader, HUDBody } from "@/components/HUDPanel";
import { ProvenanceBadge } from "@/components/ProvenanceBadge";
import { KPITile } from "@/components/KPITile";
import AdvisorPanel from "@/components/AdvisorPanel";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

const SEV_COLOR = {
  normal:   { dot: "#94a3b8", text: "text-muted-foreground",          border: "border-l-[hsl(var(--muted-foreground))]" },
  watch:    { dot: "#38bdf8", text: "text-[hsl(var(--state-info))]",     border: "border-l-[hsl(var(--state-info))]" },
  warning:  { dot: "#f59e0b", text: "text-[hsl(var(--state-warning))]",  border: "border-l-[hsl(var(--state-warning))]" },
  critical: { dot: "#ef4444", text: "text-[hsl(var(--state-critical))]", border: "border-l-[hsl(var(--state-critical))]" },
};

const SEV_RADIUS = { normal: 6, watch: 9, warning: 13, critical: 17 };

function PulsingMarker({ state }) {
  const sev = state.severity || "normal";
  const conf = SEV_COLOR[sev] || SEV_COLOR.normal;
  const isActive = sev !== "normal";
  return (
    <>
      {/* Outer pulse ring (only when active) */}
      {isActive && (
        <CircleMarker center={[state.lat, state.lon]} radius={SEV_RADIUS[sev] + 6}
          pathOptions={{
            color: conf.dot, weight: 1.2, fillColor: conf.dot, fillOpacity: 0.12,
            className: "cyc-pulse",
          }}
          interactive={false} />
      )}
      <CircleMarker center={[state.lat, state.lon]} radius={SEV_RADIUS[sev]}
        pathOptions={{ color: conf.dot, weight: 2, fillColor: conf.dot, fillOpacity: 0.55 }}>
        <Tooltip direction="top" offset={[0, -4]} sticky>
          <div className="font-mono text-[11px]">
            <div className="font-semibold text-foreground">{state.name}</div>
            <div className="text-muted-foreground">Severity: <span className={conf.text}>{sev.toUpperCase()}</span></div>
            <div>Max wind 7d: {state.max_wind_7d_ms} m/s</div>
            <div>Max precip 7d: {state.max_precip_7d_mm} mm</div>
          </div>
        </Tooltip>
      </CircleMarker>
    </>
  );
}

function BasinCard({ title, states, dataTestId }) {
  return (
    <HUDPanel dataTestId={dataTestId}>
      <HUDHeader title={title} subtitle={`${states.length} coastal regions monitored`} />
      <HUDBody className="p-0">
        {states.length === 0 ? (
          <div className="px-4 py-6 text-xs text-muted-foreground">No states in this basin.</div>
        ) : (
          <ul className="divide-y divide-border/50">
            {states.map((s) => {
              const conf = SEV_COLOR[s.severity] || SEV_COLOR.normal;
              return (
                <li key={s.code} data-testid="cyc-basin-row"
                  className={cn("flex items-center justify-between gap-3 px-4 py-3 border-l-4 bg-card/40", conf.border)}>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{s.name}</div>
                    <div className="text-[10px] font-mono uppercase text-muted-foreground mt-0.5">{s.label}</div>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <Badge variant="outline" className={cn("font-mono text-[10px] uppercase", conf.text)}>{s.severity}</Badge>
                    <div className="text-[10px] font-mono text-muted-foreground mt-1">
                      <Wind className="w-2.5 h-2.5 inline mr-0.5" />{s.max_wind_7d_ms} m/s · <CloudRain className="w-2.5 h-2.5 inline mx-0.5" />{s.max_precip_7d_mm} mm
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </HUDBody>
    </HUDPanel>
  );
}

export default function Cyclone() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api.get("/hazards/cyclone-watch")
      .then((r) => setData(r.data))
      .catch(() => setErr("Failed to load cyclone watch."));
  }, []);

  const counts = useMemo(() => {
    const c = { normal: 0, watch: 0, warning: 0, critical: 0 };
    (data?.coastal_states || []).forEach((s) => { if (c[s.severity] != null) c[s.severity]++; });
    return c;
  }, [data]);

  return (
    <div data-testid="cyclone-page" className="p-4 md:p-6 space-y-4">
      <style>{`
        @keyframes cycPulse { 0% { stroke-opacity: 0.55; stroke-width: 1.2px; } 70% { stroke-opacity: 0; stroke-width: 6px; } 100% { stroke-opacity: 0; stroke-width: 6px; } }
        .leaflet-interactive.cyc-pulse, path.cyc-pulse { animation: cycPulse 1.8s ease-out infinite; }
      `}</style>
      <div>
        <div className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground">// Coastal Hazards</div>
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Waves className="w-5 h-5 text-[hsl(var(--state-info))]" /> Cyclone Watch — Arabian Sea & Bay of Bengal
        </h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPITile dataTestId="cyc-kpi-coastal" label="Coastal Regions" value={data?.coastal_states?.length} />
        <KPITile dataTestId="cyc-kpi-active" label="Active Watches" value={data?.active_watches?.length}
          status={(data?.active_watches?.length ?? 0) > 0 ? "stress" : "favorable"} sub="watch/warning/critical" />
        <KPITile dataTestId="cyc-kpi-warning" label="Warnings" value={counts.warning}
          status={counts.warning > 0 ? "caution" : "favorable"} />
        <KPITile dataTestId="cyc-kpi-critical" label="Critical" value={counts.critical}
          status={counts.critical > 0 ? "stress" : "favorable"} />
      </div>

      {err && <div className="text-xs text-[hsl(var(--state-critical))] font-mono">{err}</div>}

      <HUDPanel>
        <HUDHeader title="Coastal Mission Map" subtitle="Pulsing markers indicate active watches"
          right={<ProvenanceBadge source="Open-Meteo" />} />
        <HUDBody className="p-0">
          <div data-testid="cyc-map" className="relative w-full" style={{ height: "55vh" }}>
            <MapContainer center={[15.5, 82]} zoom={4.6} minZoom={3} maxZoom={8} scrollWheelZoom={true}
              style={{ height: "100%", width: "100%", background: "hsl(222 35% 5%)" }}>
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap &copy; CARTO' />
              {(data?.coastal_states || []).map((s) => <PulsingMarker key={s.code} state={s} />)}
            </MapContainer>
            {/* Legend */}
            <div className="absolute bottom-3 left-3 z-[400] hud-panel px-3 py-2 text-[10px] font-mono">
              <div className="uppercase tracking-[0.18em] text-muted-foreground mb-1">Severity</div>
              <div className="flex flex-col gap-1">
                {["critical", "warning", "watch", "normal"].map((k) => (
                  <div key={k} className="flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: SEV_COLOR[k].dot }} />
                    <span className={SEV_COLOR[k].text}>{k.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </HUDBody>
      </HUDPanel>

      {!data ? (
        <div className="py-10 flex items-center justify-center text-muted-foreground text-xs">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> loading basins…
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          <BasinCard dataTestId="cyc-basin-arabian" title="Arabian Sea Basin" states={data.basin_summary?.arabian_sea || []} />
          <BasinCard dataTestId="cyc-basin-bob" title="Bay of Bengal Basin" states={data.basin_summary?.bay_of_bengal || []} />
        </div>
      )}

      {data?.active_watches?.length > 0 && (
        <HUDPanel>
          <HUDHeader title="Active Watches" subtitle={`${data.active_watches.length} region(s) requiring monitoring`}
            right={<AlertTriangle className="w-4 h-4 text-[hsl(var(--state-warning))]" />} />
          <HUDBody>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.active_watches.map((s) => {
                const conf = SEV_COLOR[s.severity] || SEV_COLOR.normal;
                return (
                  <div key={s.code} data-testid="cyc-active-card"
                    className={cn("rounded-md border border-border/70 bg-card/60 border-l-4 p-4", conf.border)}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="font-medium">{s.name}</div>
                      <Badge variant="outline" className={cn("font-mono text-[10px] uppercase", conf.text)}>{s.severity}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">{s.label}</div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <div><span className="text-muted-foreground">Max wind 7d:</span> <span className="text-foreground">{s.max_wind_7d_ms} m/s</span></div>
                      <div><span className="text-muted-foreground">Now:</span> <span className="text-foreground">{s.current_wind_ms} m/s</span></div>
                      <div className="col-span-2"><span className="text-muted-foreground">Max precip 7d:</span> <span className="text-foreground">{s.max_precip_7d_mm} mm</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </HUDBody>
        </HUDPanel>
      )}

      <AdvisorPanel />
    </div>
  );
}
