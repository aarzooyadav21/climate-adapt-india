"""Daily climate bulletin generator — AI-tailored per role."""
import asyncio
import time
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Query, Depends, HTTPException

from services.climate_service import climate_service
from services.llm_service import LlmChat, UserMessage, LLM_MODEL_NAME, LLM_MODEL_PROVIDER, _key
from services.auth_service import get_current_user
from data.india_states import state_by_code

router = APIRouter(prefix="/bulletin", tags=["bulletin"])

# In-memory TTL cache: { (state_code, role): (expires_ts, payload) }
_BULLETIN_CACHE: dict = {}
_TTL_SECONDS = 30 * 60  # 30-minute cache per (state, role)

ROLE_SYSTEMS = {
    "farmer": (
        "You write the FARMER'S DAILY BULLETIN. Plain Indian English, short sentences, no jargon. "
        "Focus on actions: irrigation, sowing, pest watch, heat protection. End with a one-line takeaway."
    ),
    "policymaker": (
        "You write the POLICYMAKER'S DAILY BRIEF in executive tone. Quantify risk. "
        "Sections: HEADLINE → NATIONAL STATUS → STATE FOCUS → PRIORITY ACTIONS (2-3) → DATA CONFIDENCE."
    ),
    "scientist": (
        "You write the SCIENTIST'S DAILY BULLETIN. Technical register. "
        "Sections: HEADLINE → OBSERVED STATE (with values+units+sources) → ANOMALIES / FLAGS → "
        "OUTLOOK NEXT 7D → OPEN QUESTIONS / DATA GAPS → DATA CONFIDENCE."
    ),
}


@router.get("")
async def bulletin(
    state_code: str = Query(...),
    role: Optional[str] = Query(None),
    user=Depends(get_current_user),
):
    use_role = (role or user.get("role") or "scientist").lower()
    if use_role not in ROLE_SYSTEMS:
        use_role = "scientist"
    st = state_by_code(state_code.upper())
    if not st:
        raise HTTPException(404, "State not found")

    # Serve from cache if fresh
    cache_key = (st["code"], use_role)
    now = time.time()
    cached = _BULLETIN_CACHE.get(cache_key)
    if cached and cached[0] > now:
        return cached[1]

    from routes.monsoon import monsoon_status
    from routes.extremes import drought_index, extreme_alerts

    # Lightweight context: only fast/cached endpoints. Skip fire/cyclone fan-out
    # which iterates all states and previously caused proxy timeouts.
    snap, mon, drought, alerts = await asyncio.gather(
        climate_service.snapshot(st["lat"], st["lon"]),
        monsoon_status(),
        drought_index(),
        extreme_alerts(),
    )
    st_mon = next((s for s in mon["state_summaries"] if s["code"] == st["code"]), None)
    st_drought = next((s for s in drought["states"] if s["code"] == st["code"]), None)
    st_alerts = next((s for s in alerts["states"] if s["code"] == st["code"]), None)

    ctx = {
        "state": st["name"], "date_ist": datetime.now(timezone.utc).astimezone(timezone(timedelta(hours=5, minutes=30))).strftime("%Y-%m-%d"),
        "current": snap.get("current"),
        "climatology_30d": snap.get("climatology_30d"),
        "monsoon": {"national_departure_pct": mon["national_departure_pct"], "phase": mon["phase"], "state": st_mon},
        "drought_state": st_drought, "drought_national_at_risk": drought["count_at_risk"],
        "extremes_state": st_alerts, "extremes_national_with_alerts": alerts["states_with_alerts"],
    }

    chat = LlmChat(api_key=_key(), session_id=f"bulletin-{use_role}-{st['code']}", system_message=ROLE_SYSTEMS[use_role]
                   ).with_model(LLM_MODEL_PROVIDER, LLM_MODEL_NAME)
    prompt = (
        f"Write today's CLIMATE BULLETIN for {st['name']}, India. Use the data below. "
        "Be specific with numbers (with units + source). Cite NASA POWER / Open-Meteo / Open-Meteo ERA5 / IMD-style. "
        "DO NOT invent numbers not present in DATA. If a field is missing, write 'data not available'. "
        f"\n\nDATA:\n{ctx}"
    )
    try:
        resp = await chat.send_message(UserMessage(text=prompt))
        text = resp.strip()
    except Exception as e:
        raise HTTPException(500, f"Bulletin generation failed: {e}")

    result = {
        "role": use_role, "state": st, "date_ist": ctx["date_ist"],
        "bulletin_text": text,
        "context_summary": {k: bool(v) for k, v in ctx.items()},
        "provenance": [
            {"source": "NASA POWER", "dataset": "MERRA-2"},
            {"source": "Open-Meteo", "dataset": "ECMWF/IFS"},
            {"source": "Open-Meteo ERA5", "dataset": "ECMWF ERA5"},
            {"source": "IMD-style", "dataset": "State LPA climatology"},
        ],
    }
    _BULLETIN_CACHE[cache_key] = (now + _TTL_SECONDS, result)
    return result
