# Security — NEO Watch

## MVP (phases 1–4, localhost only)
- **NASA API key:** lives in `/backend/.env` (Node owns ingestion), never committed, never hardcoded.
- **Database credentials:** `/backend/.env` (Node, live reads/writes) AND `/ml-service/.env` (FastAPI's offline training script only — it needs its own DB connection to build the training set, but never at request time). Both files gitignored.
- **`.env.example` files:** agent must generate one in each of `/backend` and `/ml-service`, placeholders only (`YOUR_PASSWORD`, `YOUR_NASA_API_KEY`) — never a real key/password in any committed file.
- **Service-to-service call (Node → FastAPI):** `ML_SERVICE_URL` in `/backend/.env` points to the local FastAPI instance. In local dev this is just `http://localhost:8000` — no auth needed between them yet, but don't expose FastAPI's port publicly even locally beyond what's needed (bind to localhost, not 0.0.0.0, during development).
- **CORS:** restrict to the localhost frontend origin on the Node backend; FastAPI doesn't need CORS configured for browsers at all, since only Node calls it, never the frontend directly.
- **Input validation:** Node/Express routes should validate all incoming request params (object IDs, filter/query params) before using them in SQL — use `pg`'s parameterized queries, never string-concatenate SQL. FastAPI's `/predict` should validate the shape of incoming feature payloads (e.g. via Pydantic models) before running inference.
- **No auth needed yet** — no user accounts exist until phase 7, so no auth surface to secure yet. Don't build auth prematurely.
- **Fallback error handling:** when the FastAPI call in `/api/risk-score/:id` fails, Node must log the real error server-side but never forward raw internal error details (stack traces, connection strings, internal hostnames) to the frontend response — only the clean `nasa_flag_fallback` payload.

## Before phase 7 (accounts/watchlists) — revisit before starting this phase
- Passwords: hash with bcrypt/argon2 via a library — never store plaintext, never roll your own hashing
- JWT: short-lived access tokens, secret key from env var, not hardcoded
- Rate limiting on auth endpoints (login/signup) to reduce brute-force risk

## Before phase 8 (observation logging) — revisit before starting this phase
- User-submitted `lat`/`long` and `notes` fields: sanitize/validate input, parameterized queries only
- Consider whether precise lat/long from users needs any privacy handling before display to other users (if observations become visible to others in a later iteration)

## Before phase 10 (deployment) — revisit before starting this phase
- Move all secrets (NASA API key, DB credentials, JWT secret) to the hosting platform's secret/env management (Vercel/Railway env vars) — never in the repo
- Reconfigure CORS on the Node backend to the actual deployed frontend origin, remove localhost wildcard
- **FastAPI ML microservice must not be publicly reachable on its own** once deployed — it should only accept requests from the Node backend (internal network / private service binding on the hosting platform, or at minimum a shared-secret header Node sends that FastAPI validates). Exposing `/predict` publicly lets anyone hit your model directly, bypassing Node entirely.
- Enable HTTPS (typically automatic on Vercel/Railway, but verify)
- Add basic rate limiting on public Node API endpoints
- Review Postgres access — ensure DB is not publicly exposed beyond what Node (and, for training runs, the ML microservice) needs
- Review and re-check this whole file — deployment changes the threat model from "solo local project" to "public internet service with a live service-to-service call," and prior phases were built without that model in mind

## General principle throughout
Security work scales with what the app actually does. Don't front-load phase 7/8/10 concerns into the MVP — but don't skip revisiting this file when those phases start, either.
