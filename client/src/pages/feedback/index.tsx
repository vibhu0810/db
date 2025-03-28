import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { HeartIcon, Heart, Plus, PlusCircle, Edit, Check, X } from "lucide-react";

// Interface for feedback questions
interface FeedbackQuestion {
  id: number;
  question: string;
  isActive: boolean;
  createdAt: string;
  createdBy: number | null;
  sortOrder: number;
}

interface Feedback {
  id: number;
  userId: number;
  month: number;
  year: number;
  ratings: string; // JSON string of ratings
  averageRating: string;
  comments: string | null;
  createdAt: string;
  isCompleted: boolean;
  user?: {
    id: number;
    username: string;
    email: string;
    companyName: string;
  };
}

// Modern HeartRating component with animations
function StarRating({ rating, onRatingChange }: { rating: number, onRatingChange?: (rating: number) => void }) {
  const [hoverRating, setHoverRating] = useState(0);
  
  const activeRating = hoverRating || rating;
  
  return (
    <div className="flex items-center gap-1 py-2">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((heart) => (
          <motion.button
            key={heart}
            type="button"
            initial={{ scale: 1 }}
            whileHover={{ scale: onRatingChange ? 1.2 : 1 }}
            whileTap={{ scale: onRatingChange ? 0.9 : 1 }}
            transition={{ duration: 0.2 }}
            className={`relative focus:outline-none rounded-full p-1 
              ${activeRating >= heart 
                ? "text-red-500" 
                : "text-gray-300 dark:text-gray-600"}`}
            onClick={() => onRatingChange?.(heart)}
            onMouseEnter={() => onRatingChange && setHoverRating(heart)}
            onMouseLeave={() => onRatingChange && setHoverRating(0)}
            disabled={!onRatingChange}
          >
            <Heart
              fill={activeRating >= heart ? "currentColor" : "none"}
              className={`h-6 w-6 transition-all duration-300`}
              strokeWidth={activeRating >= heart ? 1.5 : 1.5}
            />
            
            {/* Animate the heart when it becomes active */}
            {activeRating === heart && onRatingChange && (
              <motion.span
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{ 
                  repeat: 1, 
                  duration: 0.5,
                  ease: "easeOut" 
                }}
              >
                <Heart fill="currentColor" className="h-6 w-6 text-red-500" />
              </motion.span>
            )}
          </motion.button>
        ))}
      </div>
      
      {rating > 0 && (
        <motion.span 
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          className="ml-2 text-sm font-medium text-red-500"
        >
          {rating}/5
        </motion.span>
      )}
    </div>
  );
}

function formatMonth(month: number): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  // Ensure month value is valid (between 1-12) or handle edge cases
  const safeMonth = isNaN(month) || month < 1 || month > 12 
    ? new Date().getMonth() + 1  // Default to current month if invalid
    : month;
    
  return months[safeMonth - 1];
}

// Heart display component for average ratings
function HeartRatingDisplay({ rating }: { rating: number }) {
  // Ensure rating is a valid number
  const validRating = isNaN(rating) ? 0 : rating;
  
  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((heart) => {
          // Use a more precise method to determine partially filled hearts
          const isFilled = heart <= Math.floor(validRating);
          const isHalfFilled = !isFilled && (heart - 0.5) <= validRating;
          
          return (
            <Heart
              key={heart}
              fill={isFilled ? "currentColor" : "none"}
              className={`h-4 w-4 ${
                isFilled 
                  ? "text-red-500" 
                  : isHalfFilled 
                    ? "text-red-300" 
                    : "text-gray-300 dark:text-gray-600"
              }`}
            />
          );
        })}
      </div>
      <span className="ml-1 text-sm font-medium text-red-500">{validRating.toFixed(1)}</span>
    </div>
  );
}

