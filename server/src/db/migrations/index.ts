import type { Migration } from './types.js';
import { migration as enablePgvector } from './0001-enable-pgvector.js';

export const migrations: Migration[] = [enablePgvector];
