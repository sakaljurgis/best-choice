import type { Migration } from './types.js';
import { migration as enablePgvector } from './0001-enable-pgvector.js';
import { migration as createProjectsTable } from './0002-create-projects-table.js';
import { migration as createUrlsTable } from './0003-create-urls-table.js';
import { migration as createItemsTable } from './0004-create-items-table.js';
import { migration as createItemPricesTable } from './0005-create-item-prices-table.js';
import { migration as createImagesTable } from './0006-create-images-table.js';
import { migration as addDefaultImageToItems } from './0007-add-default-image-to-items.js';

export const migrations: Migration[] = [
  enablePgvector,
  createProjectsTable,
  createUrlsTable,
  createItemsTable,
  createItemPricesTable,
  createImagesTable,
  addDefaultImageToItems,
];
