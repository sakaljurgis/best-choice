import { requestStructuredLlmResponse } from './llm-service.js';

interface LlmImportExtractionResult {
  manufacturer: string | null;
  model: string | null;
  note?: string | null;
  attributes?: Record<string, unknown> | null;
  images?: Array<{ url?: string | null; alt?: string | null }> | null;
}

const toSnakeCaseKey = (value: string): string => {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
};

const normalizeAttributes = (input: unknown): Record<string, unknown> => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }

  const normalized: Record<string, unknown> = {};

  for (const [rawKey, rawValue] of Object.entries(input)) {
    if (typeof rawKey !== 'string') {
      continue;
    }

    const trimmed = rawKey.trim();
    if (!trimmed) {
      continue;
    }

    const snakeCase = toSnakeCaseKey(trimmed);
    if (!snakeCase) {
      continue;
    }

    normalized[snakeCase] = rawValue;
  }

  return normalized;
};

export interface ItemImportDetails {
  manufacturer: string | null;
  model: string | null;
  note: string | null;
  attributes: Record<string, unknown>;
  images: Array<{ url: string }>;
}

const sanitizeItemImportDetails = (raw: unknown): ItemImportDetails => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      manufacturer: null,
      model: null,
      note: null,
      attributes: {},
      images: []
    };
  }

  const manufacturerValue = (raw as { manufacturer?: unknown }).manufacturer;
  const modelValue = (raw as { model?: unknown }).model;
  const noteValue = (raw as { note?: unknown }).note;
  const attributesValue = (raw as { attributes?: unknown }).attributes;
  const imagesValue = (raw as { images?: unknown }).images;

  const manufacturer =
    typeof manufacturerValue === 'string'
      ? manufacturerValue.trim() || null
      : manufacturerValue === null
      ? null
      : null;

  const model =
    typeof modelValue === 'string' ? modelValue.trim() || null : modelValue === null ? null : null;

  const note =
    typeof noteValue === 'string' ? noteValue.trim() || null : noteValue === null ? null : null;

  const attributes = normalizeAttributes(attributesValue);

  const images: Array<{ url: string }> = [];
  if (Array.isArray(imagesValue)) {
    const seen = new Set<string>();
    for (const candidate of imagesValue) {
      if (!candidate || typeof candidate !== 'object') {
        continue;
      }

      const urlValue = (candidate as { url?: unknown }).url;
      if (typeof urlValue !== 'string') {
        continue;
      }

      const trimmed = urlValue.trim();
      if (!trimmed || seen.has(trimmed)) {
        continue;
      }

      seen.add(trimmed);
      images.push({ url: trimmed });
    }
  }

  return {
    manufacturer,
    model,
    note,
    attributes,
    images
  };
};

export const parseCachedItemImportDetails = (raw: unknown): ItemImportDetails | null => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const details = sanitizeItemImportDetails(raw);

  if (
    details.manufacturer === null &&
    details.model === null &&
    Object.keys(details.attributes).length === 0 &&
    details.images.length === 0 &&
    details.note === null
  ) {
    return null;
  }

  return details;
};

export const extractItemImportDetails = async ({
  normalizedUrl,
  markdown
}: {
  normalizedUrl: string;
  markdown: string;
}): Promise<ItemImportDetails> => {
  const llmExtraction = await requestStructuredLlmResponse<LlmImportExtractionResult>({
    systemPrompt:
      'You extract structured product information from markdown content. ' +
      'Return only facts explicitly supported by the text. Never invent details.',
    prompt: [
      'Extract product details for cataloging.',
      `Source URL: ${normalizedUrl}`,
      'Provide the best available manufacturer, model, concise note (if applicable), key attributes, and any image URLs present.',
      'Markdown content:',
      '```markdown',
      markdown,
      '```'
    ].join('\n'),
    responseSchema: {
      name: 'product_import',
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          manufacturer: {
            type: ['string', 'null'],
            description:
              'Manufacturer or brand responsible for the product. Use null when not stated.'
          },
          model: {
            type: ['string', 'null'],
            description: 'Product model or name. Use null when not stated.'
          },
          note: {
            type: ['string', 'null'],
            description: 'Optional short note or summary gleaned from the content.'
          },
          attributes: {
            type: 'object',
            description:
              'Key-value attributes derived from the content (e.g., price, dimensions, materials).',
            additionalProperties: {
              anyOf: [
                { type: 'string' },
                { type: 'number' },
                { type: 'integer' },
                { type: 'boolean' },
                { type: 'null' }
              ]
            }
          },
          images: {
            type: 'array',
            description: 'Direct image URLs found in the content.',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                url: { type: 'string', format: 'uri' },
                alt: { type: ['string', 'null'] }
              },
              required: ['url']
            }
          }
        },
        required: ['manufacturer', 'model', 'attributes', 'images']
      }
    }
  });

  return sanitizeItemImportDetails(llmExtraction);
};
