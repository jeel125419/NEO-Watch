# PRD — NEO Watch

## One-liner
Asteroid risk data, translated for humans — not scientists.

## Problem
NASA/JPL publish extensive near-Earth object (NEO) data (NeoWs API, CNEOS Sentry, JPL Small-Body DB), but it's built for scientists — raw orbital elements, MOID values, absolute magnitude. A student, hobbyist, or curious person has no easy way to understand "should I care about this asteroid" without decoding scientific notation and orbital mechanics jargon.

## Honest positioning (read this before writing any marketing copy)
This project does **not** out-predict or out-accuracy NASA's own systems (CNEOS Sentry, Torino/Palermo scales). It is not a novel scientific tool. Its real value is:
1. **Accessibility** — translating NASA's public data into plain language for non-experts.
2. **Education/engagement** — a friendlier entry point than raw JPL tables for students, enthusiasts, science communicators.
3. **Technical demonstration** — full-stack + ML + real external API integration + relational schema design, built end-to-end.

**Never claim:** "predicts dangerous asteroids," "more accurate than NASA," "fills a gap in asteroid tracking."
**Always claim:** "makes public NEO data understandable," "classifies hazard tier using a model trained on NASA's own criteria," "translated for humans, not scientists."

## Target users
Both are in scope, no hard priority — but layout is newbie-first:
- **Newbie / student / curious public** — needs plain-language explanations up front.
- **Hobbyist astronomer** — wants more technical detail (orbital elements, precise figures), available but not front-loaded.

UI principle: basic/plain-language info always visible first; technical detail available on expand/drill-down, not hidden behind separate modes.

## What the "hazardous" label actually means
NASA's `is_potentially_hazardous_asteroid` flag is a **fixed eligibility rule**, not a prediction:
1. Minimum Orbit Intersection Distance (MOID) < 0.05 AU, **and**
2. Absolute magnitude H ≤ 22.0 (roughly, diameter > ~140m)

Both conditions must hold. It does not mean an impact is predicted — it means the object is close and large enough to warrant continued tracking. The app's ML model is trained to **reconstruct this classification from orbital features**, not to invent a new risk assessment. State this accurately in any UI copy, README, or pitch.

## Core value delivered (MVP)
- Ingest real NEO data from NASA's NeoWs API into own database (not live-called per request)
- ML model classifies hazard tier from orbital/physical features, trained against NASA's own PHA flag
- Plain-language explanation of what the classification means, alongside raw figures for enthusiasts
- Searchable/filterable list of NEOs

## Full version scope (post-MVP, phased — see phases.md)
- Visibility predictor (can I see this from my location tonight)
- Sky map visualization
- User accounts, watchlists
- Citizen science observation logging
- Notifications / recall or refinement alerts

## Success criteria for MVP
- Data ingestion pipeline runs and populates DB without manual intervention
- Model has defensible metrics (precision/recall on minority "hazardous" class, not just accuracy — class imbalance is expected)
- A non-technical person can look at the UI and understand what they're seeing without external explanation
- Feature list and explanation copy match what's actually true about the PHA flag (no overclaiming)
