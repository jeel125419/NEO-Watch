import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/neo_watch';
  console.log(`[Migration] Connecting to database...`);

  const isCloudDb = process.env.DATABASE_URL && (
    process.env.DATABASE_URL.includes('neon.tech') ||
    process.env.DATABASE_URL.includes('supabase') ||
    process.env.DATABASE_URL.includes('render.com') ||
    process.env.DATABASE_URL.includes('sslmode=require') ||
    process.env.NODE_ENV === 'production'
  );

  const sslConfig = isCloudDb ? { rejectUnauthorized: false } : false;

  // First, verify or create the neo_watch database by connecting to default postgres DB (local only)
  const urlObj = new URL(dbUrl);
  const targetDbName = urlObj.pathname.replace(/^\//, '');

  if (!isCloudDb && targetDbName && targetDbName !== 'postgres') {
    const maintenanceUrl = new URL(dbUrl);
    maintenanceUrl.pathname = '/postgres';
    const maintenanceClient = new pg.Client({ connectionString: maintenanceUrl.toString(), ssl: sslConfig });

    try {
      await maintenanceClient.connect();
      const checkRes = await maintenanceClient.query(
        "SELECT 1 FROM pg_database WHERE datname = $1",
        [targetDbName]
      );
      if (checkRes.rowCount === 0) {
        console.log(`[Migration] Database '${targetDbName}' does not exist. Creating...`);
        await maintenanceClient.query(`CREATE DATABASE "${targetDbName}"`);
        console.log(`[Migration] Database '${targetDbName}' created.`);
      }
    } catch (err) {
      console.warn(`[Migration] Note: Could not auto-create database via maintenance connection (${err.message}). Assuming target database exists or will be created.`);
    } finally {
      await maintenanceClient.end().catch(() => {});
    }
  }

  // Connect to target DB and apply schema
  const client = new pg.Client({ connectionString: dbUrl, ssl: sslConfig });
  try {
    await client.connect();
    console.log(`[Migration] Connected to '${targetDbName}'. Reading schema.sql...`);
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await client.query(schemaSql);
    console.log('[Migration] Database schema applied successfully!');
  } catch (err) {
    console.error('[Migration Error]', err.message);
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

runMigration();
