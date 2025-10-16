import { query } from './pool.js';

export interface ImageRow {
  id: string;
  item_id: string;
  url: string;
  created_at: Date;
  updated_at: Date;
}

export interface ImageRecord {
  id: string;
  itemId: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

const mapImageRow = (row: ImageRow): ImageRecord => ({
  id: row.id,
  itemId: row.item_id,
  url: row.url,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString()
});

export const findImageById = async (id: string): Promise<ImageRecord | null> => {
  const result = await query<ImageRow>(
    `
      SELECT id, item_id, url, created_at, updated_at
      FROM images
      WHERE id = $1
    `,
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapImageRow(result.rows[0]);
};

export const listImagesByItemId = async (itemId: string): Promise<ImageRecord[]> => {
  const result = await query<ImageRow>(
    `
      SELECT id, item_id, url, created_at, updated_at
      FROM images
      WHERE item_id = $1
      ORDER BY created_at ASC, id ASC
    `,
    [itemId]
  );

  return result.rows.map(mapImageRow);
};

export interface CreateImageParams {
  itemId: string;
  url: string;
}

export const createImage = async (params: CreateImageParams): Promise<ImageRecord> => {
  const result = await query<ImageRow>(
    `
      INSERT INTO images (item_id, url)
      VALUES ($1, $2)
      RETURNING id, item_id, url, created_at, updated_at
    `,
    [params.itemId, params.url]
  );

  return mapImageRow(result.rows[0]);
};

export const deleteImage = async (id: string): Promise<boolean> => {
  const result = await query(
    `
      DELETE FROM images
      WHERE id = $1
    `,
    [id]
  );

  return (result.rowCount ?? 0) > 0;
};
