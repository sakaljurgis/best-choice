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
      CREATE TABLE IF NOT EXISTS item_prices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
        condition price_condition NOT NULL,
        amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
        currency CHAR(3) NOT NULL,
        source_url_id UUID REFERENCES urls(id) ON DELETE SET NULL,
        note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CHECK (char_length(currency) = 3)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS item_prices_item_id_idx ON item_prices (item_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS item_prices_source_url_id_idx ON item_prices (source_url_id);
    `);
  }
};
