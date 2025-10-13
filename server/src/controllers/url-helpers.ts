import { createUrl, findUrlById } from '../db/urls-repository.js';
import { HttpError } from '../errors/http-error.js';
import { normalizeUrl } from '../utils/url-normalizer.js';

export const resolveUrlId = async (params: {
  sourceUrlId: string | null;
  sourceUrl: string | null;
}) => {
  let urlId = params.sourceUrlId ?? null;

  if (params.sourceUrl) {
    const normalized = normalizeUrl(params.sourceUrl);
    const url = await createUrl({ url: normalized });
    urlId = url.id;
  } else if (urlId) {
    const existing = await findUrlById(urlId);
    if (!existing) {
      throw new HttpError(400, 'sourceUrlId does not exist');
    }
  }

  return urlId;
};
