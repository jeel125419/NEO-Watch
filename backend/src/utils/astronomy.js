/**
 * Astronomy & Orbital Mechanics Utility for NEO Watch
 * Phase 5 - Visibility Predictor
 * 
 * Computes:
 * - Julian Day & Sidereal Time
 * - Sun position & twilight times (Civil, Nautical, Astronomical dusk/dawn)
 * - Moon phase, illumination, and topocentric position / interference
 * - Asteroid geocentric coordinates & topocentric altitude/azimuth across the night
 * - Apparent magnitude and viewing equipment recommendations
 */

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

/**
 * Normalizes an angle in degrees to [0, 360)
 */
export function normalizeDeg(deg) {
  let val = deg % 360;
  if (val < 0) val += 360;
  return val;
}

/**
 * Convert standard Date to Julian Date (JD)
 */
export function dateToJD(date) {
  return (date.getTime() / 86400000.0) + 2440587.5;
}

/**
 * Calculate Greenwich Mean Sidereal Time (GMST) in degrees
 */
export function getGMST(date) {
  const jd = dateToJD(date);
  const d = jd - 2451545.0; // days since J2000.0
  // Standard IAU formula for GMST
  const gmstHours = (18.697374558 + 24.06570982441908 * d) % 24;
  const hoursNorm = gmstHours < 0 ? gmstHours + 24 : gmstHours;
  return hoursNorm * 15.0; // convert hours to degrees
}

/**
 * Calculate Local Sidereal Time (LST) in degrees
 */
export function getLST(date, lon) {
  return normalizeDeg(getGMST(date) + lon);
}

/**
 * Calculate Sun coordinates (apparent RA and Dec in degrees)
 */
export function getSunPosition(date) {
  const jd = dateToJD(date);
  const n = jd - 2451545.0; // Days since J2000.0

  // Mean anomaly of the Sun
  const M = normalizeDeg(357.5291 + 0.98560028 * n);
  // Mean longitude of the Sun
  const L = normalizeDeg(280.4664 + 0.98564736 * n);
  // Ecliptic longitude
  const C = 1.9148 * Math.sin(M * DEG2RAD) + 0.0200 * Math.sin(2 * M * DEG2RAD);
  const lambda = normalizeDeg(L + C);
  // Obliquity of the ecliptic
  const epsilon = 23.4393 - 0.0000004 * n;

  // Equatorial coordinates
  const sinDec = Math.sin(epsilon * DEG2RAD) * Math.sin(lambda * DEG2RAD);
  const dec = Math.asin(sinDec) * RAD2DEG;

  const y = Math.cos(epsilon * DEG2RAD) * Math.sin(lambda * DEG2RAD);
  const x = Math.cos(lambda * DEG2RAD);
  let ra = Math.atan2(y, x) * RAD2DEG;
  ra = normalizeDeg(ra);

  return { ra, dec, lambda };
}

/**
 * Convert Equatorial coordinates (RA, Dec in degrees) to Horizontal (Alt, Az in degrees)
 */
export function equatorialToHorizontal(ra, dec, lat, lon, date) {
  const lst = getLST(date, lon);
  const ha = normalizeDeg(lst - ra); // Hour angle in degrees

  const latRad = lat * DEG2RAD;
  const decRad = dec * DEG2RAD;
  const haRad = ha * DEG2RAD;

  // Altitude
  const sinAlt = Math.sin(latRad) * Math.sin(decRad) +
                 Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt))) * RAD2DEG;

  // Azimuth
  const cosAlt = Math.cos(alt * DEG2RAD);
  let az = 0;
  if (Math.abs(cosAlt) > 1e-6) {
    const cosAz = (Math.sin(decRad) - Math.sin(latRad) * sinAlt) / (Math.cos(latRad) * cosAlt);
    const clampedCosAz = Math.max(-1, Math.min(1, cosAz));
    az = Math.acos(clampedCosAz) * RAD2DEG;
    if (Math.sin(haRad) > 0) {
      az = 360 - az;
    }
  }

  return {
    altitude: alt,
    azimuth: normalizeDeg(az)
  };
}

