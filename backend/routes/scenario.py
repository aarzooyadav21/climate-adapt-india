"""Scenario simulator + Sector dashboards."""
import asyncio
import statistics
from typing import Dict, Optional, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.climate_service import climate_service
from services.analytics import spi_proxy
from services.llm_service import generate_narrative
from data.india_states import state_by_code, STATE_LPA_MM, MAJOR_CITIES

router = APIRouter(prefix="/scenario", tags=["scenario"])
sector_router = APIRouter(prefix="/sectors", tags=["sectors"])


class ScenarioInput(BaseModel):
    state_code: str = Field(...)
    warming_c: float = Field(2.0, ge=0.5, le=5.0)
    horizon_years: int = Field(20, ge=5, le=80)
    rainfall_shift_pct: Optional[float] = Field(None, ge=-40.0, le=40.0)


def _apply_scenario(base_t: float, base_rain: float, warming: float, rain_shift: Optional[float], horizon: int):
    # Simple linear-scaling delta method (illustrative — not a true GCM downscaling)
    proj_t = round(base_t + warming, 2)
    rain_change = rain_shift if rain_shift is not None else -2.5 * warming  # Rough scale
    proj_rain = round(base_rain * (1 + rain_change / 100.0), 2)
    return proj_t, proj_rain, round(rain_change, 2)


@router.post("/run")
async def run_scenario(body: ScenarioInput):
    st = state_by_code(body.state_code.upper())
    if not st:
        raise HTTPException(404, "State not found")
    snap, era5 = await asyncio.gather(
        climate_service.snapshot(st["lat"], st["lon"]),
        climate_service.fetch_era5_reanalysis(st["lat"], st["lon"], days=365),
    )
    daily = era5.get("daily", {}) or {}
    base_t_series = daily.get("temperature_2m_mean") or []
    base_t = round(statistics.mean(base_t_series), 2) if base_t_series else (snap["climatology_30d"].get("avg_temp_c") or 27.0)
    base_rain = STATE_LPA_MM.get(st["code"], 800.0)

    proj_t, proj_rain, rain_change_pct = _apply_scenario(base_t, base_rain, body.warming_c, body.rainfall_shift_pct, body.horizon_years)

    # Risk shift assessment
    drought_shift = (
        "much higher" if (rain_change_pct <= -10 and body.warming_c >= 2.0)
        else "higher" if rain_change_pct <= -5
        else "similar" if -5 < rain_change_pct < 5
        else "lower"
    )

    chart = {
        "labels": ["Baseline", f"+{body.warming_c}°C @ {body.horizon_years}y"],
        "temperature_c": [base_t, proj_t],
        "rainfall_mm": [base_rain, proj_rain],
    }

    payload = {
        "state": st["name"],
        "baseline_temp_c": base_t,
        "projected_temp_c": proj_t,
        "baseline_rainfall_mm": base_rain,
        "projected_rainfall_mm": proj_rain,
        "rainfall_change_pct": rain_change_pct,
        "warming_c": body.warming_c,
        "horizon_years": body.horizon_years,
        "drought_risk_shift": drought_shift,
    }
    narrative = await generate_narrative("scenario", payload)

    return {
        "state": st,
        "input": body.model_dump(),
        "baseline": {"temperature_c": base_t, "rainfall_mm": base_rain},
        "projection": {
            "temperature_c": proj_t,
            "rainfall_mm": proj_rain,
            "rainfall_change_pct": rain_change_pct,
            "drought_risk_shift": drought_shift,
        },
        "chart": chart,
        **narrative,
        "provenance": [
            {"source": "Open-Meteo ERA5", "dataset": "ECMWF ERA5 (baseline)"},
            {"source": "IMD-style", "dataset": "State LPA (rainfall baseline)"},
            {"source": "Delta-method downscaling", "dataset": "Linear scenario projection (illustrative)"},
        ],
    }


# =================== SECTOR DASHBOARDS ===================

async def _sector_payload(state_code: Optional[str], default: str = "MH"):
    code = (state_code or default).upper()
    st = state_by_code(code)
    if not st:
        raise HTTPException(404, "State not found")
    snap, era5 = await asyncio.gather(
        climate_service.snapshot(st["lat"], st["lon"]),
        climate_service.fetch_era5_reanalysis(st["lat"], st["lon"], days=120),
    )
    return st, snap, era5


