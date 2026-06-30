import { useEffect, useState } from "react";
import { FlaskConical, Play, Loader2 } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Cell, Legend
} from "recharts";
import { HUDPanel, HUDHeader, HUDBody } from "@/components/HUDPanel";
import { ProvenanceBadge } from "@/components/ProvenanceBadge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import StateSelector from "@/components/StateSelector";
import AdvisorPanel from "@/components/AdvisorPanel";
import { SaveScenarioButton, SavedScenariosButton } from "@/components/SavedScenarios";
import { useAppState } from "@/context/AppStateContext";
import api from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const RISK_COLOR = {
  lower: "text-[hsl(var(--state-success))]",
  similar: "text-foreground",
  higher: "text-[hsl(var(--state-warning))]",
  "much higher": "text-[hsl(var(--state-critical))]",
};

const IMPACT_COLOR = {
  low: "bg-[hsl(var(--state-success)/0.16)] text-[hsl(var(--state-success))] border-[hsl(var(--state-success)/0.4)]",
  moderate: "bg-[hsl(var(--state-warning)/0.16)] text-[hsl(var(--state-warning))] border-[hsl(var(--state-warning)/0.4)]",
  high: "bg-[hsl(var(--state-critical)/0.16)] text-[hsl(var(--state-critical))] border-[hsl(var(--state-critical)/0.4)]",
};

