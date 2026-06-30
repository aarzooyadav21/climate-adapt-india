import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import api from "@/lib/api";
import { useAppState } from "@/context/AppStateContext";

// Fix leaflet default icon path
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const RAMPS = {
  temperature: [
    { max: 18, color: "#0ea5e9" }, { max: 24, color: "#22d3ee" },
    { max: 30, color: "#10b981" }, { max: 34, color: "#fbbf24" },
    { max: 38, color: "#fb923c" }, { max: 42, color: "#ef4444" },
    { max: 99, color: "#b91c1c" },
  ],
  rainfall: [
    { max: -40, color: "#b91c1c" }, { max: -20, color: "#ef4444" },
    { max: -10, color: "#fbbf24" }, { max: 10, color: "#10b981" },
    { max: 20, color: "#22d3ee" }, { max: 40, color: "#0ea5e9" },
    { max: 999, color: "#1d4ed8" },
  ],
  drought: [
    { max: -0.6, color: "#b91c1c" }, { max: -0.3, color: "#ef4444" },
    { max: -0.15, color: "#fb923c" }, { max: 0.15, color: "#10b981" },
    { max: 0.3, color: "#22d3ee" }, { max: 0.6, color: "#0ea5e9" },
    { max: 999, color: "#1d4ed8" },
  ],
};

function colorFor(layer, value) {
  if (value === null || value === undefined || isNaN(value)) return "#6b7280";
  const ramp = RAMPS[layer] || RAMPS.temperature;
  for (const step of ramp) if (value <= step.max) return step.color;
  return ramp[ramp.length - 1].color;
}

function FitBoundsOnce({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points?.length) return;
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lon]));
    map.fitBounds(bounds, { padding: [20, 20] });
  }, []); // eslint-disable-line
  return null;
}

export default function IndiaMap({ height = "60vh", showCities = false, layerOverride }) {
  const { selectedState, setSelectedState, activeLayer } = useAppState();
  const layer = layerOverride || activeLayer;
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [stateValues, setStateValues] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, c] = await Promise.all([api.get("/climate/states"), api.get("/climate/cities")]);
        setStates(s.data.states);
        setCities(c.data.cities);
      } catch (err) { /* ignore */ }
    })();
  }, []);

  // Load layer-specific values (drought index, monsoon departure, etc.)
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        if (layer === "drought") {
          const { data } = await api.get("/drought/index");
          const map = {};
          (data.states || []).forEach((s) => { map[s.code] = s.spi; });
          setStateValues(map);
        } else if (layer === "rainfall") {
          const { data } = await api.get("/monsoon/status");
          const map = {};
          (data.state_summaries || []).forEach((s) => { map[s.code] = s.departure_pct; });
          setStateValues(map);
        } else {
          // temperature: lazy load via current snapshots for top metros only
          setStateValues({});
        }
      } catch (err) { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, [layer]);

  const stateMarkers = useMemo(() => states.map((s) => {
    let value = stateValues[s.code];
    // Fallback for temperature: leave value undefined (uses neutral color), but radius is fixed
    return {
      ...s,
      value,
      color: colorFor(layer, value),
    };
  }), [states, stateValues, layer]);

  return (
    <div data-testid="india-map" className="relative w-full rounded-md overflow-hidden border border-border/80" style={{ height }}>
      <MapContainer
        center={[22.5, 80.5]} zoom={4.5} minZoom={3} maxZoom={9}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%", background: "hsl(222 35% 5%)" }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap &copy; CARTO'
        />
        <FitBoundsOnce points={states} />
        {stateMarkers.map((s) => (
          <CircleMarker
            key={s.code}
            center={[s.lat, s.lon]}
            radius={selectedState?.code === s.code ? 11 : 7}
            pathOptions={{
              color: selectedState?.code === s.code ? "#fbbf24" : s.color,
              weight: selectedState?.code === s.code ? 3 : 1.5,
              fillColor: s.color,
              fillOpacity: 0.85,
            }}
            eventHandlers={{
              click: () => setSelectedState({ code: s.code, name: s.name, lat: s.lat, lon: s.lon }),
            }}
          >
            <Tooltip direction="top" offset={[0, -6]}>
              <div className="font-mono text-[11px]">
                <div className="text-foreground font-semibold">{s.name}</div>
                <div className="text-muted-foreground">{s.zone} · {s.code}</div>
                {s.value !== undefined && (
                  <div className="text-foreground mt-1">
                    {layer === "drought" && <>SPI: {s.value.toFixed(2)}</>}
                    {layer === "rainfall" && <>Departure: {s.value > 0 ? "+" : ""}{s.value}%</>}
                  </div>
                )}
              </div>
            </Tooltip>
          </CircleMarker>
        ))}
        {showCities && cities.map((c) => (
          <CircleMarker key={c.name + c.lat} center={[c.lat, c.lon]}
            radius={3} pathOptions={{ color: "#22d3ee", fillOpacity: 0.6, weight: 1 }}>
            <Tooltip>{c.name}</Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Legend */}
      <div data-testid="map-legend" className="absolute bottom-3 left-3 z-[400] hud-panel px-3 py-2 max-w-[260px]">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5">
          Layer: <span className="text-foreground">{layer}</span>
          {loading && <span className="ml-2 text-[hsl(var(--primary))]">• loading</span>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(RAMPS[layer] || RAMPS.temperature).map((s, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm" style={{ background: s.color }} />
              <span className="text-[10px] font-mono text-muted-foreground">
                {layer === "rainfall" ? `≤${s.max}%`
                  : layer === "drought" ? `≤${s.max}`
                  : `≤${s.max}°C`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
