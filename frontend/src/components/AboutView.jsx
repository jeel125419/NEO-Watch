import React, { useState, useEffect, useRef } from 'react';

// 9 Comprehensive Astronomical Terms with Simple Summaries, Custom Diagrams, and Deep Dives
export const GLOSSARY_TERMS = [
  {
    id: 'h-magnitude',
    title: 'Absolute Magnitude',
    symbol: 'H',
    category: 'Brightness & Size',
    summary: 'A standard measure of an asteroid\'s intrinsic brightness. In astronomy, lower or negative numbers mean much larger and brighter celestial bodies.',
    deepDive: {
      scientificText: 'Absolute Magnitude (H) represents the visual magnitude an asteroid would have if it were exactly 1 Astronomical Unit (AU) from both the Sun and Earth, at a zero phase angle (fully illuminated). Because the magnitude scale is logarithmic and inverse, an asteroid with H = 14 is about 100 times brighter and typically much larger than one with H = 19.',
      formula: 'Estimated Diameter (km): D ≈ (1329 / √p) × 10^(-0.2 × H), where p is the geometric albedo (surface reflectivity).',
      observingContext: 'Amateur telescope observers use H combined with current distance to calculate apparent magnitude (V) to know whether an asteroid is visible tonight in their aperture.',
      officialLink: 'https://ssd.jpl.nasa.gov/horizons/',
      linkText: 'NASA JPL Horizons System Ephemeris'
    },
    renderDiagram: () => (
      <svg className="glossary-diagram-svg" viewBox="0 0 360 110" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="360" height="110" rx="10" fill="rgba(8, 12, 22, 0.75)" stroke="rgba(196, 181, 253, 0.12)" />
        {/* H = 11 Large Bright Object */}
        <circle cx="65" cy="50" r="28" fill="url(#brightGrad)" filter="drop-shadow(0 0 14px rgba(251, 191, 36, 0.6))" />
        <text x="65" y="94" textAnchor="middle" fill="#f8fafc" fontSize="11" fontFamily="var(--font-mono)">H = 11 (Huge & Bright)</text>
        
        {/* Arrow showing inverse scale */}
        <path d="M 125 50 L 235 50" stroke="rgba(196, 181, 253, 0.35)" strokeWidth="2" strokeDasharray="3 3" />
        <polygon points="125,50 135,45 135,55" fill="var(--accent-lavender)" />
        <text x="180" y="42" textAnchor="middle" fill="var(--accent-lavender)" fontSize="10" fontWeight="600">Lower H = Brighter</text>

        {/* H = 18 Medium Object */}
        <circle cx="180" cy="58" r="14" fill="#6366f1" filter="drop-shadow(0 0 8px rgba(99, 102, 241, 0.5))" />
        <text x="180" y="94" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="var(--font-mono)">H = 18 (Medium)</text>

        {/* H = 25 Tiny Dim Dot */}
        <circle cx="295" cy="50" r="5" fill="#94a3b8" />
        <circle cx="295" cy="50" r="10" stroke="rgba(148, 163, 184, 0.25)" strokeWidth="1" strokeDasharray="2 2" />
        <text x="295" y="94" textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="var(--font-mono)">H = 25 (Faint Dot)</text>

        <defs>
          <radialGradient id="brightGrad" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#fffbeb" />
            <stop offset="40%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </radialGradient>
        </defs>
      </svg>
    )
  },
  {
    id: 'pha-classification',
    title: 'Potentially Hazardous Asteroid (PHA)',
    symbol: 'PHA',
    category: 'Safety & Hazards',
    summary: 'An administrative classification by NASA and astronomers to prioritize tracking asteroids that come relatively close to Earth\'s orbit and are large enough to survive the atmosphere. It does not predict an Earth impact.',
    deepDive: {
      scientificText: 'A Near-Earth Asteroid is classified as a Potentially Hazardous Asteroid (PHA) if its Minimum Orbital Intersection Distance (MOID) with Earth is 0.05 Astronomical Units (AU) or less, and its absolute magnitude (H) is 22.0 or brighter (corresponding to roughly 140 meters in diameter or larger).',
      formula: 'Criteria: Earth MOID ≤ 0.05 AU (~7.5M km / 19.5 LD) AND Estimated Diameter ≥ 140 meters (H ≤ 22.0).',
      observingContext: 'Because orbits slowly evolve over thousands of years due to gravitational nudges from planets, continuous optical astrometry and planetary radar allow astronomers to rule out impact threats for centuries in advance.',
      officialLink: 'https://science.nasa.gov/planetary-defense/',
      linkText: 'NASA Planetary Defense Coordination Office'
    },
    renderDiagram: () => (
      <svg className="glossary-diagram-svg" viewBox="0 0 360 110" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="360" height="110" rx="10" fill="rgba(8, 12, 22, 0.75)" stroke="rgba(196, 181, 253, 0.12)" />
        {/* Earth Center */}
        <circle cx="80" cy="55" r="14" fill="#38bdf8" filter="drop-shadow(0 0 10px rgba(56, 189, 248, 0.5))" />
        <text x="80" y="59" textAnchor="middle" fill="#04080e" fontSize="9" fontWeight="bold">EARTH</text>

        {/* 0.05 AU Safety Buffer Zone */}
        <circle cx="80" cy="55" r="42" stroke="rgba(245, 158, 11, 0.45)" strokeWidth="1.5" strokeDasharray="4 4" fill="rgba(245, 158, 11, 0.06)" />
        <text x="80" y="24" textAnchor="middle" fill="#fbbf24" fontSize="9" fontFamily="var(--font-mono)">0.05 AU Tracking Zone (~7.5M km)</text>

        {/* Asteroid Orbit passing through buffer */}
        <path d="M 140 15 Q 110 55 170 100" stroke="#f43f5e" strokeWidth="2" fill="none" />
        <circle cx="118" cy="50" r="5" fill="#f43f5e" filter="drop-shadow(0 0 6px #f43f5e)" />
        <text x="135" y="46" fill="#f87171" fontSize="9" fontWeight="600">Asteroid Path</text>

        {/* Criteria Checklist on Right */}
        <rect x="220" y="20" width="125" height="70" rx="6" fill="rgba(15, 23, 42, 0.85)" stroke="rgba(196, 181, 253, 0.15)" />
        <text x="230" y="38" fill="#e2e8f0" fontSize="10" fontWeight="600">PHA Criteria:</text>
        <text x="230" y="56" fill="#fbbf24" fontSize="9" fontFamily="var(--font-mono)">✔ Proximity ≤ 0.05 AU</text>
        <text x="230" y="74" fill="#fbbf24" fontSize="9" fontFamily="var(--font-mono)">✔ Diameter ≥ 140 m</text>
      </svg>
    )
  },
  {
    id: 'lunar-distance',
    title: 'Lunar Distance',
    symbol: 'LD',
    category: 'Distance Units',
    summary: 'A relatable cosmic ruler equal to the average distance between Earth and our Moon (~384,400 km or 238,900 miles).',
    deepDive: {
      scientificText: 'Because near-Earth asteroids pass at distances of millions of kilometers, dealing with long raw numbers can be unintuitive. Expressing distance in Lunar Distances (LD) gives immediate practical context: an asteroid passing at 10 LD is 10 times farther away than the Moon.',
      formula: '1 LD = 384,400 km (0.00257 AU). To convert: Distance in LD = Distance (km) / 384,400.',
      observingContext: 'Objects passing inside 1 LD are considered very close flybys, usually detected by optical survey telescopes like Pan-STARRS or Catalina Sky Survey days before encounter.',
      officialLink: 'https://www.jpl.nasa.gov/asteroid-watch/',
      linkText: 'NASA JPL Asteroid Watch Portal'
    },
    renderDiagram: () => (
      <svg className="glossary-diagram-svg" viewBox="0 0 360 110" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="360" height="110" rx="10" fill="rgba(8, 12, 22, 0.75)" stroke="rgba(196, 181, 253, 0.12)" />
        {/* Earth */}
        <circle cx="50" cy="55" r="16" fill="#38bdf8" />
        <text x="50" y="85" textAnchor="middle" fill="#94a3b8" fontSize="10">Earth</text>

        {/* Baseline ruler between Earth and Moon */}
        <line x1="68" y1="55" x2="160" y2="55" stroke="var(--accent-lavender)" strokeWidth="2" />
        <circle cx="165" cy="55" r="7" fill="#cbd5e1" />
        <text x="165" y="85" textAnchor="middle" fill="#94a3b8" fontSize="10">Moon (1 LD)</text>
        <text x="114" y="47" textAnchor="middle" fill="var(--accent-lavender)" fontSize="9" fontFamily="var(--font-mono)">384,400 km</text>

        {/* Extended asteroid flyby at 4 LD */}
        <line x1="172" y1="55" x2="310" y2="55" stroke="rgba(196, 181, 253, 0.3)" strokeWidth="1.5" strokeDasharray="3 3" />
        <circle cx="310" cy="55" r="5" fill="#f59e0b" filter="drop-shadow(0 0 6px #f59e0b)" />
        <text x="310" y="85" textAnchor="middle" fill="#fbbf24" fontSize="10">Asteroid (~4.2 LD)</text>
        <text x="240" y="47" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="var(--font-mono)">1.6 Million km</text>
      </svg>
    )
  },
  {
    id: 'astronomical-unit',
    title: 'Astronomical Unit',
    symbol: 'AU',
    category: 'Distance Units',
    summary: 'The fundamental yardstick of the solar system: the average distance from the center of Earth to the center of the Sun (~149.6 million km).',
    deepDive: {
      scientificText: 'In 2012, the International Astronomical Union (IAU) standardized 1 Astronomical Unit as exactly 149,597,870,700 meters. Orbital distances of planets and near-Earth asteroids are universally computed in AU by NASA JPL Horizons.',
      formula: '1 AU = 149,597,870.7 km (~92.96 million miles). Light takes approximately 499 seconds (8.3 minutes) to travel 1 AU.',
      observingContext: 'When an asteroid orbit approaches within 0.05 AU of Earth\'s orbit, it enters the critical threshold for Potentially Hazardous Asteroid monitoring.',
      officialLink: 'https://ssd.jpl.nasa.gov/',
      linkText: 'NASA Solar System Dynamics (SSD)'
    },
    renderDiagram: () => (
      <svg className="glossary-diagram-svg" viewBox="0 0 360 110" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="360" height="110" rx="10" fill="rgba(8, 12, 22, 0.75)" stroke="rgba(196, 181, 253, 0.12)" />
        {/* Sun */}
        <circle cx="50" cy="55" r="24" fill="#fbbf24" filter="drop-shadow(0 0 16px rgba(251, 191, 36, 0.7))" />
        <text x="50" y="59" textAnchor="middle" fill="#78350f" fontSize="11" fontWeight="bold">SUN</text>

        {/* Distance Line */}
        <line x1="80" y1="55" x2="280" y2="55" stroke="rgba(251, 191, 36, 0.5)" strokeWidth="2" strokeDasharray="4 4" />
        <text x="180" y="45" textAnchor="middle" fill="#fef08a" fontSize="11" fontWeight="600">1.0 AU (149.6 Million km)</text>
        <text x="180" y="75" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="var(--font-mono)">Light Travel Time: 8.3 minutes</text>

        {/* Earth */}
        <circle cx="295" cy="55" r="10" fill="#38bdf8" filter="drop-shadow(0 0 8px #38bdf8)" />
        <text x="295" y="85" textAnchor="middle" fill="#e0f2fe" fontSize="10">Earth</text>
      </svg>
    )
  },
  {
    id: 'estimated-diameter',
    title: 'Estimated Diameter Range',
    symbol: 'Min – Max',
    category: 'Brightness & Size',
    summary: 'Asteroid sizes are given as an estimated range (e.g. 240m – 540m) because optical telescopes measure reflected sunlight, not physical edges directly.',
    deepDive: {
      scientificText: 'An asteroid\'s brightness depends both on its physical size and its albedo (how reflective its surface materials are). A small, shiny asteroid can reflect the exact same amount of light as a large, coal-dark asteroid. Without spacecraft visits or planetary radar reflection data, astronomers calculate a size range based on typical asteroid albedos (reflectivities ranging between 0.05 for dark carbonaceous surfaces and 0.25 for stony silicate surfaces).',
      formula: 'D_min = (1329 / √0.25) × 10^(-0.2H)  |  D_max = (1329 / √0.05) × 10^(-0.2H)',
      observingContext: 'When NASA radar facilities like Goldstone observe an asteroid during close approach, the delay-Doppler bounce provides a direct shape and size measurement, narrowing the range to exact meters.',
      officialLink: 'https://cneos.jpl.nasa.gov/',
      linkText: 'NASA CNEOS Center for Near Earth Object Studies'
    },
    renderDiagram: () => (
      <svg className="glossary-diagram-svg" viewBox="0 0 360 110" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="360" height="110" rx="10" fill="rgba(8, 12, 22, 0.75)" stroke="rgba(196, 181, 253, 0.12)" />
        {/* Same Sunlight Beam */}
        <text x="35" y="30" fill="var(--accent-lavender)" fontSize="10" fontWeight="600">Sunlight In ☀️</text>
        <path d="M 35 45 L 85 45" stroke="#fef08a" strokeWidth="2" strokeDasharray="3 3" />
        <path d="M 35 75 L 185 75" stroke="#fef08a" strokeWidth="2" strokeDasharray="3 3" />

        {/* Shiny Small Asteroid */}
        <circle cx="110" cy="45" r="14" fill="#cbd5e1" stroke="#94a3b8" />
        <text x="110" y="80" textAnchor="middle" fill="#e2e8f0" fontSize="9">Shiny (p = 0.25)</text>
        <text x="110" y="93" textAnchor="middle" fill="var(--accent-cyan)" fontSize="9" fontFamily="var(--font-mono)">Smaller Min Size</text>

        <text x="180" y="55" textAnchor="middle" fill="#64748b" fontSize="12">VS</text>

        {/* Dark Big Asteroid */}
        <circle cx="260" cy="55" r="26" fill="#1e293b" stroke="#475569" strokeWidth="2" />
        <text x="260" y="93" textAnchor="middle" fill="#e2e8f0" fontSize="9">Dark Carbon (p = 0.05) → Larger Max Size</text>
      </svg>
    )
  },
  {
    id: 'closest-approach',
    title: 'Closest Approach & Miss Distance',
    symbol: 'Perigee',
    category: 'Orbital Mechanics',
    summary: 'The exact point along an asteroid\'s curved orbit where its distance to Earth reaches its absolute minimum during a flyby encounter.',
    deepDive: {
      scientificText: 'As an asteroid travels along its elliptical path around the Sun, it reaches a perihelion/perigee point relative to Earth. The miss distance is the geometric distance between the centers of mass of the two bodies at the moment of closest approach.',
      formula: 'Relative Velocity (v_rel): Vector subtraction of Earth\'s orbital velocity (v_earth ≈ 29.8 km/s) and the asteroid\'s heliocentric velocity (v_ast).',
      observingContext: 'Closest approach is typically the moment an asteroid appears brightest in the sky and moves fastest against background stars, requiring rapid telescope tracking rates.',
      officialLink: 'https://eyes.nasa.gov/apps/asteroids/',
      linkText: 'NASA Eyes on Asteroids (3D Real-Time Visualizer)'
    },
    renderDiagram: () => (
      <svg className="glossary-diagram-svg" viewBox="0 0 360 110" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="360" height="110" rx="10" fill="rgba(8, 12, 22, 0.75)" stroke="rgba(196, 181, 253, 0.12)" />
        {/* Earth */}
        <circle cx="180" cy="75" r="14" fill="#38bdf8" />
        <text x="180" y="100" textAnchor="middle" fill="#e0f2fe" fontSize="9">Earth</text>

        {/* Parabolic flyby curve */}
        <path d="M 40 25 Q 180 35 320 15" stroke="var(--accent-lavender)" strokeWidth="2.5" fill="none" />
        <circle cx="180" cy="30" r="5" fill="#f59e0b" filter="drop-shadow(0 0 8px #f59e0b)" />
        
        {/* Distance Line */}
        <line x1="180" y1="36" x2="180" y2="60" stroke="#f43f5e" strokeWidth="2" strokeDasharray="2 2" />
        <text x="235" y="48" fill="#fb7185" fontSize="9" fontWeight="600">Closest Approach Distance</text>
        <text x="180" y="20" textAnchor="middle" fill="#f59e0b" fontSize="9" fontWeight="bold">Asteroid Flyby</text>
      </svg>
    )
  },
  {
    id: 'ra-dec',
    title: 'Right Ascension & Declination',
    symbol: 'RA / Dec',
    category: 'Telescope Coordinates',
    summary: 'The celestial sphere equivalent of longitude and latitude used on star charts and telescope mounts to pinpoint where an asteroid appears among the stars.',
    deepDive: {
      scientificText: 'Declination (Dec) measures North/South angles from the Celestial Equator in degrees (-90° at the South Celestial Pole to +90° at the North Celestial Pole). Right Ascension (RA) measures Eastward angular distance along the Celestial Equator from the Vernal Equinox point, expressed in hours (0h to 24h), minutes, and seconds.',
      formula: '1 hour of Right Ascension = 15 degrees of angular celestial rotation (360° / 24h).',
      observingContext: 'NEO Watch provides instantaneous RA and Dec so amateur astronomers can directly enter these coordinates into motorized GoTo telescope mounts or Stellarium to locate the asteroid.',
      officialLink: 'https://stellarium-web.org/',
      linkText: 'Stellarium Web Interactive Planetarium'
    },
    renderDiagram: () => (
      <svg className="glossary-diagram-svg" viewBox="0 0 360 110" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="360" height="110" rx="10" fill="rgba(8, 12, 22, 0.75)" stroke="rgba(196, 181, 253, 0.12)" />
        {/* Celestial Sphere Globe */}
        <circle cx="100" cy="55" r="38" stroke="rgba(196, 181, 253, 0.3)" strokeWidth="1.5" />
        <ellipse cx="100" cy="55" rx="38" ry="12" stroke="rgba(56, 189, 248, 0.5)" strokeWidth="1.5" strokeDasharray="3 2" />
        <line x1="100" y1="17" x2="100" y2="93" stroke="rgba(196, 181, 253, 0.3)" strokeWidth="1.5" />
        
        {/* Coordinates labels */}
        <circle cx="118" cy="40" r="4" fill="#f59e0b" />
        <text x="130" y="38" fill="#fbbf24" fontSize="9" fontWeight="600">Asteroid Position</text>

        {/* Explain grid on right */}
        <rect x="200" y="20" width="145" height="70" rx="6" fill="rgba(15, 23, 42, 0.85)" stroke="rgba(196, 181, 253, 0.15)" />
        <text x="210" y="38" fill="#38bdf8" fontSize="10" fontWeight="bold">Declination (Dec):</text>
        <text x="210" y="50" fill="#94a3b8" fontSize="9">Celestial Latitude (-90° to +90°)</text>
        <text x="210" y="68" fill="var(--accent-lavender)" fontSize="10" fontWeight="bold">Right Ascension (RA):</text>
        <text x="210" y="80" fill="#94a3b8" fontSize="9">Celestial Longitude (0h to 24h)</text>
      </svg>
    )
  },
  {
    id: 'alt-az',
    title: 'Altitude & Azimuth',
    symbol: 'Alt / Az',
    category: 'Telescope Coordinates',
    summary: 'Backyard coordinates telling stargazers where to look: how high above your local horizon (Altitude) and which compass direction to face (Azimuth).',
    deepDive: {
      scientificText: 'Unlike RA/Dec which are fixed to the celestial sphere, Altitude and Azimuth are observer-centric and change minute-by-minute as Earth rotates. Altitude is 0° at the true horizon, negative below the horizon, and +90° at the Zenith (directly overhead). Azimuth is the horizontal compass bearing (0° North, 90° East, 180° South, 270° West).',
      formula: 'Altitude: 0° (Horizon) to 90° (Zenith). Azimuth: 0° (North), 90° (East), 180° (South), 270° (West).',
      observingContext: 'NEO Watch computes Alt/Az in real time from your device\'s latitude, longitude, and UTC timestamp, alerting you when an asteroid rises above 20° altitude for clear viewing away from ground turbulence.',
      officialLink: 'https://minorplanetcenter.net/',
      linkText: 'IAU Minor Planet Center (MPC)'
    },
    renderDiagram: () => (
      <svg className="glossary-diagram-svg" viewBox="0 0 360 110" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="360" height="110" rx="10" fill="rgba(8, 12, 22, 0.75)" stroke="rgba(196, 181, 253, 0.12)" />
        {/* Horizon Dome */}
        <path d="M 50 80 A 70 70 0 0 1 190 80 Z" stroke="rgba(196, 181, 253, 0.3)" strokeWidth="1.5" fill="rgba(99, 102, 241, 0.05)" />
        <line x1="40" y1="80" x2="200" y2="80" stroke="#64748b" strokeWidth="1.5" />
        
        {/* Observer */}
        <circle cx="120" cy="80" r="3" fill="#f8fafc" />
        <text x="120" y="93" textAnchor="middle" fill="#64748b" fontSize="8">You</text>
        <text x="120" y="20" textAnchor="middle" fill="#38bdf8" fontSize="9">Zenith (90°)</text>

        {/* Asteroid on Dome */}
        <line x1="120" y1="80" x2="165" y2="35" stroke="rgba(245, 158, 11, 0.4)" strokeWidth="1.5" strokeDasharray="3 3" />
        <circle cx="165" cy="35" r="4" fill="#f59e0b" filter="drop-shadow(0 0 6px #f59e0b)" />
        
        <text x="145" y="65" fill="#f59e0b" fontSize="9" fontWeight="bold">Alt: 45°</text>

        {/* Compass on right */}
        <circle cx="280" cy="55" r="30" stroke="rgba(196, 181, 253, 0.25)" strokeWidth="1.5" />
        <text x="280" y="32" textAnchor="middle" fill="#38bdf8" fontSize="9" fontWeight="bold">N (0°)</text>
        <text x="305" y="58" textAnchor="middle" fill="#94a3b8" fontSize="8">E</text>
        <text x="280" y="80" textAnchor="middle" fill="#94a3b8" fontSize="8">S</text>
        <text x="255" y="58" textAnchor="middle" fill="#94a3b8" fontSize="8">W</text>
        <line x1="280" y1="55" x2="300" y2="40" stroke="#f59e0b" strokeWidth="2" />
        <text x="280" y="98" textAnchor="middle" fill="var(--accent-lavender)" fontSize="9">Azimuth: Compass Angle</text>
      </svg>
    )
  },
  {
    id: 'horizons-ephemeris',
    title: 'JPL Horizons Ephemeris',
    symbol: 'Vectors',
    category: 'Orbital Mechanics',
    summary: 'NASA JPL\'s scientific supercomputer system that calculates high-precision 3D orbital trajectories for over 1.3 million asteroids and comets.',
    deepDive: {
      scientificText: 'Maintained by NASA Jet Propulsion Laboratory\'s Solar System Dynamics Group, the Horizons on-line ephemeris system performs numerical integration incorporating general relativistic corrections, planetary oblateness, and non-gravitational Yarkovsky thermal radiation forces.',
      formula: 'Outputs 6-element Cartesian state vectors: Position (X, Y, Z in AU or km) and Velocity (Vx, Vy, Vz in km/s) referenced to the J2000 ecliptic coordinate frame.',
      observingContext: 'NEO Watch queries verified NASA JPL orbital ephemerides to deliver authentic positions to space enthusiasts, eliminating hypothetical or simulated calculations.',
      officialLink: 'https://ssd.jpl.nasa.gov/horizons/',
      linkText: 'NASA JPL Horizons Ephemeris Documentation'
    },
    renderDiagram: () => (
      <svg className="glossary-diagram-svg" viewBox="0 0 360 110" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="360" height="110" rx="10" fill="rgba(8, 12, 22, 0.75)" stroke="rgba(196, 181, 253, 0.12)" />
        {/* Radar/Optical Survey */}
        <rect x="20" y="30" width="75" height="50" rx="6" fill="rgba(15, 23, 42, 0.9)" stroke="rgba(56, 189, 248, 0.3)" />
        <text x="57" y="50" textAnchor="middle" fill="#38bdf8" fontSize="14">📡</text>
        <text x="57" y="68" textAnchor="middle" fill="#94a3b8" fontSize="8">Survey Radar</text>

        <line x1="98" y1="55" x2="135" y2="55" stroke="rgba(196, 181, 253, 0.4)" strokeWidth="2" markerEnd="url(#arrow)" />

        {/* NASA JPL Supercomputer */}
        <rect x="140" y="25" width="85" height="60" rx="6" fill="rgba(30, 27, 75, 0.9)" stroke="rgba(139, 92, 246, 0.4)" />
        <text x="182" y="47" textAnchor="middle" fill="#c4b5fd" fontSize="14">💻</text>
        <text x="182" y="62" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">NASA JPL</text>
        <text x="182" y="74" textAnchor="middle" fill="var(--accent-lavender)" fontSize="8">Horizons Engine</text>

        <line x1="228" y1="55" x2="265" y2="55" stroke="rgba(196, 181, 253, 0.4)" strokeWidth="2" />

        {/* NEO Watch Platform */}
        <rect x="270" y="30" width="75" height="50" rx="6" fill="rgba(15, 23, 42, 0.9)" stroke="rgba(16, 185, 129, 0.3)" />
        <text x="307" y="50" textAnchor="middle" fill="#34d399" fontSize="14">☄️</text>
        <text x="307" y="68" textAnchor="middle" fill="#e2e8f0" fontSize="8">NEO Watch</text>
      </svg>
    )
  }
];

