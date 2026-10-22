import { Router } from 'express';
import { query } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// All notification endpoints require user authentication
router.use(requireAuth);

/**
 * Format kilometer distance to human readable (Millions of km & Lunar Distances)
 */
function formatDistance(km) {
  if (!km) return 'close proximity';
  const num = Number(km);
  const ld = (num / 384400).toFixed(1);
  const millions = (num / 1000000).toFixed(2);
  return `${millions}M km (${ld} Lunar Distances)`;
}

/**
 * GET /api/notifications
 * Retrieves notifications for the authenticated user, newest first.
 * Supports optional ?unread=true filter and ?limit=50.
 */
router.get('/', async (req, res) => {
  try {
    const unreadOnly = req.query.unread === 'true';
    const limit = parseInt(req.query.limit, 10) || 50;

    let sql = `
      SELECT 
        n.id,
        n.user_id,
        n.neo_object_id,
        n.type,
        n.title,
        n.message,
        n.severity,
        n.is_read,
        n.created_at,
        o.name AS neo_name,
        o.neo_reference_id,
        o.is_potentially_hazardous
      FROM notifications n
      LEFT JOIN neo_objects o ON n.neo_object_id = o.id
      WHERE n.user_id = $1
    `;

    const params = [req.user.id];

    if (unreadOnly) {
      sql += ' AND n.is_read = false';
    }

    sql += ' ORDER BY n.created_at DESC LIMIT $2;';
    params.push(limit);

    const result = await query(sql, params);

    // Fast unread count
    const countSql = 'SELECT COUNT(*)::int AS unread_count FROM notifications WHERE user_id = $1 AND is_read = false;';
    const countRes = await query(countSql, [req.user.id]);

    return res.json({
      notifications: result.rows,
      count: result.rows.length,
      unreadCount: countRes.rows[0].unread_count || 0
    });
  } catch (err) {
    console.error('[Notifications GET Error]', err);
    return res.status(500).json({ error: 'Failed to retrieve notifications' });
  }
});

/**
 * GET /api/notifications/unread-count
 * Returns lightweight unread count for fast UI badge polling.
 */
router.get('/unread-count', async (req, res) => {
  try {
    const sql = 'SELECT COUNT(*)::int AS unread_count FROM notifications WHERE user_id = $1 AND is_read = false;';
    const result = await query(sql, [req.user.id]);
    return res.json({ unreadCount: result.rows[0].unread_count || 0 });
  } catch (err) {
    console.error('[Notifications Unread-Count Error]', err);
    return res.status(500).json({ error: 'Failed to count unread notifications' });
  }
});

/**
 * PUT /api/notifications/:id/read
 * Marks a specific notification as read.
 */
