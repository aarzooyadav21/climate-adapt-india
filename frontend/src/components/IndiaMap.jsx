import { useEffect, useState, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import api from "@/lib/api";
import { useAppState } from "@/context/AppStateContext";
import { HeatmapOverlay, RAMPS } from "@/components/HeatmapOverlay";
import { CursorInspector } from "@/components/CursorInspector";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Layer key in URL/api vs UI label
const LAYER_API_KEY = {
  temperature: "temperature",
  rainfall: "rainfall_departure",
  drought: "drought_spi",
  humidity: "humidity",
  precipitation: "precipitation",
  wind: "wind",
};

const LEGEND_FMT = {
  temperature:        (s) => `${s}°C`,
  rainfall:           (s) => `${s}%`,
  drought:            (s) => `${s}`,
  humidity:           (s) => `${s}%`,
  precipitation:      (s) => `${s}mm`,
  wind:               (s) => `${s}m/s`,
};

function FitBoundsOnce() {
  const map = useMap();
  useEffect(() => {
    map.fitBounds([[6.5, 68], [37, 97]], { padding: [10, 10] });
  }, []); // eslint-disable-line
  return null;
}

export default function IndiaMap({ height = "60vh", layerOverride }) {
  const { selectedState, setSelectedState, activeLayer } = useAppState();
  const uiLayer = layerOverride || activeLayer;
  const apiLayer = LAYER_API_KEY[uiLayer] || "temperature";

  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [geo, setGeo] = useState(null);
  const [gridPoints, setGridPoints] = useState([]);
  const [gridUnit, setGridUnit] = useState("");

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

  const onGridLoaded = useCallback((data) => {
    setGridPoints(data.points || []);
    setGridUnit(data.unit || "");
  }, []);

  // Places for cursor "nearest" lookup — combine cities + states
  const places = useMemo(() => {
    return [
      ...cities.map((c) => ({ lat: c.lat, lon: c.lon, label: c.name })),
      ...states.map((s) => ({ lat: s.lat, lon: s.lon, label: s.name })),
    ];
  }, [cities, states]);

  // Style for state polygons — now subtle (heatmap shows the data)
  const geoStyle = useCallback((feature) => {
    const code = feature.properties.code;
    const isSelected = selectedState?.code === code;
    return {
      fillColor: "transparent",
      fillOpacity: 0,
      color: isSelected ? "#fbbf24" : "rgba(220, 240, 255, 0.35)",
      weight: isSelected ? 2 : 0.6,
    };
  }, [selectedState]);

  const onEachFeature = (feature, layerObj) => {
    const { code, name } = feature.properties;
    layerObj.on({
      mouseover: (e) => {
        e.target.setStyle({ weight: 1.6, color: "#22d3ee" });
      },
      mouseout: (e) => {
        e.target.setStyle(geoStyle(feature));
      },
      click: () => {
        const s = states.find((x) => x.code === code);
        if (s) setSelectedState({ code: s.code, name: s.name, lat: s.lat, lon: s.lon });
      },
    });
  };

  const ramp = RAMPS[apiLayer] || RAMPS.temperature;
  const fmt = LEGEND_FMT[uiLayer];

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
        <FitBoundsOnce />
        {/* Continuous heatmap */}
        <HeatmapOverlay layer={apiLayer} onPointsLoaded={onGridLoaded} indiaGeoJSON={geo} />
        {/* Subtle state outlines + click-to-select */}
        {geo && (
          <GeoJSON
            key={`outline-${selectedState?.code}`}
            data={geo}
            style={geoStyle}
            onEachFeature={onEachFeature}
          />
        )}
        {/* Selected state pin only */}
        {selectedState && (
          <CircleMarker
            center={[selectedState.lat, selectedState.lon]}
            radius={7}
            pathOptions={{ color: "#fbbf24", weight: 2.5, fillColor: "#fbbf24", fillOpacity: 0.9 }}
          >
            <Tooltip direction="top" offset={[0, -6]} permanent>
              <div className="font-mono text-[11px] text-foreground">{selectedState.name}</div>
            </Tooltip>
          </CircleMarker>
        )}
        {/* Hover-anywhere inspector */}
        <CursorInspector layer={apiLayer} points={gridPoints} places={places} />
      </MapContainer>

      {/* Legend */}
      <div data-testid="map-legend" className="absolute bottom-3 left-3 z-[400] hud-panel px-3 py-2 max-w-[300px]">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5">
          Layer: <span className="text-foreground">{uiLayer}</span>
          {gridUnit && <span className="ml-2 text-[hsl(var(--primary))]">{gridUnit}</span>}
        </div>
        <div className="flex h-2.5 rounded-sm overflow-hidden border border-border/60" style={{
          background: `linear-gradient(to right, ${ramp.map((s) => `rgb(${s.color.join(",")})`).join(",")})`
        }} />
        <div className="flex justify-between mt-1 text-[10px] font-mono text-muted-foreground">
          <span>{fmt(ramp[0].stop)}</span>
          <span>{fmt(ramp[Math.floor(ramp.length/2)].stop)}</span>
          <span>{fmt(ramp[ramp.length-1].stop)}</span>
        </div>
        <div className="mt-1.5 text-[9px] text-muted-foreground/70 font-mono">
          {gridPoints.length} grid samples · IDW-interpolated · hover for exact value
        </div>
      </div>
    </div>
  );
}
