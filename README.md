# ☄️ NEO Watch
> **Near-Earth Object risk and orbital telemetry translated for humans, not scientists.**

[![React](https://img.shields.io/badge/Frontend-React_18_+_Vite-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js_+_Express-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL_18-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![FastAPI](https://img.shields.io/badge/ML_Service-FastAPI_+_Scikit--Learn-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 📖 Overview

Headlines about "hazardous asteroids skimming past Earth" routinely spark unnecessary panic. NASA designates an asteroid as **Potentially Hazardous (PHA)** purely as an administrative tracking flag if it passes within **0.05 AU** (~19.5 lunar distances) and exceeds **140 meters** in size—it is **not** an announcement of an imminent collision.

**NEO Watch** translates NASA's JPL NeoWs and orbital data into clear, layered language for both curious beginners and amateur stargazers:
- **Beginner First**: Plain-language risk ratings without confusing scientific jargon.
- **Detail on Demand**: Real orbital mechanics, close encounter chronologies, and astronomical ephemerides when you want them.
- **Observation Planning**: Real-time celestial planisphere maps, topocentric horizon projections, and telescope GoTo coordinates.

---

## 🏛️ System Architecture

NEO Watch is engineered with a decoupled, resilient multi-service architecture:

```mermaid
flowchart TD
    subgraph Client ["Client Tier (Browser)"]
        UI["React 18 + Vite (SPA)\n• Asteroid Catalog & Search\n• Visibility Predictor (24h Curve)\n• Celestial Sky Map (Canvas Dome)\n• Watchlists & Observation Log"]
    end

    subgraph Backend ["Backend API Tier (Port 5000)"]
        EXPRESS["Node.js + Express (ES Modules)\n• REST API (/api/neos, /api/visibility, /api/auth, /api/watchlist, /api/observations)\n• Direct pg Connection Pool (No ORMs)\n• Astronomical Coordinate Math (RA/Dec, Alt/Az, Moon Illumination)\n• JWT Authentication & Password Hashing (bcryptjs)"]
    end

    subgraph ML ["Machine Learning Tier (Port 8000)"]
        FASTAPI["FastAPI Microservice (Python 3.11)\n• Random Forest Binary Classifier (Scikit-Learn)\n• Trained on NASA Physical & Orbital Features\n• Stateless /predict Endpoint"]
    end

    subgraph Data ["Database Tier (Port 5432)"]
        PG[("PostgreSQL 18 (neo_watch)\n• neo_objects\n• close_approach_events\n• orbital_elements\n• users\n• watchlists\n• observations")]
    end

    subgraph External ["External Astronomy Platforms"]
        EXT1["🛰️ NASA JPL 3D Orbit Viewer"]
        EXT2["🗺️ Aladin Lite (ESA/CDS Sky Survey)"]
        EXT3["🪐 IAU Minor Planet Center"]
        EXT4["🔭 Computerized GoTo Telescopes (ASCOM / SkySafari)"]
    end

    UI <-->|HTTP / REST JSON| EXPRESS
    EXPRESS <-->|Parameterized SQL| PG
    EXPRESS -->|HTTP POST /predict| FASTAPI
    EXPRESS -.->|Graceful Fallback if ML Offline| EXPRESS
    UI -->|Dynamic Deep Links & Ephemeris| External
```

### Architectural Principles
1. **Separation of Concerns**: The ML service is strictly an inference microservice—it has zero access to the database and no authentication logic.
2. **Defensive Fallback**: If the ML service is down or unreachable, the Express backend automatically falls back to NASA's official hazard classification flag (`nasa_flag_fallback`) with visual notice in the UI.
3. **Pure Parameterized SQL**: Zero ORMs. All PostgreSQL queries use parameterized syntax (`$1`, `$2`) to eliminate SQL injection risks.
4. **JWT Security**: User authentication uses HTTP Bearer tokens with 7-day expiration and password salt hashing via `bcryptjs`.

---

## 🔬 Scientific Calculations vs. The Experimental ML Model

A core principle of NEO Watch is **scientific clarity and intellectual honesty**. It is crucial to understand what is deterministic astronomy physics versus what is experimental machine learning:

### 1. The Scientific Calculations (The Ground Truth)
All orbital paths, close-approach dates, miss distances, and horizon positions are **pure physics and astronomical mechanics**, not AI predictions:
- **NASA JPL / CNEOS Ephemerides**: Encounter dates, relative velocities, and minimum orbit intersection distances (MOID) come directly from NASA Jet Propulsion Laboratory’s radar and optical astrometry.
- **Topocentric Horizon Calculations**: The altitude, compass azimuth, and observing windows in the *Visibility Predictor* and *Interactive Sky Map* are calculated deterministically in Node.js using Local Sidereal Time (LST), Greenwich Mean Sidereal Time (GMST), Keplerian orbital elements, observer geographic coordinates, and spherical trigonometry.
- **Lunar Interference**: Real-time lunar phase, illumination percentage, and angular separation are calculated mathematically to estimate sky brightness and visual contrast.

> **An AI does not invent or simulate orbital trajectories. Planetary orbits are governed by celestial mechanics.**

### 2. Why We Implemented the Machine Learning Model
The ML microservice (Python + FastAPI + Scikit-Learn) was developed as an **experimental educational model**:
- **Objective**: To explore whether a lightweight statistical classifier (Random Forest) can reconstruct NASA's administrative **Potentially Hazardous Asteroid (PHA)** threshold criteria purely from numerical physical features (absolute magnitude $H$, minimum/maximum estimated diameter, close-approach velocity, miss distance).
- **Benchmarking**: It demonstrates how machine learning decision trees evaluate feature importance when assessing small-body hazard flags.

### 3. Scientific Limitations & Strict Provenance
- **Not an Impact Predictor**: The model **does not** predict impact probability, atmospheric detonation, or kinetic deflection.
- **Administrative Eligibility**: A "Hazardous" designation simply means the asteroid's orbit brings it within 0.05 AU of Earth and its size exceeds ~140 meters, qualifying it for continued radar tracking.
- **Provenance Transparency**: Every single asteroid risk card in the application displays its exact provenance (`source: 'ml_model'` with confidence score vs. `source: 'nasa_flag_fallback'`).
- **Resilient Fallback**: If the ML service is offline or unreachable, the system automatically falls back to NASA's official baseline flag without breaking user experience.

---

## 🚀 Key Features

### 1. ☄️ Asteroid Catalog & Layered Risk Dossier
- Real-time catalog search with **350ms input debouncing** to minimize API calls.
- Filter by hazard status and sort by diameter, miss distance, approach date, or name.
- **3-Layer Detail Modal**:
  - **Layer 1 (Human Translation)**: High / Medium / Low hazard badges with conversational explanations.
  - **Layer 2 (Scientific Details)**: Expandable astronomical properties, orbital elements ($e$, $i$, $a$, orbital period), and external planetarium visualizers.
  - **Layer 3 (Raw Telemetry)**: Unfiltered NASA NeoWs API payload for researchers and students.

### 2. 🚀 Upcoming vs. Past Encounter Separation
- Close approach events are cleanly partitioned into:
  - **Upcoming Passes**: Encounters occurring in the future, sorted by nearest date with relative time tags (e.g., *"in 8 months"*).
  - **Past Encounters**: Historical passes since the 1900s, sorted from most recent backwards.

### 3. 🔭 Tonight’s Astronomical Visibility Predictor
- Calculates whether an asteroid is observable from your exact geographic coordinates tonight.
- **Topocentric Altitude & Compass Azimuth** calculation taking observer latitude, longitude, and local sidereal time into account.
- **Lunar Interference Engine**: Moon phase illumination percentage and angular lunar distance penalty.
- **24-Hour Night Altitude Curve**: Visual histogram distinguishing dark-sky observable hours ($\ge 15^\circ$ elevation during astronomical twilight) from twilight and below-horizon hours.
- **One-click Geolocation**: Auto-detects GPS coordinates or selects from global presets (New Delhi, New York, London, Tokyo, Mauna Kea, Atacama Desert).

### 4. 🌌 Interactive Celestial Sky Map
- Real-time **Planisphere Polar Dome Canvas Projection** showing the night sky dome:
  - Zenith ($90^\circ$) at the center, local horizon ($0^\circ$) at the outer perimeter.
  - Cardinal directions (North, East, South, West) and concentric altitude reference rings ($30^\circ$, $60^\circ$).
  - Minimum unobstructed observation ring ($15^\circ$).
- **Time Scrubber**: Slide from $-12\text{ hours}$ to $+12\text{ hours}$ to preview asteroid positions across the entire night.
- **Trajectory Arcs**: Renders multi-hour curved orbital motion paths across the starfield.
- **Astronomical Red Night Vision Mode**: High-contrast, monochromatic dark-red theme preserves human dark adaptation during outdoor telescope sessions.

### 5. ⭐ User Accounts & Asteroid Watchlists
- Register and log in securely with JWT token persistence.
- One-click **Star Bookmark (★)** on cards, modals, and sky map targets.
- **Dedicated Watchlist View**: Filter tracked asteroids by hazard, review closest miss distances, and directly launch visibility predictions.

### 6. 📓 Citizen Science Observation Logging
- Registered amateur astronomers can record telescopic and binocular sightings.
- **Slide-in Observation Drawer**:
  - **"My Sightings"**: Chronological log of past observations, with inline note editing and record deletion.
  - **"Log New Sighting"**: Asteroid dropdown (auto-selected from context), timestamp picker, and auto-geolocation GPS lock.
  - Equipment & sky notes: Optical aperture, eyepiece/camera, sky transparency, and estimated visual magnitude.
- Observation badges displayed on the header profile, watchlist cards, and asteroid modal.

### 7. 🛰️ External Astronomy Deep-Linking & Telescope GoTo Mounts
Instead of locking users into a closed ecosystem, NEO Watch directly bridges users to professional, world-class astronomical tools:

1. **🛰️ NASA JPL Small-Body Database (SBDB) 3D Orbit Viewer** (`https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html`):
   - Opens the official NASA JPL interactive 3D solar system simulator via the asteroid's unique NASA SPK-ID (`sstr={id}&view=VOP`).
   - Renders the exact 3D Keplerian orbital ellipse around the Sun, orbital inclination relative to Earth's ecliptic plane, real-time Earth-asteroid distance, and full 3D camera pan/tilt controls.
2. **🗺️ Aladin Lite Deep-Sky Survey** (`https://aladin.cds.unistra.fr/AladinLite/`):
   - Developed by the **CDS (Centre de Données astronomiques de Strasbourg)** and used by the European Space Agency (ESA).
   - Automatically passes the asteroid's exact Right Ascension (RA) and Declination (Dec) celestial coordinates to center high-resolution optical survey imagery (DSS2 color, PanSTARRS) directly on the background starfield where the asteroid is located.
3. **🪐 IAU Minor Planet Center (MPC)** (`https://www.minorplanetcenter.net/`):
   - The official International Astronomical Union worldwide clearinghouse for all minor planet and asteroid astrometric measurements.
   - Opens the official discovery dossier, observation baseline, orbital arc length, and radar observation timeline.
4. **🔭 TheSkyLive Real-Time Tracker** (`https://theskylive.com/`):
   - Opens dedicated observation guides with visual light curves, constellation transits, and finder charts.
5. **📋 1-Click Computerized Telescope GoTo Ephemeris**:
   - Copies exact J2000 equatorial coordinates (`RA: 06h 54m 31s | Dec: +32° 50' 24"`) and local horizon coordinates (`Alt: 85.6° | Az: 346.9°`) directly to the clipboard.
   - Ready for instant pasting into computerized GoTo telescope mounts, Stellarium Desktop, SkySafari, ASCOM drivers, SynScan, or N.I.N.A.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React 18, Vite 8, Vanilla CSS (Design Tokens, Glassmorphism, Responsive Grid), HTML5 Canvas |
| **Backend API** | Node.js (ES Modules), Express, `pg` (PostgreSQL Client Pool), `bcryptjs`, `jsonwebtoken`, `cors`, `dotenv` |
| **Database** | PostgreSQL 18 with B-tree index optimizations |
| **ML Microservice** | Python 3.11, FastAPI, Uvicorn, Scikit-Learn, Joblib, NumPy, Pandas |
| **Data Ingestion** | NASA NeoWs (Near Earth Object Web Service) REST API |

---

## 📦 Project Structure

```text
NEO-Watch/
├── backend/                  # Node.js + Express Backend
│   ├── src/
│   │   ├── db/               # PostgreSQL pool connection & schema.sql
│   │   ├── middleware/       # JWT auth verification middleware
│   │   ├── routes/           # REST routes (neos, visibility, auth, watchlist, observations)
│   │   ├── utils/            # Astronomical formulas (RA/Dec, Alt/Az, Moon, Sun, LST)
│   │   └── index.js          # Express app entrypoint & error handling
│   ├── package.json
│   └── .env.example
├── frontend/                 # React 18 + Vite Frontend
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── AstroDeepLinks.jsx      # External tools & GoTo copy
│   │   │   ├── AuthModal.jsx           # Sign in & registration modal
│   │   │   ├── ObservationLogModal.jsx # Citizen science drawer
│   │   │   ├── SkyMap.jsx              # Canvas celestial sky map
│   │   │   ├── VisibilityPredictor.jsx # Topocentric visibility predictor
│   │   │   └── WatchlistView.jsx       # Personal watchlist dashboard
│   │   ├── App.jsx           # Root application, navigation, & detail modal
│   │   ├── App.css           # Design system tokens, dark theme, responsive CSS
│   │   └── main.jsx          # Vite React root
│   ├── package.json
│   └── vite.config.js
├── ml-service/               # Python FastAPI Microservice
│   ├── model/                # Trained Random Forest model (hazard_model.joblib)
│   ├── main.py               # FastAPI application & /predict endpoint
│   ├── requirements.txt
│   └── train.py              # Model training script
├── architecture.md           # Technical architecture specifications
├── design.md                 # UI design system & aesthetic tokens
├── phases.md                 # Project implementation roadmap
├── prd.md                    # Product requirements document
└── security.md               # Security guidelines & threat model
```

---

## ⚙️ Local Development Setup

### 1. Prerequisites
- **Node.js** (v18.x or v20.x+)
- **PostgreSQL** (v14+) running locally on port 5432
- **Python** (v3.9+)

---

### 2. Database Setup
Create the PostgreSQL database and run the schema:
```bash
# In psql or PostgreSQL GUI:
CREATE DATABASE neo_watch;

# Apply the relational schema:
psql -U postgres -d neo_watch -f backend/src/db/schema.sql
```

---

### 3. Backend Configuration & Ingestion
```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

Ensure your `backend/.env` file has your credentials:
```env
PORT=5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/neo_watch
JWT_SECRET=super_secret_jwt_key_for_development
ML_SERVICE_URL=http://localhost:8000
NASA_API_KEY=DEMO_KEY
```

Sync asteroid data from NASA NeoWs into PostgreSQL:
```bash
npm run sync-data
```

Start the backend server:
```bash
npm run dev
# Server listening on http://localhost:5000
```

---

### 4. Machine Learning Microservice
In a separate terminal:
```bash
cd ml-service

# Create and activate a virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install requirements
pip install -r requirements.txt

# (Optional) Train/re-train model:
python train.py

# Start FastAPI server
uvicorn main:app --port 8000 --reload
# ML Service running on http://localhost:8000
```

---

### 5. Frontend Development Server
In a third terminal:
```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
# Frontend running on http://localhost:3000
```

Open **`http://localhost:3000`** in your browser.

---

## 📡 API Reference

### Asteroid Endpoints
- `GET /api/neos?page=1&limit=12&search=Eros&hazardous=true&sortBy=name` — Catalog list with pagination.
- `GET /api/neos/:id` — Full asteroid record including close approaches and orbital elements.
- `GET /api/neos/:id/trajectory` — Historical and upcoming trajectory events.
- `GET /api/risk-score/:id` — Machine learning hazard classification inference.

### Astronomical Visibility Endpoints
- `GET /api/visibility?lat=28.61&lon=77.20&date=2026-10-22` — Visibility rankings for all NEOs from location.
- `GET /api/visibility/:id?lat=28.61&lon=77.20` — Detailed 24-hour altitude profile, moon interference, and peak window for an asteroid.

### Authentication & Watchlist Endpoints
- `POST /api/auth/register` — Register new user account (`email`, `password`, `name`).
- `POST /api/auth/login` — Sign in and receive JWT bearer token.
- `GET /api/auth/me` — Authenticated user profile.
- `GET /api/watchlist` — Get all bookmarked asteroids for authenticated user.
- `POST /api/watchlist/:neo_id` — Add asteroid to watchlist.
- `DELETE /api/watchlist/:neo_id` — Remove asteroid from watchlist.

### Citizen Science Observations Endpoints
- `GET /api/observations` — Get all observation sighting records logged by the user.
- `GET /api/observations/neo/:neo_id` — Get sightings for a specific asteroid.
- `POST /api/observations` — Record sighting (`neo_object_id`, `observed_at`, `lat`, `long`, `notes`).
- `PUT /api/observations/:id` — Edit sighting notes or time.
- `DELETE /api/observations/:id` — Delete sighting record.

---

## 🔮 Future Roadmap

### Phase 9: Notifications & Refinement Alerts
- **Orbital Refinement Alerts**: Notify users when NASA JPL radar tracking updates an asteroid's orbital eccentricity, semi-major axis, or close-approach timing.
- **Hazard Classification Shifts**: Alert watchlisted users if an asteroid's Potentially Hazardous status or ML risk tier changes.
- **Upcoming Flyby Reminders**: Automated notification 24 hours before a watchlisted asteroid reaches its closest Earth encounter or peak viewing window.

### Phase 10: Multi-Service Cloud Deployment
- **Frontend**: Edge deployment via **Vercel** with CDN asset caching.
- **Node.js Backend**: Containerized deployment on **Railway** or **Render** connected to managed PostgreSQL.
- **ML Microservice**: Dedicated Python container on **Render** or **Railway** with internal private networking (keeping inference endpoints unexposed to public internet).
- **Security Audit**: Implementation of strict rate-limiting, CORS origin restrictions, security headers (Helmet), and JWT rotation.

### Additional Enhancements
- **PWA (Progressive Web App)**: Offline support for the Celestial Sky Map during stargazing trips without cellular reception.
- **Direct ASCOM / INDI Telescope Driver Integration**: Push coordinates over local network directly to computerized mounts.

---

## 📄 License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
