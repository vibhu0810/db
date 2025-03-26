import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, XCircle, DragHandleDots2Icon, ArrowUpDown } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Question {
  id: number;
  question: string;
  isActive: boolean;
  sortOrder: number;
}

interface FeedbackCampaign {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
  organizationId: number;
  targetUserRole?: string;
  createdAt: string;
}

interface FeedbackCampaignProps {
  campaigns?: FeedbackCampaign[];
  questions?: Question[];
  isLoading?: boolean;
  organizationId?: number;
}

const FeedbackCampaignManager: React.FC<FeedbackCampaignProps> = ({
  campaigns = [],
  questions = [],
  isLoading = false,
  organizationId
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [campaignFormOpen, setCampaignFormOpen] = useState(false);
  const [questionFormOpen, setQuestionFormOpen] = useState(false);
  
  // State for new campaign
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    isActive: true,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    targetUserRole: 'user',
    organizationId: organizationId || 1
  });
  
  // State for new question
  const [newQuestion, setNewQuestion] = useState({
    question: '',
    isActive: true
  });
  
  // State for campaign questions
  const [selectedCampaign, setSelectedCampaign] = useState<FeedbackCampaign | null>(null);
  const [campaignQuestions, setCampaignQuestions] = useState<Question[]>([]);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  
  // Handle adding a new campaign
  const addCampaignMutation = useMutation({
    mutationFn: async () => {
      if (!newCampaign.name) {
        throw new Error('Campaign name is required');
      }
      
      const response = await fetch('/api/test/feedback/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCampaign)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create campaign');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Campaign created successfully',
        variant: 'default'
      });
      
      // Reset form and close dialog
      setNewCampaign({
        name: '',
        description: '',
        isActive: true,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        targetUserRole: 'user',
        organizationId: organizationId || 1
      });
      setCampaignFormOpen(false);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/test/feedback/campaigns'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Handle adding a new question
  const addQuestionMutation = useMutation({
    mutationFn: async () => {
      if (!newQuestion.question) {
        throw new Error('Question text is required');
      }
      
      const response = await fetch('/api/test/feedback/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newQuestion,
          organizationId: organizationId || 1
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create question');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Question created successfully',
        variant: 'default'
      });
      
      // Reset form and close dialog
      setNewQuestion({
        question: '',
        isActive: true
      });
      setQuestionFormOpen(false);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/test/feedback/questions'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Toggle campaign status
  const toggleCampaignStatus = useMutation({
    mutationFn: async (campaignId: number) => {
      const response = await fetch(`/api/test/feedback/campaigns/${campaignId}/toggle`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update campaign status');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Campaign status updated',
        variant: 'default'
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/test/feedback/campaigns'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Toggle question status
  const toggleQuestionStatus = useMutation({
    mutationFn: async (questionId: number) => {
      const response = await fetch(`/api/test/feedback/questions/${questionId}/toggle`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update question status');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Question status updated',
        variant: 'default'
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/test/feedback/questions'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Load campaign questions
  const loadCampaignQuestions = async (campaign: FeedbackCampaign) => {
    setSelectedCampaign(campaign);
    
    try {
      const response = await fetch(`/api/test/feedback/campaigns/${campaign.id}/questions`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to load campaign questions');
      }
      
      const data = await response.json();
      setCampaignQuestions(data.questions || []);
      
      // Filter out questions that are already in the campaign
      const campaignQuestionIds = data.questions.map((q: Question) => q.id);
      setAvailableQuestions(questions.filter(q => !campaignQuestionIds.includes(q.id)));
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load campaign questions',
        variant: 'destructive'
      });
    }
  };
  
  // Add question to campaign
  const addQuestionToCampaign = useMutation({
    mutationFn: async ({ campaignId, questionId }: { campaignId: number, questionId: number }) => {
      const response = await fetch(`/api/test/feedback/campaigns/${campaignId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId,
          sortOrder: campaignQuestions.length
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add question to campaign');
      }
      
      return await response.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'Success',
        description: 'Question added to campaign',
        variant: 'default'
      });
      
      // Refresh campaign questions
      if (selectedCampaign) {
        loadCampaignQuestions(selectedCampaign);
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
  
  // Remove question from campaign
  const removeQuestionFromCampaign = useMutation({
    mutationFn: async ({ campaignId, questionId }: { campaignId: number, questionId: number }) => {
      const response = await fetch(`/api/test/feedback/campaigns/${campaignId}/questions/${questionId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove question from campaign');
      }
      
      return await response.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'Success',
        description: 'Question removed from campaign',
        variant: 'default'
      });
      
      // Refresh campaign questions
      if (selectedCampaign) {
        loadCampaignQuestions(selectedCampaign);
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
  
  // Reorder campaign questions
  const reorderCampaignQuestions = useMutation({
    mutationFn: async (questionIds: number[]) => {
      const response = await fetch(`/api/test/feedback/questions/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionIds })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reorder questions');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Questions reordered successfully',
        variant: 'default'
      });
      
      // Refresh campaign questions
      if (selectedCampaign) {
        loadCampaignQuestions(selectedCampaign);
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
  
  // Move question up or down in the order
  const moveQuestion = (questionId: number, direction: 'up' | 'down') => {
    const questionIndex = campaignQuestions.findIndex(q => q.id === questionId);
    if (questionIndex === -1) return;
    
    const newQuestions = [...campaignQuestions];
    if (direction === 'up' && questionIndex > 0) {
      // Swap with the previous item
      [newQuestions[questionIndex], newQuestions[questionIndex - 1]] = 
        [newQuestions[questionIndex - 1], newQuestions[questionIndex]];
    } else if (direction === 'down' && questionIndex < newQuestions.length - 1) {
      // Swap with the next item
      [newQuestions[questionIndex], newQuestions[questionIndex + 1]] = 
        [newQuestions[questionIndex + 1], newQuestions[questionIndex]];
    } else {
      return; // No change needed
    }
    
    // Update the sort order for all questions
    const questionIds = newQuestions.map(q => q.id);
    reorderCampaignQuestions.mutate(questionIds);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Feedback Management</h2>
        <div className="flex gap-2">
          <Dialog open={questionFormOpen} onOpenChange={setQuestionFormOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" /> 
                Add Question
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Feedback Question</DialogTitle>
                <DialogDescription>
                  Add a new question to your feedback question bank.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="question">Question Text</Label>
                  <Textarea
                    id="question"
                    placeholder="How satisfied are you with our support response time?"
                    value={newQuestion.question}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, question: e.target.value }))}
                    className="resize-none"
                    rows={3}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="question-active"
                    checked={newQuestion.isActive}
                    onCheckedChange={(checked) => setNewQuestion(prev => ({ ...prev, isActive: checked }))}
                  />
                  <Label htmlFor="question-active">Active</Label>
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setQuestionFormOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => addQuestionMutation.mutate()}
                  disabled={addQuestionMutation.isPending}
                >
                  {addQuestionMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...</>
                  ) : (
                    'Add Question'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Dialog open={campaignFormOpen} onOpenChange={setCampaignFormOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" /> 
                Create Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Feedback Campaign</DialogTitle>
                <DialogDescription>
                  Set up a new feedback campaign to collect responses from users.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Campaign Name</Label>
                  <Input
                    id="name"
                    placeholder="Monthly Customer Satisfaction"
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Collect monthly feedback from customers about our service quality"
                    value={newCampaign.description}
                    onChange={(e) => setNewCampaign(prev => ({ ...prev, description: e.target.value }))}
                    className="resize-none"
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={newCampaign.startDate}
                      onChange={(e) => setNewCampaign(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={newCampaign.endDate}
                      onChange={(e) => setNewCampaign(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="targetUserRole">Target User Role</Label>
                  <select
                    id="targetUserRole"
                    className="w-full p-2 rounded-md border border-input bg-background"
                    value={newCampaign.targetUserRole}
                    onChange={(e) => setNewCampaign(prev => ({ ...prev, targetUserRole: e.target.value }))}
                  >
                    <option value="user">Customers</option>
                    <option value="user_manager">User Managers</option>
                    <option value="inventory_manager">Inventory Managers</option>
                    <option value="all">All Users</option>
                  </select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="campaign-active"
                    checked={newCampaign.isActive}
                    onCheckedChange={(checked) => setNewCampaign(prev => ({ ...prev, isActive: checked }))}
                  />
                  <Label htmlFor="campaign-active">Active</Label>
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setCampaignFormOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => addCampaignMutation.mutate()}
                  disabled={addCampaignMutation.isPending}
                >
                  {addCampaignMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
                  ) : (
                    'Create Campaign'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center my-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Questions Panel */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Feedback Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {questions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No feedback questions created yet.
                  </p>
                ) : (
                  questions.map((question) => (
                    <div 
                      key={question.id} 
                      className="p-3 border rounded-lg flex justify-between items-start group hover:bg-muted/30"
                    >
                      <div>
                        <p className="font-medium">{question.question}</p>
                        <p className={`text-xs mt-1 ${question.isActive ? 'text-green-600' : 'text-red-600'}`}>
                          {question.isActive ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                      <div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleQuestionStatus.mutate(question.id)}
                          className="h-8 w-8 p-0"
                        >
                          <span className="sr-only">
                            {question.isActive ? 'Deactivate' : 'Activate'}
                          </span>
                          <Switch checked={question.isActive} />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Campaigns Panel */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Feedback Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {campaigns.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No feedback campaigns created yet.
                  </p>
                ) : (
                  campaigns.map((campaign) => (
                    <div 
                      key={campaign.id} 
                      className={`p-3 border rounded-lg hover:bg-muted/30 cursor-pointer ${
                        selectedCampaign?.id === campaign.id ? 'bg-primary/10 border-primary' : ''
                      }`}
                      onClick={() => loadCampaignQuestions(campaign)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{campaign.name}</p>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {campaign.description}
                          </p>
                          <p className="text-xs mt-1">
                            {new Date(campaign.startDate).toLocaleDateString()} - {new Date(campaign.endDate).toLocaleDateString()}
                          </p>
                          <p className={`text-xs mt-1 ${campaign.isActive ? 'text-green-600' : 'text-red-600'}`}>
                            {campaign.isActive ? 'Active' : 'Inactive'}
                          </p>
                        </div>
                        <div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCampaignStatus.mutate(campaign.id);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <span className="sr-only">
                              {campaign.isActive ? 'Deactivate' : 'Activate'}
                            </span>
                            <Switch checked={campaign.isActive} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Campaign Questions Panel */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>
                {selectedCampaign ? `${selectedCampaign.name} Questions` : 'Campaign Questions'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedCampaign ? (
                <p className="text-muted-foreground text-center py-4">
                  Select a campaign to view and manage its questions
                </p>
              ) : (
                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-muted-foreground">Current Questions</h3>
                  <div className="space-y-2">
                    {campaignQuestions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No questions added to this campaign yet
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {campaignQuestions.map((question, index) => (
                          <div 
                            key={question.id}
                            className="p-3 border rounded-lg flex items-center gap-2 group hover:bg-muted/30"
                          >
                            <div className="flex-none">
                              <DragHandleDots2Icon className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="flex-grow">
                              <p className="text-sm">{question.question}</p>
                            </div>
                            <div className="flex-none flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => moveQuestion(question.id, 'up')}
                                disabled={index === 0}
                                className="h-7 w-7 p-0"
                              >
                                <ArrowUpDown className="h-4 w-4 rotate-90" />
                                <span className="sr-only">Move Up</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => moveQuestion(question.id, 'down')}
                                disabled={index === campaignQuestions.length - 1}
                                className="h-7 w-7 p-0"
                              >
                                <ArrowUpDown className="h-4 w-4 -rotate-90" />
                                <span className="sr-only">Move Down</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeQuestionFromCampaign.mutate({
                                  campaignId: selectedCampaign.id,
                                  questionId: question.id
                                })}
                                className="h-7 w-7 p-0 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <XCircle className="h-4 w-4" />
                                <span className="sr-only">Remove</span>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="pt-4 border-t">
                    <h3 className="font-medium text-sm text-muted-foreground mb-2">Add Questions</h3>
                    {availableQuestions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No more questions available to add
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {availableQuestions.map((question) => (
                          <div
                            key={question.id}
                            className="p-3 border rounded-lg flex justify-between items-center hover:bg-muted/30"
                          >
                            <p className="text-sm">{question.question}</p>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => addQuestionToCampaign.mutate({
                                campaignId: selectedCampaign.id,
                                questionId: question.id
                              })}
                              disabled={addQuestionToCampaign.isPending}
                            >
                              {addQuestionToCampaign.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Plus className="h-4 w-4" />
                              )}
                              <span className="sr-only">Add</span>
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
            {selectedCampaign && (
              <CardFooter className="border-t pt-4 flex justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedCampaign(null)}
                >
                  Done
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default FeedbackCampaignManager;