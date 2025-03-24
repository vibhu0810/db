import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";

export function usePendingFeedback() {
  const { user } = useAuth();
  
  const { data, isLoading } = useQuery({
    queryKey: ['/api/feedback/pending'],
    enabled: !!user,
    refetchInterval: 300000, // Refetch every 5 minutes
  });
  
  return {
    hasPendingFeedback: data?.hasPendingFeedback || false,
    isLoading
  };
}