/**
 * Convert azimuth angle to 8-point / 16-point compass direction
 */
export function azimuthToDirection(az) {
  const directions = [
    'North', 'NNE', 'North-East', 'ENE',
    'East', 'ESE', 'South-East', 'SSE',
    'South', 'SSW', 'South-West', 'WSW',
    'West', 'WNW', 'North-West', 'NNW'
  ];
  const index = Math.round(az / 22.5) % 16;
  return `${directions[index]} (${Math.round(az)}°)`;
}

/**
 * Calculate Sun twilight and darkness windows for a given date and location
 */
export function getSunTimeline(date, lat, lon) {
  // Midnight of the requested day in local/UTC
  const baseDate = new Date(date);
  baseDate.setUTCHours(12, 0, 0, 0); // Noon anchor

  let sunset = null;
  let duskCivil = null;
  let duskNautical = null;
  let duskAstronomical = null;
  let dawnAstronomical = null;
  let dawnNautical = null;
  let dawnCivil = null;
  let sunrise = null;

  // Scan over a 24-hour window from noon to noon next day in 5-minute increments
  const stepMs = 5 * 60 * 1000;
  let prevTime = new Date(baseDate.getTime());
  let prevAlt = equatorialToHorizontal(
    getSunPosition(prevTime).ra,
    getSunPosition(prevTime).dec,
    lat, lon, prevTime
  ).altitude;

  for (let i = 1; i <= 288; i++) {
    const currTime = new Date(baseDate.getTime() + i * stepMs);
    const sunPos = getSunPosition(currTime);
    const currAlt = equatorialToHorizontal(sunPos.ra, sunPos.dec, lat, lon, currTime).altitude;

    // Crossing horizons going down (afternoon -> evening)
    if (prevAlt >= -0.833 && currAlt < -0.833 && !sunset) sunset = currTime;
    if (prevAlt >= -6.0 && currAlt < -6.0 && !duskCivil) duskCivil = currTime;
    if (prevAlt >= -12.0 && currAlt < -12.0 && !duskNautical) duskNautical = currTime;
    if (prevAlt >= -18.0 && currAlt < -18.0 && !duskAstronomical) duskAstronomical = currTime;

    // Crossing horizons going up (morning)
    if (i > 144) { // past midnight
      if (prevAlt < -18.0 && currAlt >= -18.0 && !dawnAstronomical) dawnAstronomical = currTime;
      if (prevAlt < -12.0 && currAlt >= -12.0 && !dawnNautical) dawnNautical = currTime;
      if (prevAlt < -6.0 && currAlt >= -6.0 && !dawnCivil) dawnCivil = currTime;
      if (prevAlt < -0.833 && currAlt >= -0.833 && !sunrise) sunrise = currTime;
    }

    prevAlt = currAlt;
    prevTime = currTime;
  }

  // Fallbacks for polar regions or extremes
  if (!duskAstronomical) duskAstronomical = duskNautical || duskCivil || sunset;
  if (!dawnAstronomical) dawnAstronomical = dawnNautical || dawnCivil || sunrise;

  return {
    sunset,
    duskCivil,
    duskNautical,
    duskAstronomical,
    dawnAstronomical,
    dawnNautical,
    dawnCivil,
    sunrise
  };
}

/**
 * Calculate Moon Phase, Illumination fraction, and Interference level
 */
