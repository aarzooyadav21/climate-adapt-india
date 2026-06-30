"""
POC Test Script — Digital Twin of India's Climate

Validates ALL core integrations in isolation BEFORE building the app:
  1) NASA POWER API — historical climate data for 3 Indian cities
  2) Open-Meteo Climate / Forecast API — reanalysis + forecast
  3) Statistical engine — anomaly detection (z-scores) + SPI-proxy
  4) Emergent LLM (Claude) — climate analysis & narrative grounded on real data

Exits non-zero if any check fails.
"""

import os
import sys
import asyncio
import json
import statistics
from datetime import datetime, timedelta
from pathlib import Path

import httpx
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")

# ---- Configuration ----
INDIAN_CITIES = [
    {"name": "Delhi",   "lat": 28.6139, "lon": 77.2090, "state": "Delhi"},
    {"name": "Mumbai",  "lat": 19.0760, "lon": 72.8777, "state": "Maharashtra"},
    {"name": "Chennai", "lat": 13.0827, "lon": 80.2707, "state": "Tamil Nadu"},
]

PASS = "✅ PASS"
FAIL = "❌ FAIL"
results = {}


def banner(title):
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


# =====================================================================
# TEST 1: NASA POWER API
# =====================================================================
async def test_nasa_power():
    banner("TEST 1: NASA POWER API — Historical Climate (India)")
    end = datetime.utcnow() - timedelta(days=5)
    start = end - timedelta(days=30)
    params_str = "T2M,PRECTOTCORR,RH2M,WS10M,ALLSKY_SFC_SW_DWN"
    all_ok = True
    samples = {}

    async with httpx.AsyncClient(timeout=30.0) as client:
        for city in INDIAN_CITIES:
            url = "https://power.larc.nasa.gov/api/temporal/daily/point"
            qs = {
                "parameters": params_str,
                "community": "AG",
                "longitude": city["lon"],
                "latitude": city["lat"],
                "start": start.strftime("%Y%m%d"),
                "end": end.strftime("%Y%m%d"),
                "format": "JSON",
            }
            try:
                r = await client.get(url, params=qs)
                r.raise_for_status()
                data = r.json()
                params = data["properties"]["parameter"]
                t2m_vals = list(params["T2M"].values())
                precip_vals = list(params["PRECTOTCORR"].values())
                valid_t = [v for v in t2m_vals if v != -999.0]
                if len(valid_t) < 10:
                    raise ValueError(f"Too few valid temp records: {len(valid_t)}")
                samples[city["name"]] = {
                    "avg_temp_c": round(statistics.mean(valid_t), 2),
                    "total_precip_mm": round(sum(v for v in precip_vals if v != -999.0), 2),
                    "records": len(valid_t),
                }
                print(f"  ✓ {city['name']:8s} avg_temp={samples[city['name']]['avg_temp_c']}°C  "
                      f"precip={samples[city['name']]['total_precip_mm']}mm  n={samples[city['name']]['records']}")
            except Exception as e:
                print(f"  ✗ {city['name']}: {e}")
                all_ok = False

    results["nasa_power"] = {"status": PASS if all_ok else FAIL, "samples": samples}
    print(f"\nResult: {results['nasa_power']['status']}")
    return all_ok, samples


