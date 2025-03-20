import { useQuery } from "@tanstack/react-query";

interface SEOJokeResponse {
  joke: string;
}

export function useSEOJoke() {
  return useQuery<SEOJokeResponse>({
    queryKey: ["/api/seo-joke"],
    enabled: false, // Only fetch when needed
  });
}
