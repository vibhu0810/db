import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect, useCallback, useRef } from "react";
import { 
  Loader2, Send, Check, CheckCheck, Image as ImageIcon, 
  Mic, MicOff, X, FileText, Paperclip, Music, Star
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
import { useLocation } from "wouter";

interface ChatUser extends User {
  companyName: string;
  username: string;
  is_admin: boolean;
  email: string;
}

export default function ChatPage() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
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
        return res.json();
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
      
      const res = await apiRequest("POST", "/api/messages", {
        content: messageText,
        receiverId: selectedUserId,
        attachmentUrl,
        attachmentType
      });
      
      if (!res.ok) throw new Error('Failed to send message');
      return res.json();
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
    if (ticketData && ticketData.ticket && users.length > 0) {
      console.log('Ticket data loaded:', ticketData);
      setActiveTicketId(ticketData.ticket.id);
      
      // Handle based on user role
      if (isAdmin) {
        // For admin users, set the customer who created the ticket as the selected user
        console.log('Admin user handling ticket, finding customer with ID:', ticketData.ticket.userId);
        
        // This might not be in the filtered users list, so fetch the specific user directly
        apiRequest("GET", `/api/users/${ticketData.ticket.userId}`)
          .then(res => res.json())
          .then(customerData => {
            console.log('Found customer user:', customerData);
            setSelectedUserId(customerData.id);
            
            // Set initial message to acknowledge ticket
            setMessageInput(`I'm here to help with your support ticket #${ticketId}.`);
          })
          .catch(err => {
            console.error('Error fetching customer user:', err);
            toast({
              title: "Error",
              description: "Could not find the customer for this support ticket.",
              variant: "destructive",
            });
          });
      } else {
        // For regular users, find an admin to chat with
        console.log('Regular user handling ticket, finding an admin user');
        
        // Get all users to find admins, regardless of the current filter
        apiRequest("GET", "/api/users")
          .then(res => res.json())
          .then(allUsers => {
            const admins = allUsers.filter((u: ChatUser) => u.is_admin);
            console.log('Found admins:', admins);
            
            if (admins.length > 0) {
              const adminUser = admins[0];
              console.log('Setting selected user to admin:', adminUser.username);
              setSelectedUserId(adminUser.id);
            } else {
              toast({
                title: "No Admin Found",
                description: "Could not find an admin to handle your support ticket.",
                variant: "destructive",
              });
            }
          })
          .catch(err => {
            console.error('Error fetching admin users:', err);
            toast({
              title: "Error",
              description: "Could not find admin support for this ticket.",
              variant: "destructive",
            });
          });
      }
    }
  }, [ticketData, users, isAdmin, ticketId]);

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
        {/* Users list */}
        <div className="w-64 border rounded-lg overflow-hidden">
          <div className="p-4 border-b bg-muted">
            <h2 className="font-semibold">
              {isAdmin ? "Customers" : "Support Team"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isAdmin
                ? "Select a customer to chat with"
                : "Our support team is here to help"}
            </p>
          </div>
          <ScrollArea className="h-[calc(100%-6rem)]">
            {users.length > 0 ? (
              users.map((chatUser) => {
                // Count unread messages for this user
                const unreadMessages = messages?.filter(
                  (m: any) => m.senderId === chatUser.id && !m.read &&
                  // Only count messages from conversations other than the currently selected one
                  (selectedUserId !== chatUser.id)
                );
                const unreadCount = unreadMessages?.length || 0;

                return (
                  <button
                    key={chatUser.id}
                    onClick={() => setSelectedUserId(chatUser.id)}
                    className={cn(
                      "w-full p-4 text-left hover:bg-accent transition-colors flex items-center gap-3 relative",
                      selectedUserId === chatUser.id && "bg-accent"
                    )}
                  >
                    <div className="relative">
                      <Avatar>
                        {chatUser.profilePicture ? (
                          <img src={chatUser.profilePicture} alt={chatUser.username} />
                        ) : (
                          <div className="bg-primary/10 w-full h-full flex items-center justify-center text-primary font-semibold">
                            {chatUser.username[0].toUpperCase()}
                          </div>
                        )}
                      </Avatar>
                      {/* Online/Offline indicator */}
                      <div className={cn(
                        "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background",
                        onlineStatus[chatUser.id] ? "bg-emerald-500" : "bg-destructive"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {chatUser.companyName || chatUser.username}
                        {chatUser.is_admin && (
                          <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            Admin
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {chatUser.is_admin ? "Support Agent" : chatUser.email}
                      </div>
                    </div>
                    {unreadCount > 0 && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">
                        {unreadCount}
                      </div>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                {isAdmin
                  ? "No customers available"
                  : "No support agents available at the moment"}
              </div>
            )}
          </ScrollArea>
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
                            <p className="whitespace-pre-wrap break-words">
                              {message.content}
                            </p>
                            
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
                                const file = new File([blob], 'voice-message.mp3', { type: 'audio/mpeg' });
                                setAudioAttachment(file);
                                setAudioChunks([]);
                                
                                // Stop all tracks in the stream
                                stream.getTracks().forEach(track => track.stop());
                              };
                              
                              recorder.start();
                              setMediaRecorder(recorder);
                              setIsRecording(true);
                              setAudioChunks([]);
                            })
                            .catch(err => {
                              console.error("Error accessing microphone:", err);
                              toast({
                                title: "Cannot access microphone",
                                description: "Please allow microphone access and try again.",
                                variant: "destructive",
                              });
                            });
                        } else {
                          toast({
                            title: "Voice recording not supported",
                            description: "Your browser doesn't support voice recording.",
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
                    placeholder="Type your message..."
                    value={messageInput}
                    onChange={handleMessageInputChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={isRecording || uploadingAttachment}
                    className="flex-1"
                  />
                  
                  {/* Send button */}
                  <Button
                    onClick={handleSendMessage}
                    disabled={
                      (!messageInput.trim() && !imageAttachment && !audioAttachment) || 
                      sendMessageMutation.isPending || 
                      uploadingAttachment
                    }
                  >
                    {sendMessageMutation.isPending || uploadingAttachment ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                {/* Recording/attachment instructions */}
                <div className="mt-2 text-xs text-muted-foreground">
                  Press and hold the microphone button to record a voice message. 
                  Click the paperclip to attach an image.
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Select a {isAdmin ? "customer" : "support agent"} to start chatting
            </div>
          )}
        </div>
      </div>
      
      {/* Ticket Rating Dialog */}
      <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rate your support experience</DialogTitle>
            <DialogDescription>
              Please rate your support experience and provide any feedback you'd like to share.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col space-y-4 py-4">
            <div className="flex justify-center space-x-1">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => setTicketRating(rating)}
                  className={`p-1 rounded-full transition-colors ${
                    ticketRating >= rating ? 'text-yellow-400' : 'text-gray-300'
                  }`}
                >
                  <Star className="h-8 w-8" fill={ticketRating >= rating ? "currentColor" : "none"} />
                </button>
              ))}
            </div>
            
            <Textarea
              placeholder="Share your feedback (optional)"
              value={ticketFeedback}
              onChange={(e) => setTicketFeedback(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          
          <DialogFooter className="sm:justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setShowRatingDialog(false);
                setTicketRating(5);
                setTicketFeedback("");
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={submitTicketRating}
              disabled={closeTicketMutation.isPending}
            >
              {closeTicketMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
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