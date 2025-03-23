import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusBadge } from "@/components/ui/status-badge";
import { format } from "date-fns";
import { Loader2, Copy, MessageSquare, ArrowLeft, LifeBuoy, Star } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { X, FileText, ExternalLink, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function OrderDetailsPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const [newComment, setNewComment] = useState("");
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Keep track of previous order status to detect changes
  const [previousStatus, setPreviousStatus] = useState<string | null>(null);
  
  const { data: order, isLoading } = useQuery({
    queryKey: ['/api/orders', id],
    queryFn: () => apiRequest("GET", `/api/orders/${id}`).then(res => res.json()),
    refetchInterval: 5000, // Poll every 5 seconds for order status updates
  });
  
  // Notify on status change
  useEffect(() => {
    if (order && previousStatus !== null && order.status !== previousStatus) {
      toast({
        title: "Status Updated",
        description: `Order status changed from "${previousStatus}" to "${order.status}"`,
        variant: "default",
      });
    }
    
    if (order) {
      setPreviousStatus(order.status);
    }
  }, [order?.status, previousStatus, toast]);

  const { data: comments = [], isLoading: isLoadingComments, refetch: refetchComments } = useQuery({
    queryKey: ['/api/orders', id, 'comments'],
    queryFn: () => apiRequest("GET", `/api/orders/${id}/comments`)
      .then(res => res.json())
      .catch(err => {
        console.error("Error fetching comments:", err);
        return [];
      }),
    refetchInterval: 5000, // Poll every 5 seconds for new comments
  });
  
  // Auto-scroll to the bottom of the comments when new comments are added
  useEffect(() => {
    if (Array.isArray(comments) && comments.length > 0 && commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments]);
  
  // Mutation for marking comments as read
  const markCommentsAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!id) return;
      const response = await apiRequest("POST", `/api/orders/${id}/comments/read`);
      if (!response.ok) {
        throw new Error("Failed to mark comments as read");
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate related queries to update the server data
      queryClient.invalidateQueries({ queryKey: ['/api/orders/unread-comments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    },
    onError: (error) => {
      console.error("Failed to mark comments as read:", error);
    }
  });

  // This effect marks comments as read when the page loads
  useEffect(() => {
    if (id && Array.isArray(comments) && comments.length > 0) {
      // Mark comments as read using the mutation
      markCommentsAsReadMutation.mutate();
    }
  }, [id, comments]);

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
      // Focus the textarea again after successful submission
      if (textareaRef.current) {
        setTimeout(() => {
          textareaRef.current?.focus();
        }, 100);
      }
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Text has been copied to your clipboard.",
    });
  };
  
  // Mutation for cancelling an order
  const cancelOrderMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/orders/${id}/status`, {
        status: "Cancelled"
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to cancel order");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Order Cancelled",
        description: `Order #${id} has been cancelled successfully.`,
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
        <div className="flex items-center">
          <Link href="/orders">
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back to Orders
            </Button>
          </Link>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-bold tracking-tight">Order #{id}</h2>
          <p className="text-muted-foreground">View and manage order details</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Source URL / Guest Post Title</label>
              <div className="flex items-center gap-2 mt-1">
                <div className="truncate">
                  {order.sourceUrl === "not_applicable" 
                    ? (order.title && order.title !== "not_applicable" 
                       ? `${order.title}${order.website?.name ? ` - ${order.website.name}` : ""}`
                       : "No source URL provided")
                    : order.sourceUrl
                  }
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0"
                  onClick={() => copyToClipboard(
                    order.sourceUrl === "not_applicable"
                      ? (order.title && order.title !== "not_applicable" 
                         ? `${order.title}${order.website?.name ? ` - ${order.website.name}` : ""}`
                         : "")
                      : order.sourceUrl
                  )}
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
                <div className="mt-1">
                  <StatusBadge status={order.status} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Date Ordered</label>
                <div className="mt-1">
                  {order.dateOrdered ? format(new Date(order.dateOrdered), "MMMM d, yyyy") : "Not available"}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Date Completed</label>
                <div className="mt-1">
                  {order.dateCompleted ? format(new Date(order.dateCompleted), "MMMM d, yyyy") : "Not completed"}
                </div>
              </div>
            </div>
            
            {/* Display content document link if available (for guest posts) */}
            {order.contentDocument && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Content Document</label>
                <div className="mt-1 flex items-center">
                  <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                  <a 
                    href={order.contentDocument} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    View Document
                  </a>
                </div>
              </div>
            )}
            
            {/* Display Google Doc link if available */}
            {order.googleDocLink && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Google Doc</label>
                <div className="mt-1 flex items-center">
                  <ExternalLink className="h-4 w-4 mr-2 text-muted-foreground" />
                  <a 
                    href={order.googleDocLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    View Google Doc
                  </a>
                </div>
              </div>
            )}
            
            {/* Add Cancel Order button if order is In Progress and user owns the order */}
            {order.status === "In Progress" && order.userId === user?.id && (
              <div className="mt-4">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      <X className="h-4 w-4 mr-2" />
                      Cancel Order
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel Order</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to cancel this order? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>No, Keep Order</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => cancelOrderMutation.mutate()}
                        disabled={cancelOrderMutation.isPending}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {cancelOrderMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Yes, Cancel Order
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
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
                  <div className="relative mb-4">
                    <ScrollArea className="h-[350px] pr-4 rounded-md border">
                      <div className="space-y-4 p-4">
                        {!Array.isArray(comments) || comments.length === 0 ? (
                          <div className="text-center text-muted-foreground py-8">
                            No comments yet. Be the first to add one!
                          </div>
                        ) : (
                          comments.map((comment: any) => (
                            <div key={comment.id} className="rounded-lg bg-muted p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium">{comment.user?.username}</span>
                                <span className="text-sm text-muted-foreground">
                                  {comment.createdAt ? format(new Date(comment.createdAt), "MMM d, yyyy h:mm a") : "Unknown time"}
                                </span>
                              </div>
                              <p className="text-sm">{comment.message}</p>
                            </div>
                          ))
                        )}
                        {/* Invisible element at the end to scroll to */}
                        <div ref={commentsEndRef} />
                      </div>
                    </ScrollArea>
                  </div>

                  <div className="space-y-2">
                    <Textarea
                      ref={textareaRef}
                      placeholder="Add a comment... (Ctrl+Enter to submit)"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => {
                        // Submit comment with Ctrl+Enter
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && newComment.trim()) {
                          e.preventDefault();
                          addCommentMutation.mutate();
                        }
                      }}
                      rows={3}
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