# Design — NEO Watch

## Database schema

### `neo_objects` — one row per asteroid (identity table)
| column | type | notes |
|---|---|---|
| id | serial PK | |
| neo_reference_id | varchar, unique | NASA's own ID — enables upsert on re-sync instead of duplicating |
| name | varchar | e.g. "433 Eros" |
| absolute_magnitude_h | float | brightness; also a PHA-rule input |
| estimated_diameter_min_km | float | |
| estimated_diameter_max_km | float | |
| is_potentially_hazardous | boolean | ML label source |
| last_synced_at | timestamp | staleness tracking |

### `orbital_elements` — one row per object (kept separate from neo_objects to keep identity table lean)
| column | type | notes |
|---|---|---|
| id | serial PK | |
| neo_object_id | FK → neo_objects | |
| eccentricity | float | |
| inclination | float | |
| semi_major_axis | float | |
| orbital_period | float | |
| perihelion_distance | float | |

### `close_approach_events` — one-to-many; source of ML features and future visibility data
| column | type | notes |
|---|---|---|
| id | serial PK | |
| neo_object_id | FK → neo_objects | |
| approach_date | date | |
| relative_velocity_kmh | float | |
| miss_distance_km | float | |
| orbiting_body | varchar | usually "Earth"; NASA includes other bodies |

### Phase 2 tables (stub now to avoid painful migrations later, do not build logic for these in MVP)
- `users` — id, email, password_hash, created_at
- `watchlists` — id, user_id FK, neo_object_id FK, added_at
- `observations` — id, user_id FK, neo_object_id FK, observed_at, lat, long, notes

## Why this split
An object has one set of orbital elements but many close-approach events over time — that repetition is literally what makes something "near-Earth." The ML model trains on a join across all three tables, not on `neo_objects` alone.

## Note on service split
Schema and API (Node/Express) are separate from the ML microservice (FastAPI). Node owns all reads/writes to the tables below. FastAPI only receives feature values via an internal call and returns a prediction — it does not query Postgres at inference time, only during offline training. See architecture.md for the full service boundary.

## Database access pattern
Node/Express owns all DB access at request time, via the `pg` (node-postgres) library with parameterized SQL queries — no ORM. The offline Python training script (part of the FastAPI ML microservice folder) connects to Postgres separately and directly, only to build the training dataset; it has no role in live request handling.

## ML feature set (MVP)
Five features, joined across the schema above (query lives in the Node backend for live use; equivalent query in the Python training script for building the training set):
- `miss_distance_km` (from close_approach_events, closest approach only)
- `relative_velocity_kmh` (from close_approach_events, closest approach only)
- `absolute_magnitude_h` (from neo_objects)
- `estimated_diameter_min_km` / `estimated_diameter_max_km` (from neo_objects)
- `eccentricity` (from orbital_elements)

Label: `is_potentially_hazardous` (from neo_objects).

## Training data construction
- One row per asteroid, using its **closest** approach (minimum `miss_distance_km`) — not every event, and not a random or first approach.
- Reason: prevents data leakage (same object/label appearing disguised in both train and test splits) and matches the physically meaningful case — the closest pass is what actually matters for hazard assessment.
- Model type: start with Random Forest or XGBoost — explainable, every feature has physical meaning, no need for deep learning at this scale.
- Evaluation: report precision/recall/F1 on the hazardous (minority) class specifically. Do not report accuracy alone — class imbalance makes it misleading.

## UI / content hierarchy (newbie-first, detail on demand)
Frontend is React in plain JavaScript — no TypeScript, no `.tsx` files, no type-checking build step.

No separate "modes" for newbie vs enthusiast — single view, layered detail:
1. **Always visible, plain language:** object name, a one-line plain-language risk tier ("Low / Medium / High — tracked because it's [big/close] enough to watch"), and a short explanation of what that tier means.
2. **On expand/drill-down:** raw figures — magnitude, precise diameter range, eccentricity, orbital period, miss distance, velocity — for users who want the numbers.
3. Never hide the plain-language explanation behind the technical view or vice versa — both live on the same object detail view, just ordered by which appears first on the page.

## Copy / messaging guardrails (apply everywhere in the UI)
- Say: "classified using NASA's own hazard criteria," "translated for humans, not scientists"
- Never say: "predicts danger," "more accurate than NASA," "warns of impact risk"

## Fallback behavior (ML microservice unavailable)
The FastAPI ML microservice is optional at runtime — if it is down, slow, or unreachable, Node's `/api/risk-score/:id` must fall back to returning NASA's own `is_potentially_hazardous` flag directly from Postgres rather than failing. Response includes a `source` field (`ml_model` or `nasa_flag_fallback`) so the frontend can adjust its copy accordingly (see architecture.md, risk #6, for the full behavior spec). This must be reflected in the UI: when on fallback, say so plainly rather than presenting it as the full model output.
