"""Forest hazards: fire risk index + cyclone/storm watch derived from real climate data."""
import asyncio
import statistics
from typing import Dict, List

from fastapi import APIRouter

from services.climate_service import climate_service
from services.llm_service import generate_narrative
from data.india_states import INDIAN_STATES, state_by_code, MAJOR_CITIES

router = APIRouter(prefix="/hazards", tags=["hazards"])

# Coastal state codes for cyclone watch
COASTAL = {"GJ", "MH", "GA", "KA", "KL", "TN", "AP", "OD", "WB", "AN", "LD", "PY", "DN"}


def _fire_risk(t2m_max: float, humidity: float, precip_30d: float, wind: float) -> Dict:
    """Heuristic Fire Weather Index (FWI-lite).
    Higher temp, lower humidity, less recent precip, higher wind => higher risk.
    """
    # Normalised components (0-1)
    temp_c = max(0, min(1, (t2m_max - 25) / 20))         # 25-45C
    dryness = max(0, min(1, 1 - (humidity or 50) / 100))  # lower humidity = drier
    rain_c = max(0, min(1, 1 - (precip_30d or 0) / 200))  # less rain = drier
    wind_c = max(0, min(1, (wind or 2) / 12))             # 0-12 m/s
    score = round(0.35 * temp_c + 0.30 * dryness + 0.25 * rain_c + 0.10 * wind_c, 3)
    if score >= 0.75: category = "extreme"
    elif score >= 0.6: category = "very_high"
    elif score >= 0.45: category = "high"
    elif score >= 0.3: category = "moderate"
    else: category = "low"
    return {"score": score, "category": category}


async def _state_fire(s: Dict) -> Dict:
    snap = await climate_service.snapshot(s["lat"], s["lon"])
    clim = snap.get("climatology_30d") or {}
    cur = snap.get("current") or {}
    fr = _fire_risk(
        clim.get("avg_max_c") or 33,
        cur.get("humidity") or 50,
        clim.get("total_precip_mm") or 0,
        cur.get("wind_ms") or 2,
    )
    return {
        "code": s["code"], "name": s["name"], "zone": s["zone"], "lat": s["lat"], "lon": s["lon"],
        "tmax_30d": clim.get("avg_max_c"), "humidity_now": cur.get("humidity"),
        "precip_30d": clim.get("total_precip_mm"), "wind_now": cur.get("wind_ms"),
        **fr,
    }


@router.get("/fire-risk")
async def fire_risk_index():
    rows = await asyncio.gather(*[_state_fire(s) for s in INDIAN_STATES])
    at_risk = [r for r in rows if r["category"] in ("high", "very_high", "extreme")]
    return {
        "states": sorted(rows, key=lambda r: r["score"], reverse=True),
        "count_at_risk": len(at_risk),
        "max_score": max(r["score"] for r in rows) if rows else 0,
        "provenance": [
            {"source": "Open-Meteo", "dataset": "ECMWF/IFS current"},
            {"source": "NASA POWER", "dataset": "MERRA-2 climatology"},
            {"source": "Derived FWI-lite", "dataset": "Temperature + humidity + recent precip + wind"},
        ],
    }


@router.get("/fire-risk/narrative")
async def fire_risk_narrative():
    data = await fire_risk_index()
    top = data["states"][:6]
    payload = {
        "max_score": data["max_score"],
        "count_at_risk": data["count_at_risk"],
        "top_states": [{"name": s["name"], "score": s["score"], "category": s["category"]} for s in top],
    }
    res = await generate_narrative("extremes", payload)
    return {"index": data, **res}


async def _coastal_storm(s: Dict) -> Dict:
    om = await climate_service.fetch_open_meteo_forecast(s["lat"], s["lon"])
    daily = om.get("daily", {}) if om.get("available") else {}
    cur = om.get("current", {}) if om.get("available") else {}
    max_wind_7d = max((daily.get("wind_speed_10m_max") or [0]) or [0])
    max_precip_7d = max((daily.get("precipitation_sum") or [0]) or [0])
    cur_wind = cur.get("wind_speed_10m") or 0
    # Severity
    if max_wind_7d >= 25 or cur_wind >= 22:
        severity, label = "critical", "Severe cyclonic / gale conditions"
    elif max_wind_7d >= 17 or max_precip_7d >= 80:
        severity, label = "warning", "Tropical-storm strength winds or very heavy rain"
    elif max_wind_7d >= 12 or max_precip_7d >= 40:
        severity, label = "watch", "Elevated winds and rain"
    else:
        severity, label = "normal", "No coastal storm indicators"
    return {
        "code": s["code"], "name": s["name"], "lat": s["lat"], "lon": s["lon"],
        "max_wind_7d_ms": round(max_wind_7d, 1),
        "max_precip_7d_mm": round(max_precip_7d, 1),
        "current_wind_ms": round(cur_wind, 1),
        "severity": severity, "label": label,
    }


@router.get("/cyclone-watch")
async def cyclone_watch():
    coastal_states = [s for s in INDIAN_STATES if s["code"] in COASTAL]
    rows = await asyncio.gather(*[_coastal_storm(s) for s in coastal_states])
    active = [r for r in rows if r["severity"] != "normal"]
    return {
        "coastal_states": rows,
        "active_watches": active,
        "basin_summary": {
            "arabian_sea": [r for r in rows if r["code"] in ("GJ", "MH", "GA", "KA", "KL", "LD")],
            "bay_of_bengal": [r for r in rows if r["code"] in ("TN", "AP", "OD", "WB", "AN", "PY")],
        },
        "provenance": [{"source": "Open-Meteo", "dataset": "ECMWF/IFS forecast (10-day daily max wind + precip)"}],
    }
