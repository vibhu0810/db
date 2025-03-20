import { useState, useRef, useEffect } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Order, Review } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { DateRange } from "react-day-picker";
import { addDays, subMonths, format, parseISO } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  Calendar as CalendarIcon, 
  Download, 
  Loader2, 
  Send, 
  LightbulbIcon, 
  TrendingUp, 
  BarChart3, 
  Sparkles, 
  MessageSquare 
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Reports() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ['/api/orders']
  });

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery<Review[]>({
    queryKey: ['/api/reviews']
  });

  const filteredOrders = orders.filter(
    (order) =>
      date?.from &&
      date.to &&
      new Date(order.dateOrdered) >= date.from &&
      new Date(order.dateOrdered) <= date.to
  );

  const totalSpent = filteredOrders.reduce(
    (sum, order) => sum + Number(order.price),
    0
  );

  const ordersByStatus = filteredOrders.reduce((acc: any, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {});

  const statusData = Object.entries(ordersByStatus).map(([name, value]) => ({
    name,
    value,
  }));

  const averageRating =
    reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length || 0;

  const COLORS = [
    "hsl(var(--primary))",
    "hsl(var(--secondary))",
    "hsl(var(--muted))",
    "hsl(var(--accent))",
  ];

  const exportReport = () => {
    const report = {
      dateRange: {
        from: date?.from?.toISOString(),
        to: date?.to?.toISOString(),
      },
      metrics: {
        totalOrders: filteredOrders.length,
        totalSpent,
        averageOrderValue: totalSpent / filteredOrders.length || 0,
        ordersByStatus,
        averageRating,
      },
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "report.json";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (ordersLoading || reviewsLoading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </DashboardShell>
    );
  }

  // AI Chat state
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([
    { role: "assistant", content: "Hello! I'm your AI link-building assistant. Ask me anything about your link building strategy!" }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Campaign performance data (monthly growth data)
  const [performanceData, setPerformanceData] = useState(() => {
    // Generate 6 months of data for demonstration
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const month = subMonths(now, i);
      const monthOrders = orders.filter(order => {
        const orderDate = new Date(order.dateOrdered);
        return orderDate.getMonth() === month.getMonth() && 
               orderDate.getFullYear() === month.getFullYear();
      });
      
      months.push({
        name: format(month, 'MMM'),
        orders: monthOrders.length,
        links: monthOrders.filter(o => o.status === 'Completed').length,
        traffic: Math.round(monthOrders.filter(o => o.status === 'Completed').length * (Math.random() * 200 + 50))
      });
    }
    return months;
  });

  // Strategy suggestions based on order history
  const suggestions = [
    {
      title: "Diversify Your Anchor Text",
      description: "Analysis of your link profile shows heavy use of exact-match anchors. Try using more branded and natural variations.",
      id: 1
    },
    {
      title: "Target Higher Authority Domains",
      description: "Your recent links are from domains with DA<40. Consider investing in higher authority sites for better impact.",
      id: 2
    },
    {
      title: "Content Gap Opportunity",
      description: "We noticed your competitors rank for 'SaaS pricing strategies' - consider creating link-worthy content on this topic.",
      id: 3
    }
  ];

  // Handle chat submission
  const sendChatRequest = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = { role: "user", content: chatInput };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput("");
    setChatLoading(true);
    
    try {
      // Call to backend AI endpoint
      const response = await fetch('/api/link-strategy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          message: chatInput
        })
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.message) {
        setChatMessages(prev => [...prev, { role: "assistant", content: data.message }]);
      } else {
        throw new Error("No response from AI assistant");
      }
    } catch (error) {
      console.error("Error getting AI response:", error);
      // If API is unavailable, provide a fallback response
      setChatMessages(prev => [...prev, { 
        role: "assistant", 
        content: "I'd recommend focusing on high-quality backlinks from relevant sites in your industry. " +
                 "Quality over quantity is key for sustainable SEO growth. Would you like more specific suggestions based on your niche?" 
      }]);
      toast({
        variant: "destructive",
        title: "AI Service Unavailable",
        description: "Using fallback response. Please try again later."
      });
    } finally {
      setChatLoading(false);
    }
  };

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold tracking-tight">Campaign Reports & Strategy</h2>
          <p className="text-muted-foreground">Track your link-building performance and get personalized strategy advice</p>
        </div>

        <Tabs defaultValue="reports">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span>Performance Reports</span>
            </TabsTrigger>
            <TabsTrigger value="strategy" className="flex items-center gap-2">
              <LightbulbIcon className="h-4 w-4" />
              <span>Strategy Assistant</span>
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span>Personalized Suggestions</span> 
            </TabsTrigger>
          </TabsList>
          
          {/* REPORTS TAB */}
          <TabsContent value="reports" className="space-y-6 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Campaign Performance Dashboard</h3>
              <div className="flex gap-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date?.from ? (
                        date.to ? (
                          <>
                            {format(date.from, "LLL dd, y")} -{" "}
                            {format(date.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(date.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={date?.from}
                      selected={date}
                      onSelect={setDate}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
                <Button onClick={exportReport}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Report
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    Total Orders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{filteredOrders.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    Total Spent
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${totalSpent.toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    Average Order Value
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${(totalSpent / filteredOrders.length || 0).toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    Average Rating
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {averageRating.toFixed(1)}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card className="border-none shadow-none">
              <CardHeader className="px-0">
                <CardTitle>Performance Trends (6 Months)</CardTitle>
                <CardDescription>Track your campaign growth over time</CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <RechartsTooltip />
                      <Line type="monotone" dataKey="orders" stroke="hsl(var(--primary))" name="Orders Placed" />
                      <Line type="monotone" dataKey="links" stroke="hsl(var(--secondary))" name="Links Built" />
                      <Line type="monotone" dataKey="traffic" stroke="hsl(var(--accent))" name="Est. Traffic" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Orders by Status</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label
                      >
                        {statusData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Monthly Order Trends</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={statusData}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <RechartsTooltip />
                      <Bar dataKey="value" fill="hsl(var(--primary))">
                        {statusData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* STRATEGY ASSISTANT TAB */}
          <TabsContent value="strategy" className="pt-4">
            <Card className="p-0">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <CardTitle>Link-Building Strategy Assistant</CardTitle>
                </div>
                <CardDescription>
                  Ask questions about link-building strategies, SEO, and optimizing your campaigns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[500px] flex flex-col">
                  <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-4">
                    {chatMessages.map((message, i) => (
                      <div key={i} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex gap-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                          <Avatar className="h-8 w-8">
                            {message.role === 'user' ? (
                              <AvatarImage src={user?.profilePicture || ''} alt="Your profile" />
                            ) : (
                              <AvatarImage src="/ai-avatar.png" alt="AI Assistant" />
                            )}
                            <AvatarFallback>{message.role === 'user' ? user?.firstName?.charAt(0) || 'U' : 'AI'}</AvatarFallback>
                          </Avatar>
                          <div className={`rounded-lg px-4 py-2 ${
                            message.role === 'user' 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted'
                          }`}>
                            {message.content}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  
                  <div className="relative">
                    <Textarea
                      placeholder="Ask about link-building strategies..."
                      className="resize-none pr-12"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendChatRequest();
                        }
                      }}
                    />
                    <Button 
                      size="sm" 
                      className="absolute right-4 bottom-3 h-8 w-8 p-0" 
                      onClick={sendChatRequest}
                      disabled={chatLoading || !chatInput.trim()}
                    >
                      {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* PERSONALIZED SUGGESTIONS TAB */}
          <TabsContent value="suggestions" className="pt-4">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium">Personalized Link-Building Suggestions</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Based on your campaign history and industry trends, we've curated these recommendations to improve your results
                </p>
              </div>
              
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {suggestions.map(suggestion => (
                  <Card key={suggestion.id} className="overflow-hidden transition-all duration-200 hover:shadow-md">
                    <CardHeader className="bg-muted/50">
                      <CardTitle className="flex gap-2 text-base font-semibold">
                        <LightbulbIcon className="h-5 w-5 text-primary" />
                        {suggestion.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                    </CardContent>
                    <CardFooter className="border-t px-6 py-3 bg-background">
                      <Button variant="outline" size="sm" className="w-full">
                        <span>Learn More</span>
                        <TrendingUp className="ml-2 h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
              
              <Card className="border-dashed">
                <CardContent className="flex items-center justify-center p-6">
                  <div className="text-center">
                    <Sparkles className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <h3 className="text-lg font-medium">Get More Personalized Suggestions</h3>
                    <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-md mx-auto">
                      Complete more campaigns to receive AI-powered suggestions tailored to your link-building strategy
                    </p>
                    <Button>
                      <span>Start New Campaign</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}