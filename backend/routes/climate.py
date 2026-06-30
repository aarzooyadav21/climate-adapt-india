"""Climate routes — snapshot, historical, states list."""
from fastapi import APIRouter, Query, HTTPException

from services.climate_service import climate_service
from data.india_states import INDIAN_STATES, MAJOR_CITIES, state_by_code

router = APIRouter(prefix="/climate", tags=["climate"])


@router.get("/states")
async def list_states():
    return {"states": INDIAN_STATES, "count": len(INDIAN_STATES)}


@router.get("/cities")
async def list_cities():
    return {"cities": MAJOR_CITIES, "count": len(MAJOR_CITIES)}


@router.get("/snapshot")
async def snapshot(
    lat: float = Query(...),
    lon: float = Query(...),
):
    if not (6.0 <= lat <= 38.0 and 67.0 <= lon <= 98.0):
        # Allow but warn outside India BBox; still process
        pass
    snap = await climate_service.snapshot(lat, lon)
    return snap


@router.get("/snapshot/state/{code}")
async def snapshot_state(code: str):
    st = state_by_code(code.upper())
    if not st:
        raise HTTPException(404, "State not found")
    snap = await climate_service.snapshot(st["lat"], st["lon"])
    snap["state"] = st
    return snap


@router.get("/historical")
async def historical(
    lat: float = Query(...),
    lon: float = Query(...),
    days: int = Query(180, ge=30, le=730),
):
    return await climate_service.historical(lat, lon, days=days)


@router.get("/nasa-power")
async def nasa_power(
    lat: float = Query(...),
    lon: float = Query(...),
    days: int = Query(60, ge=7, le=365),
):
    return await climate_service.fetch_nasa_power(lat, lon, days=days)


@router.get("/forecast")
async def forecast(
    lat: float = Query(...),
    lon: float = Query(...),
):
    return await climate_service.fetch_open_meteo_forecast(lat, lon)
