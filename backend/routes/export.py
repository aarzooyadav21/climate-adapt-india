"""Data export endpoints — CSV / JSON for various datasets."""
import io
import csv
import json
import asyncio
from typing import Optional

from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse

from services.climate_service import climate_service
from data.india_states import state_by_code, INDIAN_STATES

router = APIRouter(prefix="/export", tags=["export"])


def _stream_csv(headers, rows, filename):
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(headers)
    for r in rows:
        w.writerow(r)
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _stream_json(payload, filename):
    return StreamingResponse(
        iter([json.dumps(payload, indent=2, default=str)]),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/historical")
async def export_historical(
    state_code: str = Query(...),
    days: int = Query(180, ge=30, le=730),
    fmt: str = Query("csv", pattern="^(csv|json)$"),
):
    st = state_by_code(state_code.upper())
    if not st:
        raise HTTPException(404, "State not found")
    era5 = await climate_service.fetch_era5_reanalysis(st["lat"], st["lon"], days=days)
    daily = era5.get("daily", {}) or {}
    dates = daily.get("time") or []
    tmean = daily.get("temperature_2m_mean") or []
    tmax = daily.get("temperature_2m_max") or []
    tmin = daily.get("temperature_2m_min") or []
    rain = daily.get("precipitation_sum") or []
    if fmt == "json":
        payload = {
            "state": st,
            "source": "Open-Meteo ERA5",
            "days": days,
            "records": [
                {"date": dates[i], "t_mean": tmean[i] if i < len(tmean) else None,
                 "t_max": tmax[i] if i < len(tmax) else None,
                 "t_min": tmin[i] if i < len(tmin) else None,
                 "precip_mm": rain[i] if i < len(rain) else None}
                for i in range(len(dates))
            ],
        }
        return _stream_json(payload, f"climate_historical_{st['code']}_{days}d.json")
    rows = [[dates[i],
             tmean[i] if i < len(tmean) else "",
             tmax[i] if i < len(tmax) else "",
             tmin[i] if i < len(tmin) else "",
             rain[i] if i < len(rain) else ""] for i in range(len(dates))]
    return _stream_csv(["date", "t_mean_c", "t_max_c", "t_min_c", "precip_mm"], rows,
                       f"climate_historical_{st['code']}_{days}d.csv")


@router.get("/snapshot")
async def export_snapshot(
    state_code: str = Query(...),
    fmt: str = Query("csv", pattern="^(csv|json)$"),
):
    st = state_by_code(state_code.upper())
    if not st:
        raise HTTPException(404, "State not found")
    snap = await climate_service.snapshot(st["lat"], st["lon"])
    if fmt == "json":
        return _stream_json({"state": st, **snap}, f"climate_snapshot_{st['code']}.json")
    rows = []
    cur = snap["current"] or {}
    clim = snap["climatology_30d"] or {}
    for k, v in cur.items():
        rows.append(["current", k, v])
    for k, v in clim.items():
        rows.append(["climatology_30d", k, v])
    return _stream_csv(["group", "variable", "value"], rows, f"climate_snapshot_{st['code']}.csv")


@router.get("/drought")
async def export_drought(fmt: str = Query("csv", pattern="^(csv|json)$")):
    from routes.extremes import drought_index
    data = await drought_index()
    if fmt == "json":
        return _stream_json(data, "drought_index_india.json")
    rows = [[s["code"], s["name"], s["zone"], s["spi"], s["category"], s.get("obs_mm"), s.get("climatology_mm")] for s in data["states"]]
    return _stream_csv(["code", "name", "zone", "spi", "category", "obs_mm", "climatology_mm"], rows, "drought_index_india.csv")


@router.get("/monsoon")
async def export_monsoon(fmt: str = Query("csv", pattern="^(csv|json)$")):
    from routes.monsoon import monsoon_status
    data = await monsoon_status()
    if fmt == "json":
        return _stream_json(data, "monsoon_status_india.json")
    rows = [[s["code"], s["name"], s["zone"], s["observed_mm"], s["lpa_mm"], s["departure_pct"], s["category"]] for s in data["state_summaries"]]
    return _stream_csv(["code", "name", "zone", "observed_mm", "lpa_mm", "departure_pct", "category"], rows, "monsoon_status_india.csv")
