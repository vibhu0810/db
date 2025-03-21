import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Loader2, Copy, MessageSquare, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";

export default function OrderDetailsPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const [newComment, setNewComment] = useState("");
  const [statusHighlight, setStatusHighlight] = useState(false);
  const [previousStatus, setPreviousStatus] = useState<string | null>(null);
  
  // Setup WebSocket to listen for real-time updates
  useWebSocket({
    onOrderUpdate: (orderId: number, status: string) => {
      // Only update if this is the order we're viewing
      if (orderId === parseInt(id as string)) {
        // Save the current status before the update
        if (order) {
          setPreviousStatus(order.status);
        }
        
        // Update the order data
        queryClient.invalidateQueries({ queryKey: ['/api/orders', id] });
        
        // Activate highlight effect
        setStatusHighlight(true);
        
        // Notify about status change
        toast({
          title: "Order Status Updated",
          description: `Order status updated to ${status}`,
        });
      }
    },
    onNewComment: (orderId: number) => {
      // Only update if this is the order we're viewing
      if (orderId === parseInt(id as string)) {
        queryClient.invalidateQueries({ queryKey: ['/api/orders', id, 'comments'] });
      }
    }
  });

  const { data: order, isLoading } = useQuery({
    queryKey: ['/api/orders', id],
    queryFn: () => apiRequest("GET", `/api/orders/${id}`).then(res => res.json()),
  });

  const { data: comments = [], isLoading: isLoadingComments } = useQuery({
    queryKey: ['/api/orders', id, 'comments'],
    queryFn: () => apiRequest("GET", `/api/orders/${id}/comments`).then(res => res.json()),
  });

  const addCommentMutation = useMutation({
    mutationFn: async () => {
      if (!newComment.trim()) {
        throw new Error("Please enter a comment");
      }
      const res = await apiRequest("POST", `/api/orders/${id}/comments`, {
        message: newComment.trim(),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to add comment");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders', id, 'comments'] });
      setNewComment("");
      toast({
        title: "Success",
        description: "Your comment has been added successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Effect to reset highlight after animation
  useEffect(() => {
    if (statusHighlight) {
      // Reset highlight after animation completes (3 seconds)
      const timer = setTimeout(() => {
        setStatusHighlight(false);
        setPreviousStatus(null);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [statusHighlight]);
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Text has been copied to your clipboard.",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Link href="/orders">
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
          </Button>
        </Link>
        <div className="flex items-center justify-center h-[40vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-4">
        <Link href="/orders">
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
          </Button>
        </Link>
        <div className="text-xl font-medium">Order not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/orders">
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back to Orders
            </Button>
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Order #{id}</h2>
            <p className="text-muted-foreground">View and manage order details</p>
          </div>
        </div>
        {!isAdmin && user?.companyLogo && (
          <div className="hidden md:block">
            <img 
              src={user.companyLogo} 
              alt={user.companyName || 'Company logo'} 
              className="h-16 object-contain" 
              onError={(e) => {
                // Hide the image if it fails to load
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Source URL</label>
              <div className="flex items-center gap-2 mt-1">
                <div className="truncate">{order.sourceUrl}</div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0"
                  onClick={() => copyToClipboard(order.sourceUrl)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Target URL</label>
              <div className="flex items-center gap-2 mt-1">
                <div className="truncate">{order.targetUrl}</div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0"
                  onClick={() => copyToClipboard(order.targetUrl)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Anchor Text</label>
              <div className="flex items-center gap-2 mt-1">
                <div className="truncate">{order.anchorText}</div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0"
                  onClick={() => copyToClipboard(order.anchorText)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Text Edit/Article</label>
              <div className="mt-1 whitespace-pre-wrap">{order.textEdit || "No content"}</div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Notes</label>
              <div className="mt-1 whitespace-pre-wrap">{order.notes || "No notes"}</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Price</label>
                <div className="mt-1">${Number(order.price).toFixed(2)}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="mt-1 font-medium">
                  <span className={cn(
                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-sm",
                    statusHighlight
                      ? "bg-primary/20 text-primary animate-pulse shadow-lg"
                      : "bg-primary/10 text-primary",
                  )}>
                    {order.status}
                    {previousStatus && statusHighlight && (
                      <span className="ml-2 text-xs text-muted-foreground">(was: {previousStatus})</span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Date Ordered</label>
              <div className="mt-1">
                {format(new Date(order.dateOrdered), "MMMM d, yyyy")}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Comments</CardTitle>
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoadingComments ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {comments.map((comment: any) => (
                      <div key={comment.id} className="rounded-lg bg-muted p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">{comment.user?.username}</span>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(comment.createdAt), "MMM d, yyyy h:mm a")}
                          </span>
                        </div>
                        <p className="text-sm">{comment.message}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Textarea
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                    />
                    <Button
                      onClick={() => addCommentMutation.mutate()}
                      disabled={addCommentMutation.isPending || !newComment.trim()}
                      className="w-full"
                    >
                      {addCommentMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Add Comment
                    </Button>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}