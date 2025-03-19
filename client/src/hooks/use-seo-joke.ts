import { useQuery } from "@tanstack/react-query";

export function useSEOJoke() {
  return useQuery({
    queryKey: ["/api/seo-joke"],
    enabled: false, // Only fetch when needed
  });
}
