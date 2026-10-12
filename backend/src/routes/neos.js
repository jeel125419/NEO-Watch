import { Router } from 'express';
import axios from 'axios';
import { query } from '../db/index.js';

const router = Router();
const rawMlUrl = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';
const ML_SERVICE_URL = rawMlUrl.replace('localhost', '127.0.0.1');

/**
 * GET /api/neos
 * List, search, filter and paginate near-Earth objects
 */
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const { search, hazardous, sortBy, sortOrder } = req.query;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (search && search.trim() !== '') {
      conditions.push(`(n.name ILIKE $${paramIndex} OR n.neo_reference_id ILIKE $${paramIndex})`);
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    if (hazardous !== undefined && hazardous !== '') {
      conditions.push(`n.is_potentially_hazardous = $${paramIndex}`);
      params.push(hazardous === 'true');
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Allowed sort columns
    const allowedSortCols = {
      name: 'n.name',
      magnitude: 'n.absolute_magnitude_h',
      diameter: 'n.estimated_diameter_max_km',
      hazardous: 'n.is_potentially_hazardous',
      id: 'n.id'
    };
    const sortCol = allowedSortCols[sortBy] || 'n.id';
    const direction = sortOrder?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    // Count total
    const countSql = `SELECT COUNT(*) FROM neo_objects n ${whereClause}`;
    const countRes = await query(countSql, params);
    const totalCount = parseInt(countRes.rows[0].count, 10);

    // Query page data with closest approach distance joined
    const dataSql = `
      SELECT 
        n.id,
        n.neo_reference_id,
        n.name,
        n.absolute_magnitude_h,
        n.estimated_diameter_min_km,
        n.estimated_diameter_max_km,
        n.is_potentially_hazardous,
        n.last_synced_at,
        closest_ca.miss_distance_km AS closest_miss_distance_km,
        closest_ca.approach_date AS closest_approach_date
      FROM neo_objects n
      LEFT JOIN LATERAL (
        SELECT miss_distance_km, approach_date
        FROM close_approach_events
        WHERE neo_object_id = n.id
        ORDER BY miss_distance_km ASC NULLS LAST
        LIMIT 1
      ) closest_ca ON true
      ${whereClause}
      ORDER BY ${sortCol} ${direction}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
    `;

    const dataRes = await query(dataSql, [...params, limit, offset]);

    res.json({
      data: dataRes.rows,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (err) {
    console.error('[API /api/neos Error]', err);
    res.status(500).json({ error: 'Failed to retrieve Near-Earth Objects' });
  }
});

/**
 * GET /api/neos/:id
 * Detailed object view joining neo_objects, orbital_elements, and close_approach_events
 */
router.get('/:id', async (req, res) => {
  const neoId = parseInt(req.params.id, 10);
  if (isNaN(neoId) || neoId <= 0) {
    return res.status(400).json({ error: 'Invalid NEO ID' });
  }

  try {
    // 1. Fetch base object
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

    // 3. Fetch close approaches ordered by approach date
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

    res.json(neo);
  } catch (err) {
    console.error(`[API /api/neos/${req.params.id} Error]`, err);
    res.status(500).json({ error: 'Failed to retrieve NEO details' });
  }
});

/**
 * GET /api/neos/:id/risk-score or /api/risk-score/:id
 * Graceful degradation risk assessment calling FastAPI /predict
 */
router.get('/:id/risk-score', handleRiskScore);

export async function handleRiskScore(req, res) {
  const neoId = parseInt(req.params.id, 10);
  if (isNaN(neoId) || neoId <= 0) {
    return res.status(400).json({ error: 'Invalid NEO ID' });
  }

  let asteroidRecord = null;
  try {
    // Query joined features for inference
    const featureSql = `
      SELECT 
        n.id,
        n.neo_reference_id,
        n.name,
        n.absolute_magnitude_h,
        n.estimated_diameter_min_km,
        n.estimated_diameter_max_km,
        n.is_potentially_hazardous,
        o.eccentricity,
        ca.miss_distance_km,
        ca.relative_velocity_kmh
      FROM neo_objects n
      LEFT JOIN orbital_elements o ON o.neo_object_id = n.id
      LEFT JOIN LATERAL (
        SELECT miss_distance_km, relative_velocity_kmh
        FROM close_approach_events
        WHERE neo_object_id = n.id
        ORDER BY miss_distance_km ASC NULLS LAST
        LIMIT 1
      ) ca ON true
      WHERE n.id = $1;
    `;
    const featureRes = await query(featureSql, [neoId]);
    if (featureRes.rows.length === 0) {
      return res.status(404).json({ error: 'Asteroid not found' });
    }
    asteroidRecord = featureRes.rows[0];
  } catch (dbErr) {
    console.error('[Risk-Score DB Error]', dbErr);
    return res.status(500).json({ error: 'Failed to fetch asteroid features' });
  }

  // Attempt ML microservice prediction with a strict 2.5s timeout
  try {
    const payload = {
      miss_distance_km: asteroidRecord.miss_distance_km ?? 10000000.0,
      relative_velocity_kmh: asteroidRecord.relative_velocity_kmh ?? 50000.0,
      absolute_magnitude_h: asteroidRecord.absolute_magnitude_h ?? 22.0,
      estimated_diameter_min_km: asteroidRecord.estimated_diameter_min_km ?? 0.1,
      estimated_diameter_max_km: asteroidRecord.estimated_diameter_max_km ?? 0.2,
      eccentricity: asteroidRecord.eccentricity ?? 0.2
    };

    const mlResponse = await axios.post(`${ML_SERVICE_URL}/predict`, payload, {
      timeout: 2500
    });

    return res.json({
      source: 'ml_model',
      tier: mlResponse.data.tier,
      confidence: mlResponse.data.confidence,
      is_potentially_hazardous: mlResponse.data.is_potentially_hazardous,
      explanation: mlResponse.data.explanation
    });
  } catch (mlErr) {
    // Graceful degradation: never fail the user request if ML microservice is down or slow
    console.warn(`[Risk-Score ML Fallback] ML service call failed (${mlErr.message}). Falling back to NASA flag.`);

    const isHazardous = Boolean(asteroidRecord.is_potentially_hazardous);
    return res.json({
      source: 'nasa_flag_fallback',
      tier: isHazardous ? 'High' : 'Low',
      confidence: null,
      is_potentially_hazardous: isHazardous,
      explanation: "Showing NASA's own hazard flag — the detailed risk model is temporarily unavailable."
    });
  }
}

export default router;
