const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

type ApiFetchOptions = Omit<RequestInit, 'body'> & {
  body?: Record<string, unknown>;
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
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<TResponse>;
}