export default function Scenarios() {
  const { selectedState, setSelectedState } = useAppState();
  const [warming, setWarming] = useState(2.0);
  const [horizon, setHorizon] = useState(20);
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const run = async () => {
    if (!selectedState) return;
    setRunning(true);
    setResult(null);
    try {
      const { data } = await api.post("/scenario/run", {
        state_code: selectedState.code,
        warming_c: warming,
        horizon_years: horizon,
      });
      setResult(data);
      toast.success(`Scenario simulated for ${data.state.name}`);
    } catch (e) {
      toast.error("Scenario failed");
    } finally {
      setRunning(false);
    }
  };

  const onLoadSaved = (s) => {
    setWarming(s.warming_c);
    setHorizon(s.horizon_years);
    // jump to that state if available
    if (s.state_code && s.state_code !== selectedState?.code) {
      // Trigger state change via app state — fetch states list to get lat/lon
      api.get("/climate/states").then(({ data }) => {
        const st = (data.states || []).find((x) => x.code === s.state_code);
        if (st) setSelectedState({ code: st.code, name: st.name, lat: st.lat, lon: st.lon });
      });
    }
    if (s.result_summary && Object.keys(s.result_summary).length) {
      setResult(s.result_summary);
    }
    toast.success(`Loaded: ${s.label}`);
  };

  const savePayload = result ? {
    state_code: result.state?.code,
    state_name: result.state?.name,
    warming_c: result.input?.warming_c,
    horizon_years: result.input?.horizon_years,
    rainfall_shift_pct: result.input?.rainfall_shift_pct ?? null,
    result_summary: {
      state: result.state,
      input: result.input,
      baseline: result.baseline,
      projection: result.projection,
      chart: result.chart,
      narrative: result.narrative,
      provenance: result.provenance,
    },
  } : null;

  const chartData = result
    ? [
        { name: "Baseline", temp: result.baseline?.temperature_c, rain: result.baseline?.rainfall_mm },
        { name: `+${result.input?.warming_c ?? warming}°C @ ${result.input?.horizon_years ?? horizon}y`, temp: result.projection?.temperature_c, rain: result.projection?.rainfall_mm },
      ]
    : [];

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <div className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground">// Scenario Simulator</div>
        <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Warming What-If · Sector Impact Projection</h1>
          <div className="flex items-center gap-2">
            <SaveScenarioButton scenarioPayload={savePayload} disabled={!result} />
            <SavedScenariosButton onLoad={onLoadSaved} reloadKey={reloadKey} />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-4">
        <HUDPanel className="lg:col-span-4">
          <HUDHeader title="Scenario Inputs" subtitle="Delta-method downscaling" right={<FlaskConical className="w-4 h-4 text-[hsl(var(--primary))]" />} />
          <HUDBody className="space-y-5">
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Region</div>
              <StateSelector className="w-full font-mono text-xs" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Warming Scenario</div>
                <div className="font-mono text-sm text-foreground">+{warming.toFixed(1)}°C</div>
              </div>
              <Tabs value={String(warming)} onValueChange={(v) => setWarming(Number(v))}>
                <TabsList className="bg-card/60 border border-border/70 grid grid-cols-4 w-full">
                  {[1.5, 2.0, 2.5, 3.0].map((w) => (
                    <TabsTrigger key={w} value={String(w)} data-testid={`warm-${w}`} className="text-xs font-mono">+{w}°C</TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Horizon</div>
                <div className="font-mono text-sm text-foreground">{horizon} years</div>
              </div>
              <Slider data-testid="horizon-slider" value={[horizon]} min={5} max={80} step={5} onValueChange={(v) => setHorizon(v[0])} />
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>5y</span><span>40y</span><span>80y</span>
              </div>
            </div>

            <Button data-testid="scenario-run-button" disabled={running} onClick={run}
              className="w-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.92)] hud-glow-cyan">
              {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-2" />}
              Run Simulation
            </Button>

            <div className="text-[10px] font-mono text-muted-foreground">
              Note: Illustrative delta-method projection on top of ERA5/IMD-style baseline. Not a substitute for full GCM downscaling.
            </div>
          </HUDBody>
        </HUDPanel>

        <HUDPanel className="lg:col-span-8">
          <HUDHeader title="Projection Results" subtitle={result ? `${result.state?.name || "—"} · +${result.input?.warming_c ?? "?"}°C · ${result.input?.horizon_years ?? "?"}y` : "Run a scenario to see projections"}
            right={result && <div className="flex gap-2">{(result.provenance || []).slice(0, 2).map((p, i) => <ProvenanceBadge key={i} source={p.source} />)}</div>} />
          <HUDBody>
            {!result ? (
              <div className="h-72 flex items-center justify-center text-muted-foreground text-sm">No scenario yet · configure inputs and run.</div>
            ) : (
              <div className="space-y-4">
                <div className="grid md:grid-cols-3 gap-3">
                  <div className="hud-panel p-4">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Baseline Temp</div>
                    <div className="font-mono text-2xl tabular-nums">{result.baseline.temperature_c}<span className="text-xs text-muted-foreground ml-1">°C</span></div>
                    <div className="text-[11px] font-mono text-muted-foreground mt-1">→ Projected: <span className="text-foreground">{result.projection.temperature_c}°C</span></div>
                  </div>
                  <div className="hud-panel p-4">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Baseline Rainfall</div>
                    <div className="font-mono text-2xl tabular-nums">{result.baseline.rainfall_mm}<span className="text-xs text-muted-foreground ml-1">mm</span></div>
                    <div className="text-[11px] font-mono text-muted-foreground mt-1">→ Projected: <span className="text-foreground">{result.projection.rainfall_mm} mm</span> ({result.projection.rainfall_change_pct >= 0 ? "+" : ""}{result.projection.rainfall_change_pct}%)</div>
                  </div>
                  <div className="hud-panel p-4">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Drought Risk Shift</div>
                    <div className={cn("font-mono text-2xl tabular-nums uppercase", RISK_COLOR[result.projection.drought_risk_shift])}>
                      {result.projection.drought_risk_shift}
                    </div>
                  </div>
                </div>

                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 20, bottom: 0, left: -10 }}>
                      <CartesianGrid stroke="hsl(220 18% 18% / 0.6)" />
                      <XAxis dataKey="name" stroke="hsl(215 14% 72%)" fontSize={10} />
                      <YAxis yAxisId="l" stroke="hsl(184 92% 55%)" fontSize={10} />
                      <YAxis yAxisId="r" orientation="right" stroke="hsl(34 92% 56%)" fontSize={10} />
                      <RTooltip contentStyle={{ background: "hsl(222 30% 9%)", border: "1px solid hsl(220 18% 18%)", borderRadius: 8, fontFamily: "IBM Plex Mono", fontSize: 11 }} />
                      <Legend wrapperStyle={{ fontSize: 11, fontFamily: "IBM Plex Mono" }} />
                      <Bar yAxisId="l" dataKey="temp" name="Temp °C" fill="hsl(184 92% 55%)" radius={[3,3,0,0]} />
                      <Bar yAxisId="r" dataKey="rain" name="Rainfall mm" fill="hsl(34 92% 56%)" radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {result.narrative && (
                  <div className="space-y-3 text-sm">
                    <div className="text-foreground font-medium">{result.narrative.headline}</div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="font-mono uppercase text-[10px]">Confidence {result.narrative.confidence}</Badge>
                      <Badge variant="outline" className="font-mono uppercase text-[10px]">ΔT {result.narrative.projected_temp_change_c}°C</Badge>
                      <Badge variant="outline" className="font-mono uppercase text-[10px]">ΔP {result.narrative.projected_rainfall_change_pct}%</Badge>
                    </div>
                    {!!(result.narrative.sector_impacts || []).length && (
                      <div>
                        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Sector Impacts</div>
                        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {result.narrative.sector_impacts.map((s, i) => (
                            <div key={i} className="rounded-md border border-border/60 p-3">
                              <div className="flex items-center justify-between">
                                <div className="text-xs uppercase tracking-wider font-semibold">{s.sector}</div>
                                <Badge variant="outline" className={cn("font-mono uppercase text-[10px]", IMPACT_COLOR[s.impact])}>{s.impact}</Badge>
                              </div>
                              <div className="text-[12px] text-muted-foreground mt-1">{s.note}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {!!(result.narrative.adaptation_actions || []).length && (
                      <div>
                        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Adaptation Actions</div>
                        <ul className="list-disc ml-5">{result.narrative.adaptation_actions.map((a, i) => <li key={i}>{a}</li>)}</ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </HUDBody>
        </HUDPanel>
      </div>

      <AdvisorPanel />
    </div>
  );
}
