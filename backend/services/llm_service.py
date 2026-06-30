"""Emergent LLM Service — wraps Claude for advisor chat + narrative generation.
Produces strictly structured JSON for narratives, and free-form for chat.
"""
from __future__ import annotations
import os
import json
import logging
import uuid
from typing import Dict, Any, List, Optional

from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)

LLM_MODEL_PROVIDER = "anthropic"
LLM_MODEL_NAME = "claude-sonnet-4-6"

SYSTEM_ANALYST = (
    "You are the AI Climate Analyst for Bharat Digital Climate Twin, India's national "
    "AI-powered digital twin of its climate system. You analyze multi-source observations "
    "(NASA POWER, Open-Meteo ERA5 reanalysis & forecasts, IMD-style datasets). "
    "Be precise, India-context aware, never fabricate. When asked for JSON respond ONLY with valid JSON "
    "(no markdown fences, no preamble)."
)

SYSTEM_ADVISOR = (
    "You are the AI Climate Advisor for Bharat Digital Climate Twin. You serve Indian "
    "policymakers, scientists, and farmers using real fetched observations.\n\n"
    "STRICT GROUNDING RULES — YOU MUST FOLLOW:\n"
    "1. ONLY use facts present in the CONTEXT block injected with each user message. "
    "Treat CONTEXT as the single source of truth.\n"
    "2. If the user asks something for which CONTEXT lacks data, explicitly say so: "
    "\"I don't have data for X in the current CONTEXT — try selecting that region/dataset.\" "
    "DO NOT guess, do not extrapolate beyond the data, do not invent numbers.\n"
    "3. When you state a numerical value, quote it from CONTEXT with units and cite its source "
    "(e.g. \"38.4°C — Open-Meteo current\", \"160.5 mm 30-day total — NASA POWER\").\n"
    "4. End every answer with a short \"Sources:\" line listing only the providers actually used "
    "from CONTEXT (NASA POWER, Open-Meteo, Open-Meteo ERA5, IMD-style climatology).\n"
    "5. Use short headings + bullets. Be India-context aware. Be honest about uncertainty.\n"
    "6. If asked to make a forecast or scenario projection, base it strictly on the provided "
    "snapshot/climatology/forecast in CONTEXT — never fabricate model output."
)


def _key() -> str:
    k = os.environ.get("EMERGENT_LLM_KEY")
    if not k:
        raise RuntimeError("EMERGENT_LLM_KEY missing in environment")
    return k


def _clean_json(s: str) -> str:
    s = s.strip()
    if s.startswith("```"):
        s = s.split("```")[1]
        if s.startswith("json"):
            s = s[4:]
    return s.strip()


async def generate_narrative(kind: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """kind: monsoon | drought | extremes | scenario | snapshot | sector"""
    schema_map = {
        "monsoon": (
            "{\n"
            '  "headline": "<2-line summary of monsoon state>",\n'
            '  "phase": "<pre-onset|onset|active|break|withdrawal|inactive>",\n'
            '  "departure_summary": "<short text on rainfall departure from LPA>",\n'
            '  "regions_above_normal": ["<state>"],\n'
            '  "regions_below_normal": ["<state>"],\n'
            '  "key_drivers": ["<driver1>", "<driver2>"],\n'
            '  "outlook_2weeks": "<short text>",\n'
            '  "confidence": 0.0\n'
            "}"
        ),
        "drought": (
            "{\n"
            '  "headline": "<2-line drought situational summary>",\n'
            '  "states_at_risk": [{"name":"","category":"moderate_drought|severe_drought|extreme_drought"}],\n'
            '  "primary_drivers": ["<driver>"],\n'
            '  "agricultural_impact": "<short>",\n'
            '  "water_impact": "<short>",\n'
            '  "recommendations": ["<short action>"],\n'
            '  "confidence": 0.0\n'
            "}"
        ),
        "extremes": (
            "{\n"
            '  "headline": "<2-line extreme weather summary>",\n'
            '  "active_alerts": [{"type":"heatwave|coldwave|cyclone|flood|thunderstorm","severity":"watch|warning|critical","region":"","note":""}],\n'
            '  "emerging_risks": ["<short>"],\n'
            '  "public_advisory": "<short>",\n'
            '  "confidence": 0.0\n'
            "}"
        ),
        "scenario": (
            "{\n"
            '  "headline": "<2-line scenario impact summary>",\n'
            '  "projected_temp_change_c": 0.0,\n'
            '  "projected_rainfall_change_pct": 0.0,\n'
            '  "drought_risk_shift": "<lower|similar|higher|much higher>",\n'
            '  "sector_impacts": [{"sector":"agriculture|water|urban|energy|health","impact":"low|moderate|high","note":""}],\n'
            '  "adaptation_actions": ["<short>"],\n'
            '  "confidence": 0.0\n'
            "}"
        ),
        "snapshot": (
            "{\n"
            '  "headline": "<2-line current climate state>",\n'
            '  "key_drivers": ["<short>"],\n'
            '  "risks": [{"sector":"agriculture|water|urban|energy|health","level":"low|moderate|high","note":""}],\n'
            '  "confidence": 0.0\n'
            "}"
        ),
        "sector": (
            "{\n"
            '  "headline": "<2-line sector-specific situation>",\n'
            '  "current_state": "<short>",\n'
            '  "key_indicators": [{"name":"","value":"","status":"favorable|caution|stress"}],\n'
            '  "recommendations": ["<short>"],\n'
            '  "confidence": 0.0\n'
            "}"
        ),
    }
    schema = schema_map.get(kind, schema_map["snapshot"])
    chat = LlmChat(api_key=_key(), session_id=f"narrative-{kind}-{uuid.uuid4().hex[:8]}",
                   system_message=SYSTEM_ANALYST).with_model(LLM_MODEL_PROVIDER, LLM_MODEL_NAME)
    user = (
        f"Generate a {kind} climate narrative for India based on the following observed data.\n\n"
        f"DATA:\n{json.dumps(payload, indent=2, default=str)}\n\n"
        f"Respond ONLY with valid JSON matching this schema (no markdown, no commentary):\n{schema}"
    )
    try:
        resp = await chat.send_message(UserMessage(text=user))
        parsed = json.loads(_clean_json(resp))
        return {"ok": True, "narrative": parsed}
    except Exception as e:
        logger.error(f"LLM narrative ({kind}) failed: {e}")
        return {"ok": False, "error": str(e), "narrative": None}


class AdvisorChat:
    """Persistent multi-turn advisor chat (one instance per session)."""

    _sessions: Dict[str, LlmChat] = {}

    @classmethod
    def get(cls, session_id: str) -> LlmChat:
        if session_id not in cls._sessions:
            cls._sessions[session_id] = LlmChat(
                api_key=_key(), session_id=session_id, system_message=SYSTEM_ADVISOR
            ).with_model(LLM_MODEL_PROVIDER, LLM_MODEL_NAME)
        return cls._sessions[session_id]

    @classmethod
    async def reply(cls, session_id: str, message: str, context: Optional[Dict[str, Any]] = None) -> str:
        chat = cls.get(session_id)
        ctx_block = ""
        if context:
            ctx_block = (
                "\n\n--- CONTEXT (real fetched observations) ---\n"
                f"{json.dumps(context, indent=2, default=str)}\n"
                "--- END CONTEXT ---\n"
            )
        full = f"{message}{ctx_block}"
        resp = await chat.send_message(UserMessage(text=full))
        return resp
