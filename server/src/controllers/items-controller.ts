import type { Request, Response } from 'express';
import {
  createItem as createItemRepo,
  deleteItem as deleteItemRepo,
  getItemById,
  listItems as listItemsRepo,
  updateItem as updateItemRepo
} from '../db/items-repository.js';
import {
  createUrl,
  findUrlByValue,
  updateUrlAttributes,
  updateUrlBodyText
} from '../db/urls-repository.js';
import { findImageById } from '../db/images-repository.js';
import { HttpError } from '../errors/http-error.js';
import { resolveUrlId } from './url-helpers.js';
import { parsePaginationParams, parseUuid } from '../validation/common.js';
import {
  parseItemCreatePayload,
  parseItemImportPayload,
  parseItemStatusFilter,
  parseItemUpdatePayload
} from '../validation/items.js';
import { readUrlMarkdown } from '../services/url-reader-service.js';
import { normalizeUrl } from '../utils/url-normalizer.js';
import {
  extractItemImportDetails,
  parseCachedItemImportDetails
} from '../services/item-import-service.js';

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
      defaultImageId: payload.defaultImageId,
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

  let defaultImageId: string | null | undefined;
  if ('defaultImageId' in payload) {
    defaultImageId = payload.defaultImageId ?? null;
    if (defaultImageId !== null) {
      const image = await findImageById(defaultImageId);
      if (!image) {
        throw new HttpError(404, 'Default image not found');
      }
      if (image.itemId !== itemId) {
        throw new HttpError(
          400,
          'defaultImageId must reference an image belonging to this item'
        );
      }
    }
  }

  const item = await updateItemRepo(itemId, {
    manufacturer: payload.manufacturer,
    model: payload.model,
    sourceUrlId,
    defaultImageId,
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

export const importItemFromUrl = async (req: Request, res: Response) => {
  const projectId = parseUuid(req.params.projectId, 'projectId');
  void projectId;

  const { url } = parseItemImportPayload(req.body);
  let normalizedUrl = url;

  try {
    normalizedUrl = new URL(url).toString();
  } catch {
    // If the URL constructor fails here, readUrlMarkdown will surface the error.
  }

  const normalizedDbUrl = normalizeUrl(url);
  let urlRecord = await findUrlByValue(normalizedDbUrl);
  let markdown: string;

  const existingBody = urlRecord?.bodyText;
  if (existingBody && existingBody.trim().length > 0) {
    markdown = existingBody;
  } else {
    try {
      markdown = await readUrlMarkdown(normalizedUrl);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      throw new HttpError(
        422,
        'We could not read that URL. Please enter the item details manually.'
      );
    }

    if (urlRecord) {
      const updated = await updateUrlBodyText(urlRecord.id, markdown);
      if (updated) {
        urlRecord = updated;
      }
    } else {
      urlRecord = await createUrl({ url: normalizedDbUrl, bodyText: markdown });
    }
  }

  const cachedDetails = parseCachedItemImportDetails(urlRecord?.attributes);
  const details = cachedDetails
    ? cachedDetails
    : await extractItemImportDetails({ normalizedUrl, markdown });

  if (!cachedDetails) {
    if (urlRecord) {
      const updated = await updateUrlAttributes(urlRecord.id, details);
      if (updated) {
        urlRecord = updated;
      }
    } else {
      urlRecord = await createUrl({ url: normalizedDbUrl, bodyText: markdown, attributes: details });
    }
  }

  res.json({
    data: {
      ...details,
      sourceUrl: normalizedUrl
    }
  });
};
