# Bharat Climate Twin — PRD

## Vision
A high-fidelity AI-powered virtual replica of India's climate system, fusing multi-source national & global datasets with LLM-grounded intelligence to support adaptation, policy, science and farming.

## Core Functionality (Delivered)
- **Live India climate map** (Leaflet, CartoDB Dark Matter) with state-level markers and 3 toggleable layers (temperature, rainfall departure, drought SPI).
- **Mission Control dashboard** with KPI strip + clickable state inspection + provenance on every metric.
- **Monsoon Tracker** — phase, national & state departure, time-series with climatology proxy, AI narrative.
- **Extreme Weather Console** — heatwave/coldwave/flood/dry-spell detection per state with severity.
- **Drought Monitor** — SPI-style index across all 36 states/UTs with heatmap + AI briefing.
- **Scenario Simulator** — delta-method warming projections (+1.5/+2/+2.5/+3°C, 5–80y), AI sector-impact narrative.
- **Sector Dashboards** — Agriculture, Water Resources, Urban Heat, Energy with 5 indicators each + AI advisory.
- **AI Climate Advisor** — Claude Sonnet 4.6, grounded on real fetched observations, with citation badges.
- **Multi-role auth** — Policymaker / Scientist / Farmer (JWT, bcrypt, seeded demo accounts).

## Data Sources
- NASA POWER (MERRA-2): T2M, precipitation, humidity, wind, solar.
- Open-Meteo: ECMWF/IFS current + 10-day forecast.
- Open-Meteo ERA5 archive: 90–365 days reanalysis.
- IMD-style state LPA climatology (36 states/UTs).

## Architecture
- **Backend**: FastAPI + Motor (MongoDB), httpx async, aiocache (15-60min TTL).
- **AI**: Emergent Universal LLM key via `emergentintegrations` → Claude Sonnet 4.6.
- **Frontend**: React 19 + shadcn/ui + Leaflet + Recharts + framer-motion; dark ISRO mission-control theme.

## Testing
- POC test_core.py: 4/4 PASS (NASA POWER, Open-Meteo, statistical engine, LLM).
- Backend testing_agent_v3: **21/21 endpoints PASS (100%)**.
- Frontend testing_agent_v3: **18/18 user stories PASS (100%)**.

## Demo Credentials
- policymaker@test.in / Climate@2025
- scientist@test.in / Climate@2025
- farmer@test.in / Climate@2025

## Files
- Backend: `/app/backend/server.py`, `/app/backend/services/*`, `/app/backend/routes/*`, `/app/backend/data/india_states.py`
- Frontend: `/app/frontend/src/App.js`, `/app/frontend/src/pages/*`, `/app/frontend/src/components/*`
- POC: `/app/test_core.py`
- Design: `/app/design_guidelines.md`
