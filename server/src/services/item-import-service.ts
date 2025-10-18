import { requestStructuredLlmResponse } from './llm-service.js';

interface LlmImportExtractionResult {
  manufacturer: string | null;
  model: string | null;
  note?: string | null;
  attributes?: Record<string, unknown> | null;
  images?: Array<{ url?: string | null; alt?: string | null }> | null;
}

interface AttributeHintSample {
  key: string;
  sampleValues: string[];
}

interface ProjectAttributeHints {
  projectAttributeNames?: string[];
  projectAttributeExamples?: AttributeHintSample[];
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
  markdown,
  attributeHints
}: {
  normalizedUrl: string;
  markdown: string;
  attributeHints?: ProjectAttributeHints;
}): Promise<ItemImportDetails> => {
  const preferredAttributeNames = (attributeHints?.projectAttributeNames ?? [])
    .map((name) => name.trim())
    .filter((name) => name.length > 0)
    .slice(0, 12);

  const attributeExampleLines = (attributeHints?.projectAttributeExamples ?? [])
    .map((example) => {
      const key = example.key.trim();
      if (!key) {
        return null;
      }

      const values = example.sampleValues
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
        .slice(0, 3);

      if (values.length === 0) {
        return null;
      }

      return `- ${key}: ${values.join(' | ')}`;
    })
    .filter((line): line is string => Boolean(line))
    .slice(0, 10);

  const promptSections: string[] = [
    'Extract product details for cataloging.',
    `Source URL: ${normalizedUrl}`
  ];

  if (preferredAttributeNames.length > 0 || attributeExampleLines.length > 0) {
    promptSections.push('Project attribute context:');

    if (preferredAttributeNames.length > 0) {
      promptSections.push(`Preferred attribute keys: ${preferredAttributeNames.join(', ')}`);
    }

    if (attributeExampleLines.length > 0) {
      promptSections.push('Existing item attribute examples:');
      promptSections.push(...attributeExampleLines);
    }

    promptSections.push(
      'When the content maps to these attributes, reuse the exact key. Only introduce new keys when necessary.'
    );
  }

  promptSections.push(
    'Provide the best available manufacturer, model, concise note (if applicable), all attributes explicitly mentioned in the content (not just the important ones), and any image URLs present.',
    'Markdown content:',
    '```markdown',
    markdown,
    '```'
  );

  const llmExtraction = await requestStructuredLlmResponse<LlmImportExtractionResult>({
    systemPrompt:
      'You extract structured product information for a catalog from markdown content. ' +
      'Use the provided project attribute context to align attribute names. ' +
      'Capture every attribute the content states, even if it falls outside the tracked or preferred list. ' +
      'Return only facts explicitly supported by the text. Never invent details.',
    prompt: promptSections.join('\n'),
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
              'Key-value attributes derived from the content (e.g., price, dimensions, materials). Prefer attribute keys that match the provided project context.',
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
