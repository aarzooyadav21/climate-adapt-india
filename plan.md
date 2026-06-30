# plan.md (Updated)

## 1) Objectives
- Deliver an **AI-powered Climate Digital Twin for India** focused on adaptation, integrating:
  - **Real-time + historical observations** (NASA POWER, Open-Meteo, ERA5)
  - **Derived indicators** (anomalies, drought proxy, hazards heuristics)
  - **Grounded AI narratives** with strict “no invented numbers” behavior
- Provide an **ISRO Earth Observatory / Mission Control** UI with clear provenance for every metric.
- Provide **multi-role experiences** (Scientist / Policymaker / Farmer) with strict RBAC and role-appropriate navigation.
- Provide **continuous IDW heatmap** over India with hover inspection and **state/district resolution toggles**.
- Support **scenario running (Scientist Lab)**, saved scenarios, and CSV/JSON export.
- Integrate **JalVayu Drishti-inspired modules**:
  - Forest Fire / Hazards console
  - Cyclone Watch
  - Daily AI Climate Bulletin

**Current status:** Core application and JalVayu Drishti integration are implemented end-to-end (backend + frontend). Bulletin timeout issue mitigated via lighter context + TTL caching.

---

## 2) Implementation Steps (Phased)

### Phase 1 — Core POC (Isolation) *must pass before app work*
**User stories**
1. As a developer, I can fetch NASA POWER historical climate variables for Delhi/Mumbai/Chennai reliably.
2. As a developer, I can fetch Open-Meteo reanalysis + forecast for the same points with consistent units.
3. As a developer, I can compute anomalies/z-scores (and SPI-like drought proxy) from fetched series.
4. As a developer, I can call Emergent LLM (Claude/GPT) and get a structured, India-relevant analysis.
5. As a developer, I can run one script and see a clear PASS/FAIL report for every dependency.

**Steps**
- Create and iterate on `/app/test_core.py`:
  - Fetch NASA POWER daily data for 3 cities.
  - Fetch Open-Meteo forecast + ERA5 reanalysis for same cities.
  - Normalize outputs + store cache JSON in `/app/tmp/`.
  - Run anomaly detection on temperature and precipitation; compute SPI-proxy.
  - Call LLM with strict JSON schema + provenance fields.
  - Print PASS/FAIL; non-zero exit on failure.

**Exit criteria**
- Script completes with PASS for all 4 core checks on 3 cities, twice in a row.

**Status:** ✅ Completed earlier in project.

---

### Phase 2 — V1 App Development (No Auth Yet): Map + Snapshots + Core Dashboards
**User stories**
1. As a user, I can open the app and see an India mission-control home with live timestamp + data source status.
2. As a user, I can view an interactive India map and click a state/city to see a climate snapshot.
3. As a user, I can toggle layers and see legend update.
4. As a user, I can open Monsoon and Drought pages to see time-series + a state heatmap.
5. As a user, I can run a simple scenario and get charts + AI narrative.

**Backend (FastAPI)**
- Unified `ClimateService` returning normalized structures + provenance.
- Core endpoints for snapshot/historical/monsoon/drought/scenario.

**Frontend (React + shadcn/ui + Leaflet + Recharts)**
- ISRO mission-control dark theme.
- App shell with modules nav.
- India map and analytics pages.

**Testing**
- End-to-end UI test: map → snapshot → monsoon → drought → scenario.

**Exit criteria**
- V1 works without auth; no broken pages; provenance displayed.

**Status:** ✅ Completed earlier in project.

---

### Phase 3 — Add Features: Extremes Panel + Sector Dashboards + Advisor Chat
**User stories**
1. As a user, I can view an Extreme Weather page with risk cards.
2. As a user, I can see state-wise alert severity.
3. As a user, I can open Agriculture/Water/Urban/Energy dashboards.
4. As a user, I can chat with an AI Climate Advisor grounded in selected location data.
5. As a user, I can export chart datasets to CSV/JSON with provenance.

**Backend**
- Extremes alerts + narrative endpoints.
- Sector indices endpoints.
- Advisor chat endpoint with grounding + provenance.
- Export endpoints.

**Frontend**
- Extremes page.
- Sector pages.
- Advisor panel.

**Testing**
- End-to-end test across pages + export + advisor.

**Exit criteria**
- Advisor responds grounded; exports correct.

**Status:** ✅ Completed earlier in project.

---

