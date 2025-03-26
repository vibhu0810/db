import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Star, StarIcon, BarChart2, MessageSquare, Users, Calendar } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Button } from '../../components/ui/button';
import FeedbackCampaignManager from '../../components/feedback/feedback-campaign';
import RoleDashboardLayout from '../../components/role-dashboard-layout';

interface FeedbackResponse {
  id: number;
  userId: number;
  campaignId: number;
  month: number;
  year: number;
  ratings: string;
  averageRating: string;
  comments: string | null;
  createdAt: string;
  isCompleted: boolean;
  user?: {
    id: number;
    username: string;
    email: string;
    companyName: string;
    firstName?: string;
    lastName?: string;
  };
  campaign?: {
    id: number;
    name: string;
  };
}

interface FeedbackQuestion {
  id: number;
  question: string;
  isActive: boolean;
  createdAt: string;
  createdBy: number | null;
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

const FeedbackCard = ({ feedback }: { feedback: FeedbackResponse }) => {
  const parsedRatings = JSON.parse(feedback.ratings);
  const averageRating = parseFloat(feedback.averageRating);
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-base">
              {feedback.user?.firstName && feedback.user?.lastName
                ? `${feedback.user.firstName} ${feedback.user.lastName}`
                : feedback.user?.username || 'Anonymous User'}
            </CardTitle>
            <CardDescription>
              {feedback.user?.companyName && `${feedback.user.companyName} • `}
              {new Date(feedback.createdAt).toLocaleDateString()}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i}>
                {averageRating >= i + 1 ? (
                  <StarIcon className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ) : averageRating > i && averageRating < i + 1 ? (
                  <span className="relative">
                    <Star className="h-4 w-4 text-muted-foreground" />
                    <span
                      className="absolute top-0 left-0 overflow-hidden"
                      style={{ width: `${(averageRating - i) * 100}%` }}
                    >
                      <StarIcon className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    </span>
                  </span>
                ) : (
                  <Star className="h-4 w-4 text-muted-foreground" />
                )}
              </span>
            ))}
            <span className="ml-1 text-sm font-medium">{averageRating.toFixed(1)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {feedback.comments && (
            <div className="text-sm">
              <p className="italic">"{feedback.comments}"</p>
            </div>
          )}
          
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">Campaign: </span>
            {feedback.campaign?.name || 'General Feedback'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const calculateAverageRating = (feedbackList: FeedbackResponse[]): number => {
  if (feedbackList.length === 0) return 0;
  
  const sum = feedbackList.reduce((acc, feedback) => {
    return acc + parseFloat(feedback.averageRating);
  }, 0);
  
  return sum / feedbackList.length;
};

const FeedbackDashboard = () => {
  const [timeframe, setTimeframe] = useState<string>('all');
  
  const { data: feedbackData, isLoading: isFeedbackLoading } = useQuery({
    queryKey: ['/api/test/feedback/all'],
    queryFn: async () => {
      const response = await fetch('/api/test/feedback/all');
      if (!response.ok) {
        throw new Error('Failed to fetch feedback data');
      }
      return response.json();
    }
  });
  
  const { data: campaignsData, isLoading: isCampaignsLoading } = useQuery({
    queryKey: ['/api/test/feedback/campaigns'],
    queryFn: async () => {
      const response = await fetch('/api/test/feedback/campaigns');
      if (!response.ok) {
        throw new Error('Failed to fetch campaigns');
      }
      return response.json();
    }
  });
  
  const { data: questionsData, isLoading: isQuestionsLoading } = useQuery({
    queryKey: ['/api/test/feedback/questions'],
    queryFn: async () => {
      const response = await fetch('/api/test/feedback/questions');
      if (!response.ok) {
        throw new Error('Failed to fetch questions');
      }
      return response.json();
    }
  });
  
  // Filter feedback based on timeframe
  const filterFeedbackByTimeframe = (feedbackList: FeedbackResponse[] = []): FeedbackResponse[] => {
    if (timeframe === 'all') return feedbackList;
    
    const now = new Date();
    const filterDate = new Date();
    
    switch (timeframe) {
      case 'week':
        filterDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        filterDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        filterDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        filterDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return feedbackList;
    }
    
    return feedbackList.filter(feedback => {
      const feedbackDate = new Date(feedback.createdAt);
      return feedbackDate >= filterDate;
    });
  };
  
  const feedback = feedbackData?.feedback || [];
  const filteredFeedback = filterFeedbackByTimeframe(feedback);
  const averageRating = calculateAverageRating(filteredFeedback);
  const responseRate = feedbackData?.responseRate || 0;
  const totalResponses = filteredFeedback.length;
  
  return (
    <RoleDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Feedback Management</h1>
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
              <SelectItem value="quarter">Last 3 Months</SelectItem>
              <SelectItem value="year">Last 12 Months</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <Star className="h-5 w-5 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <div className="text-2xl font-bold">{averageRating.toFixed(1)}</div>
                <div className="ml-2 flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i}>
                      {averageRating >= i + 1 ? (
                        <StarIcon className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      ) : averageRating > i && averageRating < i + 1 ? (
                        <span className="relative">
                          <Star className="h-5 w-5 text-muted-foreground" />
                          <span
                            className="absolute top-0 left-0 overflow-hidden"
                            style={{ width: `${(averageRating - i) * 100}%` }}
                          >
                            <StarIcon className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                          </span>
                        </span>
                      ) : (
                        <Star className="h-5 w-5 text-muted-foreground" />
                      )}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Based on {totalResponses} {totalResponses === 1 ? 'response' : 'responses'}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
              <BarChart2 className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{responseRate}%</div>
              <p className="text-xs text-muted-foreground">
                Of eligible users provided feedback
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
              <Calendar className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isCampaignsLoading ? '—' : (campaignsData?.campaigns || []).filter((c: FeedbackCampaign) => c.isActive).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Feedback campaigns currently running
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Questions Bank</CardTitle>
              <MessageSquare className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isQuestionsLoading ? '—' : (questionsData?.questions || []).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Total feedback questions available
              </p>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="responses">
          <TabsList className="grid w-full md:w-[400px] grid-cols-2">
            <TabsTrigger value="responses">Feedback Responses</TabsTrigger>
            <TabsTrigger value="campaigns">Manage Campaigns</TabsTrigger>
          </TabsList>
          <TabsContent value="responses" className="pt-4">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Recent Feedback</h2>
                <Button variant="outline" size="sm">
                  <Users className="h-4 w-4 mr-2" />
                  Filter by User
                </Button>
              </div>
              
              {isFeedbackLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-40 rounded-lg border bg-muted/20 animate-pulse"></div>
                  ))}
                </div>
              ) : filteredFeedback.length === 0 ? (
                <div className="text-center py-12 border rounded-lg bg-muted/10">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium">No feedback responses found</h3>
                  <p className="text-muted-foreground mt-1">
                    Try changing the time filter or create a new feedback campaign
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredFeedback.map((feedback) => (
                    <FeedbackCard key={feedback.id} feedback={feedback} />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="campaigns" className="pt-4">
            <FeedbackCampaignManager 
              campaigns={campaignsData?.campaigns || []}
              questions={questionsData?.questions || []}
              isLoading={isCampaignsLoading || isQuestionsLoading}
            />
          </TabsContent>
        </Tabs>
      </div>
    </RoleDashboardLayout>
  );
};

export default FeedbackDashboard;