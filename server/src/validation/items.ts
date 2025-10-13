import { HttpError } from '../errors/http-error.js';
import { parseUuid } from './common.js';

const itemStatuses = new Set(['active', 'rejected']);

const ensureAttributesObject = (value: unknown): Record<string, unknown> => {
  if (value === undefined) {
    return {};
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, 'attributes must be an object');
  }
  return value as Record<string, unknown>;
};

export interface ItemCreateInput {
  manufacturer: string | null;
  model: string;
  sourceUrlId: string | null;
  sourceUrl: string | null;
  status: 'active' | 'rejected';
  note: string | null;
  attributes: Record<string, unknown>;
}

export type ItemUpdateInput = Partial<ItemCreateInput>;

export const parseItemCreatePayload = (payload: unknown): ItemCreateInput => {
  if (payload === null || typeof payload !== 'object') {
    throw new HttpError(400, 'Body must be an object');
  }

  const {
    manufacturer = null,
    brand,
    model,
    status = 'active',
    note = null,
    attributes,
    sourceUrl,
    sourceUrlId
  } = payload as Record<string, unknown>;

  const manufacturerValue =
    manufacturer ?? (typeof brand === 'string' ? brand : null);

  if (
    manufacturerValue !== null &&
    (typeof manufacturerValue !== 'string' || manufacturerValue.trim().length === 0)
  ) {
    throw new HttpError(400, 'manufacturer must be a non-empty string or null');
  }

  if (typeof model !== 'string' || model.trim().length === 0 || model.length > 150) {
    throw new HttpError(400, 'model must be a non-empty string up to 150 characters');
  }

  if (typeof status !== 'string' || !itemStatuses.has(status)) {
    throw new HttpError(400, 'status must be one of active, rejected');
  }

  if (note !== null && typeof note !== 'string') {
    throw new HttpError(400, 'note must be a string or null');
  }

  let normalizedSourceUrlId: string | null = null;
  if (sourceUrlId !== undefined && sourceUrlId !== null) {
    normalizedSourceUrlId = parseUuid(sourceUrlId, 'sourceUrlId');
  }

  let normalizedSourceUrl: string | null = null;
  if (sourceUrl !== undefined && sourceUrl !== null) {
    if (typeof sourceUrl !== 'string' || sourceUrl.trim().length === 0) {
      throw new HttpError(400, 'sourceUrl must be a non-empty string when provided');
    }
    normalizedSourceUrl = sourceUrl;
  }

  return {
    manufacturer:
      manufacturerValue === null ? null : (manufacturerValue as string).trim(),
    model: model.trim(),
    status: status as 'active' | 'rejected',
    note: note === null ? null : (note as string),
    attributes: ensureAttributesObject(attributes),
    sourceUrlId: normalizedSourceUrlId,
    sourceUrl: normalizedSourceUrl
  };
};

export const parseItemUpdatePayload = (payload: unknown): ItemUpdateInput => {
  if (payload === null || typeof payload !== 'object') {
    throw new HttpError(400, 'Body must be an object');
  }

  const result: ItemUpdateInput = {};
  const {
    manufacturer,
    brand,
    model,
    status,
    note,
    attributes,
    sourceUrl,
    sourceUrlId
  } = payload as Record<string, unknown>;

  if (manufacturer !== undefined || brand !== undefined) {
    const value = manufacturer ?? brand;
    if (value === null) {
      result.manufacturer = null;
    } else if (typeof value === 'string' && value.trim().length > 0) {
      result.manufacturer = value.trim();
    } else {
      throw new HttpError(
        400,
        'manufacturer/brand must be a non-empty string or null'
      );
    }
  }

  if (model !== undefined) {
    if (typeof model !== 'string' || model.trim().length === 0 || model.length > 150) {
      throw new HttpError(400, 'model must be a non-empty string up to 150 characters');
    }
    result.model = model.trim();
  }

  if (status !== undefined) {
    if (typeof status !== 'string' || !itemStatuses.has(status)) {
      throw new HttpError(400, 'status must be one of active, rejected');
    }
    result.status = status as 'active' | 'rejected';
  }

  if (note !== undefined) {
    if (note === null) {
      result.note = null;
    } else if (typeof note === 'string') {
      result.note = note;
    } else {
      throw new HttpError(400, 'note must be a string or null');
    }
  }

  if (attributes !== undefined) {
    result.attributes = ensureAttributesObject(attributes);
  }

  if (sourceUrlId !== undefined) {
    if (sourceUrlId === null) {
      result.sourceUrlId = null;
    } else {
      result.sourceUrlId = parseUuid(sourceUrlId, 'sourceUrlId');
    }
  }

  if (sourceUrl !== undefined) {
    if (sourceUrl === null) {
      result.sourceUrl = null;
    } else if (typeof sourceUrl === 'string' && sourceUrl.trim().length > 0) {
      result.sourceUrl = sourceUrl;
    } else {
      throw new HttpError(400, 'sourceUrl must be a non-empty string or null');
    }
  }

  if (Object.keys(result).length === 0) {
    throw new HttpError(400, 'At least one field must be provided for update');
  }

  return result;
};

export const parseItemStatusFilter = (
  value: unknown
): 'active' | 'rejected' | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string' || !itemStatuses.has(value)) {
    throw new HttpError(400, 'status filter must be one of active, rejected');
  }
  return value as 'active' | 'rejected';
};

export interface ItemImportPayload {
  url: string;
}

export const parseItemImportPayload = (payload: unknown): ItemImportPayload => {
  if (payload === null || typeof payload !== 'object') {
    throw new HttpError(400, 'Body must be an object');
  }

  const { url } = payload as Record<string, unknown>;

  if (typeof url !== 'string' || url.trim().length === 0) {
    throw new HttpError(400, 'url must be a non-empty string');
  }

  return { url: url.trim() };
};