export function getMoonDetails(date, lat, lon) {
  const jd = dateToJD(date);
  // Synodic lunar cycle (~29.53058867 days)
  // Known new moon: Jan 6, 2000 at 18:14 UTC -> JD 2451549.26
  const synodicMonth = 29.53058867;
  const daysSinceNew = (jd - 2451549.26) % synodicMonth;
  const moonAge = daysSinceNew < 0 ? daysSinceNew + synodicMonth : daysSinceNew;

  // Phase angle & illuminated fraction (0 to 1)
  const phaseAngle = (moonAge / synodicMonth) * 360;
  const illumination = 0.5 * (1 - Math.cos(phaseAngle * DEG2RAD));
  const illuminationPct = Math.round(illumination * 100);

  // Phase name & icon
  let phaseName = 'New Moon';
  let phaseIcon = '🌑';

  if (moonAge < 1.84) {
    phaseName = 'New Moon';
    phaseIcon = '🌑';
  } else if (moonAge < 5.53) {
    phaseName = 'Waxing Crescent';
    phaseIcon = '🌒';
  } else if (moonAge < 9.22) {
    phaseName = 'First Quarter';
    phaseIcon = '🌓';
  } else if (moonAge < 12.91) {
    phaseName = 'Waxing Gibbous';
    phaseIcon = '🌔';
  } else if (moonAge < 16.61) {
    phaseName = 'Full Moon';
    phaseIcon = '🌕';
  } else if (moonAge < 20.30) {
    phaseName = 'Waning Gibbous';
    phaseIcon = '🌖';
  } else if (moonAge < 23.99) {
    phaseName = 'Last Quarter';
    phaseIcon = '🌗';
  } else if (moonAge < 27.68) {
    phaseName = 'Waning Crescent';
    phaseIcon = '🌘';
  } else {
    phaseName = 'New Moon';
    phaseIcon = '🌑';
  }

  // Moon approximate equatorial coordinates
  const d = jd - 2451545.0;
  const L = normalizeDeg(218.316 + 13.176396 * d);
  const M = normalizeDeg(134.963 + 13.064993 * d);
  const F = normalizeDeg(93.272 + 13.229350 * d);
  const lambda = normalizeDeg(L + 6.289 * Math.sin(M * DEG2RAD));
  const beta = 5.128 * Math.sin(F * DEG2RAD);

  const eps = 23.4393 * DEG2RAD;
  const sinDec = Math.sin(beta * DEG2RAD) * Math.cos(eps) +
                 Math.cos(beta * DEG2RAD) * Math.sin(eps) * Math.sin(lambda * DEG2RAD);
  const dec = Math.asin(sinDec) * RAD2DEG;

  const y = Math.sin(lambda * DEG2RAD) * Math.cos(eps) -
            Math.tan(beta * DEG2RAD) * Math.sin(eps);
  const x = Math.cos(lambda * DEG2RAD);
  const ra = normalizeDeg(Math.atan2(y, x) * RAD2DEG);

  // Current Moon altitude
  const { altitude: moonAlt } = equatorialToHorizontal(ra, dec, lat, lon, date);

  // Interference classification
  let interferenceLevel = 'Low';
  let interferenceExplanation = 'Minimal light pollution from the moon.';

  if (moonAlt < 0) {
    interferenceLevel = 'None';
    interferenceExplanation = 'The Moon is below the horizon during this time.';
  } else if (illuminationPct > 65) {
    interferenceLevel = 'High';
    interferenceExplanation = `Bright ${phaseName} (${illuminationPct}% illuminated) washes out faint asteroids.`;
  } else if (illuminationPct > 30) {
    interferenceLevel = 'Moderate';
    interferenceExplanation = `Moderate moon glare (${phaseName}, ${illuminationPct}% illuminated) may reduce contrast for faint targets.`;
  } else {
    interferenceLevel = 'Low';
    interferenceExplanation = `Slender ${phaseName} (${illuminationPct}% illuminated) provides dark skies.`;
  }

  return {
    phase_name: phaseName,
    phase_icon: phaseIcon,
    illumination_pct: illuminationPct,
    moon_age_days: Math.round(moonAge * 10) / 10,
    current_altitude_deg: Math.round(moonAlt * 10) / 10,
    interference_level: interferenceLevel,
    interference_explanation: interferenceExplanation,
    ra,
    dec
  };
}

/**
 * Approximate Asteroid Geocentric Coordinates from orbital elements & close approach anchoring
 */