### Phase 4 — Multi-Role Auth + Role Routing + Persistence
**User stories**
1. As a user, I can register/login and select a role (Policymaker/Scientist/Farmer).
2. As a user, I’m routed to a role-appropriate default dashboard.
3. As a farmer, I primarily see agriculture + advisory.
4. As a policymaker, I see executive risk + summaries.
5. As a scientist, I can access all datasets, exports, and configuration options.

**Backend**
- Mongo models: users, scenarios.
- JWT auth + role-based guards.
- Seed users for QA.

**Frontend**
- Login/register.
- Role-based navigation and route gating.

**Testing**
- End-to-end tests for each role.

**Exit criteria**
- Role gating correct; no unauthorized access.

**Status:** ✅ Completed earlier in project.

---

### Phase 5 — JalVayu Drishti Integration (Hazards + Cyclone Watch + Daily AI Bulletin)
**User stories**
1. As a policymaker/scientist, I can view **Forest Fire Risk** as a mission console (map + ranked states + AI narrative).
2. As a policymaker/scientist, I can view **Cyclone Watch** for coastal states with severity signals and basin grouping.
3. As any role (including farmer), I can generate a **Daily AI Climate Bulletin** tailored to my role and selected state.
4. As a user, I see provenance and the system avoids hallucinated numbers.

**Backend (FastAPI)**
- `GET /api/hazards/fire-risk` + `GET /api/hazards/fire-risk/narrative`
- `GET /api/hazards/cyclone-watch`
- `GET /api/bulletin?state_code=XX&role=YY` (auth required)
- **Performance/timeout mitigation (implemented):**
  - Bulletin now uses **lighter context** (snapshot + monsoon + drought + extremes)
  - Adds **in-memory TTL cache** for generated bulletins (30 minutes) to prevent repeated expensive runs and reduce latency.

**Frontend (React)**
- New pages:
  - `/app/hazards/fire` (FireRisk.jsx): choropleth map + hover card + ranked list + generate narrative
  - `/app/hazards/cyclone` (Cyclone.jsx): pulsing markers + basin tables + severity KPIs
  - `/app/bulletin` (Bulletin.jsx): state selector + role selector + generate/regenerate + provenance
- Navigation + RBAC wiring:
  - Farmer: Bulletin accessible; Fire/Cyclone hidden and direct URL access redirects.
  - Policymaker/Scientist: full access to Fire/Cyclone/Bulletin.

**Testing**
- Frontend testing agent: **24/24 tests passed** (UI rendering + role gating).
- Manual verification: bulletin renders; fresh generation ~50s, cached ~0.5s.

**Exit criteria**
- New modules available per role; UI consistent with ISRO theme; bulletin generation reliable under proxy limits.

**Status:** ✅ Completed.

---

### Phase 6 — Polish + Hardening + Comprehensive Testing
**User stories**
1. As a user, I always understand data provenance for any number shown.
2. As a user, I can trust error handling (graceful fallbacks if upstream APIs fail).
3. As a user, I experience fast loads due to caching and incremental rendering.
4. As a user, alerts are visually clear and consistent across pages.
5. As a user, the app feels like a cohesive ISRO mission-control console.

**Steps**
- Standardize provenance blocks + units across all modules.
- Add retries/timeouts/backoff where appropriate for Open-Meteo rate limiting.
- Performance:
  - Expand caching strategy for expensive fan-out endpoints (district grid, hazards) if needed.
  - Consider async job + polling pattern for long LLM generations (optional; cache already mitigates bulletin).
- Final full-suite testing pass; fix regressions.

**Status:** 🔜 Next.

---

## 3) Next Actions
1. **Run a full smoke pass** across roles (Scientist/Policymaker/Farmer) including the 3 new modules.
2. Monitor Open-Meteo rate limiting (429) for district grid and consider caching/persistence if it becomes frequent.
3. Optional hardening: add async bulletin job + polling if infrastructure timeouts recur in other deployments.
4. Prepare for deployment (when user says “deploy”).

---

## 4) Success Criteria
- Core POC: NASA POWER + Open-Meteo + LLM + anomaly detection succeed reliably.
- Mission Control: continuous IDW heatmap + hover inspector at state/district resolution.
- Multi-role: correct dashboards and strict RBAC.
- JalVayu Drishti modules: Fire Risk + Cyclone Watch + Daily AI Bulletin fully integrated with consistent theme and provenance.
- Stability: end-to-end tests pass; graceful handling of upstream failures; caching prevents proxy timeouts for expensive AI calls.
