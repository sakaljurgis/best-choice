import type { ItemPrice, PriceCondition, PriceSourceType } from '@shared/models/item-price';
import { pool, query } from './pool.js';

const priceColumns = `
  p.id,
  p.item_id,
  p.condition,
  p.amount,
  p.currency,
  p.source_type,
  p.source_url_id,
  p.source_note,
  p.note,
  p.observed_at,
  p.is_primary,
  p.created_at,
  p.updated_at,
  u.url AS source_url
`;

export interface ItemPriceRow {
  id: string;
  item_id: string;
  condition: PriceCondition;
  amount: string;
  currency: string;
  source_type: PriceSourceType;
  source_url_id: string | null;
  source_note: string | null;
  note: string | null;
  observed_at: Date;
  is_primary: boolean;
  created_at: Date;
  updated_at: Date;
  source_url: string | null;
}

export type ItemPriceRecord = ItemPrice;

const mapItemPriceRow = (row: ItemPriceRow): ItemPriceRecord => ({
  id: row.id,
  itemId: row.item_id,
  condition: row.condition,
  amount: Number(row.amount),
  currency: row.currency,
  sourceType: row.source_type,
  sourceUrlId: row.source_url_id,
  sourceUrl: row.source_url,
  sourceNote: row.source_note,
  note: row.note,
  observedAt: row.observed_at.toISOString(),
  isPrimary: row.is_primary,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString()
});

export interface ListItemPricesOptions {
  itemId: string;
  limit: number;
  offset: number;
  condition?: PriceCondition;
}

export const listItemPrices = async (
  options: ListItemPricesOptions
): Promise<ItemPriceRecord[]> => {
  const params: unknown[] = [options.itemId];
  const filters: string[] = ['p.item_id = $1'];

  if (options.condition) {
    params.push(options.condition);
    filters.push(`p.condition = $${params.length}`);
  }

  params.push(options.limit);
  const limitIndex = params.length;
  params.push(options.offset);
  const offsetIndex = params.length;

  const result = await query<ItemPriceRow>(
    `
      SELECT ${priceColumns}
      FROM item_prices p
      LEFT JOIN urls u ON u.id = p.source_url_id
      WHERE ${filters.join(' AND ')}
      ORDER BY p.observed_at DESC
      LIMIT $${limitIndex}
      OFFSET $${offsetIndex}
    `,
    params
  );

  return result.rows.map(mapItemPriceRow);
};

export interface CreateItemPriceParams {
  itemId: string;
  condition: PriceCondition;
  amount: number;
  currency: string;
  sourceType: PriceSourceType;
  sourceUrlId: string | null;
  sourceNote: string | null;
  note: string | null;
  observedAt?: string;
  isPrimary: boolean;
}

export const createItemPrice = async (
  params: CreateItemPriceParams
): Promise<ItemPriceRecord> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (params.isPrimary) {
      await client.query(
        `
          UPDATE item_prices
          SET is_primary = FALSE
          WHERE item_id = $1 AND condition = $2
        `,
        [params.itemId, params.condition]
      );
    }

    const result = await client.query<{ id: string }>(
      `
        INSERT INTO item_prices (
          item_id,
          condition,
          amount,
          currency,
          source_type,
          source_url_id,
          source_note,
          note,
          observed_at,
          is_primary
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, NOW()), $10)
        RETURNING id
      `,
      [
        params.itemId,
        params.condition,
        params.amount,
        params.currency,
        params.sourceType,
        params.sourceUrlId,
        params.sourceNote,
        params.note,
        params.observedAt ?? null,
        params.isPrimary
      ]
    );

    const insertedId = result.rows[0]?.id;
    if (!insertedId) {
      throw new Error('Failed to create item price');
    }

    const record = await client.query<ItemPriceRow>(
      `
        SELECT ${priceColumns}
        FROM item_prices p
        LEFT JOIN urls u ON u.id = p.source_url_id
        WHERE p.id = $1
      `,
      [insertedId]
    );

    await client.query('COMMIT');
    return mapItemPriceRow(record.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getItemPriceById = async (id: string): Promise<ItemPriceRecord | null> => {
  const result = await query<ItemPriceRow>(
    `
      SELECT ${priceColumns}
      FROM item_prices p
      LEFT JOIN urls u ON u.id = p.source_url_id
      WHERE p.id = $1
    `,
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapItemPriceRow(result.rows[0]);
};

export interface UpdateItemPriceParams {
  condition?: PriceCondition;
  amount?: number;
  currency?: string;
  sourceType?: PriceSourceType;
  sourceUrlId?: string | null;
  sourceNote?: string | null;
  note?: string | null;
  observedAt?: string;
  isPrimary?: boolean;
}

export const updateItemPrice = async (
  id: string,
  params: UpdateItemPriceParams
): Promise<ItemPriceRecord | null> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existingResult = await client.query<ItemPriceRow>(
      `
        SELECT ${priceColumns}
        FROM item_prices p
        LEFT JOIN urls u ON u.id = p.source_url_id
        WHERE p.id = $1
        FOR UPDATE
      `,
      [id]
    );

    if (existingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const existing = existingResult.rows[0];
    const fields: string[] = [];
    const values: unknown[] = [];

    if (params.condition !== undefined) {
      values.push(params.condition);
      fields.push(`condition = $${values.length}`);
    }
    if (params.amount !== undefined) {
      values.push(params.amount);
      fields.push(`amount = $${values.length}`);
    }
    if (params.currency !== undefined) {
      values.push(params.currency);
      fields.push(`currency = $${values.length}`);
    }
    if (params.sourceType !== undefined) {
      values.push(params.sourceType);
      fields.push(`source_type = $${values.length}`);
    }
    if (params.sourceUrlId !== undefined) {
      values.push(params.sourceUrlId);
      fields.push(`source_url_id = $${values.length}`);
    }
    if (params.sourceNote !== undefined) {
      values.push(params.sourceNote);
      fields.push(`source_note = $${values.length}`);
    }
    if (params.note !== undefined) {
      values.push(params.note);
      fields.push(`note = $${values.length}`);
    }
    if (params.observedAt !== undefined) {
      values.push(params.observedAt);
      fields.push(`observed_at = COALESCE($${values.length}, NOW())`);
    }
    if (params.isPrimary !== undefined) {
      values.push(params.isPrimary);
      fields.push(`is_primary = $${values.length}`);
    }

    if (fields.length > 0) {
      values.push(id);
      const idIndex = values.length;

      await client.query(
        `
          UPDATE item_prices
          SET ${fields.join(', ')}, updated_at = NOW()
          WHERE id = $${idIndex}
        `,
        values
      );
    }

    const newCondition = params.condition ?? existing.condition;
    const newIsPrimary = params.isPrimary ?? existing.is_primary;

    if (newIsPrimary) {
      await client.query(
        `
          UPDATE item_prices
          SET is_primary = FALSE
          WHERE item_id = $1 AND condition = $2 AND id <> $3
        `,
        [existing.item_id, newCondition, id]
      );
    }

    const updatedResult = await client.query<ItemPriceRow>(
      `
        SELECT ${priceColumns}
        FROM item_prices p
        LEFT JOIN urls u ON u.id = p.source_url_id
        WHERE p.id = $1
      `,
      [id]
    );

    await client.query('COMMIT');
    return mapItemPriceRow(updatedResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const deleteItemPrice = async (id: string): Promise<boolean> => {
  const result = await query(
    `
      DELETE FROM item_prices
      WHERE id = $1
    `,
    [id]
  );

  return (result.rowCount ?? 0) > 0;
};
