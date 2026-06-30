"""Policymaker executive brief — aggregates national + state-level risk into an executive summary."""
import asyncio
from typing import Optional

from fastapi import APIRouter, Query, HTTPException

from services.climate_service import climate_service
from services.llm_service import LlmChat, UserMessage, LLM_MODEL_NAME, LLM_MODEL_PROVIDER, _key
from data.india_states import state_by_code, STATE_LPA_MM

router = APIRouter(prefix="/policymaker", tags=["policymaker"])

POLICY_SYSTEM = (
    "You are a senior climate-risk advisor briefing an Indian policymaker (minister/secretary/IAS officer). "
    "Use the executive register: concise, evidence-led, policy-relevant. Quantify risk. "
    "Always ground in the data provided. If data is missing, say so. "
    "Avoid scientific jargon — explain SPI, ENSO etc. only in parentheses if used. "
    "Recommend 2–3 actionable interventions (advisories, allocations, coordination)."
)


@router.get("/brief")
async def policymaker_brief(state_code: str = Query(...)):
    st = state_by_code(state_code.upper())
    if not st:
        raise HTTPException(404, "State not found")

    from routes.monsoon import monsoon_status
    from routes.extremes import extreme_alerts, drought_index

    mon, alerts, drought, snap = await asyncio.gather(
        monsoon_status(),
        extreme_alerts(),
        drought_index(),
        climate_service.snapshot(st["lat"], st["lon"]),
    )
    state_drought = next((s for s in drought["states"] if s["code"] == st["code"]), None)
    state_alerts = next((s for s in alerts["states"] if s["code"] == st["code"]), None)
    state_mon = next((s for s in mon["state_summaries"] if s["code"] == st["code"]), None)

    drought_at_risk = [s for s in drought["states"] if s["category"] in ("moderate_drought","severe_drought","extreme_drought")]
    extremes_alerts = [s for s in alerts["states"] if s.get("severity") in ("warning","critical")]

    # Risk cards — executive view
    risk_cards = [
        {
            "label": "National Monsoon", "big": f"{mon['national_departure_pct']:+.1f}%",
            "sub": f"Phase: {mon['phase'].title()} · Status: {mon['national_category'].replace('_',' ')}",
            "severity": "normal" if abs(mon['national_departure_pct']) < 10 else "caution" if abs(mon['national_departure_pct']) < 30 else "stress",
        },
        {
            "label": "States with active warnings", "big": str(len(extremes_alerts)),
            "sub": f"out of {alerts['total_states_monitored']} monitored",
            "severity": "normal" if len(extremes_alerts) == 0 else "caution" if len(extremes_alerts) <= 3 else "stress",
        },
        {
            "label": "States in drought stress", "big": str(len(drought_at_risk)),
            "sub": "moderate / severe / extreme combined",
            "severity": "normal" if len(drought_at_risk) <= 5 else "caution" if len(drought_at_risk) <= 12 else "stress",
        },
        {
            "label": f"{st['name']} · rainfall vs LPA",
            "big": f"{state_mon['departure_pct']:+.1f}%" if state_mon else "—",
            "sub": (state_mon["category"].replace("_"," ") if state_mon else "no data"),
            "severity": ("stress" if state_mon and state_mon["departure_pct"] <= -20 else
                         "caution" if state_mon and state_mon["departure_pct"] <= -5 else "normal"),
        },
        {
            "label": f"{st['name']} · drought (SPI)",
            "big": f"{state_drought['spi']:+.2f}" if state_drought else "—",
            "sub": (state_drought["category"].replace("_"," ") if state_drought else "no data"),
            "severity": ("stress" if state_drought and "drought" in state_drought["category"] else "normal"),
        },
        {
            "label": f"{st['name']} · extreme weather",
            "big": (state_alerts["severity"].title() if state_alerts else "Normal"),
            "sub": (f"{len(state_alerts['alerts'])} active alert(s)" if state_alerts and state_alerts["alerts"] else "no active alerts"),
            "severity": ("stress" if state_alerts and state_alerts["severity"] == "critical" else
                         "caution" if state_alerts and state_alerts["severity"] == "warning" else "normal"),
        },
    ]

    # AI Executive Brief
    brief_text = None
    try:
        chat = LlmChat(api_key=_key(), session_id=f"policy-{st['code']}", system_message=POLICY_SYSTEM
                       ).with_model(LLM_MODEL_PROVIDER, LLM_MODEL_NAME)
        ctx = {
            "state": st["name"], "zone": st["zone"],
            "national_monsoon": {"phase": mon["phase"], "departure_pct": mon["national_departure_pct"]},
            "states_in_drought": len(drought_at_risk),
            "states_with_warnings": len(extremes_alerts),
            "focus_state_alerts": (state_alerts or {}).get("alerts", []),
            "focus_state_drought": state_drought,
            "focus_state_monsoon": state_mon,
            "focus_state_snapshot_current": snap.get("current"),
        }
        prompt = (
            f"Write a 5–6 line EXECUTIVE BRIEF for an Indian policymaker focused on {st['name']} based on this data: {ctx}. "
            "Structure:\n"
            "1) HEADLINE: one-line current national + state climate situation\n"
            "2) KEY RISK: the single most material risk right now\n"
            "3) AFFECTED SECTORS: short list (water, agriculture, urban, energy, health)\n"
            "4) RECOMMENDED ACTIONS: 2 specific policy actions (advisory, allocation, coordination)\n"
            "5) DATA CONFIDENCE: high/medium/low + provenance summary.\n"
            "Be concise, evidence-led. No fluff."
        )
        resp = await chat.send_message(UserMessage(text=prompt))
        brief_text = resp.strip()
    except Exception:
        brief_text = None

    return {
        "state": st,
        "risk_cards": risk_cards,
        "brief_text": brief_text,
        "national_summary": {
            "monsoon_phase": mon["phase"],
            "monsoon_departure_pct": mon["national_departure_pct"],
            "states_in_drought": len(drought_at_risk),
            "states_with_warnings": len(extremes_alerts),
            "states_monitored": alerts["total_states_monitored"],
        },
        "top_priority_states": [{"name": s["name"], "code": s["code"], "category": s["category"], "spi": s["spi"]} for s in drought_at_risk[:6]],
        "provenance": [
            {"source": "Open-Meteo ERA5", "dataset": "ECMWF ERA5"},
            {"source": "Open-Meteo", "dataset": "ECMWF/IFS"},
            {"source": "NASA POWER", "dataset": "MERRA-2"},
            {"source": "IMD-style", "dataset": "State LPA climatology"},
        ],
    }
