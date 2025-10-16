import { HttpError } from '../errors/http-error.js';

export interface ImageCreateInput {
  url: string;
}

export const parseImageCreatePayload = (payload: unknown): ImageCreateInput => {
  if (payload === null || typeof payload !== 'object') {
    throw new HttpError(400, 'Body must be an object');
  }

  const { url } = payload as Record<string, unknown>;

  if (typeof url !== 'string' || url.trim().length === 0) {
    throw new HttpError(400, 'url must be a non-empty string');
  }

  const trimmed = url.trim();

  if (trimmed.length > 2048) {
    throw new HttpError(400, 'url must be 2048 characters or fewer');
  }

  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new HttpError(400, 'url must use http or https scheme');
    }
  } catch {
    throw new HttpError(400, 'url must be a valid URL');
  }

  return { url: trimmed };
};
