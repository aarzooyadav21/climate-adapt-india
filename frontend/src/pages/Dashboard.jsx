import { useEffect, useState } from "react";
import { Thermometer, CloudRain, Wind, Droplets, Sun, Gauge, Layers, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import IndiaMap from "@/components/IndiaMap";
import { HUDPanel, HUDHeader, HUDBody } from "@/components/HUDPanel";
import { KPITile } from "@/components/KPITile";
import { ProvenanceBadge } from "@/components/ProvenanceBadge";
import StateSelector from "@/components/StateSelector";
import AdvisorPanel from "@/components/AdvisorPanel";
import { ExportMenu } from "@/components/ExportMenu";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppState } from "@/context/AppStateContext";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";

const LAYERS = [
  { id: "temperature", label: "Temperature", icon: Thermometer },
  { id: "rainfall",    label: "Rainfall Departure", icon: CloudRain },
  { id: "drought",     label: "Drought (SPI)", icon: Droplets },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { selectedState, activeLayer, setActiveLayer } = useAppState();
  const [snap, setSnap] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedState) return;
    setLoading(true);
    api.get(`/climate/snapshot/state/${selectedState.code}`)
      .then((r) => setSnap(r.data))
      .finally(() => setLoading(false));
  }, [selectedState]);

  const current = snap?.current || {};
  const clim = snap?.climatology_30d || {};

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Top context strip */}
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div>
          <div className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground">// Mission Control</div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight mt-0.5">
            Welcome, {user?.full_name?.split(" ")[0]}. India climate state is live.
          </h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Tabs value={activeLayer} onValueChange={setActiveLayer}>
            <TabsList className="bg-card/60 border border-border/70">
              {LAYERS.map((l) => (
                <TabsTrigger key={l.id} value={l.id} data-testid={`layer-${l.id}`} className="text-xs font-mono tracking-wider uppercase">
                  <l.icon className="w-3 h-3 mr-1.5" />{l.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <StateSelector />
          <ExportMenu
            dataTestId="dashboard-export"
            label="Export"
            options={[
              { label: `${selectedState?.name || "State"} Live Snapshot`, endpoint: "/export/snapshot", params: { state_code: selectedState?.code }, filenameBase: `climate_snapshot_${selectedState?.code}` },
              { label: `${selectedState?.name || "State"} Historical (180d)`, endpoint: "/export/historical", params: { state_code: selectedState?.code, days: 180 }, filenameBase: `climate_historical_${selectedState?.code}_180d` },
            ]}
          />
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPITile dataTestId="kpi-temp"      label="Current Temp"     value={current.temperature_c?.toFixed(1)}  unit="°C" sub={`feels ${current.apparent_c ?? "—"}°C`} status={current.temperature_c >= 40 ? "stress" : current.temperature_c >= 35 ? "caution" : "favorable"} />
        <KPITile dataTestId="kpi-humid"     label="Humidity"         value={current.humidity}          unit="%"  sub="surface" />
        <KPITile dataTestId="kpi-rain"      label="Precip (now)"     value={current.precipitation_mm?.toFixed(1)}     unit="mm" />
        <KPITile dataTestId="kpi-wind"      label="Wind"             value={current.wind_ms?.toFixed(1)}             unit="m/s" />
        <KPITile dataTestId="kpi-solar"     label="Solar 30d avg"    value={clim.avg_solar_kwh}        unit="kWh/m²" />
        <KPITile dataTestId="kpi-precip30"  label="Precip 30d"       value={clim.total_precip_mm}      unit="mm" sub={`avg max ${clim.avg_max_c}°C`} />
      </div>

      <div className="grid lg:grid-cols-12 gap-4">
        {/* MAP */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
          className="lg:col-span-8">
          <HUDPanel scanlines>
            <HUDHeader
              title="India Climate Map"
              subtitle={`Layer: ${activeLayer} · click any state to inspect`}
              right={
                <div className="flex items-center gap-2">
                  <ProvenanceBadge source="Open-Meteo ERA5" />
                  <ProvenanceBadge source="NASA POWER" />
                </div>
              }
            />
            <div className="p-2">
              <IndiaMap height="58vh" />
            </div>
          </HUDPanel>
        </motion.div>

        {/* RIGHT RAIL */}
        <div className="lg:col-span-4 space-y-3">
          <HUDPanel>
            <HUDHeader
              title={selectedState?.name || "Select a state"}
              subtitle={loading ? "fetching telemetry…" : "Live snapshot · fused sources"}
              right={
                <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  {selectedState?.lat?.toFixed(2)}°N · {selectedState?.lon?.toFixed(2)}°E
                </div>
              }
            />
            <HUDBody className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <KPITile label="Avg Temp 30d"   value={clim.avg_temp_c}   unit="°C" />
                <KPITile label="Avg Max 30d"    value={clim.avg_max_c}    unit="°C" />
                <KPITile label="Avg Min 30d"    value={clim.avg_min_c}    unit="°C" />
                <KPITile label="Humidity 30d"   value={clim.avg_humidity} unit="%" />
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Sources</div>
                {(snap?.provenance || []).map((p, i) => (
                  <ProvenanceBadge key={i} source={p.source} />
                ))}
              </div>
              <div className="text-[10px] font-mono text-muted-foreground">
                Fetched: {snap?.fetched_at_utc?.slice(0, 19)?.replace("T", " ")} UTC
              </div>
            </HUDBody>
          </HUDPanel>

          <HUDPanel>
            <HUDHeader title="Active Twin Modules" subtitle="Quick navigation" />
            <HUDBody className="grid grid-cols-2 gap-2">
              {[
                { to: "/app/monsoon", label: "Monsoon", icon: CloudRain },
                { to: "/app/extremes", label: "Extremes", icon: Layers },
                { to: "/app/drought", label: "Drought", icon: Droplets },
                { to: "/app/scenarios", label: "Scenarios", icon: Gauge },
                { to: "/app/sectors/agriculture", label: "Agri", icon: Sun },
                { to: "/app/advisor", label: "Advisor", icon: Layers },
              ].map((q) => (
                <a key={q.to} href={q.to}
                  className="flex items-center gap-2 px-3 py-2 rounded-md border border-border/70 hover:bg-white/5 text-sm">
                  <q.icon className="w-3.5 h-3.5 text-[hsl(var(--primary))]" /> {q.label}
                </a>
              ))}
            </HUDBody>
          </HUDPanel>
        </div>
      </div>

      <AdvisorPanel />
    </div>
  );
}
