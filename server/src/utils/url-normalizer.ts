import { HttpError } from '../errors/http-error.js';

export const normalizeUrl = (input: unknown): string => {
  if (typeof input !== 'string') {
    throw new HttpError(400, 'URL must be a string');
  }

  const trimmed = input.trim();
  if (!trimmed) {
    throw new HttpError(400, 'URL must not be empty');
  }

  try {
    const decoded = decodeURI(trimmed);
    return decoded.toLowerCase();
  } catch (error) {
    throw new HttpError(400, 'URL could not be decoded', { cause: (error as Error).message });
  }
};
