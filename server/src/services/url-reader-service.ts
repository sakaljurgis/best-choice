import { env } from '../config/env.js';
import { HttpError } from '../errors/http-error.js';

const ensureHttpUrl = (rawUrl: string): string => {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new HttpError(400, 'Enter a valid absolute URL.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new HttpError(400, 'URL reader only supports http and https URLs.');
  }

  return parsed.toString();
};

const buildReaderUrl = (targetUrl: string): string => {
  const base = env.urlReader.baseUrl || 'https://r.jina.ai';
  return `${base}/${targetUrl}`;
};

export const readUrlMarkdown = async (rawUrl: string): Promise<string> => {
  if (typeof fetch !== 'function') {
    throw new HttpError(500, 'URL reader requires fetch support but it is unavailable.');
  }

  const normalizedTargetUrl = ensureHttpUrl(rawUrl);
  const requestUrl = buildReaderUrl(normalizedTargetUrl);
  const apiKey = env.urlReader.apiKey?.trim();
  const headers: Record<string, string> = {};

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  let response: Awaited<ReturnType<typeof fetch>>;
  try {
    response = await fetch(requestUrl, {
      headers
    });
  } catch {
    throw new HttpError(
      502,
      'We could not reach the URL reader service. Please try again later.'
    );
  }

  if (response.status === 404) {
    throw new HttpError(
      422,
      'We could not read that URL. Please ensure it is publicly accessible.'
    );
  }

  if (!response.ok) {
    throw new HttpError(
      502,
      'The URL reader service returned an unexpected response. Please try again later.'
    );
  }

  const markdown = await response.text();
  if (!markdown.trim()) {
    throw new HttpError(
      422,
      'The URL reader returned empty content for that URL. Please fill in the details manually.'
    );
  }

  return markdown;
};
