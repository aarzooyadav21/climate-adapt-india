import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import api from "@/lib/api";
import { useAppState } from "@/context/AppStateContext";

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
  if (value === null || value === undefined || isNaN(value)) return "#475569";
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
  const [geo, setGeo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, c, g] = await Promise.all([
          api.get("/climate/states"),
          api.get("/climate/cities"),
          api.get("/geo/india/states"),
        ]);
        setStates(s.data.states);
        setCities(c.data.cities);
        setGeo(g.data);
      } catch (err) { /* ignore */ }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        if (layer === "drought") {
          const { data } = await api.get("/drought/index");
          const m = {};
          (data.states || []).forEach((s) => { m[s.code] = s.spi; });
          setStateValues(m);
        } else if (layer === "rainfall") {
          const { data } = await api.get("/monsoon/status");
          const m = {};
          (data.state_summaries || []).forEach((s) => { m[s.code] = s.departure_pct; });
          setStateValues(m);
        } else {
          setStateValues({});
        }
      } catch (err) { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, [layer]);

  const stateMarkers = useMemo(() => states.map((s) => ({
    ...s,
    value: stateValues[s.code],
    color: colorFor(layer, stateValues[s.code]),
  })), [states, stateValues, layer]);

  const geoStyle = useMemo(() => (feature) => {
    const code = feature.properties.code;
    const value = stateValues[code];
    const fillColor = colorFor(layer, value);
    const isSelected = selectedState?.code === code;
    return {
      fillColor: layer === "temperature" ? "#0f172a" : fillColor,
      fillOpacity: layer === "temperature" ? 0.25 : (value === undefined ? 0.18 : 0.55),
      color: isSelected ? "#fbbf24" : "hsl(184 92% 55% / 0.55)",
      weight: isSelected ? 2 : 0.7,
    };
  }, [stateValues, layer, selectedState]);

  const onEachFeature = (feature, layerObj) => {
    const { code, name } = feature.properties;
    layerObj.on({
      mouseover: (e) => {
        e.target.setStyle({ weight: 1.8, color: "#22d3ee", fillOpacity: 0.65 });
      },
      mouseout: (e) => {
        e.target.setStyle(geoStyle(feature));
      },
      click: () => {
        const s = states.find((x) => x.code === code);
        if (s) setSelectedState({ code: s.code, name: s.name, lat: s.lat, lon: s.lon });
      },
    });
    const val = stateValues[code];
    const valStr = val === undefined ? "" :
      layer === "drought" ? `SPI ${val.toFixed(2)}` :
      layer === "rainfall" ? `Departure ${val > 0 ? "+" : ""}${val}%` : "";
    layerObj.bindTooltip(
      `<div style="font-family:'IBM Plex Mono'"><b>${name}</b> <span style="opacity:0.6">${code}</span><br/><span style="opacity:0.8">${valStr}</span></div>`,
      { sticky: true, opacity: 0.9 }
    );
  };

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
        {geo && (
          <GeoJSON
            key={`${layer}-${selectedState?.code}-${Object.keys(stateValues).length}`}
            data={geo}
            style={geoStyle}
            onEachFeature={onEachFeature}
          />
        )}
        {stateMarkers.map((s) => (
          <CircleMarker
            key={s.code}
            center={[s.lat, s.lon]}
            radius={selectedState?.code === s.code ? 8 : 4.5}
            pathOptions={{
              color: selectedState?.code === s.code ? "#fbbf24" : "#0b1220",
              weight: selectedState?.code === s.code ? 2.5 : 1,
              fillColor: s.color,
              fillOpacity: 0.95,
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

      <div data-testid="map-legend" className="absolute bottom-3 left-3 z-[400] hud-panel px-3 py-2 max-w-[280px]">
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
        {geo && <div className="mt-1.5 text-[9px] text-muted-foreground/70 font-mono">{geo.features.length} state polygons · {stateMarkers.length} markers</div>}
      </div>
    </div>
  );
}
