# plan.md

## 1) Objectives
- Prove the **core climate-twin data + AI pipeline** works end-to-end in isolation: NASA POWER + Open‑Meteo + LLM + anomaly detection.
- Ship an MVP web app (FastAPI + React) that surfaces **India map + climate panels + monsoon/extremes/drought + scenarios + sector views + advisor chat**.
- Add **multi-role auth** (Policymaker/Scientist/Farmer) only after core + v1 UX are stable.
- Maintain ISRO Earth Observatory mission-control UI with clear provenance for every metric.

## 2) Implementation Steps (Phased)

### Phase 1 — Core POC (Isolation) *must pass before app work*
**User stories**
1. As a developer, I can fetch NASA POWER historical climate variables for Delhi/Mumbai/Chennai reliably.
2. As a developer, I can fetch Open‑Meteo reanalysis + forecast for the same points with consistent units.
3. As a developer, I can compute anomalies/z-scores (and SPI-like drought proxy) from fetched series.
4. As a developer, I can call Emergent LLM (Claude/GPT) and get a structured, India-relevant analysis.
5. As a developer, I can run one script and see a clear PASS/FAIL report for every dependency.

**Steps**
- Websearch quick refs: NASA POWER parameters/temporal endpoints; Open‑Meteo climate/reanalysis query patterns; SPI calculation basics.
- Create `/app/test_core.py`:
  - Fetch NASA POWER daily data (temp/precip/humidity/wind/solar) for 3 cities (lat/lon constants).
  - Fetch Open‑Meteo forecast + ERA5 reanalysis for same cities.
  - Normalize outputs (units, time axis) and store small cache JSON in `/app/tmp/`.
  - Run anomaly detection on temperature and precipitation (z-score + rolling baseline); compute SPI-proxy from precip.
  - Call LLM once with a strict JSON schema response (summary, drivers, risks, confidence, citations/provenance fields).
  - Print PASS/FAIL with reasons; non-zero exit on failure.
- Iterate until: APIs stable, parsing robust, LLM returns valid JSON, anomalies computed.

**Exit criteria**
- Script completes with PASS for all 4 core checks on 3 cities, twice in a row.

---

### Phase 2 — V1 App Development (No Auth Yet): Map + Snapshots + Core Dashboards
**User stories**
1. As a user, I can open the app and see an India mission-control home with live timestamp + data source status.
2. As a user, I can view an interactive India map and click a state/city to see a climate snapshot.
3. As a user, I can toggle layers (temp/rain/anomaly) and immediately see the legend update.
4. As a user, I can open Monsoon and Drought pages to see time-series + a state heatmap.
5. As a user, I can run a simple scenario (+2°C, horizon 20y) and get charts + AI narrative.

**Backend (FastAPI)**
- Project skeleton + config (`.env`, settings, logging).
- Data services:
  - NASA POWER client, Open‑Meteo client, IMD-style mock provider (static JSON + generator for gaps).
  - Unified `ClimateService` returning normalized structures + provenance.
  - Caching (in-memory + MongoDB cache collection with TTL).
- Endpoints (unauthenticated v1):
  - `GET /api/health` (includes upstream status)
  - `GET /api/climate/snapshot?lat&lon`
  - `GET /api/climate/historical?lat&lon&start&end`
  - `GET /api/india/states` (GeoJSON metadata + summary placeholders)
  - `GET /api/monsoon/status` + `GET /api/monsoon/timeseries`
  - `GET /api/drought/index` (SPI-proxy per state)
  - `POST /api/scenario/run` (simple delta method + narrative stub)

**Frontend (React + shadcn/ui + Leaflet + Recharts)**
- ISRO Earth Observatory dark theme (HUD panels, cyan/teal accents, alert colors).
- App shell: header (timestamp, source lights), left nav (Map/Monsoon/Extremes/Drought/Scenarios/Sectors/Advisor).
- India map (Leaflet + states GeoJSON): hover tooltips, click opens right-side panel.
- Charts: snapshot cards + historical time-series; drought heatmap; monsoon chart.
- Scenario page: form (region, warming, horizon) + results + narrative.

