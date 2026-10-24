# ☄️ NEO Watch
> **Near-Earth Object risk and orbital telemetry translated for humans, not scientists.**

[![Live Demo](https://img.shields.io/badge/Live_Demo-neo--watch--teal.vercel.app-7928CA?style=for-the-badge&logo=vercel&logoColor=white)](https://neo-watch-teal.vercel.app/)
[![React](https://img.shields.io/badge/Frontend-React_18_+_Vite-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js_+_Express-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/Database-Neon_PostgreSQL-00E599?logo=postgresql&logoColor=black)](https://neon.tech/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

🌐 **Live Production App:** [https://neo-watch-teal.vercel.app/](https://neo-watch-teal.vercel.app/)

---

## 📖 Overview

Headlines about "hazardous asteroids skimming past Earth" routinely spark unnecessary panic. NASA designates an asteroid as **Potentially Hazardous (PHA)** purely as an administrative tracking flag if its orbit brings it within **0.05 AU** (~19.5 lunar distances) and its size is estimated to exceed **140 meters**—it is **not** an announcement of an imminent collision.

**NEO Watch** translates NASA JPL NeoWs and orbital ephemeris data into an intuitive, cinematic experience for both curious beginners and amateur stargazers:
- **🌌 Immersive Cosmos Design**: Celestial deep-space visual theme with dark velvet backgrounds, subtle starlight, and violet/lavender accents.
- **✨ Beginner-Friendly First**: Accessible summaries without intimidating math or alarmist headlines.
- **📖 Interactive Science Guide**: Built-in visual guide explaining astronomical concepts with custom diagrams and direct links to official NASA/JPL resources.
- **🔭 Stargazer Tools**: Topocentric altitude projections, 24-hour observation curves, interactive celestial canvas sky map, and 1-click computerized GoTo telescope coordinates.

---

## 🏛️ System Architecture

NEO Watch runs on a 100% free, modern serverless cloud stack:

```mermaid
flowchart TD
    subgraph Client ["Client Tier (Vercel Edge)"]
        UI["React 18 + Vite SPA\n• https://neo-watch-teal.vercel.app\n• Cosmos Exploration UI\n• Asteroid Catalog & Search\n• Science & Terms Guide\n• Celestial Sky Map\n• Watchlists & Sighting Log"]
    end

    subgraph Backend ["Backend API Tier (Render)"]
        EXPRESS["Node.js + Express (ES Modules)\n• REST API (/api/neos, /api/visibility, /api/auth, /api/watchlist, /api/observations)\n• Direct pg Connection Pool with Cloud SSL\n• Astronomical Coordinate Math (RA/Dec, Alt/Az, Moon Illumination)\n• JWT Authentication & bcryptjs Password Hashing"]
    end

    subgraph Data ["Cloud Database Tier (Neon.tech)"]
        PG[("Neon Serverless PostgreSQL\n• neo_objects\n• close_approach_events\n• orbital_elements\n• users & watchlists\n• observations")]
    end

    subgraph External ["External Astronomical Systems"]
        NASA["🛰️ NASA JPL NeoWs REST API"]
        JPL3D["🪐 NASA JPL 3D Orbit Viewer"]
        ALADIN["🗺️ Aladin Lite (CDS / ESA Sky Survey)"]
        MPC["🔭 IAU Minor Planet Center"]
    end

    UI <-->|HTTPS / REST API| EXPRESS
    EXPRESS <-->|Pooled PostgreSQL SSL| PG
    EXPRESS <--|Data Ingestion| NASA
    UI -->|Interactive Deep-Links| External
```

---

## 🚀 Key Features

### 1. 🌌 Cosmos Visual Experience
- Immersive celestial atmosphere inspired by deep-space exploration aesthetics.
- Humanized hero headline and welcoming language avoiding admin-dashboard clutter.
- High-contrast, legible typography with glowing starlight accents.

### 2. ☄️ Asteroid Catalog & Real-Time Search
- Real-time catalog search with **350ms input debouncing** to minimize network queries.
- Filter by official NASA hazard flag and sort by diameter, miss distance, approach date, or name.
- **Layered Asteroid Dossier**:
  - **Human Translation**: Plain-English hazard explanations distinguishing orbital criteria from collision claims.
  - **Scientific Telemetry**: Orbital parameters ($e$, $i$, $a$, orbital period), historical and upcoming flybys, and miss distances in Lunar Distances ($LD$) and kilometers.
  - **External Visualizers**: Direct 1-click links to NASA JPL 3D Orbit Viewer, Aladin Lite optical survey, and IAU Minor Planet Center.

### 3. 📖 Interactive Science & Terms Guide
A dedicated educational hub translating 9 fundamental astronomical concepts:
- **Concepts Covered**: Absolute Magnitude ($H$), Lunar Distance ($LD$), Astronomical Unit ($AU$), Semi-Major Axis ($a$), Orbital Eccentricity ($e$), Orbital Inclination ($i$), Close Approach Velocity, Potentially Hazardous Asteroid ($PHA$), and Apparent Magnitude ($V$).
- **Progressive Disclosure**: Quick 1-sentence summary by default, with an expandable **"Go Deeper ▾"** breakdown.
- **Visual Illustrations**: Custom inline SVG diagrams demonstrating orbital planes, elliptical eccentricities, and lunar distance scales.
- **Official NASA Documentation**: Direct verified links to official NASA, JPL CNEOS, and IAU references.
- **Contextual Term Jump Chips (`ⓘ`)**: Clicking any term chip across the catalog instantly jumps to its detailed entry in the Science Guide with an auto-scroll and radiant starlight pulse highlight.

### 4. 🔭 Tonight’s Astronomical Visibility Predictor
- Calculates whether an asteroid is observable from your exact geographic coordinates tonight.
- **Topocentric Altitude & Compass Azimuth** calculated in real time using Local Sidereal Time (LST) and Keplerian orbital elements.
- **Lunar Interference Engine**: Moon phase illumination percentage and angular lunar separation penalty.
- **24-Hour Horizon Altitude Curve**: Visual histogram highlighting dark-sky observable windows ($\ge 15^\circ$ elevation during astronomical twilight).
- **Geolocation**: One-click browser GPS lock or instant selection from global astronomical observatory presets (Mauna Kea, Atacama Desert, New Delhi, New York, London, Tokyo).

### 5. 🌌 Interactive Celestial Sky Map
- Real-time **Planisphere Polar Dome Canvas Projection**:
  - Zenith ($90^\circ$) at the center, local horizon ($0^\circ$) at the perimeter.
  - Concentric altitude rings ($30^\circ$, $60^\circ$) and $15^\circ$ unobstructed horizon barrier.
- **Time Scrubber**: Slide from $-12\text{ h}$ to $+12\text{ h}$ to preview asteroid positions across the night.
- **Astronomical Red Night Vision Mode**: Monochromatic deep-red UI mode preserving human dark adaptation during outdoor telescope sessions.

### 6. ⭐ User Accounts & Asteroid Watchlists
- Register and log in securely with JWT token persistence.
- One-click **Star Bookmark (★)** on cards, modals, and sky map targets.
- Filter tracked asteroids by hazard, review closest miss distances, and directly launch visibility predictions.

### 7. 📓 Citizen Science Observation Log
- Registered amateur astronomers can record telescopic and binocular sightings.
- Log equipment notes, optical aperture, visual magnitude estimates, and sky conditions.
- Auto-geolocation GPS coordinate capture for precise sighting logs.

### 8. 🔭 Computerized Telescope GoTo Ephemeris
- 1-click copy of exact J2000 equatorial coordinates (`RA: 06h 54m 31s | Dec: +32° 50' 24"`) and topocentric horizon coordinates (`Alt: 85.6° | Az: 346.9°`).
- Ready for instant pasting into computerized GoTo telescope mounts, Stellarium Desktop, SkySafari, or ASCOM drivers.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React 18, Vite, Vanilla CSS Design System, HTML5 Canvas |
| **Backend API** | Node.js (ES Modules), Express, `pg` (PostgreSQL Client Pool with Cloud SSL), `bcryptjs`, `jsonwebtoken`, `cors`, `dotenv` |
| **Cloud Database** | Neon Serverless PostgreSQL with SSL connection pooling |
| **Hosting & CDN** | Vercel (Frontend SPA Edge CDN) & Render (Backend Web Service) |
| **Data Source** | NASA NeoWs (Near Earth Object Web Service) REST API |

---

## 📦 Project Structure

```text
NEO-Watch/
├── backend/                  # Node.js + Express Backend
│   ├── src/
│   │   ├── db/               # PostgreSQL pool connection, migrations & schema
│   │   ├── middleware/       # JWT auth verification middleware
│   │   ├── routes/           # REST routes (neos, visibility, auth, watchlist, observations)
│   │   ├── scripts/          # NASA NeoWs ingestion script
│   │   ├── utils/            # Astronomical formulas (RA/Dec, Alt/Az, Moon, Sun, LST)
│   │   └── index.js          # Express app entrypoint & error handling
│   ├── package.json
│   └── .env.example
├── frontend/                 # React 18 + Vite Frontend
│   ├── src/
│   │   ├── assets/           # High-resolution celestial imagery
│   │   ├── components/       # Reusable UI components
│   │   │   ├── AboutView.jsx           # Science & Terms Guide with SVG diagrams
│   │   │   ├── AstroDeepLinks.jsx      # External tools & GoTo copy
│   │   │   ├── AuthModal.jsx           # Sign in & registration modal
│   │   │   ├── ObservationLogModal.jsx # Citizen science drawer
│   │   │   ├── SkyMap.jsx              # Canvas celestial sky map
│   │   │   ├── VisibilityPredictor.jsx # Topocentric visibility predictor
│   │   │   └── WatchlistView.jsx       # Personal watchlist dashboard
│   │   ├── App.jsx           # Root application, navigation & detail modal
│   │   ├── App.css           # Cosmos design system & responsive layout
│   │   └── main.jsx          # Vite entrypoint with dynamic API base URL
│   ├── vercel.json           # Vercel SPA routing configuration
│   ├── package.json
│   └── vite.config.js
├── LICENSE                   # MIT License
└── README.md
```

---

## ⚙️ Local Development Setup

### 1. Prerequisites
- **Node.js** (v18.x or v20.x+)
- **PostgreSQL** (local instance or free [Neon.tech](https://neon.tech) cloud database)

---

### 2. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

Configure `backend/.env`:
```env
PORT=5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/neo_watch
JWT_SECRET=your_super_secret_jwt_key
NASA_API_KEY=DEMO_KEY
```

Apply database migrations and seed NASA asteroid data:
```bash
npm run migrate
npm run ingest
```

Start the backend server:
```bash
npm run dev
# Backend listening on http://localhost:5000
```

---

### 3. Frontend Setup
In a new terminal:
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
- `GET /api/neos?page=1&limit=12&search=Eros&hazardous=true&sortBy=name` — Paginated catalog search.
- `GET /api/neos/:id` — Asteroid record with close approach history and orbital elements.
- `GET /api/neos/:id/trajectory` — Historical and upcoming trajectory flyby events.

### Astronomical Visibility Endpoints
- `GET /api/visibility?lat=28.61&lon=77.20&date=2026-10-24` — Visibility rankings for all NEOs from location.
- `GET /api/visibility/:id?lat=28.61&lon=77.20` — Detailed 24-hour altitude profile, lunar interference, and peak observing window.

### Authentication & Watchlist Endpoints
- `POST /api/auth/register` — Register user account (`email`, `password`, `name`).
- `POST /api/auth/login` — Sign in and receive JWT bearer token.
- `GET /api/auth/me` — Authenticated user profile.
- `GET /api/watchlist` — Get bookmarked asteroids for authenticated user.
- `POST /api/watchlist/:neo_id` — Add asteroid to watchlist.
- `DELETE /api/watchlist/:neo_id` — Remove asteroid from watchlist.

### Citizen Science Observations Endpoints
- `GET /api/observations` — Get all sightings logged by authenticated user.
- `POST /api/observations` — Record new telescopic sighting.
- `PUT /api/observations/:id` — Update sighting notes or conditions.
- `DELETE /api/observations/:id` — Delete sighting record.

---

## 📄 License & Author

**Author:** [Jeel Katua](https://github.com/jeel125419)  
This project is open-source and licensed under the **[MIT License](LICENSE)**.
