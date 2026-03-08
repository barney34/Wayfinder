import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
      queryFn: async ({ queryKey }) => {
        const [url] = queryKey;
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}${url}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      },
    },
  },
});

export async function apiRequest(method: string, url: string, data?: unknown, options?: RequestInit): Promise<Response> {
  const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}${url}`, {
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
