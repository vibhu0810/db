import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  urlOrOptions: string | { method: string; body?: string },
  optionsOrData?: unknown,
): Promise<Response> {
  let url: string;
  let options: RequestInit;

  // Handle overloaded function signatures
  if (typeof urlOrOptions === 'string') {
    // First form: apiRequest(url, data)
    url = urlOrOptions;
    const method = typeof optionsOrData === 'object' && optionsOrData !== null ? 'POST' : 'GET';
    options = {
      method,
      headers: optionsOrData ? { "Content-Type": "application/json" } : {},
      body: optionsOrData ? JSON.stringify(optionsOrData) : undefined,
      credentials: "include",
    };
  } else {
    // Second form: apiRequest({ method, body }, undefined)
    url = optionsOrData as string;
    options = {
      method: urlOrOptions.method,
      headers: urlOrOptions.body ? { "Content-Type": "application/json" } : {},
      body: urlOrOptions.body,
      credentials: "include",
    };
  }

  const res = await fetch(url, options);

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});