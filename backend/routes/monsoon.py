"""Monsoon routes — status, timeseries, departure %."""
import asyncio
import random
import statistics
from datetime import datetime
from typing import List, Dict

from fastapi import APIRouter, Query

from services.climate_service import climate_service
from services.llm_service import generate_narrative
from data.india_states import INDIAN_STATES, STATE_LPA_MM, state_by_code

router = APIRouter(prefix="/monsoon", tags=["monsoon"])


def _monsoon_phase(month: int, day: int) -> str:
    if (month == 6) or (month == 7 and day <= 15):
        return "onset"
    if month in (7, 8):
        return "active"
    if month == 9 and day <= 15:
        return "active"
    if month == 9 and day > 15:
        return "withdrawal"
    if month == 10:
        return "withdrawal"
    if month in (11, 12, 1, 2):
        return "northeast_monsoon"
    return "pre-monsoon"


async def _state_rainfall_summary(state: Dict) -> Dict:
    """Fetch ERA5 monsoon-window precip + compute departure vs LPA."""
    era5 = await climate_service.fetch_era5_reanalysis(state["lat"], state["lon"], days=120)
    precip = (era5.get("daily", {}) or {}).get("precipitation_sum") or []
    observed_mm = round(sum(precip[-90:]), 1) if precip else 0.0
    lpa = STATE_LPA_MM.get(state["code"], 800.0)
    departure_pct = round(((observed_mm - lpa) / lpa) * 100.0, 1) if lpa else 0.0
    if departure_pct >= 20:
        category = "excess"
    elif departure_pct >= -19:
        category = "normal"
    elif departure_pct >= -59:
        category = "deficient"
    else:
        category = "large_deficient"
    return {
        "code": state["code"],
        "name": state["name"],
        "zone": state["zone"],
        "observed_mm": observed_mm,
        "lpa_mm": lpa,
        "departure_pct": departure_pct,
        "category": category,
    }


@router.get("/status")
async def monsoon_status():
    now = datetime.utcnow()
    phase = _monsoon_phase(now.month, now.day)
    # Sample subset for status overview
    sample_codes = ["KL", "MH", "GJ", "MP", "UP", "BR", "WB", "OD", "TN", "KA", "AP", "PB", "RJ", "AS"]
    states = [state_by_code(c) for c in sample_codes if state_by_code(c)]
    summaries = await asyncio.gather(*[_state_rainfall_summary(s) for s in states])
    departures = [s["departure_pct"] for s in summaries]
    national_departure = round(statistics.mean(departures), 1) if departures else 0.0
    summaries.sort(key=lambda x: x["departure_pct"], reverse=True)
    return {
        "phase": phase,
        "date_ist": now.strftime("%Y-%m-%d"),
        "national_departure_pct": national_departure,
        "national_category": (
            "above_normal" if national_departure >= 4
            else "normal" if national_departure >= -4
            else "below_normal" if national_departure >= -19
            else "deficient"
        ),
        "state_summaries": summaries,
        "provenance": [{"source": "Open-Meteo ERA5", "dataset": "ECMWF ERA5"},
                       {"source": "IMD-style", "dataset": "State LPA climatology"}],
    }


@router.get("/timeseries")
async def monsoon_timeseries(
    lat: float = Query(...),
    lon: float = Query(...),
    days: int = Query(180, ge=60, le=730),
):
    era5 = await climate_service.fetch_era5_reanalysis(lat, lon, days=days)
    daily = era5.get("daily", {}) or {}
    dates = daily.get("time") or []
    rain = daily.get("precipitation_sum") or []
    # cumulative
    cum = []
    s = 0.0
    for v in rain:
        s += (v or 0.0)
        cum.append(round(s, 2))
    # synthesize LPA climatology line as 90% of running mean
    if rain:
        rolling = []
        win = max(7, len(rain) // 10)
        for i in range(len(rain)):
            seg = rain[max(0, i - win + 1): i + 1]
            rolling.append(round(statistics.mean(seg) * 0.95, 2))
    else:
        rolling = []
    return {
        "dates": dates,
        "daily_mm": rain,
        "cumulative_mm": cum,
        "climatology_mm": rolling,
        "provenance": [{"source": "Open-Meteo ERA5", "dataset": "ECMWF ERA5"}],
    }


@router.get("/narrative")
async def monsoon_narrative():
    status = await monsoon_status()
    payload = {
        "phase": status["phase"],
        "national_departure_pct": status["national_departure_pct"],
        "top_excess": [s for s in status["state_summaries"] if s["departure_pct"] > 10][:5],
        "top_deficient": [s for s in status["state_summaries"] if s["departure_pct"] < -10][-5:],
    }
    result = await generate_narrative("monsoon", payload)
    return {"status": status, **result}
