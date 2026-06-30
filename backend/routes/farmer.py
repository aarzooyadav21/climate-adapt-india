"""Farmer-focused endpoint — simple, action-oriented advisory in plain language.
Reuses existing climate services; adds farmer-friendly heuristics and AI narrative.
"""
import asyncio
import statistics
from typing import Optional

from fastapi import APIRouter, Query, HTTPException

from services.climate_service import climate_service
from services.llm_service import LlmChat, UserMessage, LLM_MODEL_NAME, LLM_MODEL_PROVIDER, _key
from data.india_states import state_by_code

router = APIRouter(prefix="/farmer", tags=["farmer"])

FARMER_SYSTEM = (
    "You are a friendly farm advisor speaking to an Indian farmer who is NOT a climate scientist. "
    "Use very simple language. Short sentences. No technical terms (no SPI, no ERA5, no LPA, no anomalies). "
    "Give clear yes/no advice. Mention specific crops common in India (rice, wheat, cotton, pulses, vegetables) when relevant. "
    "Always ground in the data provided. If data is missing, say 'I don't have enough information for this'."
)


@router.get("/advisory")
async def farmer_advisory(state_code: str = Query(...)):
    st = state_by_code(state_code.upper())
    if not st:
        raise HTTPException(404, "State not found")
    snap, era5 = await asyncio.gather(
        climate_service.snapshot(st["lat"], st["lon"]),
        climate_service.fetch_era5_reanalysis(st["lat"], st["lon"], days=60),
    )
    current = snap.get("current") or {}
    clim = snap.get("climatology_30d") or {}
    forecast = snap.get("forecast_daily") or {}
    era_daily = era5.get("daily") or {}

    cur_t = current.get("temperature_c") or 28
    cur_h = current.get("humidity") or 50
    cur_rain = current.get("precipitation_mm") or 0
    avg_max = clim.get("avg_max_c") or 33
    precip_30d = clim.get("total_precip_mm") or 0
    forecast_rain = (forecast.get("precipitation_sum") or [0])[:3]
    forecast_tmax = (forecast.get("temperature_2m_max") or [])[:3]
    next_3d_rain = round(sum(forecast_rain), 1) if forecast_rain else 0
    next_3d_tmax = round(max(forecast_tmax), 1) if forecast_tmax else None
    recent_rain_7d = round(sum((era_daily.get("precipitation_sum") or [])[-7:]), 1)

    # Heuristics in plain language
    irrigate_today = (cur_rain < 1 and recent_rain_7d < 8 and avg_max > 30)
    sowing_window = "open" if (avg_max < 36 and precip_30d > 15) else ("caution" if avg_max < 40 else "avoid")
    heat_stress = "high" if (next_3d_tmax and next_3d_tmax >= 40) else ("moderate" if next_3d_tmax and next_3d_tmax >= 36 else "low")
    # Pest/disease risk — high humidity + warm temps favours pests
    pest_risk = "high" if (cur_h >= 75 and 24 <= cur_t <= 32) else ("moderate" if cur_h >= 60 else "low")

    cards = [
        {
            "icon": "weather",
            "title": "Right now",
            "big": f"{round(cur_t)}°C",
            "sub": f"Feels like {round(current.get('apparent_c') or cur_t)}°C · {round(cur_h)}% humidity",
            "status": "info",
        },
        {
            "icon": "rain",
            "title": "Rain expected in next 3 days",
            "big": f"{next_3d_rain} mm",
            "sub": "Last 7 days got " + (f"{recent_rain_7d} mm of rain" if recent_rain_7d > 0 else "no rain"),
            "status": "good" if next_3d_rain >= 20 else "warn" if next_3d_rain >= 5 else "bad",
        },
        {
            "icon": "droplet",
            "title": "Should you irrigate today?",
            "big": "Yes" if irrigate_today else "Not needed",
            "sub": ("Soil is likely dry, water your crops." if irrigate_today
                    else "Recent rain or cool weather — you can skip today."),
            "status": "warn" if irrigate_today else "good",
        },
        {
            "icon": "sprout",
            "title": "Sowing window",
            "big": sowing_window.title(),
            "sub": ("Good conditions to sow most kharif/rabi crops." if sowing_window == "open"
                    else "Wait if you can — conditions are not ideal." if sowing_window == "caution"
                    else "Too hot or dry to sow now."),
            "status": "good" if sowing_window == "open" else "warn" if sowing_window == "caution" else "bad",
        },
        {
            "icon": "sun",
            "title": "Heat stress on crops (next 3 days)",
            "big": heat_stress.upper(),
            "sub": (f"Peak temperature may reach {next_3d_tmax}°C. "
                    + ("Protect young plants and irrigate in evening." if heat_stress == "high"
                       else "Watch your crops in afternoon hours." if heat_stress == "moderate"
                       else "Conditions are comfortable for crops.")),
            "status": "bad" if heat_stress == "high" else "warn" if heat_stress == "moderate" else "good",
        },
        {
            "icon": "bug",
            "title": "Pest & disease risk",
            "big": pest_risk.upper(),
            "sub": ("Humid + warm conditions favour fungal diseases. Inspect crops daily." if pest_risk == "high"
                    else "Watch for early signs of pests on leaves." if pest_risk == "moderate"
                    else "Conditions are unfavourable for pests — low risk today."),
            "status": "bad" if pest_risk == "high" else "warn" if pest_risk == "moderate" else "good",
        },
    ]

    # AI plain-language summary
    advice_text = None
    try:
        chat = LlmChat(api_key=_key(), session_id=f"farmer-{st['code']}", system_message=FARMER_SYSTEM
                       ).with_model(LLM_MODEL_PROVIDER, LLM_MODEL_NAME)
        ctx = {
            "state": st["name"], "current_temp_c": cur_t, "humidity_pct": cur_h,
            "rain_next_3d_mm": next_3d_rain, "rain_last_7d_mm": recent_rain_7d,
            "max_temp_next_3d_c": next_3d_tmax, "irrigate_today": irrigate_today,
            "sowing_window": sowing_window, "heat_stress": heat_stress, "pest_risk": pest_risk,
        }
        prompt = (
            f"Write a 4-line friendly advisory for a farmer in {st['name']} based on this data: {ctx}. "
            "Line 1: Today’s weather in one sentence. "
            "Line 2: One clear action (irrigate / don’t irrigate / sow / wait). "
            "Line 3: One warning if heat or pests are a concern, else encouragement. "
            "Line 4: One tip for the week. Use simple English. No technical words."
        )
        resp = await chat.send_message(UserMessage(text=prompt))
        advice_text = resp.strip()
    except Exception:
        advice_text = None

    return {
        "state": st,
        "cards": cards,
        "advice_text": advice_text,
        "provenance": [
            {"source": "Open-Meteo", "dataset": "ECMWF/IFS current + forecast"},
            {"source": "Open-Meteo ERA5", "dataset": "ECMWF ERA5 reanalysis"},
            {"source": "NASA POWER", "dataset": "MERRA-2 climatology"},
        ],
    }
