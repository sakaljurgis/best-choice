const BOOLEAN_TRUE_TOKENS = new Set(['true', 'yes', 'on', 'enabled', 'y']);
const BOOLEAN_FALSE_TOKENS = new Set(['false', 'no', 'off', 'disabled', 'n']);

export type AttributeScalarType = 'boolean' | 'number' | 'string';

export interface AttributeInferenceResult {
  type: AttributeScalarType;
  canonicalText: string;
  normalizedValue: boolean | number | string | null;
  error: string | null;
}

const NUMERIC_PATTERN =
  /^[+-]?(?:\d+|\d*\.\d+)(?:[eE][+-]?\d+)?$/;

export const inferScalarValue = (
  rawValue: string,
  forcedString: boolean,
  expectedType: AttributeScalarType | null
): AttributeInferenceResult => {
  if (forcedString) {
    return {
      type: 'string',
      canonicalText: rawValue,
      normalizedValue: rawValue,
      error: null
    };
  }

  const trimmed = rawValue.trim();

  if (!trimmed.length) {
    return {
      type: expectedType ?? 'string',
      canonicalText: '',
      normalizedValue: null,
      error: null
    };
  }

  const lower = trimmed.toLowerCase();

  if (BOOLEAN_TRUE_TOKENS.has(lower)) {
    return {
      type: 'boolean',
      canonicalText: 'true',
      normalizedValue: true,
      error: expectedType && expectedType !== 'boolean' ? 'Expecting a boolean value.' : null
    };
  }

  if (BOOLEAN_FALSE_TOKENS.has(lower)) {
    return {
      type: 'boolean',
      canonicalText: 'false',
      normalizedValue: false,
      error: expectedType && expectedType !== 'boolean' ? 'Expecting a boolean value.' : null
    };
  }

  if (NUMERIC_PATTERN.test(trimmed)) {
    const numericValue = Number(trimmed);
    if (!Number.isFinite(numericValue)) {
      return {
        type: 'number',
        canonicalText: trimmed,
        normalizedValue: null,
        error: 'Enter a finite numeric value.'
      };
    }
    return {
      type: 'number',
      canonicalText: String(numericValue),
      normalizedValue: numericValue,
      error: expectedType && expectedType !== 'number' ? 'Expecting a numeric value.' : null
    };
  }

  const canonical = trimmed;

  if (expectedType === 'boolean') {
    return {
      type: 'string',
      canonicalText: canonical,
      normalizedValue: canonical,
      error: 'Expecting a boolean value.'
    };
  }

  if (expectedType === 'number') {
    return {
      type: 'string',
      canonicalText: canonical,
      normalizedValue: canonical,
      error: 'Expecting a numeric value.'
    };
  }

  return {
    type: 'string',
    canonicalText: canonical,
    normalizedValue: canonical,
    error: null
  };
};
