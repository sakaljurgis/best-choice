import type { Request, Response } from 'express';
import {
  createItem as createItemRepo,
  deleteItem as deleteItemRepo,
  getItemById,
  listItems as listItemsRepo,
  updateItem as updateItemRepo
} from '../db/items-repository.js';
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
  await new Promise((resolve) => {
    setTimeout(resolve, 1000);
  })
  const projectId = parseUuid(req.params.projectId, 'projectId');
  // projectId is validated but not otherwise used for the mock response.
  void projectId;

  const { url } = parseItemImportPayload(req.body);
  let hostname: string | null = null;
  let lastPathSegment: string | null = null;
  let normalizedUrl = url;

  try {
    normalizedUrl = new URL(url).toString();
  } catch {
    // If the URL constructor fails here, readUrlMarkdown will surface the error.
  }

  let markdown: string;
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

  try {
    const parsed = new URL(normalizedUrl);
    hostname = parsed.hostname.replace(/^www\./, '');
    const pathSegments = parsed.pathname.split('/').filter(Boolean);
    if (pathSegments.length) {
      lastPathSegment = pathSegments[pathSegments.length - 1];
    }
  } catch {
    // non-standard URLs fall back to generic mock content
  }

  const manufacturerBase = hostname ? hostname.split('.')[0] : 'imported';
  const manufacturer =
    manufacturerBase.charAt(0).toUpperCase() + manufacturerBase.slice(1);

  const cleanedSegment =
    lastPathSegment?.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim() ?? 'Item';
  const model = cleanedSegment.length ? cleanedSegment : 'Imported Item';

  const imageSeedBase = cleanedSegment.length
    ? cleanedSegment.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    : manufacturer.toLowerCase();
  const normalizedSeed = imageSeedBase.length ? imageSeedBase : 'imported-item';
  const imageSeeds = Array.from({ length: 3 }, (_, index) => `${normalizedSeed}-${index + 1}`);
  const images = imageSeeds.map((seed) => ({
    url: `https://picsum.photos/seed/${encodeURIComponent(seed)}/800/600`
  }));

  const importedAt = new Date().toISOString();
  const attributes: Record<string, unknown> = {
    originUrl: normalizedUrl,
    importedAt,
    condition: 'New',
    availability: 'In stock',
    dpi: 1200,
    imageCount: images.length,
    urlReader: {
      provider: 'jina.ai',
      format: 'markdown',
      fetchedAt: importedAt,
      content: markdown
    }
  };

  if (hostname) {
    attributes.domain = hostname;
  }

  res.json({
    data: {
      manufacturer,
      model,
      note: null,
      attributes,
      sourceUrl: normalizedUrl,
      images
    }
  });
};