export function getAsteroidPosition(neo, targetDate) {
  const orb = neo.orbital_elements || {};
  const semiMajorAxis = orb.semi_major_axis || 1.4; // AU
  const eccentricity = orb.eccentricity || 0.2;
  const inclination = (orb.inclination || 10.0) * DEG2RAD;
  const periodDays = orb.orbital_period || (365.25 * Math.pow(semiMajorAxis, 1.5));

  // Find nearest close approach event to targetDate if available
  const closeApproaches = neo.close_approaches || [];
  const targetMs = targetDate.getTime();
  let nearestCA = null;
  let minDiffMs = Infinity;

  for (const ca of closeApproaches) {
    if (!ca.approach_date) continue;
    const diff = Math.abs(new Date(ca.approach_date).getTime() - targetMs);
    if (diff < minDiffMs) {
      minDiffMs = diff;
      nearestCA = ca;
    }
  }

  // Anchor date from closest approach or default epoch
  let tRef = new Date(targetDate.getFullYear(), 0, 1).getTime();
  let baseDistanceAU = semiMajorAxis;

  if (nearestCA) {
    tRef = new Date(nearestCA.approach_date).getTime();
    const missKm = nearestCA.miss_distance_km || (0.1 * 149597870.7);
    baseDistanceAU = Math.max(0.01, missKm / 149597870.7);
  }

  const daysFromAnchor = (targetMs - tRef) / (1000 * 60 * 60 * 24);
  const meanMotionDegPerDay = 360.0 / periodDays;
  const meanAnomaly = normalizeDeg(daysFromAnchor * meanMotionDegPerDay);

  // Solve Kepler equation: E - e*sin(E) = M
  let E = meanAnomaly * DEG2RAD;
  for (let iter = 0; iter < 5; iter++) {
    E = E - (E - eccentricity * Math.sin(E) - (meanAnomaly * DEG2RAD)) / (1 - eccentricity * Math.cos(E));
  }

  // True anomaly
  const sinNu = (Math.sqrt(1 - eccentricity * eccentricity) * Math.sin(E)) / (1 - eccentricity * Math.cos(E));
  const cosNu = (Math.cos(E) - eccentricity) / (1 - eccentricity * Math.cos(E));
  const trueAnomaly = Math.atan2(sinNu, cosNu);

  // Heliocentric distance r (AU)
  const r = semiMajorAxis * (1 - eccentricity * Math.cos(E));

  // Orbital longitude in orbit plane
  const u = trueAnomaly;
  // Node orientation: anchor with Sun position on anchor date
  const anchorSun = getSunPosition(new Date(tRef));
  const omegaNode = normalizeDeg(anchorSun.lambda + 180) * DEG2RAD;

  // Heliocentric ecliptic coordinates
  const xh = r * (Math.cos(omegaNode) * Math.cos(u) - Math.sin(omegaNode) * Math.sin(u) * Math.cos(inclination));
  const yh = r * (Math.sin(omegaNode) * Math.cos(u) + Math.cos(omegaNode) * Math.sin(u) * Math.cos(inclination));
  const zh = r * (Math.sin(u) * Math.sin(inclination));

  // Earth heliocentric coordinates (approximate circular orbit r=1 AU)
  const currentSun = getSunPosition(targetDate);
  const earthEclipticLong = normalizeDeg(currentSun.lambda + 180) * DEG2RAD;
  const xe = Math.cos(earthEclipticLong);
  const ye = Math.sin(earthEclipticLong);

  // Geocentric coordinates
  const deltaX = xh - xe;
  const deltaY = yh - ye;
  const deltaZ = zh;
  const deltaDistanceAU = Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ);

  // Convert to equatorial coordinates
  const eps = 23.4393 * DEG2RAD;
  const deltaXeq = deltaX;
  const deltaYeq = deltaY * Math.cos(eps) - deltaZ * Math.sin(eps);
  const deltaZeq = deltaY * Math.sin(eps) + deltaZ * Math.cos(eps);

  const ra = normalizeDeg(Math.atan2(deltaYeq, deltaXeq) * RAD2DEG);
  const dec = Math.asin(Math.max(-1, Math.min(1, deltaZeq / deltaDistanceAU))) * RAD2DEG;

  // Apparent visual magnitude: V = H + 5*log10(r * delta)
  const absMagH = neo.absolute_magnitude_h || 20.0;
  const estimatedVisualMag = Math.round((absMagH + 5 * Math.log10(Math.max(0.01, r * deltaDistanceAU))) * 10) / 10;

  return {
    ra,
    dec,
    distance_au: Math.round(deltaDistanceAU * 10000) / 10000,
    distance_km: Math.round(deltaDistanceAU * 149597870.7),
    estimated_visual_mag: estimatedVisualMag
  };
}

