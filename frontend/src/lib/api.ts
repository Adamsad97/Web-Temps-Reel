const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const BEARER_TOKEN_PREFIX = 'Bearer ';

export async function apiFetch<T>(path: string, token: string | null, options?: RequestInit): Promise<T> {
  const httpResponse = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `${BEARER_TOKEN_PREFIX}${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!httpResponse.ok) {
    const errorResponse = await httpResponse.json().catch(() => ({}));
    throw new Error(errorResponse.error || 'Request failed');
  }
  return httpResponse.json();
}
