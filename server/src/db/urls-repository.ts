import { query } from './pool.js';

export interface UrlRow {
  id: string;
  url: string;
  note: string | null;
  attributes: unknown;
  has_price: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UrlRecord {
  id: string;
  url: string;
  note: string | null;
  attributes: unknown;
  hasPrice: boolean;
  createdAt: string;
  updatedAt: string;
}

const mapUrlRow = (row: UrlRow): UrlRecord => ({
  id: row.id,
  url: row.url,
  note: row.note,
  attributes: row.attributes ?? {},
  hasPrice: row.has_price,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString()
});

export const findUrlById = async (id: string): Promise<UrlRecord | null> => {
  const result = await query<UrlRow>(
    `
      SELECT id, url, note, attributes, has_price, created_at, updated_at
      FROM urls
      WHERE id = $1
    `,
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapUrlRow(result.rows[0]);
};

export const findUrlByValue = async (url: string): Promise<UrlRecord | null> => {
  const result = await query<UrlRow>(
    `
      SELECT id, url, note, attributes, has_price, created_at, updated_at
      FROM urls
      WHERE url = $1
    `,
    [url]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapUrlRow(result.rows[0]);
};

export interface CreateUrlParams {
  url: string;
  note?: string | null;
  attributes?: unknown;
  hasPrice?: boolean;
}

export const createUrl = async (params: CreateUrlParams): Promise<UrlRecord> => {
  const result = await query<UrlRow>(
    `
      INSERT INTO urls (url, note, attributes, has_price)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (url) DO UPDATE
      SET updated_at = NOW()
      RETURNING id, url, note, attributes, has_price, created_at, updated_at
    `,
    [
      params.url,
      params.note ?? null,
      params.attributes ?? {},
      params.hasPrice ?? false
    ]
  );

  return mapUrlRow(result.rows[0]);
};
