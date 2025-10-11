import { Pool } from 'pg';
import { env } from '../config/env.js';

if (!env.databaseUrl) {
  throw new Error('DATABASE_URL is not set.');
}

export const pool = new Pool({
  connectionString: env.databaseUrl
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL client error', error);
});

export const getClient = () => pool.connect();

export const query = (text: string, params?: unknown[]) => pool.query(text, params);