**Testing**
- 1 round end-to-end UI test: map click → snapshot → historical → monsoon → drought → scenario.
- Fix parsing/caching/UI loading/error states.

**Exit criteria**
- V1 works without auth, no broken pages, all panels show real data where available + provenance.

---

### Phase 3 — Add Features: Extremes Panel + Sector Dashboards + Advisor Chat (Still No Auth)
**User stories**
1. As a user, I can view an Extreme Weather page with heatwave/flood/cyclone/drought risk cards.
2. As a user, I can see state-wise alert severity and a timeline of recent anomalies.
3. As a user, I can open Agriculture/Water/Urban/Energy dashboards and see computed indices.
4. As a user, I can chat with an AI Climate Advisor grounded in the current selected location data.
5. As a user, I can export any chart dataset to CSV/JSON with provenance.

**Backend**
- `GET /api/extremes/alerts` (rule-based from thresholds + anomaly scores).
- `GET /api/sectors/agriculture|water|urban|energy` (indices computed from temp/rain/wind/solar proxies).
- `POST /api/advisor/chat` (LLM + retrieval of current context: location, time window, anomalies; enforce JSON tool output).
- `GET /api/data/export?dataset&format`.

**Frontend**
- Extremes page (alert cards, severity bands).
- Sector pages with role-agnostic views (later gated).
- Advisor panel (dock/floating) with citations to underlying API outputs.

**Testing**
- 1 round end-to-end test across all pages + export + chat.

**Exit criteria**
- Advisor responds with grounded, structured answers; exports download correctly.

---

### Phase 4 — Multi-Role Auth + Role Routing + Persistence
**User stories**
1. As a user, I can register/login and select a role (Policymaker/Scientist/Farmer).
2. As a user, I’m routed to a role-appropriate default dashboard.
3. As a farmer, I primarily see Agriculture + local forecast/advisory panels.
4. As a policymaker, I primarily see Water/Urban risk + scenario summaries.
5. As a scientist, I can access all datasets, exports, and configuration options.

**Backend**
- Mongo models: users, sessions/chats, saved scenarios.
- Auth endpoints: `POST /api/auth/register`, `/api/auth/login`, `GET /api/auth/me`.
- JWT middleware + role-based guards.
- Persist chat sessions + saved scenarios per user.

**Frontend**
- Login/register pages; role badges.
- Role-based navigation + default routes.
- Seed test users for QA.

**Testing**
- 1 round end-to-end test for all roles + permissions.

**Exit criteria**
- Role gating correct; no unauthorized access; sessions stable.

---

### Phase 5 — Polish + Hardening + Comprehensive Testing
**User stories**
1. As a user, I always understand data provenance for any number shown.
2. As a user, I can trust error handling (graceful fallbacks if upstream APIs fail).
3. As a user, I experience fast loads due to caching and incremental rendering.
4. As a user, alerts are visually clear and consistent across pages.
5. As a user, the app feels like a cohesive ISRO mission-control console.

**Steps**
- Standardize provenance blocks + units.
- Add retries/timeouts/circuit-breaker-ish handling for upstream calls.
- Performance: cache tuning, pagination, request de-dupe.
- Final full-suite testing pass; fix regressions.

---

## 3) Next Actions
1. Implement `/app/test_core.py` and run until all PASS.
2. Lock normalized data schemas (snapshot, historical series, provenance) based on POC outputs.
3. Build Phase 2 v1 app (map + core dashboards) without auth; run e2e test.
4. Add Phase 3 (extremes + sectors + advisor + export); run e2e test.
5. Add Phase 4 auth + role routing; run e2e test.

## 4) Success Criteria
- Core POC: NASA POWER + Open‑Meteo + LLM + anomaly detection succeed reliably for 3 Indian cities.
- V1 App: interactive India map + snapshot + historical charts + monsoon/drought + scenario all functional.
- Advisor: produces structured, grounded responses with provenance and handles missing data gracefully.
- Multi-role: correct dashboards/permissions for Policymaker/Scientist/Farmer; scenarios + chats persist.
- Stability: end-to-end tests pass after each phase; no critical broken flows.