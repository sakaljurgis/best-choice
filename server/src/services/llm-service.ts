import { env } from '../config/env.js';
import { HttpError } from '../errors/http-error.js';

export interface LlmResponseSchema {
  name: string;
  schema: Record<string, unknown>;
}

export interface LlmStructuredRequest {
  systemPrompt: string;
  prompt: string;
  responseSchema: LlmResponseSchema;
}

const extractStructuredContent = <T>(payload: unknown): T => {
  if (!payload || typeof payload !== 'object') {
    throw new HttpError(502, 'LLM provider returned an unexpected payload.');
  }

  const maybeChoices = (payload as { choices?: unknown[] }).choices;
  if (!Array.isArray(maybeChoices) || maybeChoices.length === 0) {
    throw new HttpError(502, 'LLM provider did not return any choices.');
  }

  const firstChoice = maybeChoices[0];
  if (!firstChoice || typeof firstChoice !== 'object') {
    throw new HttpError(502, 'LLM provider returned a malformed choice.');
  }

  const message = (firstChoice as { message?: unknown }).message;
  if (!message || typeof message !== 'object') {
    throw new HttpError(502, 'LLM provider did not return a message.');
  }

  const parsed = (message as { parsed?: unknown }).parsed;
  if (parsed !== undefined) {
    return parsed as T;
  }

  const content = (message as { content?: unknown }).content;
  if (typeof content === 'string') {
    try {
      return JSON.parse(content) as T;
    } catch {
      throw new HttpError(
        502,
        'LLM provider returned content but it was not valid JSON as required by the schema.'
      );
    }
  }

  if (Array.isArray(content)) {
    const combined = content
      .map((part) => {
        if (!part || typeof part !== 'object') {
          return '';
        }

        const text = (part as { text?: unknown }).text;
        return typeof text === 'string' ? text : '';
      })
      .join('')
      .trim();

    if (!combined) {
      throw new HttpError(502, 'LLM provider returned empty content.');
    }

    try {
      return JSON.parse(combined) as T;
    } catch {
      throw new HttpError(
        502,
        'LLM provider returned content parts but they were not valid JSON as required by the schema.'
      );
    }
  }

  throw new HttpError(502, 'LLM provider response did not contain structured content.');
};

export const requestStructuredLlmResponse = async <T>({
  systemPrompt,
  prompt,
  responseSchema
}: LlmStructuredRequest): Promise<T> => {
  if (typeof fetch !== 'function') {
    throw new HttpError(500, 'LLM service requires fetch support but it is unavailable.');
  }

  if (!env.llm.apiUrl || !env.llm.apiKey) {
    throw new HttpError(500, 'LLM service is not configured.');
  }

  if (!responseSchema?.name?.trim()) {
    throw new HttpError(500, 'Response schema must define a non-empty name.');
  }

  if (
    !responseSchema.schema ||
    typeof responseSchema.schema !== 'object' ||
    Array.isArray(responseSchema.schema)
  ) {
    throw new HttpError(500, 'Response schema must be a JSON schema object.');
  }

  const requestBody = {
    model: env.llm.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: responseSchema.name,
        schema: responseSchema.schema
      }
    }
  };

  let response: Awaited<ReturnType<typeof fetch>>;
  try {
    response = await fetch(env.llm.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.llm.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });
  } catch (error) {
    throw new HttpError(
      502,
      'We could not reach the LLM service. Please try again later.',
      error instanceof Error ? { message: error.message } : undefined
    );
  }

  if (!response.ok) {
    let errorDetails: unknown;
    try {
      errorDetails = await response.json();
    } catch {
      errorDetails = await response.text();
    }

    throw new HttpError(
      502,
      'The LLM service returned an unexpected response. Please try again later.',
      errorDetails
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new HttpError(502, 'LLM provider returned a non-JSON response.');
  }

  return extractStructuredContent<T>(payload);
};

/*
example:

const response = await requestStructuredLlmResponse({
  systemPrompt: 'You are a helpful assistant.',
  prompt: 'What is the capital of France?',
  responseSchema: {
    name: 'capital',
    schema: {
      type: 'object',
      properties: {
        capital: {
          type: 'string'
        }
      },
      required: ['capital']
    }
  }
});

console.log(response); // { capital: 'Paris' }
 */
