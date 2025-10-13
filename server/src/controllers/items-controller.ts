import type { Request, Response } from 'express';
import {
  createItem as createItemRepo,
  deleteItem as deleteItemRepo,
  getItemById,
  listItems as listItemsRepo,
  updateItem as updateItemRepo
} from '../db/items-repository.js';
import { HttpError } from '../errors/http-error.js';
import { resolveUrlId } from './url-helpers.js';
import { parsePaginationParams, parseUuid } from '../validation/common.js';
import {
  parseItemCreatePayload,
  parseItemStatusFilter,
  parseItemUpdatePayload
} from '../validation/items.js';

export const listItems = async (req: Request, res: Response) => {
  const projectId = parseUuid(req.params.projectId, 'projectId');
  const pagination = parsePaginationParams(req.query as Record<string, unknown>);
  const status = parseItemStatusFilter((req.query as Record<string, unknown>).status);

  const items = await listItemsRepo({
    projectId,
    limit: pagination.limit,
    offset: pagination.offset,
    status
  });

  res.json({
    data: items,
    meta: {
      limit: pagination.limit,
      offset: pagination.offset,
      count: items.length
    }
  });
};

export const createItem = async (req: Request, res: Response) => {
  const projectId = parseUuid(req.params.projectId, 'projectId');
  const payload = parseItemCreatePayload(req.body);

  const sourceUrlId = await resolveUrlId({
    sourceUrlId: payload.sourceUrlId,
    sourceUrl: payload.sourceUrl
  });

  try {
    const item = await createItemRepo({
      projectId,
      manufacturer: payload.manufacturer,
      model: payload.model,
      sourceUrlId,
      status: payload.status,
      note: payload.note,
      attributes: payload.attributes
    });

    res.status(201).json({ data: item });
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === '23503'
    ) {
      throw new HttpError(404, 'Project not found');
    }
    throw error;
  }
};

export const getItem = async (req: Request, res: Response) => {
  const itemId = parseUuid(req.params.itemId, 'itemId');
  const item = await getItemById(itemId);

  if (!item) {
    throw new HttpError(404, 'Item not found');
  }

  res.json({ data: item });
};

export const updateItem = async (req: Request, res: Response) => {
  const itemId = parseUuid(req.params.itemId, 'itemId');
  const payload = parseItemUpdatePayload(req.body);

  let sourceUrlId: string | null | undefined;
  if ('sourceUrl' in payload || 'sourceUrlId' in payload) {
    sourceUrlId = await resolveUrlId({
      sourceUrlId: payload.sourceUrlId ?? null,
      sourceUrl: payload.sourceUrl ?? null
    });
  }

  const item = await updateItemRepo(itemId, {
    manufacturer: payload.manufacturer,
    model: payload.model,
    sourceUrlId,
    status: payload.status,
    note: payload.note,
    attributes: payload.attributes
  });

  if (!item) {
    throw new HttpError(404, 'Item not found');
  }

  res.json({ data: item });
};

export const deleteItem = async (req: Request, res: Response) => {
  const itemId = parseUuid(req.params.itemId, 'itemId');
  const deleted = await deleteItemRepo(itemId);

  if (!deleted) {
    throw new HttpError(404, 'Item not found');
  }

  res.status(204).send();
};
