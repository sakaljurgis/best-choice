import type { Migration } from './types.js';

export const migration: Migration = {
  name: '0003-create-urls-table',
  up: async (client) => {
    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

    await client.query(`
      CREATE TABLE IF NOT EXISTS urls (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        url TEXT NOT NULL UNIQUE,
        body_text TEXT,
        attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
        has_price BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  }
};