def _status_from_value(v, ranges):
    """ranges: list of (max_value, status). status: favorable|caution|stress"""
    for mx, s in ranges:
        if v <= mx:
            return s
    return ranges[-1][1]


@sector_router.get("/agriculture")
async def agriculture(state_code: Optional[str] = None):
    st, snap, era5 = await _sector_payload(state_code, "GJ")
    daily = era5.get("daily", {}) or {}
    rain_90 = sum((daily.get("precipitation_sum") or [])[-90:])
    lpa = STATE_LPA_MM.get(st["code"], 800.0) * 0.75
    rain_dep = round(((rain_90 - lpa) / max(lpa, 1)) * 100, 1)
    tmax_30 = (daily.get("temperature_2m_max") or [])[-30:]
    avg_max = round(statistics.mean(tmax_30), 1) if tmax_30 else None
    soil_moisture_proxy = round(max(0.0, min(1.0, 0.45 + rain_dep / 100)), 2)  # 0–1
    sowing_window = "open" if rain_dep > -15 and avg_max and avg_max < 36 else "caution"
    indicators = [
        {"name": "90d Rainfall", "value": f"{round(rain_90,1)} mm", "status": "favorable" if rain_dep > -10 else "caution" if rain_dep > -25 else "stress"},
        {"name": "Rainfall Departure", "value": f"{rain_dep:+.1f}%", "status": "favorable" if rain_dep > -10 else "caution" if rain_dep > -25 else "stress"},
        {"name": "Avg Tmax (30d)", "value": f"{avg_max}°C" if avg_max else "—", "status": "favorable" if avg_max and avg_max < 34 else "caution" if avg_max and avg_max < 38 else "stress"},
        {"name": "Soil Moisture (proxy)", "value": f"{int(soil_moisture_proxy*100)}%", "status": "favorable" if soil_moisture_proxy >= 0.5 else "caution" if soil_moisture_proxy >= 0.3 else "stress"},
        {"name": "Sowing Window", "value": sowing_window.title(), "status": "favorable" if sowing_window == "open" else "caution"},
    ]
    narrative = await generate_narrative("sector", {"sector": "agriculture", "state": st["name"], "indicators": indicators})
    return {"state": st, "sector": "agriculture", "indicators": indicators, **narrative,
            "provenance": [{"source": "Open-Meteo ERA5", "dataset": "ECMWF ERA5"},
                           {"source": "NASA POWER", "dataset": "MERRA-2"}]}


@sector_router.get("/water")
async def water(state_code: Optional[str] = None):
    st, snap, era5 = await _sector_payload(state_code, "MH")
    daily = era5.get("daily", {}) or {}
    rain_120 = sum(daily.get("precipitation_sum") or [])
    lpa = STATE_LPA_MM.get(st["code"], 800.0)
    rain_pct = round((rain_120 / max(lpa, 1)) * 100, 1)
    et_proxy = round(((snap["climatology_30d"].get("avg_max_c") or 30) - 5) * 0.18 * 30, 1)  # mm/month
    water_stress = (
        "low" if rain_pct >= 90
        else "moderate" if rain_pct >= 70
        else "high" if rain_pct >= 50
        else "severe"
    )
    indicators = [
        {"name": "Cumulative Rainfall (120d)", "value": f"{round(rain_120,1)} mm", "status": "favorable" if rain_pct >= 85 else "caution" if rain_pct >= 65 else "stress"},
        {"name": "% of LPA", "value": f"{rain_pct}%", "status": "favorable" if rain_pct >= 85 else "caution" if rain_pct >= 65 else "stress"},
        {"name": "ET Proxy (monthly)", "value": f"{et_proxy} mm", "status": "caution"},
        {"name": "Water Stress Index", "value": water_stress.title(), "status": "favorable" if water_stress == "low" else "caution" if water_stress == "moderate" else "stress"},
        {"name": "Reservoir Recharge (model)", "value": f"{max(0, round((rain_pct - 60) * 0.6, 1))}%", "status": "caution"},
    ]
    narrative = await generate_narrative("sector", {"sector": "water", "state": st["name"], "indicators": indicators})
    return {"state": st, "sector": "water", "indicators": indicators, **narrative,
            "provenance": [{"source": "Open-Meteo ERA5", "dataset": "ECMWF ERA5"},
                           {"source": "NASA POWER", "dataset": "MERRA-2"}]}


