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

// Define the list of feedback questions
const FEEDBACK_QUESTIONS = [
  "How satisfied are you with the quality of our link building services?",
  "How would you rate the communication during the order process?",
  "How satisfied are you with the turnaround time for your orders?", 
  "How likely are you to recommend our services to others?",
  "How would you rate the value for money of our services?"
];

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

// StarRating component
function StarRating({ rating, onRatingChange }: { rating: number, onRatingChange?: (rating: number) => void }) {
  const [hoverRating, setHoverRating] = useState(0);
  
  return (
    <div className="flex items-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`text-xl focus:outline-none ${
            (hoverRating || rating) >= star
              ? "text-yellow-500"
              : "text-gray-300 dark:text-gray-600"
          }`}
          onClick={() => onRatingChange?.(star)}
          onMouseEnter={() => setHoverRating(star)}
          onMouseLeave={() => setHoverRating(0)}
          disabled={!onRatingChange}
        >
          ★
        </button>
      ))}
      {rating > 0 && (
        <span className="ml-2 text-sm text-muted-foreground">{rating}/5</span>
      )}
    </div>
  );
}

function formatMonth(month: number): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return months[month - 1];
}

function FeedbackDisplay({ feedback }: { feedback: Feedback }) {
  // Parse the ratings JSON
  const ratings = JSON.parse(feedback.ratings);
  const averageRating = parseFloat(feedback.averageRating || "0");
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          Feedback for {formatMonth(feedback.month)} {feedback.year}
          <span className="ml-2 text-yellow-500">
            {[1, 2, 3, 4, 5].map((star) => (
              <span key={star} className="inline-block">
                {star <= Math.round(averageRating) ? "★" : "☆"}
              </span>
            ))}
          </span>
        </CardTitle>
        <CardDescription>
          Average Rating: {averageRating.toFixed(1)} / 5.0
        </CardDescription>
      </CardHeader>
      <CardContent>
        {FEEDBACK_QUESTIONS.map((question, index) => (
          <div key={index} className="mb-4">
            <div className="font-medium mb-1">{question}</div>
            <div className="flex items-center">
              <StarRating rating={ratings[index] || 0} />
            </div>
          </div>
        ))}
        
        {feedback.comments && (
          <>
            <Separator className="my-4" />
            <div>
              <h4 className="font-medium mb-2">Additional Comments:</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{feedback.comments}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function FeedbackForm({ feedback, onComplete }: { feedback: Feedback; onComplete: () => void }) {
  const { toast } = useToast();
  const [ratings, setRatings] = useState<number[]>(Array(FEEDBACK_QUESTIONS.length).fill(0));
  const [comments, setComments] = useState("");
  
  const submitMutation = useMutation({
    mutationFn: async () => {
      // Calculate average rating
      const validRatings = ratings.filter(r => r > 0);
      const averageRating = validRatings.length 
        ? validRatings.reduce((acc, curr) => acc + curr, 0) / validRatings.length 
        : 0;
        
      return apiRequest(`/api/feedback/${feedback.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ratings,
          averageRating,
          comments
        }),
      });
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
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Your Feedback for {formatMonth(feedback.month)} {feedback.year}</CardTitle>
        <CardDescription>
          Help us improve our services by sharing your experience
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {FEEDBACK_QUESTIONS.map((question, index) => (
          <div key={index} className="space-y-2">
            <div className="font-medium">{question}</div>
            <StarRating 
              rating={ratings[index]} 
              onRatingChange={(rating) => handleRatingChange(index, rating)} 
            />
          </div>
        ))}
        
        <div className="space-y-2">
          <label className="font-medium">Additional Comments (Optional)</label>
          <Textarea
            placeholder="Share any additional thoughts or suggestions..."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={4}
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSubmit} 
          disabled={submitMutation.isPending || ratings.some(rating => rating === 0)}
        >
          {submitMutation.isPending ? "Submitting..." : "Submit Feedback"}
        </Button>
      </CardFooter>
    </Card>
  );
}

