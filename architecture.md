# Architecture — NEO Watch

## Tech stack (locked — do not substitute without explicit reason)
- **Frontend:** React, plain JavaScript (`.js`/`.jsx`) — no TypeScript
- **Main backend:** Node.js + Express — owns the REST API, database access, and data ingestion
- **ML microservice:** FastAPI (Python) — small, stateless, scoped ONLY to serving predictions from a trained model. Not a general-purpose backend.
- **Database:** PostgreSQL — accessed directly from Node via the `pg` (node-postgres) library with parameterized SQL queries. No heavy ORM — matches existing SQL comfort and avoids an extra abstraction layer split across two languages.
- **ML training:** offline Python script, separate from the live FastAPI service — connects to Postgres directly to build the training dataset, trains the model, saves an artifact that the FastAPI microservice loads at startup.

Rationale: this matches the original MERN framing — Node/Express does everything a normal backend does (API, DB, business logic, ingestion), and FastAPI is deliberately kept small: one job, serving model predictions. Because it's narrow and stateless, it can be down without breaking the rest of the app (see fallback behavior below) and can be swapped out later without touching the main backend.

## High-level data flow

```
NASA NeoWs API
     |
     | scheduled ingestion job (Node script)
     v
PostgreSQL
  - neo_objects
  - orbital_elements
  - close_approach_events
     |
     v
Node/Express backend  (owns DB access via `pg`, all business logic)
  ├── GET /api/neos            — list/filter/search
  ├── GET /api/neos/:id        — detail, joins all 3 tables
  ├── GET /api/risk-score/:id  — tries FastAPI ML microservice first,
  |                               falls back to NASA's raw flag if unavailable
     |
     | HTTP call, only for /risk-score, short timeout (2-3s)
     v
FastAPI ML microservice (Python, stateless)
  └── POST /predict — receives the 5 features, returns { tier, confidence }
      (loads trained model artifact at startup; no DB access at request time)

Offline, NOT part of the live request path:
  Python training script — connects directly to Postgres, builds a
  one-row-per-asteroid dataset (closest approach only), trains the
  model, saves the artifact used by FastAPI's /predict endpoint

     v
React frontend (JavaScript) — calls Node/Express endpoints only,
never calls FastAPI or the NASA API directly
```

## Integration points and known risks

**1. NASA API rate limits**
Free API key: 1000 requests/hour, awkward pagination on large result sets. Do not call NASA's API live on user requests. The Node ingestion script pulls into Postgres on a schedule (cron or manual trigger for MVP); all reads are served from the local DB.

**2. Label construction / data leakage**
NASA's `is_potentially_hazardous_asteroid` flag belongs to the **object**, not to an individual close-approach event. Using every close-approach row as a separate training example lets the same asteroid appear (in disguised form) in both train and test splits, inflating apparent accuracy. **Decision: one row per asteroid, using its closest (minimum `miss_distance_km`) approach**, built by the offline training script. `close_approach_events` still stores every event for display purposes.

**3. Data staleness**
Orbital data gets refined over time. Without a re-sync job, stored classifications go stale silently. MVP: manual/cron re-sync via the Node ingestion script, tracked via `last_synced_at` on `neo_objects`.

**4. Class imbalance**
Most NEOs are not flagged hazardous. A naive classifier can get high accuracy by always predicting "not hazardous." Report precision/recall/F1 on the hazardous class specifically, not raw accuracy.

**5. Scope creep via AI agent**
Coding agents tend to over-build. Each prompt should reference the current phase in phases.md and avoid open-ended requests.

**6. ML microservice availability — graceful degradation (required, not optional)**
The FastAPI ML microservice is a separate process from Node and can be down, slow, or simply not started yet (easy to forget one of 3 local terminals). `GET /api/risk-score/:id` in Node must:
- Call FastAPI's `/predict` with a short timeout (2-3s)
- On failure (timeout, connection refused, non-200): never return a hard error to the frontend. Instead, fall back to returning NASA's own `is_potentially_hazardous` boolean straight from Postgres, tagging the response `"source": "nasa_flag_fallback"` (vs `"source": "ml_model"` on success)
- Frontend must handle both cases distinctly: on `ml_model`, show the classifier's tier + explanation; on `nasa_flag_fallback`, show something like "Showing NASA's own hazard flag — the detailed risk model is temporarily unavailable," never silently pretend they're the same thing
- The app must stay useful with degraded (but still real) information — never a broken page just because the ML microservice is down

Local dev now genuinely needs 3 terminals (React, Node, FastAPI). Use a root-level script (e.g. the `concurrently` npm package) to start all three with one command.

## Deployment
- **MVP:** localhost only, all 3 services
- **Later:** React → Vercel; Node/Express + Postgres → Railway or Render; FastAPI ML microservice → its own Railway/Render service (3 deployments, not 2) — decide specifics at that phase
