import type { Request, Response } from 'express';
import {
  createImage as createImageRepo,
  deleteImage as deleteImageRepo,
  listImagesByItemId
} from '../db/images-repository.js';
import { HttpError } from '../errors/http-error.js';
import { parseUuid } from '../validation/common.js';
import { parseImageCreatePayload } from '../validation/images.js';

export const listItemImages = async (req: Request, res: Response) => {
  const itemId = parseUuid(req.params.itemId, 'itemId');
  const images = await listImagesByItemId(itemId);

  res.json({ data: images });
};

export const createItemImage = async (req: Request, res: Response) => {
  const itemId = parseUuid(req.params.itemId, 'itemId');
  const payload = parseImageCreatePayload(req.body);

  try {
    const image = await createImageRepo({
      itemId,
      url: payload.url
    });

    res.status(201).json({ data: image });
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

export const deleteItemImage = async (req: Request, res: Response) => {
  const imageId = parseUuid(req.params.imageId, 'imageId');
  const deleted = await deleteImageRepo(imageId);

  if (!deleted) {
    throw new HttpError(404, 'Image not found');
  }

  res.status(204).send();
};
