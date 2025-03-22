import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect, useCallback, useRef } from "react";
import { 
  Loader2, Send, Check, CheckCheck, Image as ImageIcon, 
  Mic, MicOff, X, FileText, Paperclip, Music 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { User } from "@shared/schema";
import { uploadFile } from "@/utils/uploadthing";
import { useToast } from "@/hooks/use-toast";

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

  // Get users based on role - with better caching
  const { data: users = [], isLoading: usersLoading } = useQuery<ChatUser[]>({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users");
      const allUsers = await res.json();

      return allUsers.filter((chatUser: ChatUser) =>
        isAdmin ? !chatUser.is_admin : chatUser.is_admin
      );
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

  if (usersLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex gap-4">
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
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (mediaRecorder) {
                        mediaRecorder.stop();
                      }
                    }}
                  >
                    <MicOff className="h-4 w-4 mr-1" />
                    Stop
                  </Button>
                </div>
              )}
              
              <div className="flex gap-2">
                {/* Attachment buttons */}
                <div className="flex gap-1">
                  {/* Image upload button */}
                  <input 
                    type="file" 
                    id="image-upload" 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setImageAttachment(file);
                        setAudioAttachment(null);
                      }
                      e.target.value = ''; // Reset input
                    }}
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    type="button"
                    onClick={() => document.getElementById('image-upload')?.click()}
                    disabled={isRecording || uploadingAttachment}
                  >
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                  
                  {/* Voice recording button */}
                  <Button 
                    variant="outline" 
                    size="icon"
                    type="button"
                    onClick={() => {
                      if (isRecording) {
                        if (mediaRecorder) {
                          mediaRecorder.stop();
                        }
                        return;
                      }
                      
                      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                        navigator.mediaDevices.getUserMedia({ audio: true })
                          .then(stream => {
                            const recorder = new MediaRecorder(stream);
                            const chunks: Blob[] = [];
                            
                            recorder.ondataavailable = e => {
                              chunks.push(e.data);
                            };
                            
                            recorder.onstop = () => {
                              setIsRecording(false);
                              const blob = new Blob(chunks, { type: 'audio/mp3' });
                              const audioFile = new File([blob], 'voice-message.mp3', { type: 'audio/mp3' });
                              setAudioAttachment(audioFile);
                              setImageAttachment(null);
                              
                              // Stop the media tracks
                              stream.getTracks().forEach(track => track.stop());
                            };
                            
                            recorder.start();
                            setIsRecording(true);
                            setMediaRecorder(recorder);
                          })
                          .catch(err => {
                            console.error("Error accessing microphone:", err);
                          });
                      } else {
                        console.error("Media devices not supported");
                      }
                    }}
                    disabled={uploadingAttachment}
                    className={isRecording ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
                  >
                    {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                </div>
                
                {/* Message input */}
                <Input
                  value={messageInput}
                  onChange={handleMessageInputChange}
                  placeholder="Type a message..."
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                  disabled={isRecording || uploadingAttachment}
                />
                
                {/* Send button */}
                <Button
                  onClick={handleSendMessage}
                  disabled={(!(messageInput.trim() || imageAttachment || audioAttachment)) || sendMessageMutation.isPending || uploadingAttachment}
                >
                  {sendMessageMutation.isPending || uploadingAttachment ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
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
  );
}