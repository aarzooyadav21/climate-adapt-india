import { useState, useEffect } from "react";
import { Beaker, Play, Loader2, Plus, Trash2, ChevronRight } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip as RTooltip, Legend, ReferenceLine,
} from "recharts";
import { HUDPanel, HUDHeader, HUDBody } from "@/components/HUDPanel";
import { ProvenanceBadge } from "@/components/ProvenanceBadge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StateSelector from "@/components/StateSelector";
import AdvisorPanel from "@/components/AdvisorPanel";
import { useAppState } from "@/context/AppStateContext";
import { toast } from "sonner";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

const RISK_COLOR = {
  lower: "text-[hsl(var(--state-success))]",
  similar: "text-foreground",
  higher: "text-[hsl(var(--state-warning))]",
  "much higher": "text-[hsl(var(--state-critical))]",
};

function defaultExperiment(stateCode = "DL", label = "Experiment") {
  return {
    label,
    inputs: {
      state_code: stateCode,
      warming_c: 2.0,
      rainfall_shift_pct: 0,
      urbanization_pct: 20,
      land_use_change_pct: 0,
      horizon_years: 20,
    },
  };
}

function ExperimentCard({ exp, idx, onUpdate, onRemove, states }) {
  const upd = (k, v) => onUpdate({ ...exp, inputs: { ...exp.inputs, [k]: v } });
  return (
    <div data-testid={`lab-exp-${idx}`} className="hud-panel p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Input
          data-testid={`lab-exp-label-${idx}`}
          value={exp.label} onChange={(e) => onUpdate({ ...exp, label: e.target.value })}
          className="font-mono text-sm h-8 max-w-[260px]"
        />
        <Button data-testid={`lab-exp-remove-${idx}`} variant="ghost" size="sm"
          onClick={onRemove} className="text-muted-foreground hover:text-[hsl(var(--state-critical))]">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Region</div>
        <Select value={exp.inputs.state_code} onValueChange={(v) => upd("state_code", v)}>
          <SelectTrigger data-testid={`lab-exp-state-${idx}`} className="h-8 font-mono text-xs"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-[280px]">
            {states.map((s) => <SelectItem key={s.code} value={s.code} className="font-mono text-xs">{s.name} <span className="text-muted-foreground ml-1">{s.code}</span></SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Variable label="Warming" unit="°C" value={exp.inputs.warming_c} min={0} max={5} step={0.5}
                onChange={(v) => upd("warming_c", v)} testId={`lab-warming-${idx}`} />
      <Variable label="Rainfall shift" unit="%" value={exp.inputs.rainfall_shift_pct} min={-50} max={50} step={5}
                onChange={(v) => upd("rainfall_shift_pct", v)} testId={`lab-rain-${idx}`} />
      <Variable label="Urbanization" unit="%" value={exp.inputs.urbanization_pct} min={0} max={100} step={5}
                onChange={(v) => upd("urbanization_pct", v)} testId={`lab-urb-${idx}`} />
      <Variable label="Land-use change" unit="%" value={exp.inputs.land_use_change_pct} min={-50} max={50} step={5}
                onChange={(v) => upd("land_use_change_pct", v)} testId={`lab-land-${idx}`} />
      <Variable label="Horizon" unit="years" value={exp.inputs.horizon_years} min={5} max={80} step={5}
                onChange={(v) => upd("horizon_years", v)} testId={`lab-horizon-${idx}`} integer />
    </div>
  );
}

function Variable({ label, unit, value, min, max, step, onChange, testId, integer = false }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="font-mono text-xs text-foreground">{integer ? value : value.toFixed(unit === "°C" ? 1 : 0)}<span className="text-muted-foreground ml-1">{unit}</span></div>
      </div>
      <Slider data-testid={testId} value={[value]} min={min} max={max} step={step}
              onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}

export default function Lab() {
  const { selectedState } = useAppState();
  const [states, setStates] = useState([]);
  const [experiments, setExperiments] = useState([
    defaultExperiment(selectedState?.code || "DL", "Baseline +2°C"),
  ]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  // Sensitivity
  const [sensVar, setSensVar] = useState("warming_c");
  const [sensRange, setSensRange] = useState([0.0, 4.0]);
  const [sensResult, setSensResult] = useState(null);
  const [sensRunning, setSensRunning] = useState(false);

  useEffect(() => { api.get("/climate/states").then((r) => setStates(r.data.states)); }, []);

  const addExp = () => {
    if (experiments.length >= 8) return toast.error("Max 8 experiments");
    setExperiments((m) => [...m, defaultExperiment(selectedState?.code || "DL", `Experiment ${m.length + 1}`)]);
  };

  const updateExp = (idx, exp) => setExperiments((m) => m.map((e, i) => i === idx ? exp : e));
  const removeExp = (idx) => setExperiments((m) => m.filter((_, i) => i !== idx));

  const runAll = async () => {
    setRunning(true); setResult(null);
    try {
      const { data } = await api.post("/lab/run", { experiments, include_narrative: true });
      setResult(data);
      toast.success(`Ran ${data.summary.count} experiments`);
    } catch (e) {
      toast.error("Lab run failed");
    } finally { setRunning(false); }
  };

  const runSensitivity = async () => {
    setSensRunning(true); setSensResult(null);
    try {
      const { data } = await api.post("/lab/sensitivity", {
        state_code: selectedState?.code || "DL",
        horizon_years: 20,
        variable: sensVar,
        min_value: sensRange[0],
        max_value: sensRange[1],
        steps: 9,
      });
      setSensResult(data);
    } catch (e) {
      toast.error("Sensitivity sweep failed");
    } finally { setSensRunning(false); }
  };

  const chartCompare = result?.experiments?.map((r, i) => ({
    name: r.label.length > 18 ? r.label.slice(0, 18) + "…" : r.label,
    baseline_t: r.baseline.temperature_c,
    projected_t: r.projection.projected_temp_c,
    baseline_r: r.baseline.rainfall_mm,
    projected_r: r.projection.projected_rainfall_mm,
  })) || [];

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-md border border-border/80 bg-card/70 flex items-center justify-center hud-glow-cyan">
            <Beaker className="w-5 h-5 text-[hsl(var(--primary))]" />
          </div>
          <div>
            <div className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground">// Scientist Lab</div>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Climate Experiments · Compound What-If</h1>
            <div className="text-xs text-muted-foreground">Like a medical digital twin — perturb variables, run experiments, compare outcomes.</div>
          </div>
        </div>
        <StateSelector />
      </div>

      <Tabs defaultValue="compare">
        <TabsList className="bg-card/60 border border-border/70">
          <TabsTrigger value="compare" data-testid="lab-tab-compare" className="text-xs font-mono uppercase tracking-wider">Compare Experiments</TabsTrigger>
          <TabsTrigger value="sensitivity" data-testid="lab-tab-sensitivity" className="text-xs font-mono uppercase tracking-wider">Sensitivity Sweep</TabsTrigger>
        </TabsList>

        <TabsContent value="compare" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-mono text-muted-foreground">
              Configure up to 8 experiments. Each perturbs warming, rainfall, urbanization, land-use.
            </div>
            <div className="flex items-center gap-2">
              <Button data-testid="lab-add-exp" variant="outline" size="sm" onClick={addExp} className="font-mono text-[11px]"><Plus className="w-3 h-3 mr-1.5" /> Add experiment</Button>
              <Button data-testid="lab-run-all" onClick={runAll} disabled={running} className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.92)] font-mono text-[11px]">
                {running ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Play className="w-3 h-3 mr-1.5" />}
                Run All
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {experiments.map((exp, i) => (
              <ExperimentCard key={i} idx={i} exp={exp} states={states}
                onUpdate={(e) => updateExp(i, e)} onRemove={() => removeExp(i)} />
            ))}
          </div>

          {result && (
            <>
              <HUDPanel>
                <HUDHeader title="Comparison · Projected Temperature & Rainfall"
                  subtitle={`${result.summary.count} experiments`}
                  right={<div className="flex gap-1.5">{(result.provenance || []).slice(0,2).map((p,i) => <ProvenanceBadge key={i} source={p.source} />)}</div>} />
                <HUDBody>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartCompare} margin={{ top: 8, right: 30, bottom: 0, left: -10 }}>
                        <CartesianGrid stroke="hsl(220 18% 18% / 0.6)" />
                        <XAxis dataKey="name" stroke="hsl(215 14% 72%)" fontSize={10} />
                        <YAxis yAxisId="l" stroke="hsl(184 92% 55%)" fontSize={10} label={{ value: "°C", position: "insideLeft", angle: -90, fontSize: 10, fill: "hsl(184 92% 55%)" }} />
                        <YAxis yAxisId="r" orientation="right" stroke="hsl(34 92% 56%)" fontSize={10} label={{ value: "mm", position: "insideRight", angle: 90, fontSize: 10, fill: "hsl(34 92% 56%)" }} />
                        <RTooltip contentStyle={{ background: "hsl(222 30% 9%)", border: "1px solid hsl(220 18% 18%)", borderRadius: 8, fontFamily: "IBM Plex Mono", fontSize: 11 }} />
                        <Legend wrapperStyle={{ fontSize: 11, fontFamily: "IBM Plex Mono" }} />
                        <Bar yAxisId="l" dataKey="baseline_t" name="Baseline T" fill="hsl(184 92% 55% / 0.5)" radius={[3,3,0,0]} />
                        <Bar yAxisId="l" dataKey="projected_t" name="Projected T" fill="hsl(184 92% 55%)" radius={[3,3,0,0]} />
                        <Bar yAxisId="r" dataKey="baseline_r" name="Baseline R" fill="hsl(34 92% 56% / 0.5)" radius={[3,3,0,0]} />
                        <Bar yAxisId="r" dataKey="projected_r" name="Projected R" fill="hsl(34 92% 56%)" radius={[3,3,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </HUDBody>
              </HUDPanel>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {result.experiments.map((r, i) => (
                  <div data-testid={`lab-result-${i}`} key={i} className="hud-panel p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-sm truncate">{r.label}</div>
                      <Badge variant="outline" className="font-mono uppercase text-[10px]">{r.state.code}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Temp</div>
                        <div className="font-mono">{r.baseline.temperature_c}°C → <span className="text-foreground font-semibold">{r.projection.projected_temp_c}°C</span></div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Rainfall</div>
                        <div className="font-mono">{r.baseline.rainfall_mm}mm → <span className="text-foreground font-semibold">{r.projection.projected_rainfall_mm}mm</span></div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">UHI</div>
                        <div className="font-mono">+{r.projection.uhi_c}°C</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Drought Shift</div>
                        <div className={cn("font-mono uppercase text-[11px]", RISK_COLOR[r.projection.drought_risk_shift])}>{r.projection.drought_risk_shift}</div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Heat Stress Index</div>
                        <div className="font-mono">{r.projection.heat_stress_index}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {result.narrative && (
                <HUDPanel>
                  <HUDHeader title="AI Comparative Analysis" subtitle="Grounded interpretation of all experiments" />
                  <HUDBody className="space-y-2 text-sm">
                    <div className="text-foreground font-medium">{result.narrative.headline}</div>
                    {result.narrative.adaptation_actions?.length > 0 && (
                      <div>
                        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Adaptation Actions</div>
                        <ul className="list-disc ml-5">{result.narrative.adaptation_actions.map((a, i) => <li key={i}>{a}</li>)}</ul>
                      </div>
                    )}
                    <div className="text-[10px] font-mono text-muted-foreground">Confidence: {result.narrative.confidence}</div>
                  </HUDBody>
                </HUDPanel>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="sensitivity" className="mt-4 space-y-4">
          <HUDPanel>
            <HUDHeader title="Sensitivity Sweep" subtitle="Vary one variable; observe outcome curve" />
            <HUDBody className="grid md:grid-cols-3 gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Region</div>
                <StateSelector className="w-full font-mono text-xs" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Variable</div>
                <Select value={sensVar} onValueChange={setSensVar}>
                  <SelectTrigger data-testid="sens-var" className="font-mono text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warming_c" className="font-mono text-xs">Warming (°C)</SelectItem>
                    <SelectItem value="rainfall_shift_pct" className="font-mono text-xs">Rainfall shift (%)</SelectItem>
                    <SelectItem value="urbanization_pct" className="font-mono text-xs">Urbanization (%)</SelectItem>
                    <SelectItem value="land_use_change_pct" className="font-mono text-xs">Land-use change (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Range</div>
                  <div className="font-mono text-xs">{sensRange[0]} → {sensRange[1]}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input data-testid="sens-min" type="number" value={sensRange[0]} onChange={(e) => setSensRange([Number(e.target.value), sensRange[1]])} className="font-mono text-xs h-8" />
                  <Input data-testid="sens-max" type="number" value={sensRange[1]} onChange={(e) => setSensRange([sensRange[0], Number(e.target.value)])} className="font-mono text-xs h-8" />
                </div>
              </div>
              <div className="md:col-span-3">
                <Button data-testid="sens-run" onClick={runSensitivity} disabled={sensRunning} className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.92)]">
                  {sensRunning ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-1.5" />}
                  Run Sweep
                </Button>
              </div>
            </HUDBody>
          </HUDPanel>

          {sensResult && (
            <HUDPanel>
              <HUDHeader title={`${sensResult.state.name} · ${sensResult.variable}`}
                subtitle={`Curve across ${sensResult.curve.length} points`}
                right={<ProvenanceBadge source="Open-Meteo ERA5" />} />
              <HUDBody>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sensResult.curve} margin={{ top: 8, right: 30, bottom: 0, left: -10 }}>
                      <CartesianGrid stroke="hsl(220 18% 18% / 0.6)" />
                      <XAxis dataKey="variable_value" stroke="hsl(215 14% 72%)" fontSize={10}
                             label={{ value: sensResult.variable, position: "insideBottom", offset: -2, fontSize: 10, fill: "hsl(215 14% 72%)" }} />
                      <YAxis yAxisId="l" stroke="hsl(184 92% 55%)" fontSize={10} />
                      <YAxis yAxisId="r" orientation="right" stroke="hsl(34 92% 56%)" fontSize={10} />
                      <RTooltip contentStyle={{ background: "hsl(222 30% 9%)", border: "1px solid hsl(220 18% 18%)", borderRadius: 8, fontFamily: "IBM Plex Mono", fontSize: 11 }} />
                      <Legend wrapperStyle={{ fontSize: 11, fontFamily: "IBM Plex Mono" }} />
                      <ReferenceLine yAxisId="l" y={sensResult.baseline.temperature_c} stroke="hsl(184 92% 55% / 0.4)" strokeDasharray="3 3" label={{ value: "T baseline", fontSize: 10, fill: "hsl(184 92% 55%)" }} />
                      <Line yAxisId="l" type="monotone" dataKey="projected_temp_c" stroke="hsl(184 92% 55%)" strokeWidth={2} name="Projected T (°C)" dot={{ r: 3 }} />
                      <Line yAxisId="r" type="monotone" dataKey="projected_rainfall_mm" stroke="hsl(34 92% 56%)" strokeWidth={2} name="Projected Rainfall (mm)" dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </HUDBody>
            </HUDPanel>
          )}
        </TabsContent>
      </Tabs>

      <AdvisorPanel />
    </div>
  );
}
