import { Router } from 'express';
import { query } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// All observation logging endpoints require authentication
router.use(requireAuth);

/**
 * GET /api/observations
 * Returns all observations logged by the authenticated user, newest first.
 */
router.get('/', async (req, res) => {
  try {
    const sql = `
      SELECT 
        o.id,
        o.user_id,
        o.neo_object_id,
        o.observed_at,
        o.lat,
        o.long,
        o.notes,
        n.name AS neo_name,
        n.neo_reference_id,
        n.estimated_diameter_max_km,
        n.is_potentially_hazardous
      FROM observations o
      JOIN neo_objects n ON o.neo_object_id = n.id
      WHERE o.user_id = $1
      ORDER BY o.observed_at DESC;
    `;

    const result = await query(sql, [req.user.id]);
    return res.json({
      observations: result.rows,
      count: result.rows.length
    });
  } catch (err) {
    console.error('[Observations GET Error]', err);
    return res.status(500).json({ error: 'Failed to retrieve observations' });
  }
});

/**
 * GET /api/observations/neo/:neo_id
 * Returns sightings logged by the user for a specific asteroid.
 */
router.get('/neo/:neo_id', async (req, res) => {
  try {
    const neoId = parseInt(req.params.neo_id, 10);
    if (isNaN(neoId)) {
      return res.status(400).json({ error: 'Invalid asteroid ID' });
    }

    const sql = `
      SELECT 
        o.id,
        o.user_id,
        o.neo_object_id,
        o.observed_at,
        o.lat,
        o.long,
        o.notes,
        n.name AS neo_name,
        n.neo_reference_id
      FROM observations o
      JOIN neo_objects n ON o.neo_object_id = n.id
      WHERE o.user_id = $1 AND o.neo_object_id = $2
      ORDER BY o.observed_at DESC;
    `;

    const result = await query(sql, [req.user.id, neoId]);
    return res.json({
      observations: result.rows,
      count: result.rows.length
    });
  } catch (err) {
    console.error('[Observations GET By Neo Error]', err);
    return res.status(500).json({ error: 'Failed to retrieve observations for asteroid' });
  }
});

/**
 * POST /api/observations
 * Logs a new observation sighting for an asteroid.
 */
router.post('/', async (req, res) => {
  try {
    const { neo_object_id, observed_at, lat, long, notes } = req.body;

    const neoId = parseInt(neo_object_id, 10);
    if (!neoId || isNaN(neoId)) {
      return res.status(400).json({ error: 'A valid neo_object_id is required' });
    }

    // Verify asteroid exists
    const neoCheck = await query('SELECT id, name FROM neo_objects WHERE id = $1', [neoId]);
    if (neoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Target asteroid not found' });
    }

    // Validate observation timestamp
    if (!observed_at) {
      return res.status(400).json({ error: 'Observation timestamp (observed_at) is required' });
    }
    const obsDate = new Date(observed_at);
    if (isNaN(obsDate.getTime())) {
      return res.status(400).json({ error: 'Invalid observation timestamp format' });
    }
    // Allow max 5 minutes into the future for minor clock drift
    if (obsDate.getTime() > Date.now() + 5 * 60 * 1000) {
      return res.status(400).json({ error: 'Observation time cannot be in the future' });
    }

    // Validate coordinates
    const latitude = parseFloat(lat);
    const longitude = parseFloat(long);
    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
      return res.status(400).json({ error: 'Latitude must be a number between -90 and 90' });
    }
    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: 'Longitude must be a number between -180 and 180' });
    }

    // Validate notes
    const sanitizedNotes = typeof notes === 'string' ? notes.trim() : '';
    if (sanitizedNotes.length > 1000) {
      return res.status(400).json({ error: 'Observation notes cannot exceed 1000 characters' });
    }

    const insertSql = `
      INSERT INTO observations (user_id, neo_object_id, observed_at, lat, long, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const result = await query(insertSql, [
      req.user.id,
      neoId,
      obsDate.toISOString(),
      latitude,
      longitude,
      sanitizedNotes || null
    ]);

    const created = result.rows[0];
    created.neo_name = neoCheck.rows[0].name;

    return res.status(201).json({
      message: 'Observation logged successfully',
      observation: created
    });
  } catch (err) {
    console.error('[Observations POST Error]', err);
    return res.status(500).json({ error: 'Failed to record observation' });
  }
});

/**
 * PUT /api/observations/:id
 * Updates notes or observation time on an existing sighting owned by the user.
 */
router.put('/:id', async (req, res) => {
  try {
    const obsId = parseInt(req.params.id, 10);
    if (isNaN(obsId)) {
      return res.status(400).json({ error: 'Invalid observation ID' });
    }

    // Check ownership
    const existing = await query('SELECT * FROM observations WHERE id = $1 AND user_id = $2', [obsId, req.user.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Observation record not found or access denied' });
    }

    const { notes, observed_at } = req.body;
    let newObsDate = existing.rows[0].observed_at;
    let newNotes = existing.rows[0].notes;

    if (observed_at !== undefined) {
      const parsed = new Date(observed_at);
      if (isNaN(parsed.getTime())) {
        return res.status(400).json({ error: 'Invalid observation timestamp format' });
      }
      if (parsed.getTime() > Date.now() + 5 * 60 * 1000) {
        return res.status(400).json({ error: 'Observation time cannot be in the future' });
      }
      newObsDate = parsed.toISOString();
    }

    if (notes !== undefined) {
      const sanitized = typeof notes === 'string' ? notes.trim() : '';
      if (sanitized.length > 1000) {
        return res.status(400).json({ error: 'Notes cannot exceed 1000 characters' });
      }
      newNotes = sanitized || null;
    }

    const updateSql = `
      UPDATE observations
      SET notes = $1, observed_at = $2
      WHERE id = $3 AND user_id = $4
      RETURNING *;
    `;
    const result = await query(updateSql, [newNotes, newObsDate, obsId, req.user.id]);

    return res.json({
      message: 'Observation updated successfully',
      observation: result.rows[0]
    });
  } catch (err) {
    console.error('[Observations PUT Error]', err);
    return res.status(500).json({ error: 'Failed to update observation' });
  }
});

/**
 * DELETE /api/observations/:id
 * Deletes an observation record owned by the user.
 */
router.delete('/:id', async (req, res) => {
  try {
    const obsId = parseInt(req.params.id, 10);
    if (isNaN(obsId)) {
      return res.status(400).json({ error: 'Invalid observation ID' });
    }

    const deleteSql = 'DELETE FROM observations WHERE id = $1 AND user_id = $2 RETURNING id;';
    const result = await query(deleteSql, [obsId, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Observation record not found or access denied' });
    }

    return res.json({
      message: 'Observation removed successfully',
      id: obsId
    });
  } catch (err) {
    console.error('[Observations DELETE Error]', err);
    return res.status(500).json({ error: 'Failed to delete observation' });
  }
});

export default router;
