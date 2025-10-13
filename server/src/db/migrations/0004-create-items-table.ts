import type { Migration } from './types.js';

export const migration: Migration = {
  name: '0004-create-items-table',
  up: async (client) => {
    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

    await client.query(`
      DO $$
      BEGIN
        CREATE TYPE item_status AS ENUM ('active', 'rejected');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END$$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        manufacturer VARCHAR(120),
        model VARCHAR(150) NOT NULL,
        source_url_id UUID REFERENCES urls(id) ON DELETE SET NULL,
        status item_status NOT NULL DEFAULT 'active',
        note TEXT,
        attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS items_project_id_idx ON items (project_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS items_source_url_id_idx ON items (source_url_id);
    `);
  }
};
