/**
 * Continuous heatmap overlay for Leaflet using IDW (Inverse Distance Weighting).
 * Paints a smooth gradient over India BBox using grid sample points fetched from /climate/grid.
 * Auto-resizes with map; clips visually via opacity at India boundary.
 */
import { useEffect, useRef, useState, useMemo } from "react";
import { useMap, ImageOverlay } from "react-leaflet";
import L from "leaflet";
import api from "@/lib/api";

// Color ramps per layer — returns [r,g,b]
const RAMPS = {
  temperature: [
    { stop: 10,  color: [14, 116, 144] },   // deep teal cool
    { stop: 18,  color: [14, 165, 233] },
    { stop: 24,  color: [34, 211, 238] },
    { stop: 28,  color: [16, 185, 129] },
    { stop: 32,  color: [251, 191, 36] },
    { stop: 36,  color: [251, 146, 60] },
    { stop: 40,  color: [239, 68, 68] },
    { stop: 46,  color: [185, 28, 28] },
  ],
  humidity: [
    { stop: 0,   color: [185, 28, 28] },
    { stop: 25,  color: [251, 146, 60] },
    { stop: 45,  color: [251, 191, 36] },
    { stop: 60,  color: [16, 185, 129] },
    { stop: 75,  color: [34, 211, 238] },
    { stop: 90,  color: [14, 165, 233] },
    { stop: 100, color: [29, 78, 216] },
  ],
  precipitation: [
    { stop: 0,   color: [185, 28, 28] },
    { stop: 5,   color: [251, 146, 60] },
    { stop: 20,  color: [251, 191, 36] },
    { stop: 50,  color: [16, 185, 129] },
    { stop: 100, color: [34, 211, 238] },
    { stop: 200, color: [14, 165, 233] },
    { stop: 400, color: [29, 78, 216] },
  ],
  wind: [
    { stop: 0,  color: [16, 185, 129] },
    { stop: 4,  color: [34, 211, 238] },
    { stop: 8,  color: [251, 191, 36] },
    { stop: 12, color: [251, 146, 60] },
    { stop: 18, color: [239, 68, 68] },
    { stop: 30, color: [185, 28, 28] },
  ],
  drought_spi: [
    { stop: -1.0, color: [185, 28, 28] },
    { stop: -0.6, color: [239, 68, 68] },
    { stop: -0.3, color: [251, 146, 60] },
    { stop: -0.15, color: [251, 191, 36] },
    { stop: 0.15, color: [16, 185, 129] },
    { stop: 0.3,  color: [34, 211, 238] },
    { stop: 0.6,  color: [14, 165, 233] },
    { stop: 1.0,  color: [29, 78, 216] },
  ],
  rainfall_departure: [
    { stop: -60, color: [185, 28, 28] },
    { stop: -30, color: [239, 68, 68] },
    { stop: -10, color: [251, 146, 60] },
    { stop: 0,   color: [251, 191, 36] },
    { stop: 10,  color: [16, 185, 129] },
    { stop: 30,  color: [34, 211, 238] },
    { stop: 60,  color: [14, 165, 233] },
  ],
};

function interpColor(ramp, value) {
  if (value <= ramp[0].stop) return ramp[0].color;
  if (value >= ramp[ramp.length - 1].stop) return ramp[ramp.length - 1].color;
  for (let i = 0; i < ramp.length - 1; i++) {
    const a = ramp[i], b = ramp[i + 1];
    if (value >= a.stop && value <= b.stop) {
      const t = (value - a.stop) / (b.stop - a.stop);
      return [
        Math.round(a.color[0] + t * (b.color[0] - a.color[0])),
        Math.round(a.color[1] + t * (b.color[1] - a.color[1])),
        Math.round(a.color[2] + t * (b.color[2] - a.color[2])),
      ];
    }
  }
  return ramp[ramp.length - 1].color;
}

// Compute IDW value for a target (lat,lon) from sample points
function idw(points, lat, lon, power = 2.5, maxDist = 6.0) {
  let wsum = 0;
  let vsum = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const dlat = p.lat - lat;
    const dlon = p.lon - lon;
    const dist = Math.sqrt(dlat * dlat + dlon * dlon);
    if (dist < 0.0001) return p.value;
    if (dist > maxDist) continue;
    const w = 1.0 / Math.pow(dist, power);
    wsum += w;
    vsum += w * p.value;
  }
  if (wsum === 0) return null;
  return vsum / wsum;
}

