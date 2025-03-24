import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  methodOrUrl: string,
  urlOrData?: unknown,
  data?: unknown,
): Promise<Response> {
  let url: string;
  let method: string;
  let body: unknown;
  let options: RequestInit;

  // Handle different parameter formats
  if (urlOrData && typeof urlOrData === 'string') {
    // Format: apiRequest(method, url, data)
    method = methodOrUrl;
    url = urlOrData as string;
    body = data;
  } else {
    // Format: apiRequest(url, data)
    method = 'GET'; // Default method
    url = methodOrUrl;
    body = urlOrData;
    
    // If body exists, assume it's a POST unless explicitly specified
    if (body !== undefined) {
      method = 'POST';
    }
  }
  
  // Create base options
  options = {
    method,
    headers: {},
    credentials: "include",
  };
  
  // Only add body and Content-Type for methods that support body
  if (method !== 'GET' && method !== 'HEAD' && body !== undefined) {
    options.headers = { 
      ...options.headers,
      "Content-Type": "application/json",
      "Accept": "application/json"
    };
    options.body = JSON.stringify(body);
  } else {
    // Always set Accept header for all requests
    options.headers = {
      ...options.headers,
      "Accept": "application/json"
    };
  }

  console.log(`Making ${method} request to ${url}`, body ? 'with body' : 'without body');
  
  try {
    const res = await fetch(url, options);
    
    console.log(`Response from ${url}: status=${res.status}`);
    
    // For unauthorized responses, we don't want to throw immediately
    // So we can handle it gracefully in the calling code
    if (res.status === 401) {
      console.warn(`Unauthorized access to ${url}`);
      return res;
    }

    // Check content type to ensure we're getting JSON
    const contentType = res.headers.get('content-type');
    if (contentType && !contentType.includes('application/json')) {
      console.warn(`Warning: Response from ${url} is not JSON (${contentType})`);
    }

    // For other non-ok responses, we'll handle them based on the calling requirements
    return res;
  } catch (error) {
    console.error(`API Request Error to ${url}:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    console.log(`Fetching data from ${url}`);
    
    try {
      const res = await fetch(url, {
        credentials: "include",
      });
      
      console.log(`Response from ${url}: status=${res.status}`);
      
      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.log(`Unauthorized access to ${url}, returning null as configured`);
        return null;
      }

      if (!res.ok) {
        const text = await res.text();
        console.error(`Error response from ${url}: ${res.status} - ${text || res.statusText}`);
        throw new Error(`${res.status}: ${text || res.statusText}`);
      }

      const data = await res.json();
      console.log(`Successful data fetch from ${url}, data:`, 
        url.includes('/api/user') ? (data ? 'User data present' : 'No user data') : 'Data received');
      
      return data;
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
      throw error;
    }
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