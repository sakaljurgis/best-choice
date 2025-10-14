import type { PriceCondition } from '@shared/models/item-price';
import { HttpError } from '../errors/http-error.js';
import { parseUuid } from './common.js';

const priceConditions = new Set<PriceCondition>(['new', 'used']);
const isPriceCondition = (value: unknown): value is PriceCondition => {
  return typeof value === 'string' && priceConditions.has(value as PriceCondition);
};

const normalizeCurrency = (value: unknown): string => {
  if (typeof value !== 'string' || value.trim().length !== 3) {
    throw new HttpError(400, 'currency must be a 3-letter code');
  }
  return value.trim().toUpperCase();
};

export interface ItemPriceCreateInput {
  condition: PriceCondition;
  amount: number;
  currency: string;
  sourceUrlId: string | null;
  sourceUrl: string | null;
  note: string | null;
}

export type ItemPriceUpdateInput = Partial<ItemPriceCreateInput>;

const parseAmount = (value: unknown): number => {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
    throw new HttpError(400, 'amount must be a non-negative number');
  }
  return value;
};

const parseSourceUrlId = (value: unknown): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  return parseUuid(value, 'sourceUrlId');
};

const parseSourceUrl = (value: unknown): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new HttpError(400, 'sourceUrl must be a non-empty string');
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
    sourceUrlId,
    sourceUrl,
    note
  } = payload as Record<string, unknown>;

  if (!isPriceCondition(condition)) {
    throw new HttpError(400, 'condition must be one of new, used');
  }

  return {
    condition,
    amount: parseAmount(amount),
    currency: normalizeCurrency(currency),
    sourceUrlId: parseSourceUrlId(sourceUrlId),
    sourceUrl: parseSourceUrl(sourceUrl),
    note: parseNote(note)
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
    sourceUrlId,
    sourceUrl,
    note
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

  if (sourceUrlId !== undefined) {
    result.sourceUrlId = parseSourceUrlId(sourceUrlId);
  }

  if (sourceUrl !== undefined) {
    result.sourceUrl = parseSourceUrl(sourceUrl);
  }

  if (note !== undefined) {
    result.note = parseNote(note);
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