/**
 * Recommend equipment based on estimated apparent visual magnitude
 */
export function getEquipmentRecommendation(visualMag) {
  if (visualMag < 6.0) {
    return {
      category: 'Naked Eye',
      difficulty: 'Easy',
      badge_class: 'naked-eye',
      description: 'Bright enough to be spotted with the naked eye under dark, unpolluted skies.'
    };
  } else if (visualMag < 9.5) {
    return {
      category: 'Binoculars',
      difficulty: 'Accessible',
      badge_class: 'binoculars',
      description: 'Easily observed using standard binoculars (7x50 or 10x50) or small spotting scope.'
    };
  } else if (visualMag < 12.5) {
    return {
      category: 'Small to Medium Telescope',
      difficulty: 'Moderate',
      badge_class: 'small-telescope',
      description: 'Requires a 4-inch to 6-inch amateur astronomical telescope.'
    };
  } else if (visualMag < 14.5) {
    return {
      category: 'Large Telescope',
      difficulty: 'Advanced',
      badge_class: 'large-telescope',
      description: 'Requires an 8-inch to 12-inch telescope under dark skies.'
    };
  } else {
    return {
      category: 'Astrophotography / CCD',
      difficulty: 'Expert',
      badge_class: 'astrophoto',
      description: 'Very faint. Requires long-exposure digital imaging or research-grade aperture.'
    };
  }
}

/**
 * Full Night Visibility Simulation for a single NEO
 */