# =====================================================================
# TEST 2: Open-Meteo Forecast + ERA5 Reanalysis
# =====================================================================
async def test_open_meteo():
    banner("TEST 2: Open-Meteo — Forecast + ERA5 Reanalysis")
    all_ok = True
    samples = {}

    async with httpx.AsyncClient(timeout=30.0) as client:
        # 2a) Forecast endpoint
        for city in INDIAN_CITIES:
            url = "https://api.open-meteo.com/v1/forecast"
            qs = {
                "latitude": city["lat"],
                "longitude": city["lon"],
                "current": "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code",
                "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum",
                "timezone": "Asia/Kolkata",
                "forecast_days": 7,
            }
            try:
                r = await client.get(url, params=qs)
                r.raise_for_status()
                data = r.json()
                current = data["current"]
                daily = data["daily"]
                samples[city["name"]] = {
                    "current_temp": current["temperature_2m"],
                    "humidity": current["relative_humidity_2m"],
                    "wind": current["wind_speed_10m"],
                    "forecast_days": len(daily["time"]),
                    "max_forecast_temp": max(daily["temperature_2m_max"]),
                }
                print(f"  ✓ {city['name']:8s} now={current['temperature_2m']}°C  "
                      f"humidity={current['relative_humidity_2m']}%  forecast_days={len(daily['time'])}")
            except Exception as e:
                print(f"  ✗ {city['name']} forecast: {e}")
                all_ok = False

        # 2b) ERA5 Reanalysis (historical) for Delhi
        try:
            url = "https://archive-api.open-meteo.com/v1/era5"
            end = datetime.utcnow() - timedelta(days=10)
            start = end - timedelta(days=90)
            qs = {
                "latitude": INDIAN_CITIES[0]["lat"],
                "longitude": INDIAN_CITIES[0]["lon"],
                "start_date": start.strftime("%Y-%m-%d"),
                "end_date": end.strftime("%Y-%m-%d"),
                "daily": "temperature_2m_mean,precipitation_sum",
                "timezone": "Asia/Kolkata",
            }
            r = await client.get(url, params=qs)
            r.raise_for_status()
            data = r.json()
            n = len(data["daily"]["time"])
            print(f"  ✓ ERA5 reanalysis (Delhi, 90d): {n} records")
            samples["era5_delhi_days"] = n
        except Exception as e:
            print(f"  ✗ ERA5 reanalysis: {e}")
            all_ok = False

    results["open_meteo"] = {"status": PASS if all_ok else FAIL, "samples": samples}
    print(f"\nResult: {results['open_meteo']['status']}")
    return all_ok, samples


# =====================================================================
# TEST 3: Statistical Engine — Anomaly Detection + SPI-proxy
# =====================================================================
def test_statistical_engine(nasa_samples):
    banner("TEST 3: Statistical Engine — Anomalies & SPI-proxy")
    all_ok = True
    output = {}
    try:
        # Synthesize a realistic time series & compute z-scores
        # Using a longer fetched window inline test
        # Build from Delhi nasa avg_temp as baseline
        # Generate a 30-day synthetic sample around city avg with noise
        import random
        random.seed(7)
        for city, s in nasa_samples.items():
            baseline = s["avg_temp_c"]
            series = [baseline + random.gauss(0, 2.0) for _ in range(60)]
            # Inject an anomaly
            series[-1] = baseline + 6.0
            mean = statistics.mean(series[:-1])
            stdev = statistics.stdev(series[:-1])
            z = (series[-1] - mean) / stdev if stdev else 0
            anomaly_flag = abs(z) > 2.0
            # SPI-style proxy: total precip vs 30y normal (approx) — here just direction
            precip = s["total_precip_mm"]
            normal = max(precip * 0.9, 5.0)  # placeholder normal
            spi_proxy = (precip - normal) / (normal + 1e-6)
            output[city] = {
                "z_score_last_day": round(z, 2),
                "anomaly_detected": anomaly_flag,
                "spi_proxy": round(spi_proxy, 3),
            }
            print(f"  ✓ {city:8s} z={z:+.2f}  anomaly={anomaly_flag}  spi_proxy={spi_proxy:+.3f}")

        results["stats_engine"] = {"status": PASS, "samples": output}
    except Exception as e:
        all_ok = False
        results["stats_engine"] = {"status": FAIL, "error": str(e)}
        print(f"  ✗ {e}")

    print(f"\nResult: {results['stats_engine']['status']}")
    return all_ok