@sector_router.get("/urban")
async def urban(state_code: Optional[str] = None):
    st, snap, era5 = await _sector_payload(state_code, "DL")
    current = snap.get("current") or {}
    daily = era5.get("daily", {}) or {}
    tmax_7 = (daily.get("temperature_2m_max") or [])[-7:]
    avg_tmax_7 = round(statistics.mean(tmax_7), 1) if tmax_7 else None
    cur_t = current.get("temperature_c") or current.get("temperature_2m")
    humidity = current.get("humidity") or current.get("relative_humidity_2m") or 50
    # Heat index proxy (Steadman simplified)
    if cur_t is not None:
        heat_index = round(cur_t + 0.05 * (humidity - 50), 1)
    else:
        heat_index = None
    uhi_proxy = round(((avg_tmax_7 or 30) - (cur_t or 28)) + 1.5, 1)
    indicators = [
        {"name": "Current Temp", "value": f"{cur_t}°C" if cur_t else "—", "status": "favorable" if cur_t and cur_t < 32 else "caution" if cur_t and cur_t < 38 else "stress"},
        {"name": "Heat Index", "value": f"{heat_index}°C" if heat_index else "—", "status": "favorable" if heat_index and heat_index < 33 else "caution" if heat_index and heat_index < 41 else "stress"},
        {"name": "UHI Proxy", "value": f"+{uhi_proxy}°C", "status": "caution" if uhi_proxy > 2 else "favorable"},
        {"name": "7d Avg Tmax", "value": f"{avg_tmax_7}°C" if avg_tmax_7 else "—", "status": "caution"},
        {"name": "Humidity", "value": f"{humidity}%", "status": "favorable"},
    ]
    narrative = await generate_narrative("sector", {"sector": "urban", "state": st["name"], "indicators": indicators})
    return {"state": st, "sector": "urban", "indicators": indicators, **narrative,
            "provenance": [{"source": "Open-Meteo", "dataset": "ECMWF/IFS"},
                           {"source": "Open-Meteo ERA5", "dataset": "ECMWF ERA5"}]}


@sector_router.get("/energy")
async def energy(state_code: Optional[str] = None):
    st, snap, era5 = await _sector_payload(state_code, "RJ")
    clim = snap.get("climatology_30d", {})
    solar = clim.get("avg_solar_kwh") or 5.0
    wind = clim.get("avg_wind_ms") or 3.0
    daily = era5.get("daily", {}) or {}
    tmax_30 = (daily.get("temperature_2m_max") or [])[-30:]
    demand_stress_days = sum(1 for v in tmax_30 if v >= 38)
    indicators = [
        {"name": "Solar Potential", "value": f"{solar} kWh/m²/day", "status": "favorable" if solar >= 5 else "caution" if solar >= 3.5 else "stress"},
        {"name": "Wind Potential", "value": f"{wind} m/s", "status": "favorable" if wind >= 4 else "caution" if wind >= 2.5 else "stress"},
        {"name": "Demand-Stress Days (30d)", "value": f"{demand_stress_days}", "status": "favorable" if demand_stress_days < 5 else "caution" if demand_stress_days < 15 else "stress"},
        {"name": "PV Capacity Factor (proxy)", "value": f"{round(min(0.28, solar*0.045), 3)}", "status": "favorable"},
        {"name": "Wind Capacity Factor (proxy)", "value": f"{round(min(0.38, max(0.0, (wind-2.5))*0.1), 3)}", "status": "caution"},
    ]
    narrative = await generate_narrative("sector", {"sector": "energy", "state": st["name"], "indicators": indicators})
    return {"state": st, "sector": "energy", "indicators": indicators, **narrative,
            "provenance": [{"source": "NASA POWER", "dataset": "MERRA-2 (solar/wind)"},
                           {"source": "Open-Meteo ERA5", "dataset": "ECMWF ERA5"}]}
