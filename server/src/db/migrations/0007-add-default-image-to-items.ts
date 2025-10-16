import type { Migration } from './types.js';

export const migration: Migration = {
  name: '0007-add-default-image-to-items',
  up: async (client) => {
    await client.query(`
      ALTER TABLE items
      ADD COLUMN IF NOT EXISTS default_image_id UUID REFERENCES images(id) ON DELETE SET NULL
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS items_default_image_id_idx
      ON items (default_image_id)
    `);
  }
};
