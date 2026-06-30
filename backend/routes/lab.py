"""Scientist Lab — multi-variable experiments + comparison + sensitivity sweep.
Designed to feel like a medical digital twin: scientists configure variables,
run grounded experiments and inspect outcomes side-by-side.
"""
import asyncio
import statistics
from typing import List, Optional, Dict

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.climate_service import climate_service
from services.llm_service import generate_narrative
from data.india_states import state_by_code, STATE_LPA_MM

router = APIRouter(prefix="/lab", tags=["lab"])


class LabInputs(BaseModel):
    state_code: str
    warming_c: float = Field(2.0, ge=0.0, le=5.0)
    rainfall_shift_pct: float = Field(0.0, ge=-50.0, le=50.0)
    urbanization_pct: float = Field(0.0, ge=0.0, le=100.0)  # urban heat island intensification
    land_use_change_pct: float = Field(0.0, ge=-50.0, le=50.0)  # ±% deforestation/afforestation
    horizon_years: int = Field(20, ge=5, le=80)


class LabExperiment(BaseModel):
    label: Optional[str] = None
    inputs: LabInputs


class LabRunRequest(BaseModel):
    experiments: List[LabExperiment] = Field(min_length=1, max_length=8)
    include_narrative: bool = True


class SensitivityRequest(BaseModel):
    state_code: str
    horizon_years: int = 20
    variable: str = Field(pattern="^(warming_c|rainfall_shift_pct|urbanization_pct|land_use_change_pct)$")
    min_value: float
    max_value: float
    steps: int = Field(7, ge=3, le=15)


async def _baseline(st: Dict) -> Dict:
    snap = await climate_service.snapshot(st["lat"], st["lon"])
    era5 = await climate_service.fetch_era5_reanalysis(st["lat"], st["lon"], days=180)
    daily = era5.get("daily", {}) or {}
    tmean = daily.get("temperature_2m_mean") or []
    base_t = round(statistics.mean(tmean), 2) if tmean else (snap["climatology_30d"].get("avg_temp_c") or 27.0)
    return {
        "base_temp_c": base_t,
        "base_rain_mm": STATE_LPA_MM.get(st["code"], 800.0),
        "base_avg_max_c": snap["climatology_30d"].get("avg_max_c") or 33.0,
        "snap": snap,
    }


def _project(base: Dict, inp: LabInputs) -> Dict:
    # Compound delta-method:
    # - warming: add C directly
    # - urbanization: adds UHI ~ 0.04 * urb_pct (max ~4°C)
    # - land_use_change: -land_use% reduces precip ~ 0.4x (deforestation reduces rainfall)
    # - rainfall_shift: applied multiplicatively
    uhi = round(inp.urbanization_pct * 0.04, 2)
    proj_t = round(base["base_temp_c"] + inp.warming_c + uhi, 2)
    proj_tmax = round(base["base_avg_max_c"] + inp.warming_c + uhi, 2)
    rain_change_pct = inp.rainfall_shift_pct + (inp.land_use_change_pct * -0.4)
    proj_rain = round(base["base_rain_mm"] * (1 + rain_change_pct / 100.0), 1)
    # Drought risk shift heuristic
    if rain_change_pct <= -10 and (inp.warming_c + uhi) >= 1.5:
        drought_shift = "much higher"
    elif rain_change_pct <= -5:
        drought_shift = "higher"
    elif -5 < rain_change_pct < 5:
        drought_shift = "similar"
    else:
        drought_shift = "lower"
    # Heat stress days proxy
    heat_stress_factor = 1.0 + (inp.warming_c + uhi) * 0.10
    return {
        "projected_temp_c": proj_t,
        "projected_tmax_c": proj_tmax,
        "uhi_c": uhi,
        "projected_rainfall_mm": proj_rain,
        "rainfall_change_pct": round(rain_change_pct, 2),
        "drought_risk_shift": drought_shift,
        "heat_stress_index": round(heat_stress_factor, 2),
    }


