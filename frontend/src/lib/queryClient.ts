import { QueryClient } from '@tanstack/react-query';

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');

export function getApiUrl(url: string): string {
  if (/^https?:\/\//.test(url)) {
    return url;
  }

  return `${API_BASE_URL}${url}`;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
      queryFn: async ({ queryKey }) => {
        const [url] = queryKey;
        const response = await fetch(getApiUrl(String(url)));
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      },
    },
  },
});

export async function apiRequest(method: string, url: string, data?: unknown, options?: RequestInit): Promise<Response> {
  const response = await fetch(getApiUrl(url), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: data ? (data instanceof FormData ? data : JSON.stringify(data)) : undefined,
    ...options,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`${method} ${url} → ${response.status} ${response.statusText}${text ? `: ${text}` : ''}`);
  }
  return response;
}