function FeedbackDisplay({ feedback, showHistory = false }: { feedback: Feedback, showHistory?: boolean }) {
  // Fetch feedback questions from API
  const { data: feedbackQuestions = [], isLoading: isQuestionsLoading } = useQuery<FeedbackQuestion[]>({
    queryKey: ['/api/feedback/questions'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Parse the ratings JSON with error handling
  let ratings: number[] = [];
  try {
    // Handle different formats: string (JSON), object, or array
    if (typeof feedback.ratings === 'string') {
      ratings = JSON.parse(feedback.ratings);
    } else if (Array.isArray(feedback.ratings)) {
      ratings = feedback.ratings;
    } else if (typeof feedback.ratings === 'object' && feedback.ratings !== null) {
      ratings = Object.values(feedback.ratings);
    }
    
    // Ensure ratings is an array
    if (!Array.isArray(ratings)) {
      ratings = [];
    }
  } catch (e) {
    console.error("Error parsing ratings:", e);
    ratings = [];
  }
  
  const averageRating = parseFloat(feedback.averageRating || "0");
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="w-full overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-red-100 to-transparent opacity-50 rounded-bl-full transform rotate-6 -mr-6 -mt-6 dark:from-red-900 dark:opacity-20"></div>
        
        <CardHeader className="relative z-10">
          <div className="flex justify-between items-center mb-2">
            <CardTitle className="text-xl font-bold">
              {showHistory ? "Your Rating" : `${formatMonth(feedback.month)} ${feedback.year} Feedback`}
            </CardTitle>
            <div className="bg-gradient-to-r from-red-100 to-red-50 dark:from-red-900/30 dark:to-red-800/20 rounded-full px-4 py-1 text-sm font-semibold text-red-700 dark:text-red-300 flex items-center gap-2">
              <HeartIcon className="h-4 w-4 fill-red-500 text-red-500" />
              {averageRating.toFixed(1)}
            </div>
          </div>
          <CardDescription className="text-muted-foreground">
            {showHistory ? `Submitted on ${new Date(feedback.createdAt).toLocaleDateString()}` : 'Thank you for your feedback'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="relative z-10 space-y-6">
          {isQuestionsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-4 rounded-lg bg-muted/50 border border-muted-foreground/10 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-6 w-28" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
              {feedbackQuestions.map((question: FeedbackQuestion, index: number) => (
                <motion.div 
                  key={question.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.3 }}
                  className="p-4 rounded-lg bg-muted/50 border border-muted-foreground/10"
                >
                  <div className="font-medium mb-2 text-sm">{question.question}</div>
                  <div className="flex items-center">
                    <StarRating rating={ratings[index] || 0} />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          
          {feedback.comments && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Separator className="my-4" />
              <div className="bg-muted/30 p-4 rounded-lg border border-muted-foreground/10">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <span className="h-1 w-4 bg-red-500 rounded-full"></span>
                  Additional Comments
                </h4>
                <p className="text-sm whitespace-pre-line italic text-muted-foreground">"{feedback.comments}"</p>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function FeedbackForm({ feedback, onComplete }: { feedback: Feedback; onComplete: () => void }) {
  const { toast } = useToast();
  const [comments, setComments] = useState("");
  const [activeSection, setActiveSection] = useState(0);
  
  // Fetch feedback questions from API
  const { data: feedbackQuestions = [], isLoading: isQuestionsLoading } = useQuery<FeedbackQuestion[]>({
    queryKey: ['/api/feedback/questions'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Initialize ratings state when questions are loaded
  const [ratings, setRatings] = useState<number[]>([]);
  
  // Update ratings array when questions are loaded
  useEffect(() => {
    if (feedbackQuestions.length > 0) {
      setRatings(Array(feedbackQuestions.length).fill(0));
    }
  }, [feedbackQuestions]);
  
  // Calculate current progress
  const completedRatings = ratings.filter(r => r > 0).length;
  const progress = feedbackQuestions.length > 0 
    ? Math.round((completedRatings / feedbackQuestions.length) * 100)
    : 0;
  
  const submitMutation = useMutation({
    mutationFn: async () => {
      // Calculate average rating
      const validRatings = ratings.filter(r => r > 0);
      const averageRating = validRatings.length 
        ? (validRatings.reduce((acc, curr) => acc + curr, 0) / validRatings.length).toFixed(1)
        : "0";
        
      const response = await apiRequest(`/api/feedback/${feedback.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ratings: JSON.stringify(ratings), // Convert array to JSON string for consistent storage
          averageRating,
          comments,
          isCompleted: true
        }),
      });
      
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Feedback submitted",
        description: "Thank you for your feedback!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/feedback'] });
      onComplete();
    },
    onError: (error: Error) => {
      toast({
        title: "Error submitting feedback",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const handleRatingChange = (questionIndex: number, rating: number) => {
    const newRatings = [...ratings];
    newRatings[questionIndex] = rating;
    setRatings(newRatings);
    
    // Auto advance to next question if possible
    if (questionIndex < feedbackQuestions.length - 1) {
      setTimeout(() => {
        setActiveSection(questionIndex + 1);
      }, 400);
    }
  };
  
  const handleSubmit = () => {
    // Validate that all questions have been answered
    if (ratings.some(rating => rating === 0)) {
      toast({
        title: "Incomplete feedback",
        description: "Please rate all questions before submitting",
        variant: "destructive",
      });
      return;
    }
    
    submitMutation.mutate();
  };
  
  // Create calculated average rating for live preview
  const calculatedAverage = () => {
    const validRatings = ratings.filter(r => r > 0);
    if (validRatings.length === 0) return 0;
    return validRatings.reduce((sum, rating) => sum + rating, 0) / validRatings.length;
  };
  
  if (isQuestionsLoading) {
    return (
      <Card className="w-full overflow-hidden">
        <CardHeader>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 rounded-lg bg-muted/50 border border-muted-foreground/10 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-6 w-36" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="w-full overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-100 to-transparent opacity-50 rounded-bl-full transform -rotate-6 -mr-8 -mt-8 dark:from-red-900 dark:opacity-20"></div>
        
        <CardHeader className="relative z-10">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-xl">Share Your Feedback</CardTitle>
              <CardDescription className="text-muted-foreground">
                Help us improve our services
              </CardDescription>
            </div>
            
            {progress > 0 && (
              <div className="bg-red-50 dark:bg-red-900/30 px-3 py-1 rounded-full">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-16 bg-muted rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="h-full bg-red-500"
                    />
                  </div>
                  <span className="text-xs font-medium text-red-600 dark:text-red-300">{progress}%</span>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="relative z-10 space-y-8">
          <div className="space-y-6">
            {feedbackQuestions.map((question: FeedbackQuestion, index: number) => (
              <motion.div 
                key={question.id}
                initial={{ opacity: 0.7, y: 5 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  scale: activeSection === index ? 1.02 : 1
                }}
                transition={{ duration: 0.3 }}
                className={`p-5 rounded-lg border border-muted transition-all duration-300 ${
                  activeSection === index 
                    ? "bg-card shadow-md border-red-200 dark:border-red-900/50" 
                    : "bg-muted/20"
                }`}
                onClick={() => setActiveSection(index)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="font-medium flex items-center gap-2">
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      ratings[index] > 0 
                        ? "bg-red-500 text-white" 
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {index + 1}
                    </div>
                    <span>{question.question}</span>
                  </div>
                  {ratings[index] > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-green-500 text-xs font-medium px-2 py-0.5 bg-green-50 dark:bg-green-900/20 rounded-full">
                      Rated {ratings[index]}/5
                    </motion.div>
                  )}
                </div>
                <div className="flex items-center">
                  <StarRating 
                    rating={ratings[index]} 
                    onRatingChange={(rating) => handleRatingChange(index, rating)} 
                  />
                </div>
              </motion.div>
            ))}
          </div>
          
          <div className="p-5 rounded-lg border border-muted bg-muted/10">
            <div className="flex items-center gap-2 mb-3">
              <span className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold bg-muted text-muted-foreground">
                {feedbackQuestions.length + 1}
              </span>
              <label className="font-medium">Additional Comments (Optional)</label>
            </div>
            <Textarea
              placeholder="Share any additional thoughts or suggestions to help us improve..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
              className="bg-card resize-none"
            />
          </div>
          
          {/* Live rating summary */}
          {completedRatings > 1 && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 p-4 rounded-lg border border-red-100 dark:border-red-900/30"
            >
              <div className="flex items-center justify-between">
                <div className="font-medium">Your Average Rating</div>
                <div className="flex items-center gap-2">
                  <HeartRatingDisplay rating={calculatedAverage()} />
                </div>
              </div>
            </motion.div>
          )}
        </CardContent>
        
        <CardFooter className="border-t px-6 py-4 bg-muted/5">
          <div className="flex w-full items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {ratings.some(r => r === 0) 
                ? `Please rate all ${feedbackQuestions.length} questions` 
                : 'All questions answered! Ready to submit.'}
            </div>
            <Button 
              onClick={handleSubmit} 
              disabled={submitMutation.isPending || ratings.some(rating => rating === 0) || feedbackQuestions.length === 0}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {submitMutation.isPending ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                  Submitting...
                </>
              ) : "Submit Feedback"}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

// Confetti animation to celebrate feedback submission
function ConfettiCelebration() {
  const [showConfetti, setShowConfetti] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, 3500);
    
    return () => clearTimeout(timer);
  }, []);
  
  if (!showConfetti) return null;
  
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <div className="absolute inset-0 flex items-center justify-center">
        {[...Array(50)].map((_, i) => {
          const randomColor = ['bg-red-500', 'bg-pink-500', 'bg-purple-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500'][Math.floor(Math.random() * 6)];
          const randomLeft = `${Math.random() * 100}%`;
          const randomDelay = `${Math.random() * 0.5}s`;
          const randomDuration = `${0.5 + Math.random() * 2}s`;
          const size = `${5 + Math.random() * 10}px`;
          
          return (
            <motion.div
              key={i}
              className={`absolute ${randomColor} rounded-full`}
              initial={{ 
                top: "-10%",
                left: randomLeft,
                width: size,
                height: size,
                opacity: 1
              }}
              animate={{ 
                top: "110%",
                rotate: Math.random() * 360,
                opacity: 0
              }}
              transition={{ 
                duration: parseFloat(randomDuration),
                delay: parseFloat(randomDelay),
                ease: "easeOut"
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

// Streak tracking for gamification
function FeedbackStreak({ streak }: { streak: number }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950 dark:to-yellow-900 rounded-lg border border-amber-200 dark:border-amber-900">
      <div className="flex items-center gap-1">
        {[...Array(Math.min(streak, 3))].map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.1, type: "spring" }}
          >
            <svg className="w-4 h-4 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </motion.div>
        ))}
        {streak > 3 && (
          <span className="text-xs font-bold text-amber-700 dark:text-amber-300">+{streak - 3}</span>
        )}
      </div>
      <div className="text-xs font-medium text-amber-800 dark:text-amber-200">
        {streak === 0 ? 'No streak yet' : 
         streak === 1 ? 'First feedback!' : 
         `${streak} month streak`}
      </div>
    </div>
  );
}

function UserFeedbackTab() {
  const { user } = useAuth();
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  
  const { data: feedbackData = [], isLoading } = useQuery<Feedback[]>({
    queryKey: ['/api/feedback'],
    enabled: !!user
  });
  
  // Check if there's any pending feedback to complete
  const pendingFeedback = feedbackData?.find((f: Feedback) => !f.isCompleted);
  const completedFeedback = feedbackData?.filter((f: Feedback) => f.isCompleted) || [];
  
  // Calculate feedback streak (consecutive months with feedback)
  const calculateStreak = () => {
    if (!completedFeedback.length) return 0;
    
    // Sort feedback by date (newest first)
    const sortedFeedback = [...completedFeedback].sort((a, b) => {
      const dateA = new Date(a.year, a.month - 1);
      const dateB = new Date(b.year, b.month - 1);
      return dateB.getTime() - dateA.getTime();
    });
    
    let streak = 1;
    const currentDate = new Date();
    const mostRecentFeedbackDate = new Date(sortedFeedback[0].year, sortedFeedback[0].month - 1);
    
    // Check if most recent feedback is for current or last month
    const isCurrentOrLastMonth = () => {
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      
      const isCurrent = mostRecentFeedbackDate.getMonth() === currentMonth && 
                        mostRecentFeedbackDate.getFullYear() === currentYear;
      
      const lastMonth = new Date(currentYear, currentMonth - 1);
      const isLast = mostRecentFeedbackDate.getMonth() === lastMonth.getMonth() && 
                    mostRecentFeedbackDate.getFullYear() === lastMonth.getFullYear();
                    
      return isCurrent || isLast;
    };
    
    // If most recent feedback is not for current or previous month, no active streak
    if (!isCurrentOrLastMonth()) return 0;
    
    // Count consecutive months
    for (let i = 0; i < sortedFeedback.length - 1; i++) {
      const current = new Date(sortedFeedback[i].year, sortedFeedback[i].month - 1);
      const next = new Date(sortedFeedback[i + 1].year, sortedFeedback[i + 1].month - 1);
      
      // Check if dates are consecutive months
      const expectedPrevMonth = new Date(current.getFullYear(), current.getMonth() - 1);
      if (expectedPrevMonth.getMonth() === next.getMonth() && 
          expectedPrevMonth.getFullYear() === next.getFullYear()) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };
  
  const feedbackStreak = calculateStreak();
  
  // Show empty state component if there's no selected feedback
  const EmptyFeedbackState = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-muted rounded-lg p-8 text-center"
    >
      <div className="mb-6 mx-auto w-24 h-24 flex items-center justify-center rounded-full bg-muted-foreground/10">
        <Heart className="w-10 h-10 text-muted-foreground/50" />
      </div>
      <h3 className="text-xl font-medium mb-2">Welcome to Feedback</h3>
      <p className="text-muted-foreground">
        {pendingFeedback ? 
          "You have a pending feedback request. Click it in the sidebar to complete it." :
          completedFeedback.length > 0 ? 
            "View your submitted feedback by selecting an entry from the sidebar." :
            "You don't have any feedback requests yet. Feedback requests are generated monthly for clients with completed orders."
        }
      </p>
    </motion.div>
  );
  
  useEffect(() => {
    if (pendingFeedback) {
      setSelectedFeedback(pendingFeedback);
    } 
    // Don't automatically select completed feedback because we don't want to show it by default
  }, [feedbackData, pendingFeedback]);
  
  const handleFeedbackComplete = () => {
    // Refresh the data
    queryClient.invalidateQueries({ queryKey: ['/api/feedback'] });
  };
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  
  if (!feedbackData || feedbackData.length === 0) {
    return (
      <Card className="w-full text-center p-8">
        <CardContent>
          <p className="text-muted-foreground my-8">
            You don't have any feedback requests yet. Feedback requests are generated at the beginning of each month for clients with completed orders.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          {pendingFeedback && (
            <motion.div 
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 max-w-xl"
            >
              <p className="font-medium text-yellow-800 dark:text-yellow-300">
                You have pending feedback for {formatMonth(pendingFeedback.month)} {pendingFeedback.year}
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                Please take a moment to complete your feedback and help us improve our services.
              </p>
            </motion.div>
          )}
        </div>
        
        {/* Show feedback streak if completed feedback exists */}
        {feedbackStreak > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            <FeedbackStreak streak={feedbackStreak} />
          </motion.div>
        )}
      </div>
      
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base">Feedback History</CardTitle>
                <span className="text-xs text-muted-foreground">
                  {completedFeedback.length} completed
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[300px]">
                <div className="p-4 space-y-2">
                  {pendingFeedback && (
                    <motion.div
                      initial={{ y: -5, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    >
                      <Button
                        variant={selectedFeedback?.id === pendingFeedback.id ? "default" : "outline"}
                        className="w-full justify-start text-left font-normal h-auto py-2 border-yellow-200 dark:border-yellow-800"
                        onClick={() => setSelectedFeedback(pendingFeedback)}
                      >
                        <div>
                          <div className="font-medium">{formatMonth(pendingFeedback.month)} {pendingFeedback.year}</div>
                          <span className="text-xs px-2 py-0.5 ml-2 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                            Pending
                          </span>
                        </div>
                      </Button>
                    </motion.div>
                  )}
                  
                  {completedFeedback.map((feedback: Feedback, index) => (
                    <motion.div
                      key={feedback.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.2 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        variant={selectedFeedback?.id === feedback.id ? "default" : "outline"}
                        className={`w-full justify-start text-left font-normal h-auto py-3 mb-2 ${
                          selectedFeedback?.id === feedback.id 
                            ? "border-red-200 dark:border-red-800" 
                            : ""
                        }`}
                        onClick={() => {
                          // Animation when switching feedback
                          if (selectedFeedback?.id !== feedback.id) {
                            setSelectedFeedback(null);
                            setTimeout(() => setSelectedFeedback(feedback), 200);
                          }
                        }}
                      >
                        <div className="w-full">
                          <div className="flex justify-between items-center mb-1">
                            <div className="font-medium">{formatMonth(feedback.month)} {feedback.year}</div>
                            <div className="text-xs bg-red-50 dark:bg-red-900/30 rounded-full px-2 py-0.5 text-red-600 dark:text-red-300">
                              {new Date(feedback.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          
                          <div className="mt-2 flex items-center">
                            <HeartRatingDisplay rating={parseFloat(feedback.averageRating)} />
                          </div>
                        </div>
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-2">
          {showConfetti && <ConfettiCelebration />}
          
          {selectedFeedback ? (
            <motion.div
              key={selectedFeedback.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {selectedFeedback.isCompleted ? (
                <FeedbackDisplay feedback={selectedFeedback} showHistory={true} />
              ) : (
                <FeedbackForm 
                  feedback={selectedFeedback} 
                  onComplete={() => {
                    handleFeedbackComplete();
                    setShowConfetti(true);
                    // Reset the confetti after 4 seconds
                    setTimeout(() => setShowConfetti(false), 4000);
                  }} 
                />
              )}
            </motion.div>
          ) : (
            <EmptyFeedbackState />
          )}
        </div>
      </div>
    </div>
  );
}

function AdminFeedbackTab() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"feedback" | "questions">("feedback");
  const [newQuestion, setNewQuestion] = useState<string>("");
  const [editingQuestion, setEditingQuestion] = useState<{id: number, question: string} | null>(null);
  
  // Fetch feedback data
  const { data: feedbackData = [], isLoading, isError, error } = useQuery<Feedback[]>({
    queryKey: ['/api/feedback/all'],
  });
  
  // Fetch feedback questions
  const { 
    data: feedbackQuestions = [], 
    isLoading: isQuestionsLoading,
    refetch: refetchQuestions
  } = useQuery<FeedbackQuestion[]>({
    queryKey: ['/api/feedback/questions'],
  });
  
  // Generate monthly feedback mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      console.log("Generating monthly feedback requests...");
      const response = await apiRequest("/api/feedback/generate", {
        method: "POST",
      });
      
      // Log response for debugging
      console.log("Generate response status:", response.status);
      const data = await response.json();
      console.log("Generate response data:", data);
      return data;
    },
    onSuccess: (data) => {
      console.log("Generate mutation success:", data);
      toast({
        title: "Feedback requests generated",
        description: `Successfully generated ${data.count} feedback requests`,
      });
      
      // Invalidate both feedback endpoints to ensure UI refreshes
      queryClient.invalidateQueries({ queryKey: ['/api/feedback/all'] });
      queryClient.invalidateQueries({ queryKey: ['/api/feedback'] });
      
      // Force refetch the feedback data
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/feedback/all'] });
      }, 300);
    },
    onError: (error: Error) => {
      console.error("Generate mutation error:", error);
      toast({
        title: "Error generating feedback requests",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Create new question mutation
  const createQuestionMutation = useMutation({
    mutationFn: async (questionText: string) => {
      const response = await apiRequest('/api/feedback/questions', {
        method: 'POST',
        body: JSON.stringify({ question: questionText }),
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Question added",
        description: "The new question has been added successfully",
      });
      setNewQuestion("");
      queryClient.invalidateQueries({ queryKey: ['/api/feedback/questions'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error adding question",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Update question mutation
  const updateQuestionMutation = useMutation({
    mutationFn: async ({ id, question }: { id: number, question: string }) => {
      const response = await apiRequest(`/api/feedback/questions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ question }),
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Question updated",
        description: "The question has been updated successfully",
      });
      setEditingQuestion(null);
      queryClient.invalidateQueries({ queryKey: ['/api/feedback/questions'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating question",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Toggle question active status mutation
  const toggleQuestionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/feedback/questions/${id}/toggle`, {
        method: 'PATCH',
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Status updated",
        description: "Question status has been toggled successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/feedback/questions'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const handleCreateQuestion = () => {
    if (newQuestion.trim().length < 10) {
      toast({
        title: "Question too short",
        description: "The question must be at least 10 characters long",
        variant: "destructive",
      });
      return;
    }
    
    createQuestionMutation.mutate(newQuestion);
  };
  
  const handleUpdateQuestion = () => {
    if (!editingQuestion) return;
    
    if (editingQuestion.question.trim().length < 10) {
      toast({
        title: "Question too short",
        description: "The question must be at least 10 characters long",
        variant: "destructive",
      });
      return;
    }
    
    updateQuestionMutation.mutate(editingQuestion);
  };
  
  const handleToggleQuestion = (id: number) => {
    toggleQuestionMutation.mutate(id);
  };
  
  if (isLoading && activeTab === "feedback") {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  
  if (isError && activeTab === "feedback") {
    return (
      <Card className="w-full text-center p-8">
        <CardContent>
          <p className="text-muted-foreground my-8">
            Error loading feedback data. Please try again later.
          </p>
          <Button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/feedback/all'] })}
            variant="outline"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  const feedbackByUser: Record<string, Feedback[]> = {};
  
  // Group feedback by user for the feedback tab
  if (activeTab === "feedback" && feedbackData && feedbackData.length > 0) {
    feedbackData.forEach((feedback: Feedback) => {
      const userKey = feedback.user?.id.toString() || 'unknown';
      if (!feedbackByUser[userKey]) {
        feedbackByUser[userKey] = [];
      }
      feedbackByUser[userKey].push(feedback);
    });
  }
  
  return (
    <div className="space-y-6">
      {/* Top navigation tabs */}
      <div className="border-b">
        <div className="flex">
          <Button
            variant="ghost"
            className={`relative px-4 py-2 -mb-px text-sm font-medium ${
              activeTab === "feedback"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground"
            }`}
            onClick={() => setActiveTab("feedback")}
          >
            Customer Feedback
          </Button>
          <Button
            variant="ghost"
            className={`relative px-4 py-2 -mb-px text-sm font-medium ${
              activeTab === "questions"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground"
            }`}
            onClick={() => setActiveTab("questions")}
          >
            Manage Questions
          </Button>
        </div>
      </div>
      
      {activeTab === "feedback" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Customer Feedback</h2>
            <Button 
              onClick={() => generateMutation.mutate()} 
              disabled={generateMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {generateMutation.isPending ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                  Generating...
                </>
              ) : "Generate Monthly Feedback Requests"}
            </Button>
          </div>
          
          {Object.entries(feedbackByUser).length === 0 ? (
            <Card className="w-full text-center p-8">
              <CardContent>
                <p className="text-muted-foreground my-8">
                  No feedback data available yet. Generate feedback requests for users to start collecting responses.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {Object.entries(feedbackByUser).map(([userId, userFeedback]) => {
                // Sort feedback by most recent first
                const sortedFeedback = [...userFeedback].sort((a, b) => 
                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
                
                const user = sortedFeedback[0].user;
                const completedFeedback = sortedFeedback.filter(f => f.isCompleted);
                
                // Calculate average rating across all completed feedback
                let overallAverage = 0;
                if (completedFeedback.length > 0) {
                  overallAverage = completedFeedback.reduce((acc, curr) => 
                    acc + parseFloat(curr.averageRating || "0"), 0) / completedFeedback.length;
                }
                
                return (
                  <Card key={userId} className="w-full">
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle>{user?.companyName || user?.username || "Unknown User"}</CardTitle>
                          <CardDescription>{user?.email || ""}</CardDescription>
                        </div>
                        {completedFeedback.length > 0 && (
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">Average Rating</div>
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-xl font-bold text-red-500">
                                {overallAverage.toFixed(1)}
                              </span>
                              <HeartRatingDisplay rating={overallAverage} />
                            </div>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue={sortedFeedback[0].id.toString()}>
                        <TabsList className="mb-4">
                          {sortedFeedback.map(feedback => (
                            <TabsTrigger key={feedback.id} value={feedback.id.toString()}>
                              {formatMonth(feedback.month)} {feedback.year}
                              {!feedback.isCompleted && (
                                <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                                  Pending
                                </span>
                              )}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                        
                        {sortedFeedback.map(feedback => (
                          <TabsContent key={feedback.id} value={feedback.id.toString()}>
                            {feedback.isCompleted ? (
                              <FeedbackDisplay feedback={feedback} showHistory={true} />
                            ) : (
                              <div className="p-4 bg-muted rounded-lg text-center">
                                <p className="text-muted-foreground">
                                  Feedback request is pending. User has not submitted their feedback yet.
                                </p>
                              </div>
                            )}
                          </TabsContent>
                        ))}
                      </Tabs>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
      
      {activeTab === "questions" && (
        <Card>
          <CardHeader>
            <CardTitle>Manage Feedback Questions</CardTitle>
            <CardDescription>Add, edit or disable feedback questions that will be shown to customers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Add new question */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Add New Question</h3>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Textarea 
                    placeholder="Enter new feedback question..." 
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    className="h-20"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Question must be at least 10 characters long.
                  </p>
                </div>
                <Button 
                  onClick={handleCreateQuestion}
                  disabled={createQuestionMutation.isPending || newQuestion.trim().length < 10}
                  className="self-end whitespace-nowrap"
                >
                  {createQuestionMutation.isPending ? (
                    <>
                      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Question
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            <Separator />
            
            {/* Question list */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Existing Questions</h3>
              
              {isQuestionsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="p-4 rounded-lg bg-muted/50 border border-muted-foreground/10 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <div className="flex justify-end space-x-2">
                        <Skeleton className="h-10 w-20" />
                        <Skeleton className="h-10 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : feedbackQuestions.length === 0 ? (
                <div className="p-8 text-center border rounded-lg bg-muted/10">
                  <div className="text-muted-foreground">No feedback questions found. Add your first question above.</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {(feedbackQuestions as FeedbackQuestion[]).map((question: FeedbackQuestion) => (
                    <div 
                      key={question.id} 
                      className={`p-4 rounded-lg border ${
                        question.isActive 
                          ? 'bg-card' 
                          : 'bg-muted/20 opacity-75'
                      }`}
                    >
                      {editingQuestion && editingQuestion.id === question.id ? (
                        <div className="space-y-3">
                          <Textarea
                            value={editingQuestion.question}
                            onChange={(e) => setEditingQuestion({...editingQuestion, question: e.target.value})}
                            className="w-full"
                          />
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setEditingQuestion(null)}
                            >
                              Cancel
                            </Button>
                            <Button 
                              size="sm"
                              onClick={handleUpdateQuestion}
                              disabled={updateQuestionMutation.isPending}
                            >
                              {updateQuestionMutation.isPending ? "Saving..." : "Save Changes"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            <div className={`px-2 py-1 text-xs rounded-full ${
                              question.isActive 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                            }`}>
                              {question.isActive ? 'Active' : 'Inactive'}
                            </div>
                            <div className="text-sm">{question.question}</div>
                          </div>
                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setEditingQuestion({
                                id: question.id,
                                question: question.question
                              })}
                            >
                              Edit
                            </Button>
                            <Button 
                              variant={question.isActive ? "destructive" : "outline"} 
                              size="sm"
                              onClick={() => handleToggleQuestion(question.id)}
                              disabled={toggleQuestionMutation.isPending}
                            >
                              {question.isActive ? 'Disable' : 'Enable'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function FeedbackPage() {
  const { user, isAdmin } = useAuth();
  
  if (!user) {
    return null;
  }
  
  return (
    <DashboardShell>
      <div className="flex flex-col space-y-6">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-red-100 to-pink-100 dark:from-red-950 dark:to-red-900 p-8 mb-4">
          <div className="absolute inset-0 bg-grid-black/5 dark:bg-grid-white/5" />
          
          <div className="relative">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-red-900 dark:text-red-100 sm:text-4xl">
                  Customer Feedback
                </h1>
                <p className="mt-2 text-muted-foreground max-w-3xl">
                  {isAdmin ? 
                    "Monitor customer satisfaction and understand how clients feel about your services. Generate monthly feedback requests to maintain engagement." : 
                    "Share your thoughts and help us improve our service quality. Your feedback is invaluable to us."
                  }
                </p>
              </div>
              
              <div className="flex items-end">
                <div className="flex -space-x-2">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1, duration: 0.3 }}
                    >
                      <Heart 
                        key={i} 
                        className={`h-8 w-8 ${i % 2 === 0 ? 'text-red-500' : 'text-red-400'}`} 
                        fill="currentColor" 
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <Tabs defaultValue={isAdmin ? "admin" : "user"} className="w-full">
          {isAdmin && (
            <>
              <TabsList className="mb-6">
                <TabsTrigger value="admin">Customer Feedback</TabsTrigger>
                <TabsTrigger value="user">My Personal Feedback</TabsTrigger>
              </TabsList>
              
              <TabsContent value="admin">
                <AdminFeedbackTab />
              </TabsContent>
              
              <TabsContent value="user">
                <UserFeedbackTab />
              </TabsContent>
            </>
          )}
          
          {!isAdmin && <UserFeedbackTab />}
        </Tabs>
      </div>
    </DashboardShell>
  );
}