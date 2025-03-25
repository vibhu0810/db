import { useUserRating } from "@/hooks/use-user-rating";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

export function UserRating() {
  const { rating, isLoading } = useUserRating();
  
  if (isLoading) {
    return <Skeleton className="h-4 w-16" />;
  }
  
  if (rating === null) {
    return null;
  }
  
  // Rounded to nearest integer for star display
  const roundedRating = Math.round(rating);
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">{rating.toFixed(1)}</span>
            <span className="text-yellow-500 flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className="inline-block px-0.5">
                  {star <= roundedRating ? "★" : "☆"}
                </span>
              ))}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Your average rating: {rating.toFixed(1)}/5.0</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}