export function computeNeoVisibility(neo, date, lat, lon) {
  const sunTimeline = getSunTimeline(date, lat, lon);
  const moonDetails = getMoonDetails(date, lat, lon);
  const asteroidPos = getAsteroidPosition(neo, date);
  const equipment = getEquipmentRecommendation(asteroidPos.estimated_visual_mag);

  // Construct night simulation: sample every 30 minutes between Sunset and Sunrise
  const startTime = sunTimeline.sunset ? new Date(sunTimeline.sunset) : new Date(date);
  const endTime = sunTimeline.sunrise ? new Date(sunTimeline.sunrise) : new Date(startTime.getTime() + 12 * 3600000);

  const samples = [];
  let peakSample = null;
  let maxAltitude = -90;

  // Window detection: altitude >= 15° and Sun alt <= -12° (nautical/astronomical darkness)
  let windowStart = null;
  let windowEnd = null;
  let visibleHoursCount = 0;

  let current = new Date(startTime.getTime());
  while (current <= endTime) {
    const sunPos = getSunPosition(current);
    const sunAlt = equatorialToHorizontal(sunPos.ra, sunPos.dec, lat, lon, current).altitude;
    const moonPos = getMoonDetails(current, lat, lon);
    const moonAlt = equatorialToHorizontal(moonPos.ra, moonPos.dec, lat, lon, current).altitude;

    const asteroidCoords = getAsteroidPosition(neo, current);
    const horiz = equatorialToHorizontal(asteroidCoords.ra, asteroidCoords.dec, lat, lon, current);

    const isDark = sunAlt <= -12.0;
    const isAboveHorizon = horiz.altitude >= 15.0;
    const isVisibleNow = isDark && isAboveHorizon;

    const sample = {
      time: current.toISOString(),
      time_formatted: current.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      altitude_deg: Math.round(horiz.altitude * 10) / 10,
      azimuth_deg: Math.round(horiz.azimuth * 10) / 10,
      direction: azimuthToDirection(horiz.azimuth),
      sun_altitude_deg: Math.round(sunAlt * 10) / 10,
      moon_altitude_deg: Math.round(moonAlt * 10) / 10,
      is_dark: isDark,
      is_visible: isVisibleNow
    };

    samples.push(sample);

    if (isVisibleNow) {
      visibleHoursCount += 0.5;
      if (!windowStart) windowStart = current.toISOString();
      windowEnd = current.toISOString();

      if (horiz.altitude > maxAltitude) {
        maxAltitude = horiz.altitude;
        peakSample = sample;
      }
    }

    current = new Date(current.getTime() + 30 * 60 * 1000);
  }

  // Calculate score and rating
  const isVisibleTonight = visibleHoursCount > 0 && maxAltitude >= 15.0;
  let rating = 'Not Visible';
  let ratingBadge = 'not-visible';
  let summaryText = 'This asteroid remains below the local horizon (or only rises in daylight) tonight.';

  if (isVisibleTonight) {
    if (maxAltitude >= 40 && visibleHoursCount >= 2.5 && moonDetails.interference_level !== 'High') {
      rating = 'Prime Viewing';
      ratingBadge = 'prime';
      summaryText = `Excellent viewing opportunity! Rises high above the horizon (${Math.round(maxAltitude)}°) during dark night with good celestial contrast.`;
    } else if (maxAltitude >= 25 && visibleHoursCount >= 1.0) {
      rating = 'Good Window';
      ratingBadge = 'good';
      summaryText = `Clear visibility window available for ${visibleHoursCount.toFixed(1)} hours. Reaches ${Math.round(maxAltitude)}° elevation.`;
    } else {
      rating = 'Challenging';
      ratingBadge = 'challenging';
      summaryText = `Low elevation (${Math.round(maxAltitude)}°) or faint magnitude. Requires clear horizon views.`;
    }
  }

  return {
    neo_id: neo.id,
    name: neo.name,
    reference_id: neo.neo_reference_id,
    target_date: date.toISOString().split('T')[0],
    observer_location: {
      latitude: lat,
      longitude: lon
    },
    is_visible: isVisibleTonight,
    rating,
    rating_badge: ratingBadge,
    summary: summaryText,
    visibility_window: isVisibleTonight ? {
      start_time: windowStart,
      end_time: windowEnd,
      duration_hours: Math.round(visibleHoursCount * 10) / 10,
      peak_time: peakSample ? peakSample.time : null,
      peak_altitude_deg: Math.round(maxAltitude * 10) / 10,
      peak_direction: peakSample ? peakSample.direction : 'South',
      peak_azimuth_deg: peakSample ? peakSample.azimuth_deg : 180
    } : null,
    sun_timeline: {
      sunset: sunTimeline.sunset ? sunTimeline.sunset.toISOString() : null,
      dusk_astronomical: sunTimeline.duskAstronomical ? sunTimeline.duskAstronomical.toISOString() : null,
      dawn_astronomical: sunTimeline.dawnAstronomical ? sunTimeline.dawnAstronomical.toISOString() : null,
      sunrise: sunTimeline.sunrise ? sunTimeline.sunrise.toISOString() : null
    },
    moon: moonDetails,
    ephemeris: {
      ra_deg: Math.round(asteroidPos.ra * 100) / 100,
      dec_deg: Math.round(asteroidPos.dec * 100) / 100,
      distance_km: asteroidPos.distance_km,
      distance_au: asteroidPos.distance_au,
      estimated_visual_mag: asteroidPos.estimated_visual_mag
    },
    equipment,
    hourly_altitude: samples
  };
}
