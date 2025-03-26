import React, { useState } from 'react';
import { Star, StarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface FeedbackFormProps {
  questions: {
    id: number;
    question: string;
    isActive: boolean;
    sortOrder: number;
  }[];
  onClose?: () => void;
  userId?: number;
  campaignId?: number;
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({ 
  questions, 
  onClose, 
  userId,
  campaignId
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for storing ratings
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [comments, setComments] = useState('');
  
  // Calculate average rating
  const averageRating = Object.values(ratings).length > 0 
    ? Object.values(ratings).reduce((sum, rating) => sum + rating, 0) / Object.values(ratings).length 
    : 0;
  
  // Handle rating selection for a question
  const handleRatingChange = (questionId: number, rating: number) => {
    setRatings(prev => ({
      ...prev,
      [questionId]: rating
    }));
  };
  
  // Submit feedback
  const submitMutation = useMutation({
    mutationFn: async () => {
      // Check if all questions have ratings
      const activeQuestions = questions.filter(q => q.isActive);
      const hasAllRatings = activeQuestions.every(q => ratings[q.id] !== undefined);
      
      if (!hasAllRatings) {
        throw new Error('Please rate all questions');
      }
      
      const feedbackData = {
        userId: userId,
        campaignId: campaignId,
        ratings: JSON.stringify(ratings),
        averageRating: averageRating.toFixed(1),
        comments: comments.trim() || null
      };
      
      const response = await fetch('/api/test/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedbackData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit feedback');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Feedback Submitted',
        description: 'Thank you for providing your feedback!',
        variant: 'default'
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/test/feedback'] });
      
      if (onClose) {
        onClose();
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  return (
    <div className="bg-card rounded-lg p-6 shadow-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center">Your Feedback Matters</h2>
      
      <div className="space-y-6 mb-8">
        {questions
          .filter(q => q.isActive)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((question) => (
            <div key={question.id} className="space-y-2">
              <p className="font-medium">{question.question}</p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleRatingChange(question.id, star)}
                    className="p-1 transition-all"
                  >
                    {ratings[question.id] >= star ? (
                      <StarIcon className="h-8 w-8 fill-yellow-400 text-yellow-400" />
                    ) : (
                      <Star className="h-8 w-8 text-muted-foreground hover:text-yellow-400" />
                    )}
                  </button>
                ))}
                <span className="ml-2 text-sm text-muted-foreground">
                  {ratings[question.id] 
                    ? `${ratings[question.id]} ${ratings[question.id] === 1 ? 'star' : 'stars'}`
                    : 'No rating'}
                </span>
              </div>
            </div>
          ))}
      </div>
      
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">Additional Comments</h3>
        <Textarea
          placeholder="Share your thoughts or suggestions..."
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          rows={4}
          className="w-full"
        />
      </div>
      
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="font-medium">Overall Rating:</span>
          <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => (
              <div key={star} className="px-0.5">
                {averageRating >= star ? (
                  <StarIcon className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ) : averageRating >= star - 0.5 ? (
                  <div className="relative">
                    <Star className="h-5 w-5 text-muted-foreground" />
                    <div className="absolute inset-0 overflow-hidden w-1/2">
                      <StarIcon className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    </div>
                  </div>
                ) : (
                  <Star className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
          <span className="text-lg font-bold text-primary">
            {averageRating > 0 ? averageRating.toFixed(1) : '—'}
          </span>
        </div>
        
        <div className="flex gap-2">
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          )}
          <Button 
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending}
            className="px-6"
          >
            {submitMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackForm;