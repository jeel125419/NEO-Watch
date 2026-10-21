import { Router } from 'express';
import { query } from '../db/index.js';
import {
  computeNeoVisibility,
  getSunTimeline,
  getMoonDetails
} from '../utils/astronomy.js';

const router = Router();

/**
 * Validate and sanitize geographic coordinates
 */
function parseCoordinates(req) {
  let lat = parseFloat(req.query.lat);
  let lon = parseFloat(req.query.lon);

  // Defaults to New Delhi (28.6139, 77.2090) if invalid or omitted
  if (isNaN(lat) || lat < -90 || lat > 90) {
    lat = 28.6139;
  }
  if (isNaN(lon) || lon < -180 || lon > 180) {
    lon = 77.2090;
  }

  let date = new Date();
  if (req.query.date) {
    const parsed = new Date(req.query.date);
    if (!isNaN(parsed.getTime())) {
      date = parsed;
    }
  }

  return { lat, lon, date };
}

/**
 * GET /api/visibility
 * Returns a summary of celestial conditions and a ranked list of asteroids
 * visible tonight from the observer's location.
 */
router.get('/', async (req, res) => {
  try {
    const { lat, lon, date } = parseCoordinates(req);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));

    // 1. Fetch all NEOs with orbital elements and closest approach info
    const sql = `
      SELECT 
        n.id,
        n.neo_reference_id,
        n.name,
        n.absolute_magnitude_h,
        n.estimated_diameter_min_km,
        n.estimated_diameter_max_km,
        n.is_potentially_hazardous,
        o.eccentricity,
        o.inclination,
        o.semi_major_axis,
        o.orbital_period,
        o.perihelion_distance,
        closest_ca.miss_distance_km AS closest_miss_distance_km,
        closest_ca.approach_date AS closest_approach_date
      FROM neo_objects n
      LEFT JOIN orbital_elements o ON o.neo_object_id = n.id
      LEFT JOIN LATERAL (
        SELECT miss_distance_km, approach_date
        FROM close_approach_events
        WHERE neo_object_id = n.id
        ORDER BY miss_distance_km ASC NULLS LAST
        LIMIT 1
      ) closest_ca ON true
      ORDER BY n.id ASC;
    `;

    const dbRes = await query(sql);
    const allNeos = dbRes.rows;

    const sunTimeline = getSunTimeline(date, lat, lon);
    const moon = getMoonDetails(date, lat, lon);

    // 2. Compute visibility for each NEO
    const computedList = allNeos.map(row => {
      const neoData = {
        id: row.id,
        neo_reference_id: row.neo_reference_id,
        name: row.name,
        absolute_magnitude_h: row.absolute_magnitude_h,
        estimated_diameter_min_km: row.estimated_diameter_min_km,
        estimated_diameter_max_km: row.estimated_diameter_max_km,
        is_potentially_hazardous: row.is_potentially_hazardous,
        orbital_elements: {
          eccentricity: row.eccentricity,
          inclination: row.inclination,
          semi_major_axis: row.semi_major_axis,
          orbital_period: row.orbital_period,
          perihelion_distance: row.perihelion_distance
        },
        close_approaches: row.closest_approach_date ? [{
          approach_date: row.closest_approach_date,
          miss_distance_km: row.closest_miss_distance_km
        }] : []
      };

      const vis = computeNeoVisibility(neoData, date, lat, lon);

      return {
        id: row.id,
        neo_reference_id: row.neo_reference_id,
        name: row.name,
        is_potentially_hazardous: row.is_potentially_hazardous,
        estimated_diameter_min_km: row.estimated_diameter_min_km,
        estimated_diameter_max_km: row.estimated_diameter_max_km,
        is_visible: vis.is_visible,
        rating: vis.rating,
        rating_badge: vis.rating_badge,
        summary: vis.summary,
        visibility_window: vis.visibility_window,
        equipment: vis.equipment,
        estimated_visual_mag: vis.ephemeris.estimated_visual_mag,
        distance_km: vis.ephemeris.distance_km,
        peak_altitude_deg: vis.visibility_window ? vis.visibility_window.peak_altitude_deg : 0
      };
    });

    // 3. Rank objects: visible first, highest altitude and longest duration first
    const rankWeight = {
      'Prime Viewing': 4,
      'Good Window': 3,
      'Challenging': 2,
      'Not Visible': 1
    };

    computedList.sort((a, b) => {
      const weightDiff = (rankWeight[b.rating] || 0) - (rankWeight[a.rating] || 0);
      if (weightDiff !== 0) return weightDiff;
      return (b.peak_altitude_deg || 0) - (a.peak_altitude_deg || 0);
    });

    const visibleCount = computedList.filter(item => item.is_visible).length;

    res.json({
      observer: {
        latitude: lat,
        longitude: lon,
        date: date.toISOString().split('T')[0]
      },
      sky_conditions: {
        sun_timeline: {
          sunset: sunTimeline.sunset ? sunTimeline.sunset.toISOString() : null,
          dusk_astronomical: sunTimeline.duskAstronomical ? sunTimeline.duskAstronomical.toISOString() : null,
          dawn_astronomical: sunTimeline.dawnAstronomical ? sunTimeline.dawnAstronomical.toISOString() : null,
          sunrise: sunTimeline.sunrise ? sunTimeline.sunrise.toISOString() : null
        },
        moon: {
          phase_name: moon.phase_name,
          phase_icon: moon.phase_icon,
          illumination_pct: moon.illumination_pct,
          interference_level: moon.interference_level,
          interference_explanation: moon.interference_explanation
        }
      },
      stats: {
        total_cataloged: allNeos.length,
        total_visible_tonight: visibleCount
      },
      asteroids: computedList.slice(0, limit)
    });
  } catch (err) {
    console.error('[API /api/visibility Error]', err);
    res.status(500).json({ error: 'Failed to compute celestial visibility index' });
  }
});

