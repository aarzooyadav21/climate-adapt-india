"""Climate grid endpoint — returns sampled lat/lon/value points across India for
the frontend to interpolate into a continuous heatmap (IDW client-side).
Fast: uses Open-Meteo's batch API (comma-separated coords) for one-shot fetch.
"""
import asyncio
from typing import List, Dict, Any

import httpx
from aiocache import Cache
from aiocache.serializers import PickleSerializer
from fastapi import APIRouter, Query, HTTPException

from data.india_states import INDIAN_STATES, MAJOR_CITIES, STATE_LPA_MM, state_by_code
from services.climate_service import climate_service

router = APIRouter(prefix="/climate", tags=["grid"])
_cache = Cache(Cache.MEMORY, serializer=PickleSerializer(), ttl=900)

INDIA_BBOX = {"min_lat": 6.0, "max_lat": 37.5, "min_lon": 67.5, "max_lon": 97.5}


def _sample_points() -> List[Dict]:
    """State centroids + major cities + a synthetic mesh to densify sparse areas."""
    pts = []
    for s in INDIAN_STATES:
        pts.append({"lat": s["lat"], "lon": s["lon"], "label": s["name"], "kind": "state", "state_code": s["code"]})
    for c in MAJOR_CITIES:
        pts.append({"lat": c["lat"], "lon": c["lon"], "label": c["name"], "kind": "city", "state_code": c["state_code"]})
    # Densification mesh — fills gaps in low-density regions; ~5x6 = 30 extra points
    for lat in [9.0, 14.0, 19.0, 24.0, 29.0, 33.0]:
        for lon in [70.0, 76.0, 82.0, 88.0, 94.0]:
            # Only inside rough India landmass approximation
            if not (lat < 12 and lon > 91):  # exclude SE corner outside India
                pts.append({"lat": lat, "lon": lon, "label": f"grid {lat:.0f},{lon:.0f}", "kind": "mesh", "state_code": None})
    return pts


async def _batch_open_meteo_current(points: List[Dict], current_vars: str) -> List[Dict]:
    """Batch fetch current weather for many points in one Open-Meteo call."""
    lats = ",".join(f"{p['lat']:.4f}" for p in points)
    lons = ",".join(f"{p['lon']:.4f}" for p in points)
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lats,
        "longitude": lons,
        "current": current_vars,
        "timezone": "Asia/Kolkata",
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.get(url, params=params)
        r.raise_for_status()
        data = r.json()
    # If single location, Open-Meteo returns object; if multi, returns array
    if isinstance(data, dict):
        data = [data]
    return data


