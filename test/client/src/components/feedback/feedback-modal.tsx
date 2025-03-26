import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, MessageSquare } from 'lucide-react';
import FeedbackForm from './feedback-form';

interface FeedbackModalProps {
  trigger?: React.ReactNode;
  userId?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  buttonVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon';
  campaignId?: number;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ 
  trigger, 
  userId,
  open,
  onOpenChange,
  buttonVariant = 'default',
  buttonSize = 'default',
  campaignId
}) => {
  const [dialogOpen, setDialogOpen] = useState(open || false);
  
  useEffect(() => {
    if (open !== undefined) {
      setDialogOpen(open);
    }
  }, [open]);
  
  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (onOpenChange) {
      onOpenChange(open);
    }
  };
  
  // Fetch active feedback questions
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/test/feedback/questions/active', campaignId],
    queryFn: async () => {
      const url = campaignId 
        ? `/api/test/feedback/campaigns/${campaignId}/questions` 
        : '/api/test/feedback/questions/active';
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to load feedback questions');
      }
      return response.json();
    },
    enabled: dialogOpen // Only fetch when the dialog is open
  });
  
  // Default trigger if none provided
  const defaultTrigger = (
    <Button 
      variant={buttonVariant} 
      size={buttonSize}
    >
      <MessageSquare className="h-4 w-4 mr-2" />
      Give Feedback
    </Button>
  );

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>We Value Your Feedback</DialogTitle>
          <DialogDescription>
            Help us improve our services by sharing your thoughts and experiences.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500 mb-2">Unable to load feedback questions</p>
            <Button 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
            >
              Close
            </Button>
          </div>
        ) : !data?.questions || data.questions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-2">No feedback questions are currently available</p>
            <Button 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
            >
              Close
            </Button>
          </div>
        ) : (
          <FeedbackForm 
            questions={data.questions}
            onClose={() => handleOpenChange(false)}
            userId={userId}
            campaignId={campaignId}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackModal;