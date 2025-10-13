import { HttpError } from '../errors/http-error.js';

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const parseUuid = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !uuidRegex.test(value)) {
    throw new HttpError(400, `${field} must be a valid UUID`);
  }
  return value;
};

export interface PaginationParams {
  limit: number;
  offset: number;
}

export const parsePaginationParams = (
  query: Record<string, unknown>,
  defaults: PaginationParams = { limit: 20, offset: 0 }
): PaginationParams => {
  const limitRaw = query.limit;
  const offsetRaw = query.offset;

  const limit =
    typeof limitRaw === 'string' && limitRaw.trim() !== ''
      ? Number(limitRaw)
      : defaults.limit;
  const offset =
    typeof offsetRaw === 'string' && offsetRaw.trim() !== ''
      ? Number(offsetRaw)
      : defaults.offset;

  if (!Number.isFinite(limit) || limit <= 0 || limit > 100) {
    throw new HttpError(400, 'limit must be between 1 and 100');
  }

  if (!Number.isFinite(offset) || offset < 0) {
    throw new HttpError(400, 'offset must be greater than or equal to 0');
  }

  return { limit: Math.floor(limit), offset: Math.floor(offset) };
};