export function valueAt(points, lat, lon) {
  return idw(points, lat, lon);
}

export function colorForLayer(layer, value) {
  if (value === null || value === undefined || isNaN(value)) return null;
  const ramp = RAMPS[layer] || RAMPS.temperature;
  return interpColor(ramp, value);
}

export function HeatmapOverlay({ layer, onPointsLoaded, indiaGeoJSON, resolution = "state" }) {
  const map = useMap();
  const [points, setPoints] = useState([]);
  const [unit, setUnit] = useState("");
  const [pngUrl, setPngUrl] = useState(null);
  const [bounds, setBounds] = useState(null);

  // Fetch grid points (state-level or district-level)
  useEffect(() => {
    let alive = true;
    // District-level only supports a subset of layers
    const districtSupported = ["temperature", "humidity", "wind", "precipitation"];
    if (resolution === "district" && districtSupported.includes(layer)) {
      api.get("/districts/grid", { params: { layer } }).then(({ data }) => {
        if (!alive) return;
        setPoints(data.points || []);
        setUnit(data.unit || "");
        onPointsLoaded?.(data);
      }).catch(() => {});
    } else {
      api.get("/climate/grid", { params: { layer } }).then(({ data }) => {
        if (!alive) return;
        setPoints(data.points || []);
        setUnit(data.unit || "");
        onPointsLoaded?.(data);
      }).catch(() => {});
    }
    return () => { alive = false; };
  }, [layer, resolution, onPointsLoaded]);

  // Build a clipping mask path (India outline as a Path2D)
  const clipPath = useMemo(() => {
    if (!indiaGeoJSON) return null;
    return indiaGeoJSON;
  }, [indiaGeoJSON]);

  // Render canvas to PNG data URL whenever points or bbox change
  useEffect(() => {
    if (!points.length) return;
    const minLat = 6.0, maxLat = 38.0, minLon = 67.0, maxLon = 98.0;
    const W = 360, H = 360;
    // Higher resolution + sharper IDW when many points
    const isDistrict = points.length > 300;
    const idwPower = isDistrict ? 3.5 : 2.5;
    const idwMaxDist = isDistrict ? 2.5 : 6.0;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    const img = ctx.createImageData(W, H);
    const ramp = RAMPS[layer] || RAMPS.temperature;
    for (let y = 0; y < H; y++) {
      const lat = maxLat - (y / H) * (maxLat - minLat);
      for (let x = 0; x < W; x++) {
        const lon = minLon + (x / W) * (maxLon - minLon);
        const v = idw(points, lat, lon, idwPower, idwMaxDist);
        const idx = (y * W + x) * 4;
        if (v === null) {
          img.data[idx + 3] = 0;
          continue;
        }
        const c = interpColor(ramp, v);
        img.data[idx]     = c[0];
        img.data[idx + 1] = c[1];
        img.data[idx + 2] = c[2];
        img.data[idx + 3] = 200; // semi-opaque so basemap shows through
      }
    }
    ctx.putImageData(img, 0, 0);

    // Apply India mask via destination-in if we have GeoJSON
    if (clipPath && clipPath.features?.length) {
      const mask = document.createElement("canvas");
      mask.width = W; mask.height = H;
      const mctx = mask.getContext("2d");
      mctx.fillStyle = "#fff";
      mctx.beginPath();
      for (const feat of clipPath.features) {
        const geom = feat.geometry;
        const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
        for (const poly of polys) {
          for (const ring of poly) {
            ring.forEach((pt, i) => {
              const px = ((pt[0] - minLon) / (maxLon - minLon)) * W;
              const py = ((maxLat - pt[1]) / (maxLat - minLat)) * H;
              if (i === 0) mctx.moveTo(px, py); else mctx.lineTo(px, py);
            });
            mctx.closePath();
          }
        }
      }
      mctx.fill("evenodd");
      // Use mask as alpha
      ctx.globalCompositeOperation = "destination-in";
      ctx.drawImage(mask, 0, 0);
      ctx.globalCompositeOperation = "source-over";
    }

    setPngUrl(canvas.toDataURL("image/png"));
    setBounds([[minLat, minLon], [maxLat, maxLon]]);
  }, [points, layer, clipPath]);

  if (!pngUrl || !bounds) return null;
  return <ImageOverlay url={pngUrl} bounds={bounds} opacity={0.78} />;
}

export { RAMPS, idw, interpColor };
