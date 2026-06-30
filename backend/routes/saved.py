"""Persistent saved scenarios per user."""
import uuid
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorDatabase

from services.auth_service import get_current_user


class SavedScenarioCreate(BaseModel):
    label: str = Field(min_length=1, max_length=120)
    state_code: str
    state_name: Optional[str] = None
    warming_c: float
    horizon_years: int
    rainfall_shift_pct: Optional[float] = None
    result_summary: dict = {}  # store baseline/projection/risk/narrative


class SavedScenario(SavedScenarioCreate):
    id: str
    user_id: str
    created_at: str


def build_saved_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(prefix="/saved-scenarios", tags=["saved-scenarios"])

    @router.post("", response_model=SavedScenario)
    async def create(body: SavedScenarioCreate, user=Depends(get_current_user)):
        doc = {
            "id": str(uuid.uuid4()),
            "user_id": user["sub"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            **body.model_dump(),
        }
        await db.saved_scenarios.insert_one(doc)
        return SavedScenario(**doc)

    @router.get("", response_model=List[SavedScenario])
    async def list_saved(user=Depends(get_current_user)):
        cursor = db.saved_scenarios.find({"user_id": user["sub"]}, {"_id": 0}).sort("created_at", -1)
        rows = await cursor.to_list(200)
        return [SavedScenario(**r) for r in rows]

    @router.delete("/{scenario_id}")
    async def delete(scenario_id: str, user=Depends(get_current_user)):
        res = await db.saved_scenarios.delete_one({"id": scenario_id, "user_id": user["sub"]})
        if not res.deleted_count:
            raise HTTPException(404, "Scenario not found")
        return {"deleted": True}

    @router.get("/{scenario_id}", response_model=SavedScenario)
    async def get_one(scenario_id: str, user=Depends(get_current_user)):
        doc = await db.saved_scenarios.find_one({"id": scenario_id, "user_id": user["sub"]}, {"_id": 0})
        if not doc:
            raise HTTPException(404, "Scenario not found")
        return SavedScenario(**doc)

    return router
