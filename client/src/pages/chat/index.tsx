import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect, useCallback, useRef } from "react";
import { 
  Loader2, Send, Check, CheckCheck, Image as ImageIcon, 
  Mic, MicOff, X, FileText, Paperclip, Music, Star, Ticket as TicketIcon,
  Info, Link as LinkIcon, MessagesSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { User } from "@shared/schema";
import { uploadFile } from "@/utils/uploadthing";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link, useRoute } from "wouter";

interface ChatUser extends User {
  companyName: string;
  username: string;
  is_admin: boolean;
  email: string;
}

export default function ChatPage() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [location] = useLocation();
  
  // Support ticket states
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [ticketRating, setTicketRating] = useState(5);
  const [ticketFeedback, setTicketFeedback] = useState("");
  const [activeTicketId, setActiveTicketId] = useState<number | null>(null);
  
  // Check URL for ticket ID (from both route params and query string)
  const [, params] = useRoute('/chat/ticket/:id');
  
  const getTicketIdFromUrl = useCallback(() => {
    // First check route params (higher priority)
    if (params && params.id && !isNaN(parseInt(params.id, 10))) {
      console.log("Found ticket ID in route params:", params.id);
      return parseInt(params.id, 10);
    }
    
    // Otherwise check query parameters
    try {
      const queryString = location.split('?')[1] || "";
      const searchParams = new URLSearchParams(queryString);
      const ticketId = searchParams.get('ticket');
      
      console.log("URL query parameters:", queryString);
      console.log("Extracted ticket ID from query:", ticketId);
      
      return ticketId && !isNaN(parseInt(ticketId, 10)) ? parseInt(ticketId, 10) : null;
    } catch (error) {
      console.error("Error parsing ticket ID from URL:", error);
      return null;
    }
  }, [location, params]);
  
  // Get ticket ID from URL if available
  const ticketId = getTicketIdFromUrl();
  
  // Query for all user support tickets
  const { data: userTickets = { tickets: [] }, isLoading: userTicketsLoading } = useQuery({
    queryKey: ['/api/support-tickets'],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", `/api/support-tickets`);
        if (!res.ok) throw new Error('Failed to fetch user tickets');
        const data = await res.json();
        console.log('Loaded support tickets:', data);
        return data;
      } catch (error) {
        console.error("Error fetching user tickets:", error);
        return { tickets: [] };
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
  
  // Query for specific ticket details if ticketId is available
  const { data: ticketData, isLoading: ticketLoading } = useQuery({
    queryKey: ['/api/support-tickets', ticketId],
    queryFn: async () => {
      if (!ticketId) return null;
      try {
        const res = await apiRequest("GET", `/api/support-tickets/${ticketId}`);
        if (!res.ok) throw new Error('Failed to fetch ticket details');
        return res.json();
      } catch (error) {
        console.error("Error fetching ticket:", error);
        return null;
      }
    },
    enabled: !!ticketId,
  });
  
  // Get users based on role
  const { data: users = [], isLoading: usersLoading } = useQuery<ChatUser[]>({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users");
      const allUsers = await res.json();

      // The server already filters users based on role, but we'll double-check here
      let filteredUsers = allUsers;
      
      // Apply additional client-side filtering if needed
      if (!isAdmin) {
        // Regular users should only see admin users
        filteredUsers = allUsers.filter((chatUser: ChatUser) => chatUser.is_admin);
      }
      
      return filteredUsers;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Get messages for selected conversation or ticket
  const { data: messages = [], isLoading: initialMessagesLoading } = useQuery({
    queryKey: ['/api/messages', selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return [];
      
      // Handle virtual ticket users (negative IDs)
      if (selectedUserId < 0) {
        // This is a ticket conversation - get the ticket ID from the negative user ID
        const ticketId = Math.abs(selectedUserId);
        
        // For ticket conversations, we need to retrieve ticket-specific messages
        try {
          // Get ticket comments
          const commentsRes = await apiRequest("GET", `/api/support-tickets/${ticketId}/comments`);
          if (!commentsRes.ok) throw new Error('Failed to fetch ticket comments');
          
          const comments = await commentsRes.json();
          
          // Transform comments into message format
          return comments.map((comment: any) => ({
            id: `ticket-${comment.id}`,
            senderId: comment.isFromAdmin ? -1 : comment.userId, // -1 for system/admin
            receiverId: comment.isFromAdmin ? comment.userId : -1,
            content: comment.message,
            attachmentUrl: null,
            attachmentType: null,
            read: true,
            createdAt: comment.createdAt,
            isSystemMessage: comment.isSystemMessage || false
          }));
        } catch (error) {
          console.error("Error fetching ticket comments:", error);
          return [];
        }
      }
      
      // Regular user-to-user messages
      const res = await apiRequest("GET", `/api/messages/${selectedUserId}`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      return res.json();
    },
    enabled: !!selectedUserId,
    refetchInterval: 3000,
  });

  // Close ticket mutation
  const closeTicketMutation = useMutation({
    mutationFn: async ({ ticketId, rating, feedback }: { ticketId: number, rating: number, feedback: string }) => {
      const res = await apiRequest("POST", `/api/support-tickets/${ticketId}/close`, {
        rating,
        feedback
      });
      
      if (!res.ok) throw new Error('Failed to close ticket');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support-tickets'] });
      
      toast({
        title: "Ticket closed",
        description: "Thank you for your feedback!",
        variant: "default",
      });
      
      setShowRatingDialog(false);
      setTicketRating(5);
      setTicketFeedback("");
      setActiveTicketId(null);
    },
    onError: (error) => {
      console.error("Error closing ticket:", error);
      toast({
        title: "Failed to close ticket",
        description: "There was a problem closing the ticket. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ 
      messageText, 
      attachmentUrl = null, 
      attachmentType = null 
    }: { 
      messageText: string, 
      attachmentUrl?: string | null, 
      attachmentType?: string | null 
    }) => {
      if (!selectedUserId) throw new Error("No recipient selected");
      
      // Check if this is a virtual ticket conversation (selectedUserId is negative)
      if (selectedUserId < 0) {
        const ticketId = Math.abs(selectedUserId);
        
        // For virtual ticket conversations, we add a comment to the ticket
        const res = await apiRequest("POST", `/api/support-tickets/${ticketId}/comments`, {
          content: messageText,
          // We don't handle attachments for ticket comments yet
          isFromAdmin: isAdmin
        });
        
        if (!res.ok) throw new Error('Failed to add comment to ticket');
        return res.json();
      } else {
        // Regular user-to-user message
        const res = await apiRequest("POST", "/api/messages", {
          content: messageText,
          receiverId: selectedUserId,
          attachmentUrl,
          attachmentType
        });
        
        if (!res.ok) throw new Error('Failed to send message');
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages', selectedUserId] });
      setMessageInput("");
    },
    onError: (error) => {
      console.error("Error sending message:", error);
      toast({
        title: "Failed to send message",
        description: "There was a problem sending your message. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handle message input changes
  const handleMessageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
  };

  // Handle sending a message
  const handleSendMessage = () => {
    if (messageInput.trim()) {
      sendMessageMutation.mutate({ 
        messageText: messageInput.trim() 
      });
    }
  };
  
  // Handle key press in message input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // Handle ticket close request
  const handleCloseTicket = (ticketId: number) => {
    setActiveTicketId(ticketId);
    setShowRatingDialog(true);
  };
  
  // Submit ticket rating and close
  const submitTicketRating = () => {
    if (activeTicketId) {
      closeTicketMutation.mutate({
        ticketId: activeTicketId,
        rating: ticketRating,
        feedback: ticketFeedback
      });
    }
  };
  
  // Effect to set selected user when ticket ID is provided in URL
  useEffect(() => {
    if (ticketId) {
      console.log('Ticket ID detected in URL:', ticketId);
      
      // If we're using the old URL format (query parameter), redirect to the new format
      if (location.includes('?ticket=') && !location.includes('/chat/ticket/')) {
        navigate(`/chat/ticket/${ticketId}`);
        return;
      }
      
      // Set active ticket ID immediately (don't wait for ticketData)
      setActiveTicketId(ticketId);
      
      // Set virtual user ID for ticket conversations (negative ticket ID)
      const virtualTicketUserId = -ticketId;
      setSelectedUserId(virtualTicketUserId);
      
      // Only show toast when we have ticket data
      if (ticketData && ticketData.ticket) {
        console.log('Ticket data loaded from URL param:', ticketData);
        
        toast({
          title: "Support Ticket Chat",
          description: `You are now viewing Ticket #${ticketId}${ticketData.ticket.orderId ? ` for Order #${ticketData.ticket.orderId}` : ''}`,
        });
      }
    }
  }, [ticketId, ticketData, toast, location, navigate]);
  
  // Click handler for ticket selection from sidebar
  const handleTicketSelect = (ticket: any) => {
    // Set active ticket
    setActiveTicketId(ticket.id);
    
    // Create a virtual user ID (negative of ticket ID) for this conversation
    const virtualTicketUserId = -ticket.id;
    setSelectedUserId(virtualTicketUserId);
    
    // Navigate to the ticket-specific URL
    navigate(`/chat/ticket/${ticket.id}`);
  };
  
  // Loading state
  if (usersLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(90vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  return (
    <>
      <div className="h-[calc(90vh-4rem)] flex gap-4">
        {/* Support Tickets List */}
        <div className="w-64 border rounded-lg overflow-hidden flex flex-col">
          <div className="p-4 border-b bg-muted">
            <h2 className="font-semibold">
              Support Tickets
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isAdmin
                ? "Handle customer support tickets"
                : "View your active support tickets"}
            </p>
            
            {/* Support tickets section */}
            {userTickets.tickets && userTickets.tickets.length > 0 ? (
              <div className="mt-3 pt-3">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium">Active Tickets</h3>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                    {userTickets.tickets.filter((ticket: any) => ticket.status !== 'closed').length}
                  </span>
                </div>
                <ScrollArea className="h-[25vh] border rounded-md p-2 mb-4">
                  <div className="space-y-2 pr-2">
                    {userTickets.tickets
                      .filter((ticket: any) => ticket.status !== 'closed')
                      .map((ticket: any) => (
                      <Button 
                        key={ticket.id}
                        variant={activeTicketId === ticket.id ? "default" : "outline"} 
                        size="sm"
                        className="w-full justify-start text-xs"
                        onClick={() => handleTicketSelect(ticket)}
                      >
                        <div className="flex flex-col items-start">
                          <span className="truncate font-medium">
                            Ticket #{ticket.id} - Order #{ticket.orderId || 'N/A'}
                          </span>
                          <span className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
                
                {/* Closed tickets section */}
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium">Closed Tickets</h3>
                    <span className="text-xs bg-muted px-2 py-1 rounded-full">
                      {userTickets.tickets.filter((ticket: any) => ticket.status === 'closed').length}
                    </span>
                  </div>
                  <ScrollArea className="h-[20vh] border rounded-md p-2">
                    <div className="space-y-2 pr-2">
                      {userTickets.tickets
                        .filter((ticket: any) => {
                          // Only show closed tickets from the last 6 months
                          if (ticket.status !== 'closed') return false;
                          
                          const sixMonthsAgo = new Date();
                          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                          
                          const closedDate = ticket.closedAt 
                            ? new Date(ticket.closedAt)
                            : new Date(ticket.createdAt); // fallback if closedAt isn't set
                            
                          return closedDate > sixMonthsAgo;
                        })
                        .map((ticket: any) => (
                        <Button 
                          key={ticket.id}
                          variant={activeTicketId === ticket.id ? "default" : "outline"} 
                          size="sm"
                          className="w-full justify-start text-xs opacity-75 hover:opacity-100"
                          onClick={() => handleTicketSelect(ticket)}
                        >
                          <div className="flex flex-col items-start">
                            <span className="truncate font-medium">
                              Ticket #{ticket.id} - Order #{ticket.orderId || 'N/A'}
                            </span>
                            <span className="text-xs text-muted-foreground mt-1">
                              Closed {formatDistanceToNow(new Date(ticket.closedAt || ticket.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            ) : (
              <div className="mt-8 text-center text-muted-foreground p-4">
                <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm">No active support tickets</p>
                <p className="text-xs mt-1">
                  {isAdmin 
                    ? "You'll see customer tickets here when they need help" 
                    : "Create a support ticket from your order page if you need help"
                  }
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 border rounded-lg overflow-hidden flex flex-col">
          {selectedUserId ? (
            <>
              {/* Ticket information banner (if applicable) */}
              {activeTicketId && ticketData && ticketData.ticket && (
                <div className="bg-muted p-3 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4" /> 
                        Support Ticket #{ticketData.ticket.id}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {ticketData.ticket.title || "No title provided"}
                      </p>
                      {ticketData.ticket.orderId && (
                        <p className="text-xs flex items-center gap-1 mt-1 text-primary">
                          <LinkIcon className="h-3 w-3" /> 
                          <Link href={`/orders/${ticketData.ticket.orderId}`} className="hover:underline">
                            Order #{ticketData.ticket.orderId}
                          </Link>
                        </p>
                      )}
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-medium">Status: <span className={
                        ticketData.ticket.status === "open" 
                          ? "text-green-600" 
                          : ticketData.ticket.status === "in_progress" 
                            ? "text-amber-600" 
                            : "text-muted-foreground"
                      }>
                        {ticketData.ticket.status.replace("_", " ")}
                      </span></div>
                      <div className="text-muted-foreground text-xs">
                        Created {formatDistanceToNow(new Date(ticketData.ticket.createdAt), { addSuffix: true })}
                      </div>
                      {/* Close ticket button */}
                      {ticketData.ticket.status !== "closed" && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2"
                          onClick={() => handleCloseTicket(ticketData.ticket.id)}
                        >
                          Close Ticket
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
          
              {/* Messages */}
              <ScrollArea className="flex-1 p-4" id="message-container">
                {initialMessagesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.length > 0 ? (
                      messages.map((message: any) => (
                        <div
                          key={message.id}
                          className={cn(
                            "flex gap-2",
                            message.senderId === user?.id && "justify-end"
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[70%] rounded-lg p-3",
                              message.senderId === user?.id
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            )}
                          >
                            {/* Display message content */}
                            {message.isSystemMessage ? (
                              // System message (like ticket updates)
                              <div className="bg-muted p-2 rounded-md border border-border">
                                <div className="flex gap-2 items-center mb-1 text-muted-foreground">
                                  <Info className="h-4 w-4" />
                                  <span className="font-medium text-xs">System</span>
                                </div>
                                <div 
                                  className="whitespace-pre-wrap break-words text-muted-foreground system-message-content"
                                  dangerouslySetInnerHTML={{ __html: message.content }}
                                ></div>
                              </div>
                            ) : (
                              // Regular message
                              <p className="whitespace-pre-wrap break-words">
                                {message.content}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center justify-center h-64">
                        <div className="text-center text-muted-foreground">
                          <MessagesSquare className="h-12 w-12 mx-auto mb-2 opacity-20" />
                          <p>No messages yet</p>
                          <p className="text-sm mt-1">Start the conversation by sending a message.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
          
              {/* Input area */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type your message..."
                    value={messageInput}
                    onChange={handleMessageInputChange}
                    onKeyDown={handleKeyPress}
                    name="messageInput"
                    className="flex-1"
                    disabled={sendMessageMutation.isPending}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim() || sendMessageMutation.isPending}
                  >
                    {sendMessageMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <TicketIcon className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>No conversation selected</p>
                <p className="text-sm mt-1">Select a support ticket from the list to view the conversation.</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Rating Dialog */}
      <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate your support experience</DialogTitle>
            <DialogDescription>
              Please rate your experience and provide any feedback before closing this ticket.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-center my-4">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((rating) => (
                <Button
                  key={rating}
                  variant={ticketRating >= rating ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTicketRating(rating)}
                  className="w-10 h-10 rounded-full p-0"
                >
                  <Star className={ticketRating >= rating ? "fill-current" : ""}/>
                </Button>
              ))}
            </div>
          </div>
          
          <Textarea
            placeholder="Additional feedback (optional)"
            value={ticketFeedback}
            onChange={(e) => setTicketFeedback(e.target.value)}
            className="min-h-[100px]"
          />
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRatingDialog(false)}>
              Cancel
            </Button>
            <Button onClick={submitTicketRating} disabled={closeTicketMutation.isPending}>
              {closeTicketMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting</>
              ) : (
                "Submit & Close Ticket"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}