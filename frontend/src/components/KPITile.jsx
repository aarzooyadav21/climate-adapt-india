import { cn } from "@/lib/utils";

export function KPITile({ label, value, unit, sub, status = "normal", dataTestId, className }) {
  const statusColor = {
    favorable: "text-[hsl(var(--state-success))]",
    caution:   "text-[hsl(var(--state-warning))]",
    stress:    "text-[hsl(var(--state-critical))]",
    normal:    "text-foreground",
  }[status];

  return (
    <div data-testid={dataTestId || "kpi-tile"}
         className={cn("hud-panel px-4 py-3.5", className)}>
      <div className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className={cn("font-mono tabular-nums text-2xl md:text-[28px] leading-none", statusColor)}>
          {value ?? "—"}
        </span>
        {unit && <span className="text-xs text-muted-foreground font-mono">{unit}</span>}
      </div>
      {sub && <div className="mt-1 text-[11px] font-mono text-muted-foreground">{sub}</div>}
    </div>
  );
}
