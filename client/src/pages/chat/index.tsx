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
  
  // Parse URL query parameters to get ticket ID if present
  const getTicketIdFromUrl = () => {
    const searchParams = new URLSearchParams(location.split('?')[1]);
    const ticketId = searchParams.get('ticket');
    return ticketId ? parseInt(ticketId, 10) : null;
  };
  
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

  // Get users based on role - with better caching
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
      
      // Log for debugging
      console.log('All users before filtering:', allUsers);
      console.log(`Filtered users for ${isAdmin ? 'admin' : 'user'} :`, filteredUsers);
      
      return filteredUsers;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Get messages for selected conversation
  const { data: messages = [], isLoading: initialMessagesLoading } = useQuery({
    queryKey: ['/api/messages', selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return [];
      
      // Handle virtual ticket users (negative IDs)
      if (selectedUserId < 0) {
        // This is a ticket conversation - get the ticket ID from the negative user ID
        const ticketId = Math.abs(selectedUserId);
        
        // For ticket conversations, we need to retrieve ticket-specific messages
        // These would ideally come from a dedicated API endpoint, but we'll improvise
        try {
          // Get ticket details first
          const ticketRes = await apiRequest("GET", `/api/support-tickets/${ticketId}`);
          const ticketData = await ticketRes.json();
          
          if (!ticketRes.ok) throw new Error('Failed to fetch ticket details');
          
          // Let's create a synthetic conversation for this ticket
          const ticketMessages = [
            {
              id: `ticket-${ticketId}-1`,
              senderId: -100, // System message sender ID
              receiverId: user?.id || 0,
              content: `Opened support ticket for Order #${ticketData.ticket.orderId}`,
              attachmentUrl: null,
              attachmentType: null,
              read: true,
              createdAt: ticketData.ticket.createdAt,
              isSystemMessage: true
            }
          ];
          
          // Get any comments on this ticket
          if (ticketData.ticket.id) {
            try {
              const commentsRes = await apiRequest("GET", `/api/support-tickets/${ticketId}/comments`);
              if (commentsRes.ok) {
                const comments = await commentsRes.json();
                
                // Add each comment as a message in this conversation
                comments.forEach((comment: any, index: number) => {
                  // Determine if comment is from admin or customer
                  const isAdminComment = comment.isFromAdmin;
                  
                  ticketMessages.push({
                    id: `ticket-${ticketId}-comment-${index + 2}`,
                    senderId: isAdminComment ? -101 : user?.id || 0, // Admin (virtual) or current user
                    receiverId: isAdminComment ? user?.id || 0 : -101,
                    content: comment.content,
                    attachmentUrl: null,
                    attachmentType: null,
                    read: true,
                    createdAt: comment.createdAt,
                    isSystemMessage: false
                  });
                });
              }
            } catch (e) {
              console.error("Error fetching ticket comments:", e);
            }
          }
          
          // Add status update message if the ticket has been updated
          if (ticketData.ticket.status !== "open") {
            ticketMessages.push({
              id: `ticket-${ticketId}-status`,
              senderId: -100, // System message
              receiverId: user?.id || 0,
              content: `This ticket's status was updated to: ${ticketData.ticket.status.replace("_", " ")}`,
              attachmentUrl: null,
              attachmentType: null,
              read: true,
              createdAt: ticketData.ticket.updatedAt || ticketData.ticket.createdAt,
              isSystemMessage: true
            });
          }
          
          // If the ticket is closed, add a closing message
          if (ticketData.ticket.status === "closed") {
            ticketMessages.push({
              id: `ticket-${ticketId}-closed`,
              senderId: -100, // System message
              receiverId: user?.id || 0,
              content: `This ticket has been closed. ${ticketData.ticket.feedback ? `Feedback: ${ticketData.ticket.feedback}` : ''}`,
              attachmentUrl: null,
              attachmentType: null,
              read: true,
              createdAt: ticketData.ticket.closedAt || ticketData.ticket.updatedAt || ticketData.ticket.createdAt,
              isSystemMessage: true
            });
          }
          
          return ticketMessages;
        } catch (error) {
          console.error("Error fetching ticket conversation:", error);
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
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    retry: 3,
    staleTime: 1000,
  });

  // Get typing status of selected user
  const { data: typingStatus } = useQuery({
    queryKey: ['/api/typing-status', selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return { isTyping: false };
      const res = await apiRequest("GET", `/api/typing-status/${selectedUserId}`);
      return res.json();
    },
    enabled: !!selectedUserId,
    refetchInterval: 2000,
    retry: false,
  });

  // Get online status of users
  const { data: onlineStatus = {} } = useQuery({
    queryKey: ['/api/users/online-status', users],
    queryFn: async () => {
      if (!users.length) return {};
      const userIds = users.map(u => u.id).join(',');
      const res = await apiRequest("GET", `/api/users/online-status?userIds=${userIds}`);
      return res.json();
    },
    enabled: users.length > 0,
    refetchInterval: 10000, // Check online status every 10 seconds
  });


  // Update typing status mutation
  const updateTypingStatus = useMutation({
    mutationFn: async (isTyping: boolean) => {
      if (!selectedUserId) return;
      await apiRequest("POST", "/api/typing-status", {
        receiverId: selectedUserId,
        isTyping,
      });
    },
  });

  // Debounce function for typing status
  const debounce = (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  // Debounced version of updateTypingStatus
  const debouncedUpdateTyping = useCallback(
    debounce((value: boolean) => {
      setIsTyping(value);
      updateTypingStatus.mutate(value);
    }, 500),
    [updateTypingStatus]
  );

  // Handle message input changes
  const handleMessageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessageInput(value);

    if (value.length > 0 && !isTyping) {
      debouncedUpdateTyping(true);
    } else if (value.length === 0 && isTyping) {
      debouncedUpdateTyping(false);
    }
  };

  // Message upload states
  const [imageAttachment, setImageAttachment] = useState<File | null>(null);
  const [audioAttachment, setAudioAttachment] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimer = useRef<NodeJS.Timeout | null>(null);

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
        
        // For virtual ticket conversations, we add a comment to the ticket instead
        const res = await apiRequest("POST", `/api/support-tickets/${ticketId}/comments`, {
          content: messageText,
          // We don't handle attachments for ticket comments yet
          isFromAdmin: isAdmin
        });
        
        if (!res.ok) throw new Error('Failed to add comment to ticket');
        
        // Also create a regular message for admin notification if user is not admin
        if (!isAdmin) {
          // Find an admin to notify
          const adminUser = users.find((u: ChatUser) => u.is_admin);
          if (adminUser) {
            // Create a notification message for the admin
            const notifyRes = await apiRequest("POST", "/api/messages", {
              content: `New comment on Support Ticket #${ticketId}: ${messageText.substring(0, 50)}${messageText.length > 50 ? '...' : ''}`,
              receiverId: adminUser.id,
              attachmentUrl,
              attachmentType
            });
            
            if (!notifyRes.ok) {
              console.warn('Failed to notify admin about ticket comment');
            }
          }
        }
        
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
      setIsTyping(false);
      updateTypingStatus.mutate(false);
      setImageAttachment(null);
      setAudioAttachment(null);
    },
  });

  // Handle file upload and message sending
  const handleSendMessage = async () => {
    const hasText = messageInput.trim().length > 0;
    const hasAttachment = imageAttachment || audioAttachment;
    
    if (!hasText && !hasAttachment) return;
    
    try {
      if (hasAttachment) {
        setUploadingAttachment(true);
        
        if (imageAttachment) {
          try {
            const uploadUrl = await uploadFile(imageAttachment, "chatImage");
            await sendMessageMutation.mutateAsync({ 
              messageText: messageInput.trim() || "📷 Image", 
              attachmentUrl: uploadUrl, 
              attachmentType: "image" 
            });
            toast({
              title: "Image sent",
              description: "Your image has been successfully sent.",
              variant: "default",
            });
          } catch (uploadError) {
            toast({
              title: "Failed to upload image",
              description: "There was a problem uploading your image. Please try again.",
              variant: "destructive",
            });
            console.error("Image upload error:", uploadError);
          }
        } else if (audioAttachment) {
          try {
            const uploadUrl = await uploadFile(audioAttachment, "chatAudio");
            await sendMessageMutation.mutateAsync({ 
              messageText: messageInput.trim() || "🎤 Voice message", 
              attachmentUrl: uploadUrl, 
              attachmentType: "audio" 
            });
            toast({
              title: "Voice message sent",
              description: "Your voice message has been successfully sent.",
              variant: "default",
            });
          } catch (uploadError) {
            toast({
              title: "Failed to upload voice message",
              description: "There was a problem uploading your voice message. Please try again.",
              variant: "destructive",
            });
            console.error("Audio upload error:", uploadError);
          }
        }
        
        setUploadingAttachment(false);
      } else {
        // Text-only message
        await sendMessageMutation.mutateAsync({ messageText: messageInput });
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setUploadingAttachment(false);
      toast({
        title: "Message not sent",
        description: "There was a problem sending your message. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Clear typing status when component unmounts or user changes
  useEffect(() => {
    return () => {
      if (isTyping) {
        updateTypingStatus.mutate(false);
      }
    };
  }, [selectedUserId, isTyping]);

  // Handle recording timer
  useEffect(() => {
    if (isRecording) {
      setRecordingDuration(0);
      recordingTimer.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
        recordingTimer.current = null;
      }
    }
    
    return () => {
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
        recordingTimer.current = null;
      }
    };
  }, [isRecording]);
  
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
  
  // Effect to set selected user when ticket ID is provided
  useEffect(() => {
    // Only run this effect when ticket data and users are loaded
    if (ticketId && ticketData && ticketData.ticket && users.length > 0) {
      console.log('Ticket data loaded:', ticketData);
      setActiveTicketId(ticketData.ticket.id);
      
      // Set the virtual user ID for ticket conversations (negative ticket ID)
      const virtualTicketUserId = -ticketData.ticket.id;
      console.log('Setting selected user to virtual ticket user:', virtualTicketUserId);
      setSelectedUserId(virtualTicketUserId);
      
      // Clear any existing message input
      setMessageInput("");
      
      // Show toast for successful navigation
      toast({
        title: "Support Ticket Chat",
        description: `You are now viewing Ticket #${ticketData.ticket.id} for Order #${ticketData.ticket.orderId}`,
      });
    }
  }, [ticketData, users, ticketId, toast]);

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
                <ScrollArea className="h-[70vh] border rounded-md p-2">
                  <div className="space-y-2 pr-2">
                    {userTickets.tickets
                      .filter((ticket: any) => ticket.status !== 'closed')
                      .map((ticket: any) => (
                      <Button 
                        key={ticket.id}
                        variant={activeTicketId === ticket.id ? "default" : "outline"} 
                        size="sm"
                        className="w-full justify-start text-xs"
                        onClick={() => {
                          // Set active ticket and find the admin to chat with
                          setActiveTicketId(ticket.id);
                          
                          // Fetch detailed ticket information
                          apiRequest("GET", `/api/support-tickets/${ticket.id}`)
                            .then(res => res.json())
                            .then(ticketDetails => {
                              console.log('Loaded ticket details:', ticketDetails);
                              
                              // Create a virtual user ID for this ticket
                              // We'll use a negative number based on the ticket ID to ensure uniqueness
                              // This will be used as the selectedUserId for this ticket conversation
                              const virtualTicketUserId = -1 * ticket.id; 
                              
                              // Set the active ticket and selected user (virtual)
                              setActiveTicketId(ticket.id);
                              setSelectedUserId(virtualTicketUserId);
                              
                              // Store ticket data for display
                              const ticketData = {
                                ticket: ticketDetails.ticket || ticket
                              };
                              localStorage.setItem(`ticket_${ticket.id}`, JSON.stringify(ticketData));
                              
                              // Update the URL with the ticket ID for persistence
                              const url = new URL(window.location.href);
                              url.searchParams.set('ticket', ticket.id.toString());
                              window.history.pushState({}, '', url);
                              
                              // Focus the input field after a short delay
                              setTimeout(() => {
                                const inputField = document.querySelector('input[name="messageInput"]');
                                if (inputField) {
                                  (inputField as HTMLInputElement).focus();
                                }
                              }, 100);
                            })
                            .catch(err => {
                              console.error('Error loading ticket details:', err);
                              toast({
                                title: "Error",
                                description: "Could not load ticket details.",
                                variant: "destructive"
                              });
                            });
                        }}
                      >
                        <div className="flex flex-col items-start">
                          <span className="truncate font-medium">
                            Ticket #{ticket.id} - Order #{ticket.orderId}
                          </span>
                          <span className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
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
              {ticketData && ticketData.ticket && (
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
                      <p className="text-xs flex items-center gap-1 mt-1 text-primary">
                        <LinkIcon className="h-3 w-3" /> 
                        <Link href={`/orders/${ticketData.ticket.orderId}`} className="hover:underline">
                          Order #{ticketData.ticket.orderId}
                        </Link>
                      </p>
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
              <ScrollArea className="flex-1 p-4">
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
                                <p className="whitespace-pre-wrap break-words text-muted-foreground">
                                  {message.content}
                                </p>
                              </div>
                            ) : (message.content && message.content.includes("Support Ticket #")) ? (
                              // Support ticket notification
                              <div className="bg-amber-100 dark:bg-amber-950 p-2 rounded-md border border-amber-300 dark:border-amber-800">
                                <div className="flex gap-2 items-center mb-1 text-amber-800 dark:text-amber-400">
                                  <FileText className="h-4 w-4" />
                                  <span className="font-medium text-sm">Support Ticket</span>
                                </div>
                                <div className="whitespace-pre-wrap break-words">
                                  {message.content && message.content.includes("Order #") ? (
                                    <>
                                      {message.content.split("Order #").map((part: string, index: number) => {
                                        if (index === 0) return part;
                                        
                                        // Extract order ID from the text
                                        const orderIdMatch = part.match(/^(\d+)/);
                                        const orderId = orderIdMatch ? orderIdMatch[1] : null;
                                        const remainingText = part.replace(/^\d+/, "");
                                        
                                        return (
                                          <React.Fragment key={index}>
                                            Order #
                                            {orderId ? (
                                              <Link 
                                                href={`/orders/${orderId}`}
                                                className="text-primary hover:underline"
                                              >
                                                {orderId}
                                              </Link>
                                            ) : (
                                              orderId
                                            )}
                                            {remainingText}
                                          </React.Fragment>
                                        );
                                      })}
                                    </>
                                  ) : (
                                    message.content
                                  )}
                                </div>
                              </div>
                            ) : (
                              // Regular message
                              <p className="whitespace-pre-wrap break-words">
                                {message.content}
                              </p>
                            )}
                            
                            {/* Display image attachment if present */}
                            {message.attachmentUrl && message.attachmentType === 'image' && (
                              <div className="mt-2 rounded-md overflow-hidden">
                                <div className="flex items-center gap-2 mb-1">
                                  <ImageIcon className="h-4 w-4" />
                                  <span className="text-xs font-medium">Image</span>
                                </div>
                                <a 
                                  href={message.attachmentUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="block rounded-md overflow-hidden"
                                >
                                  <img 
                                    src={message.attachmentUrl} 
                                    alt="Message attachment" 
                                    className="max-w-full rounded-md hover:opacity-90 transition-opacity border border-border" 
                                    loading="lazy"
                                  />
                                </a>
                              </div>
                            )}
                            
                            {/* Display audio attachment if present */}
                            {message.attachmentUrl && message.attachmentType === 'audio' && (
                              <div className="mt-2 bg-background/20 rounded-md p-2">
                                <div className="flex items-center gap-2 mb-1">
                                  <Music className="h-4 w-4" />
                                  <span className="text-xs font-medium">Voice Message</span>
                                </div>
                                <audio 
                                  src={message.attachmentUrl} 
                                  controls 
                                  className="max-w-full w-full h-8"
                                  controlsList="nodownload noplaybackrate"
                                />
                              </div>
                            )}
                            
                            {/* Display message metadata */}
                            <div
                              className={cn(
                                "text-xs mt-1 flex items-center gap-1",
                                message.senderId === user?.id
                                  ? "text-primary-foreground/70"
                                  : "text-muted-foreground"
                              )}
                            >
                              <span>
                                {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                              </span>
                              {message.senderId === user?.id && (
                                <span className="flex items-center">
                                  •
                                  {message.read ? (
                                    <CheckCheck className="h-3 w-3 ml-1" />
                                  ) : (
                                    <Check className="h-3 w-3 ml-1" />
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-muted-foreground">
                        No messages yet. Start the conversation!
                      </div>
                    )}
                    {/* Typing indicator */}
                    {typingStatus?.isTyping && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="flex gap-1">
                          <span className="animate-bounce">.</span>
                          <span className="animate-bounce delay-100">.</span>
                          <span className="animate-bounce delay-200">.</span>
                        </div>
                        <span>Typing</span>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>

              {/* Input area */}
              <div className="p-4 border-t">
                {/* Display selected attachments */}
                {(imageAttachment || audioAttachment) && (
                  <div className="mb-3 p-2 border rounded-md bg-muted/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {imageAttachment && (
                        <>
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                          <span className="text-sm truncate max-w-[200px]">
                            {imageAttachment.name}
                          </span>
                        </>
                      )}
                      {audioAttachment && (
                        <>
                          <Music className="h-5 w-5 text-muted-foreground" />
                          <span className="text-sm truncate max-w-[200px]">
                            {audioAttachment.name || "Voice recording.mp3"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {(audioAttachment.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setImageAttachment(null);
                        setAudioAttachment(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                
                {/* Voice recording UI */}
                {isRecording && (
                  <div className="mb-3 p-2 border rounded-md bg-destructive/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <span className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
                        <span className="absolute -inset-1 rounded-full bg-destructive/30 animate-ping opacity-75" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-destructive font-medium">Recording...</span>
                        <span className="text-xs text-muted-foreground">
                          {Math.floor(recordingDuration / 60).toString().padStart(2, '0')}:
                          {(recordingDuration % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive border-destructive"
                      onClick={() => {
                        if (mediaRecorder) {
                          mediaRecorder.stop();
                        }
                        setIsRecording(false);
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  {/* File attachment button */}
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                      type="button"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) {
                            setImageAttachment(file);
                          }
                        };
                        input.click();
                      }}
                    >
                      <Paperclip className="h-5 w-5" />
                    </Button>
                  </div>

                  {/* Voice recording button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    type="button"
                    onClick={() => {
                      if (isRecording) {
                        if (mediaRecorder) {
                          mediaRecorder.stop();
                        }
                        setIsRecording(false);
                      } else {
                        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                          navigator.mediaDevices.getUserMedia({ audio: true })
                            .then(stream => {
                              const recorder = new MediaRecorder(stream);
                              const chunks: Blob[] = [];
                              
                              recorder.ondataavailable = e => {
                                chunks.push(e.data);
                              };
                              
                              recorder.onstop = () => {
                                const blob = new Blob(chunks, { type: 'audio/mpeg' });
                                const file = new File([blob], `voice-message-${new Date().getTime()}.mp3`, { type: 'audio/mpeg' });
                                setAudioAttachment(file);
                                
                                // Stop all tracks in the stream to release the microphone
                                stream.getTracks().forEach(track => track.stop());
                              };
                              
                              // Start recording
                              recorder.start();
                              setMediaRecorder(recorder);
                              setIsRecording(true);
                              setAudioChunks([]);
                            })
                            .catch(err => {
                              console.error('Error accessing microphone:', err);
                              toast({
                                title: "Microphone access denied",
                                description: "Please allow microphone access to record voice messages.",
                                variant: "destructive",
                              });
                            });
                        } else {
                          toast({
                            title: "Recording not supported",
                            description: "Your browser does not support voice recording.",
                            variant: "destructive",
                          });
                        }
                      }
                    }}
                  >
                    {isRecording ? (
                      <MicOff className="h-5 w-5 text-destructive" />
                    ) : (
                      <Mic className="h-5 w-5" />
                    )}
                  </Button>
                  
                  {/* Message input */}
                  <Input
                    value={messageInput}
                    onChange={handleMessageInputChange}
                    placeholder="Type a message..."
                    className="flex-1"
                    name="messageInput"
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  
                  {/* Send button */}
                  <Button
                    variant={messageInput.trim() || imageAttachment || audioAttachment ? "default" : "ghost"}
                    size="icon"
                    className="rounded-full"
                    disabled={uploadingAttachment || (!messageInput.trim() && !imageAttachment && !audioAttachment)}
                    onClick={handleSendMessage}
                  >
                    {uploadingAttachment ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground flex-col p-8">
              <FileText className="h-16 w-16 mb-4 text-muted-foreground/50" />
              <h3 className="text-xl font-medium mb-2">Support Tickets</h3>
              <p className="text-center max-w-md">
                {isAdmin 
                  ? "Select a support ticket from the sidebar to respond to customer inquiries."
                  : "Select a ticket from the sidebar or create a new support ticket from your order page."
                }
              </p>
              {!isAdmin && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => { navigate('/orders'); }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Go to Orders
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Ticket rating dialog */}
      <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Close Support Ticket</DialogTitle>
            <DialogDescription>
              Please rate your support experience before closing this ticket.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex justify-center space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={cn(
                    "p-1 text-lg",
                    star <= ticketRating ? "text-yellow-500" : "text-muted-foreground"
                  )}
                  onClick={() => setTicketRating(star)}
                >
                  <Star className={cn(
                    "h-8 w-8",
                    star <= ticketRating ? "fill-yellow-500" : "fill-none"
                  )} />
                </button>
              ))}
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="feedback">
                Additional Feedback (Optional)
              </label>
              <Textarea
                id="feedback"
                value={ticketFeedback}
                onChange={(e) => setTicketFeedback(e.target.value)}
                placeholder="Tell us more about your experience..."
                className="resize-none"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowRatingDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              onClick={submitTicketRating}
              disabled={closeTicketMutation.isPending}
            >
              {closeTicketMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : "Submit & Close Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}