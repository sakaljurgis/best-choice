import { Pool, type QueryResultRow } from 'pg';
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

export const query = <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
) => pool.query<T>(text, params);