export const CATEGORIES = ['All Terms', 'Brightness & Size', 'Safety & Hazards', 'Distance Units', 'Telescope Coordinates', 'Orbital Mechanics'];

export default function AboutView({ targetTermId }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Terms');
  const [expandedMap, setExpandedMap] = useState({});
  const [highlightedId, setHighlightedId] = useState(null);
  const cardRefs = useRef({});

  // Auto-scroll, expand, and highlight if targetTermId is provided
  useEffect(() => {
    if (targetTermId) {
      // Expand target term's deep dive
      setExpandedMap(prev => ({ ...prev, [targetTermId]: true }));
      setHighlightedId(targetTermId);

      // Scroll smoothly to target term card
      setTimeout(() => {
        const el = cardRefs.current[targetTermId];
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);

      // Remove highlight animation after 3.5 seconds
      const timer = setTimeout(() => {
        setHighlightedId(null);
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [targetTermId]);

  const toggleDeepDive = (id) => {
    setExpandedMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredTerms = GLOSSARY_TERMS.filter(term => {
    const matchesCategory = selectedCategory === 'All Terms' || term.category === selectedCategory;
    const query = searchQuery.trim().toLowerCase();
    const matchesQuery = !query || 
      term.title.toLowerCase().includes(query) ||
      term.symbol.toLowerCase().includes(query) ||
      term.summary.toLowerCase().includes(query) ||
      term.deepDive.scientificText.toLowerCase().includes(query);
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="about-view-container" id="about-science-guide">
      {/* Page Header */}
      <div className="about-header-banner">
        <div className="about-title-row">
          <span className="about-header-badge">📖 Astronomical Terms & Reference Guide</span>
          <h2 className="about-main-heading">Demystifying Asteroid Science</h2>
          <p className="about-sub-lead">
            Every metric, abbreviation, and coordinate on NEO Watch translated into plain English. 
            Read the quick summary, glance at the visual diagram, or click <strong>Go Deeper ▾</strong> to explore the authentic physics and verified NASA sources.
          </p>
        </div>

        {/* Search & Category Filter */}
        <div className="about-controls-row">
          <div className="about-search-input-wrap">
            <svg className="about-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              className="about-search-input"
              placeholder="Search science terms (e.g. H, PHA, AU, Magnitude, Coordinates)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                type="button" 
                className="about-clear-search-btn" 
                onClick={() => setSearchQuery('')}
              >
                ✕
              </button>
            )}
          </div>

          <div className="about-category-pills">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                className={`about-cat-pill ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Glossary Cards Grid */}
      <div className="about-glossary-grid">
        {filteredTerms.length === 0 ? (
          <div className="about-empty-state">
            <p>🔍 No science terms match "{searchQuery}".</p>
            <button 
              type="button" 
              className="page-btn" 
              onClick={() => { setSearchQuery(''); setSelectedCategory('All Terms'); }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredTerms.map(term => {
            const isExpanded = Boolean(expandedMap[term.id]);
            const isHighlighted = highlightedId === term.id;

            return (
              <article
                key={term.id}
                id={`glossary-${term.id}`}
                ref={el => (cardRefs.current[term.id] = el)}
                className={`about-term-card ${isHighlighted ? 'highlight-pulse' : ''}`}
              >
                <div className="term-card-header">
                  <div className="term-title-cluster">
                    <span className="term-symbol-badge">{term.symbol}</span>
                    <h3 className="term-title-text">{term.title}</h3>
                  </div>
                  <span className="term-category-tag">{term.category}</span>
                </div>

                {/* Tier 1: Instant Plain-English Summary */}
                <div className="term-tier1-summary">
                  <p>{term.summary}</p>
                </div>

                {/* Visual Concept Diagram */}
                <div className="term-diagram-container" aria-label={`Diagram illustrating ${term.title}`}>
                  {term.renderDiagram()}
                </div>

                {/* Go Deeper Button */}
                <button
                  type="button"
                  className={`go-deeper-btn ${isExpanded ? 'expanded' : ''}`}
                  onClick={() => toggleDeepDive(term.id)}
                  aria-expanded={isExpanded}
                >
                  <span>{isExpanded ? 'Show Summary ▴' : 'Go Deeper ▾'}</span>
                </button>

                {/* Tier 2: Deep Scientific Dive */}
                {isExpanded && (
                  <div className="term-tier2-deep-dive">
                    <h4 className="deep-dive-title">Scientific Deep Dive</h4>
                    <p className="deep-dive-p">{term.deepDive.scientificText}</p>
                    
                    {term.deepDive.formula && (
                      <div className="deep-dive-formula-box">
                        <span className="formula-label">Formula / Criteria:</span>
                        <code>{term.deepDive.formula}</code>
                      </div>
                    )}

                    <div className="deep-dive-observing-box">
                      <span className="observing-label">🔭 Stargazing & Tracking Context:</span>
                      <p>{term.deepDive.observingContext}</p>
                    </div>

                    <div className="deep-dive-source-row">
                      <span className="source-label">Official NASA / IAU Documentation:</span>
                      <a
                        href={term.deepDive.officialLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="official-source-link-btn"
                      >
                        <span>{term.deepDive.linkText}</span>
                        <span className="external-arrow">↗</span>
                      </a>
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