@router.post("/run")
async def run_lab(req: LabRunRequest):
    """Run multiple experiments side-by-side and return comparable outputs."""
    # Group by state for efficient baselining
    state_codes = list({e.inputs.state_code.upper() for e in req.experiments})
    states = [state_by_code(c) for c in state_codes]
    if any(s is None for s in states):
        raise HTTPException(404, "One or more state codes invalid")
    baselines = await asyncio.gather(*[_baseline(s) for s in states])
    base_by_code = {s["code"]: b for s, b in zip(states, baselines)}

    runs = []
    for exp in req.experiments:
        code = exp.inputs.state_code.upper()
        st = state_by_code(code)
        base = base_by_code[code]
        proj = _project(base, exp.inputs)
        runs.append({
            "label": exp.label or f"{st['name']} +{exp.inputs.warming_c}°C",
            "state": st,
            "inputs": exp.inputs.model_dump(),
            "baseline": {
                "temperature_c": base["base_temp_c"],
                "avg_max_c": base["base_avg_max_c"],
                "rainfall_mm": base["base_rain_mm"],
            },
            "projection": proj,
        })

    payload = {
        "experiments": runs,
        "summary": {
            "count": len(runs),
            "states": [s["name"] for s in states],
            "max_warming": max(e.inputs.warming_c for e in req.experiments),
        },
        "provenance": [
            {"source": "Open-Meteo ERA5", "dataset": "ECMWF ERA5 (baseline)"},
            {"source": "NASA POWER", "dataset": "MERRA-2 (climatology)"},
            {"source": "IMD-style", "dataset": "State LPA rainfall"},
            {"source": "Delta-method downscaling", "dataset": "Compound linear projection (illustrative)"},
        ],
    }

    if req.include_narrative:
        narrative = await generate_narrative("scenario", {
            "comparison_runs": [
                {
                    "label": r["label"],
                    "state": r["state"]["name"],
                    "inputs": r["inputs"],
                    "baseline": r["baseline"],
                    "projection": r["projection"],
                } for r in runs
            ],
        })
        payload.update(narrative)

    return payload


@router.post("/sensitivity")
async def sensitivity(req: SensitivityRequest):
    """Sweep one variable across a range; return outcome curve."""
    st = state_by_code(req.state_code.upper())
    if not st:
        raise HTTPException(404, "State not found")
    base = await _baseline(st)
    step = (req.max_value - req.min_value) / (req.steps - 1)
    curve = []
    for i in range(req.steps):
        v = round(req.min_value + i * step, 3)
        inputs = LabInputs(
            state_code=req.state_code,
            horizon_years=req.horizon_years,
            warming_c=2.0 if req.variable != "warming_c" else v,
            rainfall_shift_pct=0.0 if req.variable != "rainfall_shift_pct" else v,
            urbanization_pct=0.0 if req.variable != "urbanization_pct" else v,
            land_use_change_pct=0.0 if req.variable != "land_use_change_pct" else v,
        )
        proj = _project(base, inputs)
        curve.append({
            "variable_value": v,
            "projected_temp_c": proj["projected_temp_c"],
            "projected_rainfall_mm": proj["projected_rainfall_mm"],
            "rainfall_change_pct": proj["rainfall_change_pct"],
            "drought_risk_shift": proj["drought_risk_shift"],
            "heat_stress_index": proj["heat_stress_index"],
        })
    return {
        "state": st,
        "variable": req.variable,
        "range": [req.min_value, req.max_value],
        "steps": req.steps,
        "baseline": {
            "temperature_c": base["base_temp_c"],
            "rainfall_mm": base["base_rain_mm"],
        },
        "curve": curve,
        "provenance": [
            {"source": "Open-Meteo ERA5", "dataset": "ECMWF ERA5 (baseline)"},
            {"source": "Compound delta-method", "dataset": "Sensitivity sweep (illustrative)"},
        ],
    }
