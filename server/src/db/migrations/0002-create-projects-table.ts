import type { Migration } from './types.js';

export const migration: Migration = {
  name: '0002-create-projects-table',
  up: async (client) => {
    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

    await client.query(`
      DO $$
      BEGIN
        CREATE TYPE project_status AS ENUM ('active', 'archived');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END$$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(150) NOT NULL,
        description TEXT,
        status project_status NOT NULL DEFAULT 'active',
        project_attributes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
        project_priority_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  }
};
