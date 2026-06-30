/**
 * CursorInspector — listens to map mousemove and shows a floating tooltip
 * with: lat/lon coords, interpolated value at cursor (from grid points), nearest place.
 */
import { useEffect, useState, useRef, useCallback } from "react";
import { useMap } from "react-leaflet";
import { valueAt, colorForLayer } from "./HeatmapOverlay";

const LAYER_META = {
  temperature:        { label: "Temperature",       unit: "°C",     decimals: 1 },
  humidity:           { label: "Humidity",          unit: "%",      decimals: 0 },
  precipitation:      { label: "Precipitation 7d",  unit: "mm",     decimals: 1 },
  wind:               { label: "Wind",              unit: "m/s",    decimals: 1 },
  drought_spi:        { label: "Drought SPI",       unit: "",       decimals: 2 },
  rainfall_departure: { label: "Rainfall Departure",unit: "%",      decimals: 1 },
};

export function CursorInspector({ layer, points, places }) {
  const map = useMap();
  const [hover, setHover] = useState(null); // { x, y, lat, lon, value, place }
  const rafRef = useRef(null);

  const findNearest = useCallback((lat, lon) => {
    if (!places?.length) return null;
    let best = null, bd = 1e9;
    for (const p of places) {
      const d = Math.sqrt((p.lat - lat) ** 2 + (p.lon - lon) ** 2);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }, [places]);

  useEffect(() => {
    if (!map) return;
    const onMove = (e) => {
      const { lat, lng } = e.latlng;
      const containerPt = e.containerPoint;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const v = points && points.length ? valueAt(points, lat, lng) : null;
        const place = findNearest(lat, lng);
        setHover({ x: containerPt.x, y: containerPt.y, lat, lon: lng, value: v, place });
      });
    };
    const onLeave = () => setHover(null);
    map.on("mousemove", onMove);
    map.on("mouseout", onLeave);
    return () => {
      map.off("mousemove", onMove);
      map.off("mouseout", onLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [map, points, findNearest]);

  if (!hover) return null;
  const meta = LAYER_META[layer] || LAYER_META.temperature;
  const color = colorForLayer(layer, hover.value);
  const colorCss = color ? `rgb(${color.join(",")})` : "hsl(var(--muted-foreground))";
  const valueStr = hover.value === null || hover.value === undefined
    ? "—" : (typeof hover.value === "number" ? hover.value.toFixed(meta.decimals) : hover.value);

  // Position tooltip near cursor; keep within container
  const left = Math.min(hover.x + 14, (map.getContainer().clientWidth || 800) - 240);
  const top = Math.min(hover.y + 14, (map.getContainer().clientHeight || 600) - 110);

  return (
    <div
      data-testid="cursor-inspector"
      className="pointer-events-none absolute z-[500] hud-panel px-3 py-2 min-w-[210px]"
      style={{ left, top }}
    >
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: colorCss, boxShadow: `0 0 8px ${colorCss}` }} />
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{meta.label}</div>
      </div>
      <div className="mt-1 font-mono text-xl tabular-nums leading-none" style={{ color: colorCss }}>
        {valueStr}<span className="text-xs text-muted-foreground ml-1">{meta.unit}</span>
      </div>
      <div className="mt-1.5 text-[11px] font-mono text-muted-foreground">
        {hover.lat.toFixed(3)}°N · {hover.lon.toFixed(3)}°E
      </div>
      {hover.place && (
        <div className="text-[11px] text-foreground/90 truncate">near {hover.place.label || hover.place.name}</div>
      )}
    </div>
  );
}
