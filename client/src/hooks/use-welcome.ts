import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function useWelcome() {
  return useQuery({
    queryKey: ["/api/welcome-message"],
    queryFn: () => apiRequest("GET", "/api/welcome-message").then(res => res.json()),
    refetchOnWindowFocus: false, // Don't refetch on window focus to ensure different messages each time
    refetchOnMount: true, // Refetch when component mounts to get new messages
    staleTime: 0 // Always consider the data stale to get a new greeting each time
  });
}
