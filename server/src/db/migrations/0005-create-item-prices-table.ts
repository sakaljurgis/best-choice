import type { Migration } from './types.js';

export const migration: Migration = {
  name: '0005-create-item-prices-table',
  up: async (client) => {
    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

    await client.query(`
      DO $$
      BEGIN
        CREATE TYPE price_condition AS ENUM ('new', 'used');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END$$;
    `);

    await client.query(`
      DO $$
      BEGIN
        CREATE TYPE price_source AS ENUM ('url', 'manual');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END$$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS item_prices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
        condition price_condition NOT NULL,
        amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
        currency CHAR(3) NOT NULL,
        source_type price_source NOT NULL,
        source_url_id UUID REFERENCES urls(id) ON DELETE SET NULL,
        source_note TEXT,
        note TEXT,
        observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        is_primary BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CHECK (char_length(currency) = 3),
        CHECK (
          (source_type = 'manual'::price_source AND source_url_id IS NULL)
          OR (source_type = 'url'::price_source AND source_url_id IS NOT NULL)
        )
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS item_prices_item_id_idx ON item_prices (item_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS item_prices_source_url_id_idx ON item_prices (source_url_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS item_prices_observed_at_idx ON item_prices (observed_at);
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS item_prices_primary_condition_idx
      ON item_prices (item_id, condition)
      WHERE is_primary = TRUE;
    `);
  }
};
