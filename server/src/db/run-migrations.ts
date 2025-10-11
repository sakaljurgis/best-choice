import type { PoolClient } from 'pg';
import { pool } from './pool.js';
import { migrations } from './migrations/index.js';

const MIGRATIONS_TABLE = 'migrations';

const ensureMigrationsTable = async (client: PoolClient) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      run_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
};

export const runMigrations = async () => {
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);

    const executedMigrations = await client.query<{ name: string }>(
      `SELECT name FROM ${MIGRATIONS_TABLE} ORDER BY run_at ASC`
    );
    const executedCodeNames = new Set(
      executedMigrations.rows.map((row) => row.name)
    );

    for (const migration of migrations) {
      if (executedCodeNames.has(migration.name)) {
        continue;
      }

      console.log(`Running migration ${migration.name}`);

      await client.query('BEGIN');
      try {
        await migration.up(client);
        await client.query(
          `INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES ($1)`,
          [migration.name]
        );
        await client.query('COMMIT');
        console.log(`Migration ${migration.name} completed`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    client.release();
  }
};
