import type { Item, ItemPriceSummary, ItemStatus } from '@shared/models/item';
import { query } from './pool.js';

const itemColumns = `
  i.id,
  i.project_id,
  i.manufacturer,
  i.model,
  i.source_url_id,
  i.status,
  i.note,
  i.attributes,
  i.created_at,
  i.updated_at,
  u.url AS source_url,
  price_summary.min_amount AS price_min_amount,
  price_summary.max_amount AS price_max_amount,
  price_summary.total_count AS price_count,
  price_summary.currency AS price_currency,
  price_summary.currency_count AS price_currency_count,
  price_summary.min_new_amount AS price_min_new_amount,
  price_summary.new_count AS price_new_count,
  price_summary.new_currency AS price_new_currency,
  price_summary.new_currency_count AS price_new_currency_count,
  price_summary.min_used_amount AS price_min_used_amount,
  price_summary.used_count AS price_used_count,
  price_summary.used_currency AS price_used_currency,
  price_summary.used_currency_count AS price_used_currency_count
`;

export interface ItemRow {
  id: string;
  project_id: string;
  manufacturer: string | null;
  model: string;
  source_url_id: string | null;
  status: ItemStatus;
  note: string | null;
  attributes: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
  source_url: string | null;
  price_min_amount: string | null;
  price_max_amount: string | null;
  price_count: number | null;
  price_currency: string | null;
  price_currency_count: number | null;
  price_min_new_amount: string | null;
  price_new_count: number | null;
  price_new_currency: string | null;
  price_new_currency_count: number | null;
  price_min_used_amount: string | null;
  price_used_count: number | null;
  price_used_currency: string | null;
  price_used_currency_count: number | null;
}

export type ItemRecord = Item;

const mapItemRow = (row: ItemRow): ItemRecord => {
  const priceCount = row.price_count ?? 0;
  const priceSummary: ItemPriceSummary | null =
    priceCount > 0 && row.price_min_amount !== null && row.price_max_amount !== null
      ? {
          minAmount: Number(row.price_min_amount),
          maxAmount: Number(row.price_max_amount),
          currency: row.price_currency,
          priceCount,
          hasMixedCurrency: (row.price_currency_count ?? 0) > 1,
          newMinAmount:
            row.price_min_new_amount !== null ? Number(row.price_min_new_amount) : null,
          newCount: row.price_new_count ?? 0,
          newCurrency: row.price_new_currency,
          newHasMixedCurrency: (row.price_new_currency_count ?? 0) > 1,
          usedMinAmount:
            row.price_min_used_amount !== null ? Number(row.price_min_used_amount) : null,
          usedCount: row.price_used_count ?? 0,
          usedCurrency: row.price_used_currency,
          usedHasMixedCurrency: (row.price_used_currency_count ?? 0) > 1
        }
      : null;

  return {
    id: row.id,
    projectId: row.project_id,
    manufacturer: row.manufacturer,
    model: row.model,
    sourceUrlId: row.source_url_id,
    sourceUrl: row.source_url,
    status: row.status,
    note: row.note,
    attributes: row.attributes ?? {},
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    priceSummary
  };
};

export interface ListItemsOptions {
  projectId: string;
  status?: ItemStatus;
  limit: number;
  offset: number;
}

export const listItems = async (options: ListItemsOptions): Promise<ItemRecord[]> => {
  const params: unknown[] = [options.projectId];
  const filters: string[] = ['i.project_id = $1'];

  if (options.status) {
    params.push(options.status);
    filters.push(`i.status = $${params.length}`);
  }

  params.push(options.limit);
  const limitIndex = params.length;
  params.push(options.offset);
  const offsetIndex = params.length;

  const result = await query<ItemRow>(
    `
      SELECT ${itemColumns}
      FROM items i
      LEFT JOIN urls u ON u.id = i.source_url_id
      LEFT JOIN LATERAL (
        SELECT
          MIN(ip.amount) AS min_amount,
          MAX(ip.amount) AS max_amount,
          COUNT(*)::INT AS total_count,
          COUNT(DISTINCT ip.currency)::INT AS currency_count,
          MIN(ip.currency) AS currency,
          MIN(CASE WHEN ip.condition = 'new' THEN ip.amount END) AS min_new_amount,
          COUNT(CASE WHEN ip.condition = 'new' THEN 1 END)::INT AS new_count,
          COUNT(DISTINCT CASE WHEN ip.condition = 'new' THEN ip.currency END)::INT AS new_currency_count,
          MIN(CASE WHEN ip.condition = 'new' THEN ip.currency END) AS new_currency,
          MIN(CASE WHEN ip.condition = 'used' THEN ip.amount END) AS min_used_amount,
          COUNT(CASE WHEN ip.condition = 'used' THEN 1 END)::INT AS used_count,
          COUNT(DISTINCT CASE WHEN ip.condition = 'used' THEN ip.currency END)::INT AS used_currency_count,
          MIN(CASE WHEN ip.condition = 'used' THEN ip.currency END) AS used_currency
        FROM item_prices ip
        WHERE ip.item_id = i.id
      ) price_summary ON TRUE
      WHERE ${filters.join(' AND ')}
      ORDER BY i.created_at DESC
      LIMIT $${limitIndex}
      OFFSET $${offsetIndex}
    `,
    params
  );

  return result.rows.map(mapItemRow);
};

