import { useEffect, useState } from "react";
import {
  Sun, CloudRain, Droplet, Sprout, Thermometer, Bug, Loader2, MapPin, Sparkles,
} from "lucide-react";
import { HUDPanel, HUDHeader, HUDBody } from "@/components/HUDPanel";
import { ProvenanceBadge } from "@/components/ProvenanceBadge";
import StateSelector from "@/components/StateSelector";
import AdvisorPanel from "@/components/AdvisorPanel";
import { Badge } from "@/components/ui/badge";
import { useAppState } from "@/context/AppStateContext";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

const ICON_MAP = {
  weather: Sun, rain: CloudRain, droplet: Droplet, sprout: Sprout, sun: Thermometer, bug: Bug,
};

const STATUS_STYLE = {
  good:  "text-[hsl(var(--state-success))] border-[hsl(var(--state-success)/0.4)] bg-[hsl(var(--state-success)/0.10)]",
  warn:  "text-[hsl(var(--state-warning))] border-[hsl(var(--state-warning)/0.4)] bg-[hsl(var(--state-warning)/0.10)]",
  bad:   "text-[hsl(var(--state-critical))] border-[hsl(var(--state-critical)/0.4)] bg-[hsl(var(--state-critical)/0.10)]",
  info:  "text-foreground border-border bg-card",
};

const STATUS_LABEL = { good: "Good", warn: "Caution", bad: "Warning", info: "" };

export default function FarmerHome() {
  const { user } = useAuth();
  const { selectedState } = useAppState();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedState) return;
    setLoading(true);
    setData(null);
    api.get("/farmer/advisory", { params: { state_code: selectedState.code } })
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, [selectedState]);

  return (
    <div data-testid="farmer-home" className="p-4 md:p-6 space-y-5">
      <div className="flex flex-col md:flex-row gap-3 md:items-end md:justify-between">
        <div>
          <div className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground">// Farmer Console</div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Namaste, {user?.full_name?.split(" ")[0]} 👋
          </h1>
          <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" /> Your field is in <span className="text-foreground font-medium">{selectedState?.name || "—"}</span>
          </div>
        </div>
        <StateSelector />
      </div>

      {/* AI Plain-language advisory */}
      <HUDPanel glow="amber">
        <HUDHeader title="Today's Advisory for You" subtitle="Plain-language summary based on real weather data"
          right={<Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider border-[hsl(var(--india-saffron)/0.5)] text-[hsl(var(--india-saffron))]"><Sparkles className="w-3 h-3 mr-1" /> AI</Badge>} />
        <HUDBody>
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Reading the weather for your area…</div>
          ) : data?.advice_text ? (
            <div className="text-base leading-relaxed whitespace-pre-wrap">{data.advice_text}</div>
          ) : (
            <div className="text-sm text-muted-foreground">Advisory not available right now. The cards below still show your weather.</div>
          )}
        </HUDBody>
      </HUDPanel>

      {/* Big simple cards — the heart of the farmer view */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {(data?.cards || []).map((c, i) => {
          const Icon = ICON_MAP[c.icon] || Sun;
          return (
            <div key={i} data-testid={`farmer-card-${c.icon}`}
              className={cn("rounded-lg border px-4 py-4 hud-panel")}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn("w-9 h-9 rounded-md flex items-center justify-center border", STATUS_STYLE[c.status])}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">{c.title}</div>
                </div>
                {STATUS_LABEL[c.status] && (
                  <Badge variant="outline" className={cn("font-mono text-[10px] uppercase", STATUS_STYLE[c.status])}>{STATUS_LABEL[c.status]}</Badge>
                )}
              </div>
              <div className="mt-3 font-mono text-3xl md:text-4xl tabular-nums leading-none">{c.big}</div>
              <div className="mt-2 text-sm text-muted-foreground leading-relaxed">{c.sub}</div>
            </div>
          );
        })}
        {loading && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="hud-panel px-4 py-4 animate-pulse">
            <div className="h-4 w-24 bg-muted/40 rounded mb-3" />
            <div className="h-10 w-32 bg-muted/40 rounded mb-2" />
            <div className="h-3 w-full bg-muted/30 rounded" />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <span className="uppercase tracking-wider">Sources:</span>
        {(data?.provenance || []).map((p, i) => <ProvenanceBadge key={i} source={p.source} />)}
      </div>

      <AdvisorPanel />
    </div>
  );
}
