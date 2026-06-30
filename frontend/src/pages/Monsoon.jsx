import { useEffect, useState } from "react";
import { CloudRain, Loader2 } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RTooltip,
  CartesianGrid, BarChart, Bar, Cell, Legend, Line
} from "recharts";
import { HUDPanel, HUDHeader, HUDBody } from "@/components/HUDPanel";
import { ProvenanceBadge } from "@/components/ProvenanceBadge";
import { KPITile } from "@/components/KPITile";
import StateSelector from "@/components/StateSelector";
import AdvisorPanel from "@/components/AdvisorPanel";
import { ExportMenu } from "@/components/ExportMenu";
import { useAppState } from "@/context/AppStateContext";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";

const CAT_COLOR = {
  excess: "hsl(204 92% 60%)",
  normal: "hsl(152 62% 52%)",
  deficient: "hsl(34 92% 56%)",
  large_deficient: "hsl(0 84% 58%)",
};

export default function Monsoon() {
  const { selectedState } = useAppState();
  const [status, setStatus] = useState(null);
  const [series, setSeries] = useState(null);
  const [narrative, setNarrative] = useState(null);
  const [loadingNarr, setLoadingNarr] = useState(false);

  useEffect(() => {
    api.get("/monsoon/status").then((r) => setStatus(r.data));
  }, []);
  useEffect(() => {
    if (!selectedState) return;
    api.get("/monsoon/timeseries", { params: { lat: selectedState.lat, lon: selectedState.lon, days: 180 } })
      .then((r) => setSeries(r.data));
  }, [selectedState]);

  const loadNarrative = async () => {
    setLoadingNarr(true);
    try {
      const { data } = await api.get("/monsoon/narrative");
      setNarrative(data.narrative);
    } finally { setLoadingNarr(false); }
  };

  const chartData = series?.dates?.map((d, i) => ({
    date: d?.slice(5),
    daily: series.daily_mm[i] || 0,
    cumulative: series.cumulative_mm[i] || 0,
    climatology: series.climatology_mm[i] || 0,
  })) || [];

  const stateBars = (status?.state_summaries || []).map((s) => ({
    name: s.code, full: s.name, value: s.departure_pct, cat: s.category,
  }));

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div>
          <div className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground">// Monsoon Tracker</div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Indian Monsoon · Real-time Variability</h1>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu
            dataTestId="monsoon-export"
            label="Export Data"
            options={[
              { label: "National Monsoon Status (all states)", endpoint: "/export/monsoon", params: {}, filenameBase: "monsoon_status_india" },
              { label: `${selectedState?.name || "State"} Rainfall (ERA5 180d)`,
                endpoint: "/export/historical",
                params: { state_code: selectedState?.code, days: 180 },
                filenameBase: `monsoon_rainfall_${selectedState?.code}_180d` },
            ]}
          />
          <StateSelector />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPITile dataTestId="monsoon-phase" label="Monsoon Phase" value={(status?.phase || "—").toUpperCase()} sub={status?.date_ist} />
        <KPITile dataTestId="monsoon-departure" label="National Departure" value={status?.national_departure_pct} unit="%" sub={status?.national_category}
          status={(status?.national_departure_pct ?? 0) < -10 ? "stress" : (status?.national_departure_pct ?? 0) < 0 ? "caution" : "favorable"} />
        <KPITile dataTestId="monsoon-states-above" label="States Above Normal" value={(status?.state_summaries || []).filter(s => s.departure_pct > 0).length} sub="vs LPA" />
        <KPITile dataTestId="monsoon-states-below" label="States Below Normal" value={(status?.state_summaries || []).filter(s => s.departure_pct < 0).length} sub="vs LPA" />
      </div>

      <div className="grid lg:grid-cols-12 gap-4">
        <HUDPanel className="lg:col-span-7">
          <HUDHeader title={`${selectedState?.name || "Region"} · Rainfall Time Series`}
                     subtitle="Daily + cumulative observed vs climatology proxy"
                     right={<ProvenanceBadge source="Open-Meteo ERA5" />} />
          <HUDBody>
            {!chartData.length ? (
              <div className="h-72 flex items-center justify-center text-muted-foreground text-xs"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> loading…</div>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                    <defs>
                      <linearGradient id="gradCum" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(184 92% 55%)" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="hsl(184 92% 55%)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="hsl(220 18% 18% / 0.6)" />
                    <XAxis dataKey="date" stroke="hsl(215 14% 72%)" fontSize={10} tickLine={false} />
                    <YAxis stroke="hsl(215 14% 72%)" fontSize={10} tickLine={false} axisLine={false} />
                    <RTooltip contentStyle={{ background: "hsl(222 30% 9%)", border: "1px solid hsl(220 18% 18%)", borderRadius: 8, fontFamily: "IBM Plex Mono", fontSize: 11 }} />
                    <Area type="monotone" dataKey="cumulative" stroke="hsl(184 92% 55%)" fill="url(#gradCum)" strokeWidth={2} name="Cumulative mm" />
                    <Line type="monotone" dataKey="climatology" stroke="hsl(34 92% 56%)" strokeDasharray="4 3" dot={false} name="Climatology proxy" strokeWidth={1.5} />
                    <Legend wrapperStyle={{ fontSize: 11, fontFamily: "IBM Plex Mono" }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </HUDBody>
        </HUDPanel>

        <HUDPanel className="lg:col-span-5">
          <HUDHeader title="State Departure (%)" subtitle="Vs Long Period Average"
                     right={<ProvenanceBadge source="IMD-style" />} />
          <HUDBody>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stateBars} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                  <CartesianGrid stroke="hsl(220 18% 18% / 0.6)" />
                  <XAxis dataKey="name" stroke="hsl(215 14% 72%)" fontSize={10} />
                  <YAxis stroke="hsl(215 14% 72%)" fontSize={10} />
                  <RTooltip
                    contentStyle={{ background: "hsl(222 30% 9%)", border: "1px solid hsl(220 18% 18%)", borderRadius: 8, fontFamily: "IBM Plex Mono", fontSize: 11 }}
                    formatter={(v) => [`${v}%`, "Departure"]}
                    labelFormatter={(l, p) => p?.[0]?.payload?.full || l} />
                  <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                    {stateBars.map((b, i) => <Cell key={i} fill={CAT_COLOR[b.cat] || "#22d3ee"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </HUDBody>
        </HUDPanel>
      </div>

      <HUDPanel>
        <HUDHeader title="AI Monsoon Narrative" subtitle="Claude-grounded interpretation"
                   right={<button data-testid="monsoon-narrative-btn" onClick={loadNarrative} className="text-[11px] font-mono px-3 py-1.5 rounded-md border border-border/80 hover:bg-white/5">
                            {loadingNarr ? "Generating…" : "Generate narrative"}
                          </button>} />
        <HUDBody>
          {!narrative ? (
            <div className="text-sm text-muted-foreground">Click “Generate narrative” to fetch an AI-generated, India-context monsoon situation report.</div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="text-foreground font-medium">{narrative.headline}</div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-mono uppercase text-[10px]">{narrative.phase}</Badge>
                <Badge variant="outline" className="font-mono uppercase text-[10px] border-[hsl(var(--primary)/0.4)] text-[hsl(var(--primary))]">confidence {narrative.confidence}</Badge>
              </div>
              <div><span className="text-muted-foreground text-xs uppercase tracking-wider mr-2">Departure</span>{narrative.departure_summary}</div>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Above Normal</div>
                  <ul className="text-sm list-disc ml-5">{(narrative.regions_above_normal || []).map((r, i) => <li key={i}>{r}</li>)}</ul>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Below Normal</div>
                  <ul className="text-sm list-disc ml-5">{(narrative.regions_below_normal || []).map((r, i) => <li key={i}>{r}</li>)}</ul>
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Key Drivers</div>
                <ul className="text-sm list-disc ml-5">{(narrative.key_drivers || []).map((r, i) => <li key={i}>{r}</li>)}</ul>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">2-Week Outlook</div>
                <div className="text-sm">{narrative.outlook_2weeks}</div>
              </div>
            </div>
          )}
        </HUDBody>
      </HUDPanel>

      <AdvisorPanel />
    </div>
  );
}