router.put('/:id/read', async (req, res) => {
  try {
    const notifId = parseInt(req.params.id, 10);
    if (isNaN(notifId)) {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }

    const sql = `
      UPDATE notifications
      SET is_read = true
      WHERE id = $1 AND user_id = $2
      RETURNING *;
    `;
    const result = await query(sql, [notifId, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found or access denied' });
    }

    return res.json({
      message: 'Notification marked as read',
      notification: result.rows[0]
    });
  } catch (err) {
    console.error('[Notifications Read Error]', err);
    return res.status(500).json({ error: 'Failed to update notification' });
  }
});

/**
 * PUT /api/notifications/read-all
 * Marks all notifications for the authenticated user as read.
 */
router.put('/read-all', async (req, res) => {
  try {
    const sql = `
      UPDATE notifications
      SET is_read = true
      WHERE user_id = $1 AND is_read = false
      RETURNING id;
    `;
    const result = await query(sql, [req.user.id]);

    return res.json({
      message: 'All notifications marked as read',
      updatedCount: result.rows.length
    });
  } catch (err) {
    console.error('[Notifications Read-All Error]', err);
    return res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

/**
 * DELETE /api/notifications/:id
 * Dismisses/deletes a single notification.
 */
router.delete('/:id', async (req, res) => {
  try {
    const notifId = parseInt(req.params.id, 10);
    if (isNaN(notifId)) {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }

    const sql = 'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id;';
    const result = await query(sql, [notifId, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found or access denied' });
    }

    return res.json({
      message: 'Notification dismissed',
      id: notifId
    });
  } catch (err) {
    console.error('[Notifications DELETE Error]', err);
    return res.status(500).json({ error: 'Failed to delete notification' });
  }
});

/**
 * DELETE /api/notifications
 * Clears all notifications for the authenticated user.
 */
router.delete('/', async (req, res) => {
  try {
    const sql = 'DELETE FROM notifications WHERE user_id = $1 RETURNING id;';
    const result = await query(sql, [req.user.id]);

    return res.json({
      message: 'All notifications cleared',
      deletedCount: result.rows.length
    });
  } catch (err) {
    console.error('[Notifications Clear-All Error]', err);
    return res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

/**
 * POST /api/notifications/check-alerts
 * Evaluator engine: inspects the user's watchlisted asteroids and synthesizes
 * upcoming close approach, hazard shift, and orbital refinement alerts.
 */
router.post('/check-alerts', async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Fetch user's watchlisted asteroids
    const watchlistSql = `
      SELECT 
        w.neo_object_id,
        n.id,
        n.name,
        n.neo_reference_id,
        n.is_potentially_hazardous,
        oe.eccentricity,
        oe.inclination,
        oe.semi_major_axis
      FROM watchlists w
      JOIN neo_objects n ON w.neo_object_id = n.id
      LEFT JOIN orbital_elements oe ON oe.neo_object_id = n.id
      WHERE w.user_id = $1;
    `;
    const watchlistRes = await query(watchlistSql, [userId]);
    const trackedNeos = watchlistRes.rows;

    let generatedCount = 0;

    for (const neo of trackedNeos) {
      // A. Check for upcoming close approaches (within 60 days)
      const caSql = `
        SELECT approach_date, miss_distance_km, relative_velocity_kmh
        FROM close_approach_events
        WHERE neo_object_id = $1 AND approach_date >= NOW()
        ORDER BY approach_date ASC
        LIMIT 1;
      `;
      const caRes = await query(caSql, [neo.id]);

      if (caRes.rows.length > 0) {
        const ca = caRes.rows[0];
        const approachDate = new Date(ca.approach_date);
        const daysDiff = Math.ceil((approachDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

        if (daysDiff >= 0 && daysDiff <= 60) {
          // Idempotency check: avoid duplicate alert within 7 days
          const dupeCheck = await query(`
            SELECT id FROM notifications 
            WHERE user_id = $1 AND neo_object_id = $2 AND type = 'close_approach'
              AND created_at >= NOW() - INTERVAL '7 days';
          `, [userId, neo.id]);

          if (dupeCheck.rows.length === 0) {
            const dateStr = approachDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const title = `🚀 Upcoming Pass: ${neo.name}`;
            const msg = `${neo.name} is scheduled for an Earth close pass in ${daysDiff} days (${dateStr}) at ${formatDistance(ca.miss_distance_km)}.`;
            const severity = daysDiff <= 14 ? 'warning' : 'info';

            await query(`
              INSERT INTO notifications (user_id, neo_object_id, type, title, message, severity)
              VALUES ($1, $2, 'close_approach', $3, $4, $5);
            `, [userId, neo.id, title, msg, severity]);

            generatedCount++;
          }
        }
      }

      // B. Check for Potentially Hazardous Asteroid notice
      if (neo.is_potentially_hazardous) {
        const hazardDupe = await query(`
          SELECT id FROM notifications 
          WHERE user_id = $1 AND neo_object_id = $2 AND type = 'hazard_shift';
        `, [userId, neo.id]);

        if (hazardDupe.rows.length === 0) {
          const title = `⚠️ Tracked Hazard Notice: ${neo.name}`;
          const msg = `${neo.name} is tracked under NASA Potentially Hazardous Asteroid eligibility criteria due to its orbital approach proximity (<0.05 AU).`;

          await query(`
            INSERT INTO notifications (user_id, neo_object_id, type, title, message, severity)
            VALUES ($1, $2, 'hazard_shift', $3, $4, 'alert');
          `, [userId, neo.id, title, msg]);

          generatedCount++;
        }
      }

      // C. Check for notable orbital parameter refinement notice
      if (neo.eccentricity && Number(neo.eccentricity) > 0.45) {
        const orbDupe = await query(`
          SELECT id FROM notifications 
          WHERE user_id = $1 AND neo_object_id = $2 AND type = 'refinement';
        `, [userId, neo.id]);

        if (orbDupe.rows.length === 0) {
          const title = `🔬 Orbital Refinement: ${neo.name}`;
          const msg = `JPL radar trajectory analysis confirms high-eccentricity orbital solution (e = ${Number(neo.eccentricity).toFixed(3)}, inclination = ${Number(neo.inclination || 0).toFixed(1)}°).`;

          await query(`
            INSERT INTO notifications (user_id, neo_object_id, type, title, message, severity)
            VALUES ($1, $2, 'refinement', $3, $4, 'info');
          `, [userId, neo.id, title, msg]);

          generatedCount++;
        }
      }
    }

    return res.json({
      message: 'Alert check completed',
      trackedCount: trackedNeos.length,
      newAlertsGenerated: generatedCount
    });
  } catch (err) {
    console.error('[Notifications Check-Alerts Error]', err);
    return res.status(500).json({ error: 'Failed to evaluate notifications' });
  }
});

export default router;