function UserFeedbackTab() {
  const { user } = useAuth();
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  
  const { data: feedbackData = [], isLoading } = useQuery<Feedback[]>({
    queryKey: ['/api/feedback'],
    enabled: !!user
  });
  
  // Check if there's any pending feedback to complete
  const pendingFeedback = feedbackData?.find((f: Feedback) => !f.isCompleted);
  const completedFeedback = feedbackData?.filter((f: Feedback) => f.isCompleted) || [];
  
  useEffect(() => {
    if (pendingFeedback) {
      setSelectedFeedback(pendingFeedback);
    } else if (completedFeedback.length > 0 && !selectedFeedback) {
      setSelectedFeedback(completedFeedback[0]);
    }
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
      {pendingFeedback && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <p className="font-medium text-yellow-800 dark:text-yellow-300">
            You have pending feedback for {formatMonth(pendingFeedback.month)} {pendingFeedback.year}
          </p>
          <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
            Please take a moment to complete your feedback and help us improve our services.
          </p>
        </div>
      )}
      
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Feedback History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[300px]">
                <div className="p-4 space-y-2">
                  {pendingFeedback && (
                    <Button
                      variant={selectedFeedback?.id === pendingFeedback.id ? "default" : "outline"}
                      className="w-full justify-start text-left font-normal h-auto py-2"
                      onClick={() => setSelectedFeedback(pendingFeedback)}
                    >
                      <div>
                        <div className="font-medium">{formatMonth(pendingFeedback.month)} {pendingFeedback.year}</div>
                        <span className="text-xs px-2 py-0.5 ml-2 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                          Pending
                        </span>
                      </div>
                    </Button>
                  )}
                  
                  {completedFeedback.map((feedback: Feedback) => (
                    <Button
                      key={feedback.id}
                      variant={selectedFeedback?.id === feedback.id ? "default" : "outline"}
                      className="w-full justify-start text-left font-normal h-auto py-2"
                      onClick={() => setSelectedFeedback(feedback)}
                    >
                      <div>
                        <div className="font-medium">{formatMonth(feedback.month)} {feedback.year}</div>
                        <div className="text-xs text-yellow-500 mt-1">
                          {parseFloat(feedback.averageRating).toFixed(1)}/5.0
                          <span className="ml-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span key={star} className="inline-block">
                                {star <= Math.round(parseFloat(feedback.averageRating)) ? "★" : "☆"}
                              </span>
                            ))}
                          </span>
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-2">
          {selectedFeedback && (
            <>
              {selectedFeedback.isCompleted ? (
                <FeedbackDisplay feedback={selectedFeedback} />
              ) : (
                <FeedbackForm feedback={selectedFeedback} onComplete={handleFeedbackComplete} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminFeedbackTab() {
  const { toast } = useToast();
  
  const { data: feedbackData = [], isLoading } = useQuery<Feedback[]>({
    queryKey: ['/api/feedback/all'],
  });
  
  const generateMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/feedback/generate", {
        method: "POST",
      });
    },
    onSuccess: (data: { count: number }) => {
      toast({
        title: "Feedback requests generated",
        description: `Successfully generated ${data.count} feedback requests`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/feedback/all'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error generating feedback requests",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  
  const feedbackByUser: Record<string, Feedback[]> = {};
  
  // Group feedback by user
  if (feedbackData) {
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
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Customer Feedback</h2>
        <Button 
          onClick={() => generateMutation.mutate()} 
          disabled={generateMutation.isPending}
        >
          {generateMutation.isPending ? "Generating..." : "Generate Monthly Feedback Requests"}
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
                acc + parseFloat(curr.averageRating), 0) / completedFeedback.length;
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
                        <div className="text-xl font-bold text-yellow-500">
                          {overallAverage.toFixed(1)}
                          <span className="text-lg ml-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span key={star} className="inline-block">
                                {star <= Math.round(overallAverage) ? "★" : "☆"}
                              </span>
                            ))}
                          </span>
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
                          <FeedbackDisplay feedback={feedback} />
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
  );
}

export default function FeedbackPage() {
  const { user, isAdmin } = useAuth();
  
  if (!user) {
    return null;
  }
  
  return (
    <DashboardShell>
      <div className="flex flex-col space-y-4">
        <div>
          <h1 className="text-3xl font-bold">Feedback</h1>
          <p className="text-muted-foreground">
            {isAdmin ? 
              "View and manage customer feedback" : 
              "Share your thoughts about our services"
            }
          </p>
        </div>
        
        <Tabs defaultValue={isAdmin ? "admin" : "user"} className="w-full">
          {isAdmin && (
            <>
              <TabsList className="mb-4">
                <TabsTrigger value="admin">All Feedback</TabsTrigger>
                <TabsTrigger value="user">My Feedback</TabsTrigger>
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