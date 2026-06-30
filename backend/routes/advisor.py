"""AI Climate Advisor chat routes."""
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorDatabase

from services.llm_service import AdvisorChat
from services.climate_service import climate_service
from services.auth_service import get_optional_user
from data.india_states import state_by_code


class AdvisorRequest(BaseModel):
    session_id: Optional[str] = None
    message: str = Field(min_length=1)
    state_code: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None


class AdvisorResponse(BaseModel):
    session_id: str
    reply: str
    used_context: Dict[str, Any] = {}


def build_advisor_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(prefix="/advisor", tags=["advisor"])

    @router.post("/chat", response_model=AdvisorResponse)
    async def chat(body: AdvisorRequest, user=Depends(get_optional_user)):
        session_id = body.session_id or f"adv-{uuid.uuid4().hex[:12]}"
        # Build context from selected location
        context: Dict[str, Any] = {}
        if body.state_code:
            st = state_by_code(body.state_code.upper())
            if st:
                context["location"] = {"state": st["name"], "code": st["code"], "lat": st["lat"], "lon": st["lon"]}
                snap = await climate_service.snapshot(st["lat"], st["lon"])
                context["current_snapshot"] = snap["current"]
                context["climatology_30d"] = snap["climatology_30d"]
                context["provenance"] = snap["provenance"]
        elif body.lat is not None and body.lon is not None:
            snap = await climate_service.snapshot(body.lat, body.lon)
            context["location"] = {"lat": body.lat, "lon": body.lon}
            context["current_snapshot"] = snap["current"]
            context["climatology_30d"] = snap["climatology_30d"]
            context["provenance"] = snap["provenance"]

        try:
            reply = await AdvisorChat.reply(session_id, body.message, context)
        except Exception as e:
            raise HTTPException(500, f"Advisor error: {e}")

        # Persist message (best-effort)
        try:
            user_id = user["sub"] if user else None
            await db.advisor_messages.insert_many([
                {"id": str(uuid.uuid4()), "session_id": session_id, "role": "user",
                 "content": body.message, "user_id": user_id,
                 "created_at": datetime.now(timezone.utc).isoformat(),
                 "context_summary": {k: True for k in context.keys()}},
                {"id": str(uuid.uuid4()), "session_id": session_id, "role": "assistant",
                 "content": reply, "user_id": user_id,
                 "created_at": datetime.now(timezone.utc).isoformat()},
            ])
        except Exception:
            pass

        return AdvisorResponse(session_id=session_id, reply=reply, used_context=context)

    @router.get("/sessions/{session_id}")
    async def get_session(session_id: str):
        msgs = await db.advisor_messages.find(
            {"session_id": session_id}, {"_id": 0}
        ).sort("created_at", 1).to_list(500)
        return {"session_id": session_id, "messages": msgs}

    @router.get("/sessions")
    async def list_sessions(user=Depends(get_optional_user)):
        q = {"user_id": user["sub"]} if user else {}
        # group by session_id
        pipeline = [
            {"$match": q},
            {"$sort": {"created_at": -1}},
            {"$group": {"_id": "$session_id", "last_message": {"$first": "$content"},
                        "last_at": {"$first": "$created_at"}, "count": {"$sum": 1}}},
            {"$sort": {"last_at": -1}},
            {"$limit": 50},
        ]
        cursor = db.advisor_messages.aggregate(pipeline)
        rows = [r async for r in cursor]
        return {"sessions": [{"session_id": r["_id"], "last_message": r["last_message"],
                              "last_at": r["last_at"], "count": r["count"]} for r in rows]}

    return router
