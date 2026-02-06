import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
      queryFn: async ({ queryKey }) => {
        const [url] = queryKey;
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}${url}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      },
    },
  },
});

export async function apiRequest(method, url, data) {
  const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}${url}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  return response;
}
