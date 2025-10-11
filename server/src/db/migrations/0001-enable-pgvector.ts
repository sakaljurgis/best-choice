import type { Migration } from './types.js';

export const migration: Migration = {
  name: '0001-enable-pgvector',
  up: async (client) => {
    await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
  }
};
