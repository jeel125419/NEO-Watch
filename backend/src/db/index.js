import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/neo_watch'
});

pool.on('error', (err) => {
  console.error('[Postgres Pool Error]', err);
});

export const query = (text, params) => pool.query(text, params);

export default {
  pool,
  query
};
