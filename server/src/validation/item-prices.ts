import { HttpError } from '../errors/http-error.js';
import { parseUuid } from './common.js';

const priceConditions = new Set(['new', 'used']);
const priceSources = new Set(['url', 'manual']);

const normalizeCurrency = (value: unknown): string => {
  if (typeof value !== 'string' || value.trim().length !== 3) {
    throw new HttpError(400, 'currency must be a 3-letter code');
  }
  return value.trim().toUpperCase();
};

const parseObservedAt = (value: unknown): string | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    throw new HttpError(400, 'observedAt cannot be null');
  }
  if (typeof value !== 'string') {
    throw new HttpError(400, 'observedAt must be an ISO datetime string');
  }
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    throw new HttpError(400, 'observedAt must be a valid ISO datetime string');
  }
  return date.toISOString();
};

export interface ItemPriceCreateInput {
  condition: 'new' | 'used';
  amount: number;
  currency: string;
  sourceType: 'url' | 'manual';
  sourceUrlId: string | null;
  sourceUrl: string | null;
  sourceNote: string | null;
  note: string | null;
  observedAt: string | undefined;
  isPrimary: boolean;
}

export type ItemPriceUpdateInput = Partial<ItemPriceCreateInput>;

const parseAmount = (value: unknown): number => {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
    throw new HttpError(400, 'amount must be a non-negative number');
  }
  return value;
};

const parseSourceNote = (value: unknown): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new HttpError(400, 'sourceNote must be a string or null');
  }
  return value;
};

const parseNote = (value: unknown): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new HttpError(400, 'note must be a string or null');
  }
  return value;
};

const parseIsPrimary = (value: unknown): boolean => {
  if (value === undefined) {
    return false;
  }
  if (typeof value !== 'boolean') {
    throw new HttpError(400, 'isPrimary must be a boolean');
  }
  return value;
};

const parseSourceFields = (
  sourceType: 'url' | 'manual',
  sourceUrlIdValue: unknown,
  sourceUrlValue: unknown
): { sourceUrlId: string | null; sourceUrl: string | null } => {
  if (sourceType === 'manual') {
    if (sourceUrlIdValue !== undefined && sourceUrlIdValue !== null) {
      throw new HttpError(
        400,
        'sourceUrlId cannot be provided when sourceType is manual'
      );
    }
    if (sourceUrlValue !== undefined && sourceUrlValue !== null) {
      throw new HttpError(
        400,
        'sourceUrl cannot be provided when sourceType is manual'
      );
    }
    return { sourceUrlId: null, sourceUrl: null };
  }

  let sourceUrlId: string | null = null;
  if (sourceUrlIdValue !== undefined && sourceUrlIdValue !== null) {
    sourceUrlId = parseUuid(sourceUrlIdValue, 'sourceUrlId');
  }

  let sourceUrl: string | null = null;
  if (sourceUrlValue !== undefined && sourceUrlValue !== null) {
    if (typeof sourceUrlValue !== 'string' || sourceUrlValue.trim().length === 0) {
      throw new HttpError(400, 'sourceUrl must be a non-empty string');
    }
    sourceUrl = sourceUrlValue;
  }

  if (!sourceUrlId && !sourceUrl) {
    throw new HttpError(
      400,
      'sourceUrl or sourceUrlId must be provided when sourceType is url'
    );
  }

  return { sourceUrlId, sourceUrl };
};

export const parseItemPriceCreatePayload = (
  payload: unknown
): ItemPriceCreateInput => {
  if (payload === null || typeof payload !== 'object') {
    throw new HttpError(400, 'Body must be an object');
  }

  const {
    condition,
    amount,
    currency,
    sourceType,
    sourceUrlId,
    sourceUrl,
    sourceNote,
    note,
    observedAt,
    isPrimary
  } = payload as Record<string, unknown>;

  if (typeof condition !== 'string' || !priceConditions.has(condition)) {
    throw new HttpError(400, 'condition must be one of new, used');
  }

  if (typeof sourceType !== 'string' || !priceSources.has(sourceType)) {
    throw new HttpError(400, 'sourceType must be one of url, manual');
  }

  const source = parseSourceFields(
    sourceType as 'url' | 'manual',
    sourceUrlId,
    sourceUrl
  );

  return {
    condition: condition as 'new' | 'used',
    amount: parseAmount(amount),
    currency: normalizeCurrency(currency),
    sourceType: sourceType as 'url' | 'manual',
    sourceUrlId: source.sourceUrlId,
    sourceUrl: source.sourceUrl,
    sourceNote: parseSourceNote(sourceNote),
    note: parseNote(note),
    observedAt: parseObservedAt(observedAt),
    isPrimary: parseIsPrimary(isPrimary)
  };
};

export const parseItemPriceUpdatePayload = (
  payload: unknown
): ItemPriceUpdateInput => {
  if (payload === null || typeof payload !== 'object') {
    throw new HttpError(400, 'Body must be an object');
  }

  const result: ItemPriceUpdateInput = {};
  const {
    condition,
    amount,
    currency,
    sourceType,
    sourceUrlId,
    sourceUrl,
    sourceNote,
    note,
    observedAt,
    isPrimary
  } = payload as Record<string, unknown>;

  if (condition !== undefined) {
    if (typeof condition !== 'string' || !priceConditions.has(condition)) {
      throw new HttpError(400, 'condition must be one of new, used');
    }
    result.condition = condition as 'new' | 'used';
  }

  if (amount !== undefined) {
    result.amount = parseAmount(amount);
  }

  if (currency !== undefined) {
    result.currency = normalizeCurrency(currency);
  }

  if (sourceType !== undefined) {
    if (typeof sourceType !== 'string' || !priceSources.has(sourceType)) {
      throw new HttpError(400, 'sourceType must be one of url, manual');
    }
    result.sourceType = sourceType as 'url' | 'manual';
  }

  if (sourceUrlId !== undefined || sourceUrl !== undefined) {
    const type = result.sourceType ?? (sourceType as 'url' | 'manual' | undefined);
    if (!type) {
      throw new HttpError(
        400,
        'sourceType must be provided when changing sourceUrl or sourceUrlId'
      );
    }
    const parsed = parseSourceFields(type, sourceUrlId, sourceUrl);
    result.sourceUrlId = parsed.sourceUrlId;
    result.sourceUrl = parsed.sourceUrl;
  }

  if (sourceNote !== undefined) {
    result.sourceNote = parseSourceNote(sourceNote);
  }

  if (note !== undefined) {
    result.note = parseNote(note);
  }

  if (observedAt !== undefined) {
    result.observedAt = parseObservedAt(observedAt);
  }

  if (isPrimary !== undefined) {
    result.isPrimary = parseIsPrimary(isPrimary);
  }

  if (Object.keys(result).length === 0) {
    throw new HttpError(400, 'At least one field must be provided for update');
  }

  return result;
};

export const parsePriceConditionFilter = (
  value: unknown
): 'new' | 'used' | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string' || !priceConditions.has(value)) {
    throw new HttpError(400, 'condition filter must be one of new, used');
  }
  return value as 'new' | 'used';
};
