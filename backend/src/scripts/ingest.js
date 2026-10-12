import axios from 'axios';
import dotenv from 'dotenv';
import { pool } from '../db/index.js';

dotenv.config();

const NASA_API_KEY = process.env.NASA_API_KEY && process.env.NASA_API_KEY !== 'YOUR_NASA_API_KEY'
  ? process.env.NASA_API_KEY
  : 'DEMO_KEY';

const BASE_URL = 'https://api.nasa.gov/neo/rest/v1/neo/browse';

async function ingestNEOData(targetCount = 80) {
  console.log(`[Ingest] Starting NASA NeoWs data ingestion (target: ~${targetCount} NEOs)...`);
  console.log(`[Ingest] Using API Key: ${NASA_API_KEY === 'DEMO_KEY' ? 'DEMO_KEY (public limit)' : 'Custom NASA Key'}`);

  let page = 0;
  let totalProcessed = 0;
  let hazardousCount = 0;

  try {
    while (totalProcessed < targetCount) {
      console.log(`[Ingest] Fetching page ${page} from NASA NeoWs API...`);
      const response = await axios.get(BASE_URL, {
        params: {
          api_key: NASA_API_KEY,
          page: page,
          size: 20
        },
        timeout: 10000
      });

      const nearEarthObjects = response.data?.near_earth_objects || [];
      if (nearEarthObjects.length === 0) {
        console.log('[Ingest] No more NEO records returned.');
        break;
      }

      for (const neo of nearEarthObjects) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          const refId = neo.neo_reference_id || neo.id;
          const name = neo.name || `NEO-${refId}`;
          const absMag = neo.absolute_magnitude_h != null ? parseFloat(neo.absolute_magnitude_h) : null;
          const diamMin = neo.estimated_diameter?.kilometers?.estimated_diameter_min != null
            ? parseFloat(neo.estimated_diameter.kilometers.estimated_diameter_min)
            : null;
          const diamMax = neo.estimated_diameter?.kilometers?.estimated_diameter_max != null
            ? parseFloat(neo.estimated_diameter.kilometers.estimated_diameter_max)
            : null;
          const isHazardous = Boolean(neo.is_potentially_hazardous_asteroid);

          if (isHazardous) {
            hazardousCount++;
          }

          // 1. Upsert neo_objects
          const neoUpsertQuery = `
            INSERT INTO neo_objects (
              neo_reference_id, name, absolute_magnitude_h,
              estimated_diameter_min_km, estimated_diameter_max_km,
              is_potentially_hazardous, last_synced_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            ON CONFLICT (neo_reference_id)
            DO UPDATE SET
              name = EXCLUDED.name,
              absolute_magnitude_h = EXCLUDED.absolute_magnitude_h,
              estimated_diameter_min_km = EXCLUDED.estimated_diameter_min_km,
              estimated_diameter_max_km = EXCLUDED.estimated_diameter_max_km,
              is_potentially_hazardous = EXCLUDED.is_potentially_hazardous,
              last_synced_at = NOW()
            RETURNING id;
          `;
          const neoRes = await client.query(neoUpsertQuery, [
            refId, name, absMag, diamMin, diamMax, isHazardous
          ]);
          const neoObjectId = neoRes.rows[0].id;

          // 2. Upsert orbital_elements (if present)
          const orb = neo.orbital_data;
          if (orb) {
            const orbUpsertQuery = `
              INSERT INTO orbital_elements (
                neo_object_id, eccentricity, inclination,
                semi_major_axis, orbital_period, perihelion_distance
              )
              VALUES ($1, $2, $3, $4, $5, $6)
              ON CONFLICT (neo_object_id)
              DO UPDATE SET
                eccentricity = EXCLUDED.eccentricity,
                inclination = EXCLUDED.inclination,
                semi_major_axis = EXCLUDED.semi_major_axis,
                orbital_period = EXCLUDED.orbital_period,
                perihelion_distance = EXCLUDED.perihelion_distance;
            `;
            await client.query(orbUpsertQuery, [
              neoObjectId,
              orb.eccentricity != null ? parseFloat(orb.eccentricity) : null,
              orb.inclination != null ? parseFloat(orb.inclination) : null,
              orb.semi_major_axis != null ? parseFloat(orb.semi_major_axis) : null,
              orb.orbital_period != null ? parseFloat(orb.orbital_period) : null,
              orb.perihelion_distance != null ? parseFloat(orb.perihelion_distance) : null
            ]);
          }

          // 3. Upsert close_approach_events
          const closeApproaches = neo.close_approach_data || [];
          if (closeApproaches.length > 0) {
            // Remove previous events to ensure clean idempotent replace
            await client.query('DELETE FROM close_approach_events WHERE neo_object_id = $1', [neoObjectId]);

            for (const ca of closeApproaches) {
              const caInsertQuery = `
                INSERT INTO close_approach_events (
                  neo_object_id, approach_date, relative_velocity_kmh,
                  miss_distance_km, orbiting_body
                )
                VALUES ($1, $2, $3, $4, $5);
              `;
              await client.query(caInsertQuery, [
                neoObjectId,
                ca.close_approach_date || null,
                ca.relative_velocity?.kilometers_per_hour ? parseFloat(ca.relative_velocity.kilometers_per_hour) : null,
                ca.miss_distance?.kilometers ? parseFloat(ca.miss_distance.kilometers) : null,
                ca.orbiting_body || 'Earth'
              ]);
            }
          }

          await client.query('COMMIT');
          totalProcessed++;
        } catch (itemErr) {
          await client.query('ROLLBACK');
          console.error(`[Ingest Error] Failed to process NEO ${neo.id}:`, itemErr.message);
        } finally {
          client.release();
        }

        if (totalProcessed >= targetCount) break;
      }

      page++;
      // Brief pause between pages to respect rate limits
      await new Promise(r => setTimeout(r, 400));
    }

    console.log(`\n========================================`);
    console.log(`[Ingest Complete]`);
    console.log(`Total NEO objects synced: ${totalProcessed}`);
    console.log(`Hazardous NEOs: ${hazardousCount} (${((hazardousCount / (totalProcessed || 1)) * 100).toFixed(1)}%)`);
    console.log(`========================================\n`);
  } catch (err) {
    console.error('[Ingest Fatal Error]', err.response?.data || err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

const target = process.argv[2] ? parseInt(process.argv[2], 10) : 80;
ingestNEOData(target);
