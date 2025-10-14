import type { ItemPrice, PriceCondition } from '@shared/models/item-price';
import { pool, query } from './pool.js';

const priceColumns = `
  p.id,
  p.item_id,
  p.condition,
  p.amount,
  p.currency,
  p.source_url_id,
  p.note,
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
  source_url_id: string | null;
  note: string | null;
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
  sourceUrlId: row.source_url_id,
  sourceUrl: row.source_url,
  note: row.note,
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
      ORDER BY p.created_at DESC
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
  sourceUrlId: string | null;
  note: string | null;
}

export const createItemPrice = async (
  params: CreateItemPriceParams
): Promise<ItemPriceRecord> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query<{ id: string }>(
      `
        INSERT INTO item_prices (
          item_id,
          condition,
          amount,
          currency,
          source_url_id,
          note
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `,
      [
        params.itemId,
        params.condition,
        params.amount,
        params.currency,
        params.sourceUrlId,
        params.note
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
  sourceUrlId?: string | null;
  note?: string | null;
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
    if (params.sourceUrlId !== undefined) {
      values.push(params.sourceUrlId);
      fields.push(`source_url_id = $${values.length}`);
    }
    if (params.note !== undefined) {
      values.push(params.note);
      fields.push(`note = $${values.length}`);
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
