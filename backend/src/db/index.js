import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/neo_watch';
const isCloudDb = process.env.DATABASE_URL && (
  process.env.DATABASE_URL.includes('neon.tech') ||
  process.env.DATABASE_URL.includes('supabase') ||
  process.env.DATABASE_URL.includes('render.com') ||
  process.env.DATABASE_URL.includes('sslmode=require') ||
  process.env.NODE_ENV === 'production'
);

export const pool = new Pool({
  connectionString: dbUrl,
  ssl: isCloudDb ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
  console.error('[Postgres Pool Error]', err);
});

export const query = (text, params) => pool.query(text, params);

export default {
  pool,
  query
};