# =====================================================================
# TEST 4: Emergent LLM — Climate Analysis
# =====================================================================
async def test_llm(nasa_samples, om_samples):
    banner("TEST 4: Emergent LLM — Claude Climate Analysis")
    key = os.environ.get("EMERGENT_LLM_KEY")
    if not key:
        print("  ✗ EMERGENT_LLM_KEY missing")
        results["llm"] = {"status": FAIL, "error": "missing key"}
        return False

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except ImportError:
        print("  ! installing emergentintegrations …")
        os.system("pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/ -q")
        from emergentintegrations.llm.chat import LlmChat, UserMessage

    context = {
        "nasa_power_summary": nasa_samples,
        "open_meteo_current": {k: v for k, v in om_samples.items() if k != "era5_delhi_days"},
    }
    system_msg = (
        "You are the AI Climate Analyst for Bharat Digital Climate Twin. "
        "You analyze multi-source Indian climate observations (NASA POWER, Open-Meteo ERA5/forecast, IMD-style datasets). "
        "Respond ONLY with valid JSON matching the requested schema. No markdown fences."
    )
    user_text = (
        "Given the following observed climate state for 3 Indian metros over the past 30 days "
        f"(NASA POWER) and current conditions (Open-Meteo):\n\n{json.dumps(context, indent=2)}\n\n"
        "Return strictly valid JSON with this schema:\n"
        '{\n  "headline": "<2-line situational headline>",\n'
        '  "monsoon_state": "<onset|active|withdrawal|inactive|unknown>",\n'
        '  "key_drivers": ["<short driver 1>", "<short driver 2>", "<short driver 3>"],\n'
        '  "risks": [{"sector":"agriculture|water|urban|energy|health","level":"low|moderate|high","note":"<short>"}],\n'
        '  "confidence": 0.0,\n  "provenance": ["NASA POWER", "Open-Meteo"]\n}\n'
        "Be concise, India-context specific, no hallucinations beyond the data."
    )

    chat = LlmChat(api_key=key, session_id="poc-climate-test", system_message=system_msg).with_model(
        "anthropic", "claude-sonnet-4-6"
    )
    try:
        resp = await chat.send_message(UserMessage(text=user_text))
        # Try to parse JSON
        cleaned = resp.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("```")[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
        cleaned = cleaned.strip()
        parsed = json.loads(cleaned)
        required = {"headline", "monsoon_state", "key_drivers", "risks", "confidence", "provenance"}
        missing = required - set(parsed.keys())
        if missing:
            raise ValueError(f"Missing keys: {missing}")
        print(f"  ✓ LLM produced valid JSON")
        print(f"     headline      : {parsed['headline'][:120]}")
        print(f"     monsoon_state : {parsed['monsoon_state']}")
        print(f"     key_drivers   : {parsed['key_drivers']}")
        print(f"     risks_count   : {len(parsed['risks'])}")
        print(f"     confidence    : {parsed['confidence']}")
        results["llm"] = {"status": PASS, "sample": parsed}
        print(f"\nResult: {PASS}")
        return True
    except Exception as e:
        print(f"  ✗ LLM error: {e}")
        results["llm"] = {"status": FAIL, "error": str(e)}
        print(f"\nResult: {FAIL}")
        return False


# =====================================================================
# Driver
# =====================================================================
async def main():
    print("\n" + "█" * 70)
    print("  BHARAT CLIMATE TWIN — CORE POC VALIDATION")
    print("█" * 70)

    ok1, nasa_samples = await test_nasa_power()
    ok2, om_samples = await test_open_meteo()
    ok3 = test_statistical_engine(nasa_samples) if ok1 else False
    ok4 = await test_llm(nasa_samples, om_samples) if (ok1 and ok2) else False

    banner("FINAL SUMMARY")
    print(f"  NASA POWER          : {results.get('nasa_power', {}).get('status', FAIL)}")
    print(f"  Open-Meteo          : {results.get('open_meteo', {}).get('status', FAIL)}")
    print(f"  Statistical Engine  : {results.get('stats_engine', {}).get('status', FAIL)}")
    print(f"  LLM (Claude)        : {results.get('llm', {}).get('status', FAIL)}")
    all_ok = ok1 and ok2 and ok3 and ok4
    print("\n" + ("🟢 ALL CORE CHECKS PASSED — proceed to app build" if all_ok else "🔴 CORE FAILED — fix before app build"))

    # Save report
    out_dir = Path("/app/tmp")
    out_dir.mkdir(exist_ok=True)
    (out_dir / "poc_report.json").write_text(json.dumps(results, indent=2, default=str))

    sys.exit(0 if all_ok else 1)


if __name__ == "__main__":
    asyncio.run(main())
