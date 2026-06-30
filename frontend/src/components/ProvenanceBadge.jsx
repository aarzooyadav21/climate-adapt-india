import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const VARIANTS = {
  "NASA POWER": "bg-[hsl(204_92%_60%/0.14)] text-[hsl(204_92%_72%)] border-[hsl(204_92%_60%/0.35)]",
  "Open-Meteo": "bg-[hsl(184_92%_55%/0.14)] text-[hsl(184_92%_70%)] border-[hsl(184_92%_55%/0.35)]",
  "Open-Meteo ERA5": "bg-[hsl(164_78%_48%/0.14)] text-[hsl(164_78%_65%)] border-[hsl(164_78%_48%/0.35)]",
  "IMD-style": "bg-[hsl(34_92%_56%/0.14)] text-[hsl(34_92%_70%)] border-[hsl(34_92%_56%/0.35)]",
};

export function ProvenanceBadge({ source, className, compact }) {
  const variant = VARIANTS[source] || "bg-muted text-muted-foreground border-border";
  return (
    <Badge
      data-testid="provenance-badge"
      variant="outline"
      className={cn("font-mono text-[10px] uppercase tracking-wider border", variant, className)}
    >
      {compact ? source.replace("Open-Meteo ", "OM-") : source}
    </Badge>
  );
}

export function ProvenanceList({ items, className }) {
  if (!items?.length) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {items.map((p, i) => (
        <ProvenanceBadge key={i} source={p.source} />
      ))}
    </div>
  );
}
