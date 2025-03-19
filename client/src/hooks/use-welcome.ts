import { useQuery } from "@tanstack/react-query";

export function useWelcome() {
  return useQuery({
    queryKey: ["/api/welcome-message"],
    enabled: false, // Only fetch when needed
  });
}