@router.get("/grid")
async def climate_grid(
    layer: str = Query("temperature", pattern="^(temperature|humidity|precipitation|wind|drought_spi|rainfall_departure)$"),
):
    cache_key = f"grid:{layer}"
    cached = await _cache.get(cache_key)
    if cached:
        return cached

    points = _sample_points()
    out: Dict[str, Any] = {
        "layer": layer,
        "bbox": INDIA_BBOX,
        "points": [],
        "unit": "",
        "provenance": [],
    }

    if layer in ("temperature", "humidity", "wind"):
        var_map = {
            "temperature": ("temperature_2m", "°C"),
            "humidity": ("relative_humidity_2m", "%"),
            "wind": ("wind_speed_10m", "m/s"),
        }
        var, unit = var_map[layer]
        try:
            results = await _batch_open_meteo_current(points, var)
            for p, r in zip(points, results):
                val = (r.get("current") or {}).get(var)
                if val is None:
                    continue
                out["points"].append({"lat": p["lat"], "lon": p["lon"], "value": val, "label": p["label"], "state_code": p["state_code"]})
            out["unit"] = unit
            out["provenance"] = [{"source": "Open-Meteo", "dataset": "ECMWF/IFS current"}]
        except Exception as e:
            raise HTTPException(500, f"Open-Meteo batch failed: {e}")

    elif layer == "precipitation":
        # 7-day cumulative precip from Open-Meteo daily forecast
        lats = ",".join(f"{p['lat']:.4f}" for p in points)
        lons = ",".join(f"{p['lon']:.4f}" for p in points)
        url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": lats, "longitude": lons,
            "daily": "precipitation_sum",
            "timezone": "Asia/Kolkata", "forecast_days": 7,
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.get(url, params=params)
            r.raise_for_status()
            data = r.json()
        if isinstance(data, dict):
            data = [data]
        for p, rec in zip(points, data):
            vals = (rec.get("daily") or {}).get("precipitation_sum") or []
            total = round(sum(v or 0 for v in vals), 1) if vals else 0.0
            out["points"].append({"lat": p["lat"], "lon": p["lon"], "value": total, "label": p["label"], "state_code": p["state_code"]})
        out["unit"] = "mm (7d)"
        out["provenance"] = [{"source": "Open-Meteo", "dataset": "ECMWF/IFS forecast"}]

    elif layer == "drought_spi":
        # Reuse drought index endpoint, map state values onto state centroids
        from routes.extremes import drought_index
        data = await drought_index()
        by_code = {s["code"]: s["spi"] for s in data["states"]}
        for p in points:
            if p["state_code"] and p["state_code"] in by_code:
                out["points"].append({"lat": p["lat"], "lon": p["lon"], "value": by_code[p["state_code"]], "label": p["label"], "state_code": p["state_code"]})
        out["unit"] = "SPI"
        out["provenance"] = data.get("provenance", [])

    elif layer == "rainfall_departure":
        from routes.monsoon import monsoon_status
        data = await monsoon_status()
        by_code = {s["code"]: s["departure_pct"] for s in data["state_summaries"]}
        for p in points:
            if p["state_code"] and p["state_code"] in by_code:
                out["points"].append({"lat": p["lat"], "lon": p["lon"], "value": by_code[p["state_code"]], "label": p["label"], "state_code": p["state_code"]})
        out["unit"] = "% vs LPA"
        out["provenance"] = [{"source": "Open-Meteo ERA5", "dataset": "ECMWF ERA5"}, {"source": "IMD-style", "dataset": "State LPA climatology"}]

    out["count"] = len(out["points"])
    await _cache.set(cache_key, out, ttl=900)
    return out


@router.get("/point")
async def climate_point(
    lat: float = Query(...),
    lon: float = Query(...),
):
    """Lightweight single-point fetch for the hover inspector.
    Returns current temp/humidity/wind/precip and nearest known place.
    Caches per 0.1° grid cell to keep API load reasonable."""
    cache_key = f"point:{round(lat,1)}:{round(lon,1)}"
    cached = await _cache.get(cache_key)
    if cached:
        return cached
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get("https://api.open-meteo.com/v1/forecast", params={
                "latitude": round(lat, 2), "longitude": round(lon, 2),
                "current": "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code",
                "timezone": "Asia/Kolkata",
            })
            r.raise_for_status()
            data = r.json()
    except Exception as e:
        raise HTTPException(500, f"Open-Meteo failed: {e}")
    cur = data.get("current") or {}
    # nearest known place
    nearest = None
    nd = 1e9
    for c in MAJOR_CITIES + [{"name": s["name"], "lat": s["lat"], "lon": s["lon"], "state_code": s["code"]} for s in INDIAN_STATES]:
        d = (c["lat"] - lat) ** 2 + (c["lon"] - lon) ** 2
        if d < nd:
            nd = d; nearest = c
    out = {
        "lat": lat, "lon": lon,
        "temperature_c": cur.get("temperature_2m"),
        "humidity": cur.get("relative_humidity_2m"),
        "precipitation_mm": cur.get("precipitation"),
        "wind_ms": cur.get("wind_speed_10m"),
        "weather_code": cur.get("weather_code"),
        "nearest_place": nearest,
        "provenance": [{"source": "Open-Meteo", "dataset": "ECMWF/IFS current"}],
    }
    await _cache.set(cache_key, out, ttl=900)
    return out