export interface CreateItemParams {
  projectId: string;
  manufacturer: string | null;
  model: string;
  sourceUrlId: string | null;
  status: ItemStatus;
  note: string | null;
  attributes: Record<string, unknown>;
}

export const createItem = async (params: CreateItemParams): Promise<ItemRecord> => {
  const result = await query<{ id: string }>(
    `
      INSERT INTO items (
        project_id,
        manufacturer,
        model,
        source_url_id,
        status,
        note,
        attributes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `,
    [
      params.projectId,
      params.manufacturer,
      params.model,
      params.sourceUrlId,
      params.status,
      params.note,
      params.attributes
    ]
  );

  const insertedId = result.rows[0]?.id;
  if (!insertedId) {
    throw new Error('Failed to create item');
  }

  const inserted = await getItemById(insertedId);
  if (!inserted) {
    throw new Error('Created item could not be loaded');
  }

  return inserted;
};

export const getItemById = async (id: string): Promise<ItemRecord | null> => {
  const result = await query<ItemRow>(
    `
      SELECT ${itemColumns}
      FROM items i
      LEFT JOIN urls u ON u.id = i.source_url_id
      LEFT JOIN LATERAL (
        SELECT
          MIN(ip.amount) AS min_amount,
          MAX(ip.amount) AS max_amount,
          COUNT(*)::INT AS total_count,
          COUNT(DISTINCT ip.currency)::INT AS currency_count,
          MIN(ip.currency) AS currency
        FROM item_prices ip
        WHERE ip.item_id = i.id
      ) price_summary ON TRUE
      WHERE i.id = $1
    `,
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapItemRow(result.rows[0]);
};

export interface UpdateItemParams {
  manufacturer?: string | null;
  model?: string;
  sourceUrlId?: string | null;
  status?: ItemStatus;
  note?: string | null;
  attributes?: Record<string, unknown>;
}

export const updateItem = async (
  id: string,
  params: UpdateItemParams
): Promise<ItemRecord | null> => {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (params.manufacturer !== undefined) {
    values.push(params.manufacturer);
    fields.push(`manufacturer = $${values.length}`);
  }

  if (params.model !== undefined) {
    values.push(params.model);
    fields.push(`model = $${values.length}`);
  }

  if (params.sourceUrlId !== undefined) {
    values.push(params.sourceUrlId);
    fields.push(`source_url_id = $${values.length}`);
  }

  if (params.status !== undefined) {
    values.push(params.status);
    fields.push(`status = $${values.length}`);
  }

  if (params.note !== undefined) {
    values.push(params.note);
    fields.push(`note = $${values.length}`);
  }

  if (params.attributes !== undefined) {
    values.push(params.attributes);
    fields.push(`attributes = $${values.length}`);
  }

  if (fields.length === 0) {
    return getItemById(id);
  }

  values.push(id);
  const idParamIndex = values.length;

  const result = await query<{ id: string }>(
    `
      UPDATE items
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${idParamIndex}
      RETURNING id
    `,
    values
  );

  if (result.rows.length === 0) {
    return null;
  }

  const updatedId = result.rows[0]?.id;
  if (!updatedId) {
    return null;
  }

  return getItemById(updatedId);
};

export const deleteItem = async (id: string): Promise<boolean> => {
  const result = await query(
    `
      DELETE FROM items
      WHERE id = $1
    `,
    [id]
  );

  return (result.rowCount ?? 0) > 0;
};
