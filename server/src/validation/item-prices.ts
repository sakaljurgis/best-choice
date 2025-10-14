import type { PriceCondition, PriceSourceType } from '@shared/models/item-price';
import { HttpError } from '../errors/http-error.js';
import { parseUuid } from './common.js';

const priceConditions = new Set<PriceCondition>(['new', 'used']);
const priceSources = new Set<PriceSourceType>(['url', 'manual']);

const isPriceCondition = (value: unknown): value is PriceCondition => {
  return typeof value === 'string' && priceConditions.has(value as PriceCondition);
};

const isPriceSourceType = (value: unknown): value is PriceSourceType => {
  return typeof value === 'string' && priceSources.has(value as PriceSourceType);
};

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
  condition: PriceCondition;
  amount: number;
  currency: string;
  sourceType: PriceSourceType;
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
  sourceType: PriceSourceType,
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

  if (!isPriceCondition(condition)) {
    throw new HttpError(400, 'condition must be one of new, used');
  }

  if (!isPriceSourceType(sourceType)) {
    throw new HttpError(400, 'sourceType must be one of url, manual');
  }

  const source = parseSourceFields(
    sourceType,
    sourceUrlId,
    sourceUrl
  );

  return {
    condition,
    amount: parseAmount(amount),
    currency: normalizeCurrency(currency),
    sourceType,
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
    if (!isPriceCondition(condition)) {
      throw new HttpError(400, 'condition must be one of new, used');
    }
    result.condition = condition;
  }

  if (amount !== undefined) {
    result.amount = parseAmount(amount);
  }

  if (currency !== undefined) {
    result.currency = normalizeCurrency(currency);
  }

  if (sourceType !== undefined) {
    if (!isPriceSourceType(sourceType)) {
      throw new HttpError(400, 'sourceType must be one of url, manual');
    }
    result.sourceType = sourceType;
  }

  if (sourceUrlId !== undefined || sourceUrl !== undefined) {
    const type = result.sourceType ?? (isPriceSourceType(sourceType) ? sourceType : undefined);
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
): PriceCondition | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (!isPriceCondition(value)) {
    throw new HttpError(400, 'condition filter must be one of new, used');
  }
  return value;
};
