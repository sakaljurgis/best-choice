const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

type ApiFetchOptions = Omit<RequestInit, 'body'> & {
  body?: Record<string, unknown> | null;
};

export async function apiFetch<TResponse>(path: string, options: ApiFetchOptions = {}): Promise<TResponse> {
  const { body, headers, ...rest } = options;
  const init: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined,
    ...rest
  };

  const response = await fetch(`${API_BASE_URL}${path}`, init);

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;

    try {
      const errorPayload = await response.clone().json();
      const extractedMessage =
        (errorPayload && errorPayload.error && errorPayload.error.message) ??
        errorPayload.message;
      if (typeof extractedMessage === 'string' && extractedMessage.trim().length > 0) {
        message = extractedMessage;
      }
    } catch {
      // ignore JSON parsing issues - fall back to status text when available
      if (response.statusText) {
        message = `${message} ${response.statusText}`;
      }
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return null as TResponse;
  }

  return response.json() as Promise<TResponse>;
}
