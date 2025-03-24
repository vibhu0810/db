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
  const [ticketTitle, setTicketTitle] = useState("");
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [ticketRating, setTicketRating] = useState(5);
  const [ticketFeedback, setTicketFeedback] = useState("");

  // Keep track of previous order status to detect changes
  const [previousStatus, setPreviousStatus] = useState<string | null>(null);
  
  // Query for existing support ticket for this order
  const { data: supportTicketResponse } = useQuery({
    queryKey: ['/api/support-tickets/order', id],
    queryFn: () => apiRequest("GET", `/api/support-tickets/order/${id}`)
      .then(res => res.ok ? res.json() : { ticket: null })
      .catch(() => ({ ticket: null })),
    enabled: !!id && !!user,
  });
  
  // Extract the ticket from the response
  const supportTicket = supportTicketResponse?.ticket;
  
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
  
  // Query for getting admin ID
  const { data: adminData } = useQuery({
    queryKey: ['/api/users/admin'],
    queryFn: () => apiRequest("GET", "/api/users")
      .then(res => res.json())
      .then(users => users.find((u: any) => u.is_admin === true) || null),
    enabled: !!user && !isAdmin,
  });
  
  // Mutation for creating a support ticket
  const createTicketMutation = useMutation({
    mutationFn: async () => {
      if (!id || !user) throw new Error("Missing order ID or user");
      
      // Find the admin user
      const adminUser = adminData || { id: 133 }; // Default to ID 133 which is the Digital Gratified admin
      
      const title = ticketTitle || `Support ticket for Order #${id}`;
      const res = await apiRequest("POST", "/api/support-tickets", {
        orderId: Number(id),
        title,
        description: `User ${user.username} has opened a support ticket for Order #${id}`,
        adminId: adminUser.id // Explicitly set the admin ID
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create support ticket");
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/support-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/support-tickets/order', id] });
      
      // Direct navigation to chat page with the ticket
      if (data && data.ticket && data.ticket.id) {
        toast({
          title: "Support Ticket Created",
          description: "Support ticket has been created successfully. Opening chat with support team...",
        });
        
        console.log("Redirecting to ticket chat:", data.ticket.id);
        
        // Use a delay to allow the toast to show and the ticket to be fully processed
        setTimeout(() => {
          const chatUrl = `/chat?ticket=${data.ticket.id}`;
          
          // Force a hard navigation to ensure the chat page loads with the fresh ticket data
          window.location.href = chatUrl;
        }, 1500); // Increase delay to 1.5 seconds to ensure server has time to process all ticket data
      } else {
        console.error("Missing ticket ID in response:", data);
        toast({
          title: "Ticket Created",
          description: "Support ticket has been created, but there was an issue opening the chat. Please go to the Chat page.",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation for closing a support ticket with feedback
  const closeTicketMutation = useMutation({
    mutationFn: async () => {
      if (!supportTicket) throw new Error("No active support ticket");
      
      const res = await apiRequest("PATCH", `/api/support-tickets/${supportTicket.id}/close`, {
        rating: ticketRating,
        feedback: ticketFeedback,
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to close support ticket");
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/support-tickets/order', id] });
      setShowRatingDialog(false);
      
      toast({
        title: "Ticket Closed",
        description: "Your support ticket has been closed. Thank you for your feedback!",
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
          <CardContent className="max-h-[450px] overflow-auto p-6">
            <div className="space-y-4">
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
                    <ScrollArea className="h-[325px] pr-4 rounded-md border">
                      <div className="space-y-4 p-4">
                        {!Array.isArray(comments) || comments.length === 0 ? (
                          <div className="text-center text-muted-foreground py-8">
                            No comments yet. Be the first to add one!
                          </div>
                        ) : (
                          comments.map((comment: any) => (
                            <div 
                              key={comment.id} 
                              className={`rounded-lg p-3 ${
                                comment.isSystemMessage 
                                  ? "bg-secondary/50 border border-secondary" 
                                  : "bg-muted"
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                {comment.isSystemMessage ? (
                                  <span className="font-medium text-secondary-foreground">System</span>
                                ) : (
                                  <span className="font-medium">{comment.user?.username}</span>
                                )}
                                <span className="text-sm text-muted-foreground">
                                  {comment.createdAt ? format(new Date(comment.createdAt), "MMM d, yyyy h:mm a") : "Unknown time"}
                                </span>
                              </div>
                              <p className={`text-sm ${comment.isSystemMessage ? "italic" : ""}`}>{comment.message}</p>
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
      
      {/* Support Ticket Section */}
      <div className="grid gap-6 md:grid-cols-1">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Support</CardTitle>
            <LifeBuoy className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {supportTicket && supportTicket.id ? (
                <>
                  <div className="p-4 rounded-md bg-muted">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium">{supportTicket.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          Created on {supportTicket.createdAt ? format(new Date(supportTicket.createdAt), "MMMM d, yyyy") : "Unknown date"}
                        </p>
                      </div>
                      <StatusBadge status={supportTicket.status} />
                    </div>
                    <p className="text-sm mb-4">{supportTicket.description}</p>
                    
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Use a direct navigation approach for consistency
                          const chatUrl = `/chat?ticket=${supportTicket.id}`;
                          window.location.href = chatUrl;
                        }}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        View Ticket Chat
                      </Button>
                      
                      {supportTicket.status === 'Open' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowRatingDialog(true)}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Close Ticket
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Ticket Rating Dialog */}
                  {showRatingDialog && (
                    <AlertDialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Rate Your Support Experience</AlertDialogTitle>
                          <AlertDialogDescription>
                            Please rate your support experience and provide any feedback before closing this ticket.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        
                        <div className="py-4 space-y-6">
                          <div className="flex justify-center space-x-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setTicketRating(star)}
                                className="text-gray-300 hover:text-yellow-400 focus:outline-none"
                              >
                                <Star 
                                  className={`h-8 w-8 ${
                                    star <= ticketRating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                                  }`} 
                                />
                              </button>
                            ))}
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Additional Feedback (Optional)</label>
                            <Textarea
                              placeholder="Tell us about your experience..."
                              value={ticketFeedback}
                              onChange={(e) => setTicketFeedback(e.target.value)}
                              rows={4}
                            />
                          </div>
                        </div>
                        
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => closeTicketMutation.mutate()}
                            disabled={closeTicketMutation.isPending}
                          >
                            {closeTicketMutation.isPending && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Submit & Close Ticket
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm">
                    Need help with this order? Raise a support ticket to get assistance from our team.
                  </p>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="w-full">
                        <LifeBuoy className="h-4 w-4 mr-2" />
                        Raise a Ticket
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Create Support Ticket</AlertDialogTitle>
                        <AlertDialogDescription>
                          Please provide a title for your support ticket. Our team will respond as soon as possible.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      
                      <div className="py-4">
                        <label className="text-sm font-medium">
                          Ticket Title (Optional)
                          <span className="text-sm text-muted-foreground ml-1">
                            - We'll use a default title if not provided
                          </span>
                        </label>
                        <input
                          type="text"
                          placeholder="E.g., Question about my order status"
                          value={ticketTitle}
                          onChange={(e) => setTicketTitle(e.target.value)}
                          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                        />
                      </div>
                      
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => createTicketMutation.mutate()}
                          disabled={createTicketMutation.isPending}
                        >
                          {createTicketMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Create Ticket
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}