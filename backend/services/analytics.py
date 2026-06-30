"""Statistical analytics — anomaly z-scores, SPI proxy, trend detection."""
from __future__ import annotations
import statistics
from typing import List, Dict, Any, Optional


def zscores(series: List[float]) -> List[float]:
    if not series or len(series) < 3:
        return [0.0] * len(series)
    m = statistics.mean(series)
    s = statistics.stdev(series) or 1e-6
    return [round((x - m) / s, 3) for x in series]


def latest_anomaly(series: List[float]) -> Dict[str, Any]:
    if not series:
        return {"z": 0.0, "flag": False, "value": None}
    z = zscores(series)
    return {"z": z[-1], "flag": abs(z[-1]) > 2.0, "value": series[-1]}


def spi_proxy(precip_series: List[float], climatology_mean: Optional[float] = None) -> Dict[str, Any]:
    """Simple SPI-like proxy: standardized precipitation index."""
    if not precip_series:
        return {"spi": 0.0, "category": "unknown"}
    obs = sum(precip_series)
    mean = climatology_mean if climatology_mean is not None else (statistics.mean(precip_series) * len(precip_series))
    if mean <= 0:
        return {"spi": 0.0, "category": "normal"}
    deviation = (obs - mean) / (mean + 1e-6)
    # Map to categorical bands
    if deviation <= -0.60:
        cat = "extreme_drought"
    elif deviation <= -0.30:
        cat = "severe_drought"
    elif deviation <= -0.15:
        cat = "moderate_drought"
    elif deviation < 0.15:
        cat = "normal"
    elif deviation < 0.30:
        cat = "moderately_wet"
    elif deviation < 0.60:
        cat = "very_wet"
    else:
        cat = "extremely_wet"
    return {"spi": round(deviation, 3), "category": cat, "obs_mm": round(obs, 1), "climatology_mm": round(mean, 1)}


def trend_slope(series: List[float]) -> float:
    """Simple least-squares slope per index."""
    n = len(series)
    if n < 2:
        return 0.0
    xs = list(range(n))
    mx = sum(xs) / n
    my = sum(series) / n
    num = sum((x - mx) * (y - my) for x, y in zip(xs, series))
    den = sum((x - mx) ** 2 for x in xs) or 1e-6
    return round(num / den, 4)


def heatwave_flag(t2m_max: List[float], threshold: float = 40.0, consecutive: int = 3) -> bool:
    if not t2m_max:
        return False
    streak = 0
    for v in t2m_max:
        if v >= threshold:
            streak += 1
            if streak >= consecutive:
                return True
        else:
            streak = 0
    return False


def summarize_extremes(snapshot: Dict[str, Any], era5: Dict[str, Any]) -> Dict[str, Any]:
    daily = era5.get("daily", {}) if era5.get("available") else {}
    tmax = daily.get("temperature_2m_max") or []
    tmin = daily.get("temperature_2m_min") or []
    precip = daily.get("precipitation_sum") or []
    out = {
        "heatwave": heatwave_flag(tmax[-7:], threshold=40.0, consecutive=3),
        "coldwave": heatwave_flag([-v for v in tmin[-7:]], threshold=-4.0, consecutive=3) if tmin else False,
        "heavy_rain_72h": (sum(precip[-3:]) >= 120) if precip else False,
        "dry_spell_14d": (sum(precip[-14:]) <= 5.0 and len(precip) >= 14),
        "temp_trend": trend_slope(tmax[-60:]) if tmax else 0.0,
    }
    return out
