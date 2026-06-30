"""District-level endpoints — 594 Indian districts.
- GET /districts/geojson  : simplified polygons
- GET /districts/centroids: list of {district, state, lat, lon}
- GET /districts/grid?layer=temperature|humidity|precipitation|wind : batch-sampled
  using Open-Meteo (chunked because 594 > batch limit per request).
"""
import asyncio
import json
import logging
from pathlib import Path
from typing import List, Dict, Any

import httpx
from aiocache import Cache
from aiocache.serializers import PickleSerializer
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/districts", tags=["districts"])

ASSETS = Path(__file__).parent.parent / "assets"
GEO_PATH = ASSETS / "india_districts_simplified.geojson"
CENTROIDS_PATH = ASSETS / "india_districts_centroids.json"

_cache = Cache(Cache.MEMORY, serializer=PickleSerializer(), ttl=1800)
_geo_cache = None
_centroids_cache = None


def _load_centroids() -> List[Dict]:
    global _centroids_cache
    if _centroids_cache is None:
        _centroids_cache = json.loads(CENTROIDS_PATH.read_text())
    return _centroids_cache


def _load_geojson() -> dict:
    global _geo_cache
    if _geo_cache is None:
        _geo_cache = json.loads(GEO_PATH.read_text())
    return _geo_cache


@router.get("/geojson")
async def districts_geojson():
    if not GEO_PATH.exists():
        raise HTTPException(404, "Districts GeoJSON not available")
    return JSONResponse(_load_geojson(), headers={"Cache-Control": "public, max-age=86400"})


@router.get("/centroids")
async def districts_centroids(state: str = Query(None, description="Optional state-name filter")):
    c = _load_centroids()
    if state:
        c = [x for x in c if (x["state"] or "").lower() == state.lower()]
    return {"count": len(c), "centroids": c}


async def _batch_chunk(client, lats, lons, current_vars):
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": ",".join(f"{v:.4f}" for v in lats),
        "longitude": ",".join(f"{v:.4f}" for v in lons),
        "current": current_vars,
        "timezone": "Asia/Kolkata",
    }
    r = await client.get(url, params=params)
    r.raise_for_status()
    data = r.json()
    if isinstance(data, dict):
        data = [data]
    return data


@router.get("/grid")
async def districts_grid(
    layer: str = Query("temperature", pattern="^(temperature|humidity|wind|precipitation)$"),
):
    cache_key = f"district_grid:{layer}"
    cached = await _cache.get(cache_key)
    if cached:
        return cached

    centroids = _load_centroids()
    var_map = {
        "temperature": ("temperature_2m", "°C"),
        "humidity": ("relative_humidity_2m", "%"),
        "wind": ("wind_speed_10m", "m/s"),
        "precipitation": ("precipitation", "mm"),
    }
    var, unit = var_map[layer]
    # Open-Meteo accepts ~100 coords per request; we use sequential chunks with
    # tiny delay to stay under the per-IP rate limit (~10 req/min on the free tier).
    CHUNK = 100
    points: List[Dict[str, Any]] = []
    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            chunks = [centroids[i:i + CHUNK] for i in range(0, len(centroids), CHUNK)]
            for idx, chk in enumerate(chunks):
                results = await _batch_chunk(client, [c["lat"] for c in chk], [c["lon"] for c in chk], var)
                for centroid, rec in zip(chk, results):
                    val = (rec.get("current") or {}).get(var)
                    if val is None:
                        continue
                    points.append({
                        "lat": centroid["lat"],
                        "lon": centroid["lon"],
                        "value": val,
                        "district": centroid["district"],
                        "state": centroid["state"],
                    })
                if idx < len(chunks) - 1:
                    await asyncio.sleep(0.6)  # pace requests to avoid 429
    except Exception as e:
        logger.error(f"District grid fetch failed: {e}")
        raise HTTPException(500, f"Upstream batch failed: {e}")

    out = {
        "layer": layer,
        "unit": unit,
        "count": len(points),
        "points": points,
        "provenance": [{"source": "Open-Meteo", "dataset": "ECMWF/IFS current"}],
    }
    await _cache.set(cache_key, out, ttl=1800)
    return out
