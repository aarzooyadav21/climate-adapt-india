"""Climate data service — fetches from NASA POWER + Open-Meteo with caching.
Provides normalized snapshot/historical/forecast objects with provenance.
"""
from __future__ import annotations
import asyncio
import logging
import statistics
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional

import httpx
from aiocache import Cache
from aiocache.serializers import PickleSerializer

logger = logging.getLogger(__name__)

_cache = Cache(Cache.MEMORY, serializer=PickleSerializer(), ttl=900)  # 15 min

NASA_POWER_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
OPEN_METEO_FORECAST = "https://api.open-meteo.com/v1/forecast"
OPEN_METEO_ARCHIVE = "https://archive-api.open-meteo.com/v1/era5"


def _now_ist() -> str:
    return datetime.now(timezone.utc).astimezone(timezone(timedelta(hours=5, minutes=30))).strftime("%Y-%m-%d %H:%M IST")


def _now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class ClimateService:
    """All upstream climate API access funnels through this service."""

    timeout = httpx.Timeout(20.0)

    # ---------- NASA POWER ----------
    async def fetch_nasa_power(self, lat: float, lon: float, days: int = 30) -> Dict[str, Any]:
        key = f"nasa:{lat:.3f}:{lon:.3f}:{days}"
        cached = await _cache.get(key)
        if cached:
            return cached
        end = datetime.utcnow() - timedelta(days=3)
        start = end - timedelta(days=days)
        params = {
            "parameters": "T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,RH2M,WS10M,ALLSKY_SFC_SW_DWN",
            "community": "AG",
            "latitude": lat,
            "longitude": lon,
            "start": start.strftime("%Y%m%d"),
            "end": end.strftime("%Y%m%d"),
            "format": "JSON",
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                r = await client.get(NASA_POWER_URL, params=params)
                r.raise_for_status()
                raw = r.json()
        except Exception as e:
            logger.warning(f"NASA POWER fetch failed: {e}")
            return {"available": False, "error": str(e)}

        p = raw.get("properties", {}).get("parameter", {})

        def clean(d):
            return [(k, v) for k, v in sorted(d.items()) if v not in (-999.0, -999, None)]

        out = {
            "available": True,
            "source": "NASA POWER",
            "dataset": "MERRA-2 / GMAO",
            "updated_ist": _now_ist(),
            "updated_utc": _now_utc_iso(),
            "series": {
                "date": [k for k, _ in clean(p.get("T2M", {}))],
                "t2m": [v for _, v in clean(p.get("T2M", {}))],
                "t2m_max": [v for _, v in clean(p.get("T2M_MAX", {}))],
                "t2m_min": [v for _, v in clean(p.get("T2M_MIN", {}))],
                "precip_mm": [v for _, v in clean(p.get("PRECTOTCORR", {}))],
                "rh": [v for _, v in clean(p.get("RH2M", {}))],
                "wind_ms": [v for _, v in clean(p.get("WS10M", {}))],
                "solar_kwh": [v for _, v in clean(p.get("ALLSKY_SFC_SW_DWN", {}))],
            },
        }
        await _cache.set(key, out, ttl=1800)
        return out

    # ---------- Open-Meteo Forecast (current + 7-day) ----------
    async def fetch_open_meteo_forecast(self, lat: float, lon: float) -> Dict[str, Any]:
        key = f"om:{lat:.3f}:{lon:.3f}"
        cached = await _cache.get(key)
        if cached:
            return cached
        params = {
            "latitude": lat,
            "longitude": lon,
            "current": "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code,apparent_temperature,cloud_cover",
            "hourly": "temperature_2m,precipitation_probability,relative_humidity_2m,wind_speed_10m",
            "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max,sunrise,sunset",
            "timezone": "Asia/Kolkata",
            "forecast_days": 10,
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                r = await client.get(OPEN_METEO_FORECAST, params=params)
                r.raise_for_status()
                raw = r.json()
        except Exception as e:
            logger.warning(f"Open-Meteo forecast failed: {e}")
            return {"available": False, "error": str(e)}
        out = {
            "available": True,
            "source": "Open-Meteo",
            "dataset": "ECMWF/IFS + GFS blend",
            "updated_ist": _now_ist(),
            "updated_utc": _now_utc_iso(),
            "current": raw.get("current", {}),
            "daily": raw.get("daily", {}),
            "hourly": {k: v[:48] for k, v in (raw.get("hourly") or {}).items()},
        }
        await _cache.set(key, out, ttl=900)
        return out

    # ---------- Open-Meteo ERA5 Reanalysis ----------
    async def fetch_era5_reanalysis(self, lat: float, lon: float, days: int = 365) -> Dict[str, Any]:
        key = f"era5:{lat:.3f}:{lon:.3f}:{days}"
        cached = await _cache.get(key)
        if cached:
            return cached
        end = datetime.utcnow() - timedelta(days=7)
        start = end - timedelta(days=days)
        params = {
            "latitude": lat,
            "longitude": lon,
            "start_date": start.strftime("%Y-%m-%d"),
            "end_date": end.strftime("%Y-%m-%d"),
            "daily": "temperature_2m_mean,temperature_2m_max,temperature_2m_min,precipitation_sum",
            "timezone": "Asia/Kolkata",
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                r = await client.get(OPEN_METEO_ARCHIVE, params=params)
                r.raise_for_status()
                raw = r.json()
        except Exception as e:
            logger.warning(f"ERA5 fetch failed: {e}")
            return {"available": False, "error": str(e)}
        out = {
            "available": True,
            "source": "Open-Meteo ERA5",
            "dataset": "ECMWF ERA5 Reanalysis",
            "updated_ist": _now_ist(),
            "updated_utc": _now_utc_iso(),
            "daily": raw.get("daily", {}),
        }
        await _cache.set(key, out, ttl=3600)
        return out

    # ---------- High-level normalized accessors ----------
    async def snapshot(self, lat: float, lon: float) -> Dict[str, Any]:
        """Live snapshot fusing Open-Meteo current + NASA recent normals."""
        om, nasa = await asyncio.gather(
            self.fetch_open_meteo_forecast(lat, lon),
            self.fetch_nasa_power(lat, lon, days=30),
        )
        current = om.get("current", {}) if om.get("available") else {}
        # Compute 30-day averages from NASA series for context
        nasa_series = nasa.get("series", {}) if nasa.get("available") else {}
        def avg(arr):
            return round(statistics.mean(arr), 2) if arr else None
        return {
            "lat": lat,
            "lon": lon,
            "current": {
                "temperature_c": current.get("temperature_2m"),
                "apparent_c": current.get("apparent_temperature"),
                "humidity": current.get("relative_humidity_2m"),
                "precipitation_mm": current.get("precipitation"),
                "wind_ms": current.get("wind_speed_10m"),
                "cloud_cover": current.get("cloud_cover"),
                "weather_code": current.get("weather_code"),
            },
            "climatology_30d": {
                "avg_temp_c": avg(nasa_series.get("t2m", [])),
                "avg_max_c": avg(nasa_series.get("t2m_max", [])),
                "avg_min_c": avg(nasa_series.get("t2m_min", [])),
                "total_precip_mm": round(sum(nasa_series.get("precip_mm", []) or [0]), 2),
                "avg_humidity": avg(nasa_series.get("rh", [])),
                "avg_wind_ms": avg(nasa_series.get("wind_ms", [])),
                "avg_solar_kwh": avg(nasa_series.get("solar_kwh", [])),
            },
            "forecast_daily": om.get("daily", {}) if om.get("available") else {},
            "provenance": [
                {"source": om.get("source", "Open-Meteo"), "dataset": om.get("dataset"), "updated": om.get("updated_ist")},
                {"source": nasa.get("source", "NASA POWER"), "dataset": nasa.get("dataset"), "updated": nasa.get("updated_ist")},
            ],
            "fetched_at_utc": _now_utc_iso(),
        }

    async def historical(self, lat: float, lon: float, days: int = 90) -> Dict[str, Any]:
        era5 = await self.fetch_era5_reanalysis(lat, lon, days=days)
        return era5


climate_service = ClimateService()
