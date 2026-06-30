"""Extreme weather + drought routes."""
import asyncio
from typing import List, Dict
from fastapi import APIRouter

from services.climate_service import climate_service
from services.analytics import summarize_extremes, spi_proxy
from services.llm_service import generate_narrative
from data.india_states import INDIAN_STATES, STATE_LPA_MM, state_by_code

router = APIRouter(prefix="/extremes", tags=["extremes"])
drought_router = APIRouter(prefix="/drought", tags=["drought"])


async def _state_extremes(state: Dict) -> Dict:
    snap, era5 = await asyncio.gather(
        climate_service.fetch_open_meteo_forecast(state["lat"], state["lon"]),
        climate_service.fetch_era5_reanalysis(state["lat"], state["lon"], days=90),
    )
    extremes = summarize_extremes(snap, era5)
    current = (snap.get("current") or {}) if snap.get("available") else {}
    alerts = []
    if extremes["heatwave"]:
        alerts.append({"type": "heatwave", "severity": "warning", "note": "Tmax ≥ 40°C for 3+ consecutive days"})
    if extremes["coldwave"]:
        alerts.append({"type": "coldwave", "severity": "watch", "note": "Sustained cold anomaly"})
    if extremes["heavy_rain_72h"]:
        alerts.append({"type": "flood", "severity": "warning", "note": "72h rainfall ≥ 120 mm"})
    if extremes["dry_spell_14d"]:
        alerts.append({"type": "drought", "severity": "watch", "note": "14-day rainfall ≤ 5 mm"})
    # Current temp-based heat advisory
    cur_t = current.get("temperature_2m")
    if cur_t is not None and cur_t >= 43:
        alerts.append({"type": "heatwave", "severity": "critical", "note": f"Current temperature {cur_t}°C"})
    return {
        "code": state["code"],
        "name": state["name"],
        "zone": state["zone"],
        "current_temp_c": cur_t,
        "flags": extremes,
        "alerts": alerts,
        "severity": (
            "critical" if any(a["severity"] == "critical" for a in alerts)
            else "warning" if any(a["severity"] == "warning" for a in alerts)
            else "watch" if alerts else "normal"
        ),
    }


@router.get("/alerts")
async def extreme_alerts():
    codes = ["DL", "MH", "GJ", "RJ", "UP", "MP", "WB", "OD", "TN", "KL", "KA", "AP", "TG", "BR", "PB", "HR", "AS", "JH", "CT", "HP"]
    states = [s for s in (state_by_code(c) for c in codes) if s]
    results = await asyncio.gather(*[_state_extremes(s) for s in states])
    active = [r for r in results if r["alerts"]]
    return {
        "total_states_monitored": len(results),
        "states_with_alerts": len(active),
        "states": results,
        "provenance": [{"source": "Open-Meteo", "dataset": "ECMWF/IFS forecast"},
                       {"source": "Open-Meteo ERA5", "dataset": "ECMWF ERA5"}],
    }


@router.get("/narrative")
async def extremes_narrative():
    alerts = await extreme_alerts()
    payload = {
        "states_with_alerts": alerts["states_with_alerts"],
        "high_severity": [s for s in alerts["states"] if s["severity"] in ("warning", "critical")][:10],
    }
    res = await generate_narrative("extremes", payload)
    return {"alerts": alerts, **res}


async def _state_spi(state: Dict) -> Dict:
    era5 = await climate_service.fetch_era5_reanalysis(state["lat"], state["lon"], days=120)
    precip = (era5.get("daily") or {}).get("precipitation_sum") or []
    lpa = STATE_LPA_MM.get(state["code"], 800.0)
    # Use 90-day window vs LPA fraction proportional to that window
    monsoon_fraction = lpa * (90 / 122)
    spi = spi_proxy(precip[-90:], climatology_mean=monsoon_fraction)
    return {
        "code": state["code"],
        "name": state["name"],
        "zone": state["zone"],
        "lat": state["lat"],
        "lon": state["lon"],
        **spi,
    }


@drought_router.get("/index")
async def drought_index():
    results = await asyncio.gather(*[_state_spi(s) for s in INDIAN_STATES])
    at_risk = [r for r in results if r["category"] in ("moderate_drought", "severe_drought", "extreme_drought")]
    return {
        "states": results,
        "count_at_risk": len(at_risk),
        "provenance": [{"source": "Open-Meteo ERA5", "dataset": "ECMWF ERA5"},
                       {"source": "IMD-style", "dataset": "State LPA climatology"}],
    }


@drought_router.get("/narrative")
async def drought_narrative():
    idx = await drought_index()
    payload = {
        "count_at_risk": idx["count_at_risk"],
        "at_risk_states": [{"name": s["name"], "category": s["category"], "spi": s["spi"]} for s in idx["states"] if s["category"] != "normal"][:12],
    }
    res = await generate_narrative("drought", payload)
    return {"index": idx, **res}
