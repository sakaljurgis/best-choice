import type { Request, Response } from 'express';
import {
  createItemPrice as createItemPriceRepo,
  deleteItemPrice as deleteItemPriceRepo,
  getItemPriceById,
  listItemPrices as listItemPricesRepo,
  updateItemPrice as updateItemPriceRepo
} from '../db/item-prices-repository.js';
import { HttpError } from '../errors/http-error.js';
import { resolveUrlId } from './url-helpers.js';
import { parsePaginationParams, parseUuid } from '../validation/common.js';
import {
  parseItemPriceCreatePayload,
  parseItemPriceUpdatePayload,
  parsePriceConditionFilter
} from '../validation/item-prices.js';

export const listItemPrices = async (req: Request, res: Response) => {
  const itemId = parseUuid(req.params.itemId, 'itemId');
  const pagination = parsePaginationParams(req.query as Record<string, unknown>);
  const condition = parsePriceConditionFilter(
    (req.query as Record<string, unknown>).condition
  );

  const prices = await listItemPricesRepo({
    itemId,
    limit: pagination.limit,
    offset: pagination.offset,
    condition
  });

  res.json({
    data: prices,
    meta: {
      limit: pagination.limit,
      offset: pagination.offset,
      count: prices.length
    }
  });
};

export const createItemPrice = async (req: Request, res: Response) => {
  const itemId = parseUuid(req.params.itemId, 'itemId');
  const payload = parseItemPriceCreatePayload(req.body);

  let sourceUrlId: string | null = null;
  if (payload.sourceType === 'url') {
    sourceUrlId = await resolveUrlId({
      sourceUrlId: payload.sourceUrlId,
      sourceUrl: payload.sourceUrl
    });
  }

  try {
    const price = await createItemPriceRepo({
      itemId,
      condition: payload.condition,
      amount: payload.amount,
      currency: payload.currency,
      sourceType: payload.sourceType,
      sourceUrlId,
      sourceNote: payload.sourceNote,
      note: payload.note,
      observedAt: payload.observedAt,
      isPrimary: payload.isPrimary
    });

    res.status(201).json({ data: price });
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === '23503'
    ) {
      throw new HttpError(404, 'Item not found');
    }
    throw error;
  }
};

export const getItemPrice = async (req: Request, res: Response) => {
  const priceId = parseUuid(req.params.priceId, 'priceId');
  const price = await getItemPriceById(priceId);

  if (!price) {
    throw new HttpError(404, 'Price not found');
  }

  res.json({ data: price });
};

export const updateItemPrice = async (req: Request, res: Response) => {
  const priceId = parseUuid(req.params.priceId, 'priceId');
  const payload = parseItemPriceUpdatePayload(req.body);

  let sourceUrlId: string | null | undefined;
  const payloadRecord = payload as Record<string, unknown>;

  const hasSourceUrlField = Object.prototype.hasOwnProperty.call(
    payloadRecord,
    'sourceUrl'
  );
  const hasSourceUrlIdField = Object.prototype.hasOwnProperty.call(
    payloadRecord,
    'sourceUrlId'
  );

  if (payload.sourceType === 'manual') {
    sourceUrlId = null;
  } else if (payload.sourceType === 'url' || hasSourceUrlField || hasSourceUrlIdField) {
    sourceUrlId = await resolveUrlId({
      sourceUrlId: payload.sourceUrlId ?? null,
      sourceUrl: payload.sourceUrl ?? null
    });
  }

  const price = await updateItemPriceRepo(priceId, {
    condition: payload.condition,
    amount: payload.amount,
    currency: payload.currency,
    sourceType: payload.sourceType,
    sourceUrlId,
    sourceNote: payload.sourceNote,
    note: payload.note,
    observedAt: payload.observedAt,
    isPrimary: payload.isPrimary
  });

  if (!price) {
    throw new HttpError(404, 'Price not found');
  }

  res.json({ data: price });
};

export const deleteItemPrice = async (req: Request, res: Response) => {
  const priceId = parseUuid(req.params.priceId, 'priceId');
  const deleted = await deleteItemPriceRepo(priceId);

  if (!deleted) {
    throw new HttpError(404, 'Price not found');
  }

  res.status(204).send();
};
