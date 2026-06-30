"""GeoJSON + meta routes — serves simplified India states polygon set."""
import json
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/geo", tags=["geo"])

GEOJSON_PATH = Path(__file__).parent.parent / "assets" / "india_states_simplified.geojson"
_cache = None


@router.get("/india/states")
async def india_states_geojson():
    global _cache
    if _cache is None:
        if not GEOJSON_PATH.exists():
            raise HTTPException(404, "GeoJSON not found")
        _cache = json.loads(GEOJSON_PATH.read_text())
    return JSONResponse(_cache, headers={"Cache-Control": "public, max-age=86400"})