/**
 * GET /api/visibility/:id
 * Detailed visibility window and hourly altitude profile for a specific asteroid
 */
router.get('/:id', async (req, res) => {
  const neoId = parseInt(req.params.id, 10);
  if (isNaN(neoId) || neoId <= 0) {
    return res.status(400).json({ error: 'Invalid NEO ID' });
  }

  try {
    const { lat, lon, date } = parseCoordinates(req);

    // 1. Fetch base NEO
    const neoSql = `
      SELECT 
        id, neo_reference_id, name, absolute_magnitude_h,
        estimated_diameter_min_km, estimated_diameter_max_km,
        is_potentially_hazardous, last_synced_at
      FROM neo_objects
      WHERE id = $1;
    `;
    const neoRes = await query(neoSql, [neoId]);
    if (neoRes.rows.length === 0) {
      return res.status(404).json({ error: 'Asteroid not found' });
    }
    const neo = neoRes.rows[0];

    // 2. Fetch orbital elements
    const orbSql = `
      SELECT 
        eccentricity, inclination, semi_major_axis,
        orbital_period, perihelion_distance
      FROM orbital_elements
      WHERE neo_object_id = $1;
    `;
    const orbRes = await query(orbSql, [neoId]);
    neo.orbital_elements = orbRes.rows[0] || null;

    // 3. Fetch close approaches
    const caSql = `
      SELECT 
        id, approach_date, relative_velocity_kmh,
        miss_distance_km, orbiting_body
      FROM close_approach_events
      WHERE neo_object_id = $1
      ORDER BY approach_date ASC;
    `;
    const caRes = await query(caSql, [neoId]);
    neo.close_approaches = caRes.rows;

    // 4. Compute comprehensive astronomical visibility
    const visibilityResult = computeNeoVisibility(neo, date, lat, lon);

    res.json(visibilityResult);
  } catch (err) {
    console.error(`[API /api/visibility/${req.params.id} Error]`, err);
    res.status(500).json({ error: 'Failed to compute visibility prediction for this asteroid' });
  }
});

export default router;
