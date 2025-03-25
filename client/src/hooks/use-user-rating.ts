import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";

interface UserRatingResponse {
  averageRating: number | null;
}

export function useUserRating() {
  const { user } = useAuth();
  
  const { data, isLoading, error } = useQuery<UserRatingResponse>({
    queryKey: ['/api/feedback/rating'],
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  return {
    rating: data?.averageRating || null,
    isLoading,
    error
  };
}