# Phases — NEO Watch

Build strictly in order. Do not start a phase's frontend/backend work until its data dependencies from earlier phases exist. When prompting the AI coding agent, reference the current phase explicitly and do not let it build ahead into a later phase.

## Phase 0 — Setup
- Repo structure: `/frontend` (React, plain JavaScript), `/backend` (Node/Express), `/ml-service` (FastAPI)
- Postgres instance running locally
- NASA API key obtained
- Agent must create `.env.example` (committed, placeholders only) in BOTH `/backend` and `/ml-service`:
  - `/backend/.env.example`:
    ```
    DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/neo_watch
    NASA_API_KEY=YOUR_NASA_API_KEY
    ML_SERVICE_URL=http://localhost:8000
    ```
  - `/ml-service/.env.example`:
    ```
    DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/neo_watch
    ```
  Human copies each to `.env` in its own folder and fills in the real password/key — no other setup needed.
- Root-level script (e.g. via the `concurrently` npm package) to start all 3 services — frontend, backend, ml-service — with a single command, since local dev now needs 3 terminals.
- Confirm both `.env` files are in `.gitignore` before first commit.

## Phase 1 — Data ingestion (MVP)
- Implement schema from design.md: `neo_objects`, `orbital_elements`, `close_approach_events`
- Node script (in `/backend`) pulling from NASA NeoWs API (~50–100 objects to start), using `pg` for inserts
- Upsert logic keyed on `neo_reference_id` so re-runs don't duplicate
- Set `last_synced_at` on each sync

## Phase 2 — ML microservice (MVP)
- In `/ml-service`: offline Python training script — connects directly to Postgres, builds one-row-per-asteroid dataset (closest approach only) per design.md
- Train Random Forest or XGBoost classifier on the 5-feature set
- Evaluate with precision/recall/F1 on hazardous class — record and keep these numbers, they'll be needed for the README/pitch
- Save trained model artifact (pickle/joblib)
- Build the FastAPI app itself: single `POST /predict` endpoint, stateless, loads the saved artifact at startup, receives the 5 features in the request body, returns `{ tier, confidence }`. No DB access at request time, no other endpoints.

## Phase 3 — Backend API (Node/Express) (MVP)
- Endpoints: `GET /api/neos` (list/filter), `GET /api/neos/:id` (detail, joins all 3 tables), `GET /api/risk-score/:id`
- DB access via `pg`, parameterized queries, no ORM
- `/api/risk-score/:id` must implement the graceful-degradation fallback: call FastAPI `/predict` with a short timeout; on any failure, return NASA's raw `is_potentially_hazardous` flag from Postgres instead, tagged `"source": "nasa_flag_fallback"` (vs `"source": "ml_model"` on success). See architecture.md risk #6 and design.md "Fallback behavior" for full spec.
- No auth needed yet (phase 7 concern)

## Phase 4 — Frontend (MVP)
- React, plain JavaScript (no TypeScript)
- Searchable/filterable table of NEOs
- Object detail view following the newbie-first / detail-on-demand layout from design.md
- Must handle both `risk-score` response sources distinctly: show the model's tier + explanation on `ml_model`, and a plain "showing NASA's own flag — detailed model temporarily unavailable" message on `nasa_flag_fallback` — never treat them as identical in the UI
- Calls Node/Express endpoints only — never calls FastAPI or NASA directly

**End of MVP.** At this point: can I ingest real data, train a defensible model, serve it through a real service boundary, and present it usefully — even when that service boundary fails? If yes, MVP goal met — proceed to full version phases below as separate, later efforts.

---

## Phase 5 — Visibility predictor
- Given lat/long + date, compute visibility window (altitude, moon phase interference) — orbital mechanics/astronomy math, lives in Node/Express, not the ML microservice
- New backend endpoint, new frontend view

## Phase 6 — Sky map visualization
- Interactive sky map component, "objects visible tonight from your location"

## Phase 7 — Accounts and watchlists
- Implement `users`, `watchlists` tables (already stubbed in schema)
- Auth (JWT), single user role, lives in Node/Express — see security.md before starting this phase

## Phase 8 — Citizen science observation logging
- Implement `observations` table
- User-submitted sighting logs tied to their account

## Phase 9 — Notifications
- Alerting on refinement/recall-style updates to tracked objects

## Phase 10 — Deployment
- Frontend → Vercel
- Node/Express backend + Postgres → Railway or Render
- FastAPI ML microservice → its own Railway/Render service (3 deployments total, not 2)
- Re-check security.md before going live (this phase changes the threat model significantly — public internet, real user data, and a service-to-service call between Node and FastAPI that must not be publicly exposed)
