import { Router } from 'express';
import { query } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// All watchlist routes require authentication
router.use(requireAuth);

/**
 * GET /api/watchlist
 * Retrieve all asteroids in the authenticated user's watchlist with closest encounter details
 */
router.get('/', async (req, res) => {
  try {
    const sql = `
      SELECT 
        w.id AS watchlist_id,
        w.added_at,
        n.id,
        n.neo_reference_id,
        n.name,
        n.absolute_magnitude_h,
        n.estimated_diameter_min_km,
        n.estimated_diameter_max_km,
        n.is_potentially_hazardous,
        n.last_synced_at,
        closest_ca.miss_distance_km AS closest_miss_distance_km,
        closest_ca.approach_date AS closest_approach_date,
        oe.eccentricity,
        oe.inclination,
        oe.semi_major_axis
      FROM watchlists w
      JOIN neo_objects n ON w.neo_object_id = n.id
      LEFT JOIN orbital_elements oe ON oe.neo_object_id = n.id
      LEFT JOIN LATERAL (
        SELECT miss_distance_km, approach_date
        FROM close_approach_events
        WHERE neo_object_id = n.id
        ORDER BY miss_distance_km ASC NULLS LAST
        LIMIT 1
      ) closest_ca ON true
      WHERE w.user_id = $1
      ORDER BY w.added_at DESC;
    `;

    const result = await query(sql, [req.user.id]);
    return res.json({
      watchlist: result.rows,
      count: result.rows.length
    });
  } catch (err) {
    console.error('[Watchlist GET Error]', err);
    return res.status(500).json({ error: 'Failed to retrieve watchlist' });
  }
});

/**
 * GET /api/watchlist/ids
 * Returns an array of neo_object_id integers tracked by the user for fast O(1) frontend lookup
 */
router.get('/ids', async (req, res) => {
  try {
    const result = await query(
      'SELECT neo_object_id FROM watchlists WHERE user_id = $1 ORDER BY neo_object_id ASC',
      [req.user.id]
    );
    const ids = result.rows.map(r => r.neo_object_id);
    return res.json({ ids });
  } catch (err) {
    console.error('[Watchlist IDs Error]', err);
    return res.status(500).json({ error: 'Failed to fetch watchlist IDs' });
  }
});

/**
 * GET /api/watchlist/check/:neo_id
 * Check if a specific asteroid is on the user's watchlist
 */
router.get('/check/:neo_id', async (req, res) => {
  const neoId = parseInt(req.params.neo_id, 10);
  if (isNaN(neoId) || neoId <= 0) {
    return res.status(400).json({ error: 'Invalid asteroid ID' });
  }

  try {
    const result = await query(
      'SELECT id FROM watchlists WHERE user_id = $1 AND neo_object_id = $2',
      [req.user.id, neoId]
    );
    return res.json({ in_watchlist: result.rows.length > 0 });
  } catch (err) {
    console.error('[Watchlist Check Error]', err);
    return res.status(500).json({ error: 'Failed to check watchlist status' });
  }
});

/**
 * POST /api/watchlist/:neo_id
 * Add an asteroid to the user's watchlist
 */
router.post('/:neo_id', async (req, res) => {
  const neoId = parseInt(req.params.neo_id, 10);
  if (isNaN(neoId) || neoId <= 0) {
    return res.status(400).json({ error: 'Invalid asteroid ID' });
  }

  try {
    // Verify asteroid exists
    const neoRes = await query('SELECT id, name FROM neo_objects WHERE id = $1', [neoId]);
    if (neoRes.rows.length === 0) {
      return res.status(404).json({ error: 'Asteroid not found' });
    }

    const insertRes = await query(
      `INSERT INTO watchlists (user_id, neo_object_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, neo_object_id) DO NOTHING
       RETURNING id, added_at`,
      [req.user.id, neoId]
    );

    const alreadyExisted = insertRes.rows.length === 0;

    return res.status(alreadyExisted ? 200 : 201).json({
      message: alreadyExisted ? 'Asteroid already in watchlist' : 'Asteroid added to watchlist',
      neo_object_id: neoId,
      name: neoRes.rows[0].name
    });
  } catch (err) {
    console.error('[Watchlist Add Error]', err);
    return res.status(500).json({ error: 'Failed to add asteroid to watchlist' });
  }
});

/**
 * DELETE /api/watchlist/:neo_id
 * Remove an asteroid from the user's watchlist
 */
router.delete('/:neo_id', async (req, res) => {
  const neoId = parseInt(req.params.neo_id, 10);
  if (isNaN(neoId) || neoId <= 0) {
    return res.status(400).json({ error: 'Invalid asteroid ID' });
  }

  try {
    const delRes = await query(
      'DELETE FROM watchlists WHERE user_id = $1 AND neo_object_id = $2 RETURNING id',
      [req.user.id, neoId]
    );

    return res.json({
      message: 'Asteroid removed from watchlist',
      neo_object_id: neoId,
      removed: delRes.rows.length > 0
    });
  } catch (err) {
    console.error('[Watchlist Remove Error]', err);
    return res.status(500).json({ error: 'Failed to remove asteroid from watchlist' });
  }
});

export default router;
