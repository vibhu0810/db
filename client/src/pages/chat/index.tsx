import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect, useCallback } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { User } from "@shared/schema";

interface ChatUser extends User {
  companyName: string;
  username: string;
  is_admin: boolean;
  email: string;
}

export default function ChatPage() {
  const { user, isAdmin } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Get users based on role
  const { data: users = [], isLoading: usersLoading } = useQuery<ChatUser[]>({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users");
      const allUsers = await res.json();

      return allUsers.filter((chatUser: ChatUser) =>
        isAdmin ? !chatUser.is_admin : chatUser.is_admin
      );
    },
  });

  // Get messages for selected conversation
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['/api/messages', selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return [];
      const res = await apiRequest("GET", `/api/messages/${selectedUserId}`);
      return res.json();
    },
    enabled: !!selectedUserId,
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
    refetchInterval: 1000, // Poll every second
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

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      if (!selectedUserId) throw new Error("No recipient selected");
      const res = await apiRequest("POST", "/api/messages", {
        content: messageText,
        receiverId: selectedUserId,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages', selectedUserId] });
      setMessageInput("");
      setIsTyping(false);
      updateTypingStatus.mutate(false);
    },
  });

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    sendMessageMutation.mutate(messageInput);
  };

  // Clear typing status when component unmounts or user changes
  useEffect(() => {
    return () => {
      if (isTyping) {
        updateTypingStatus.mutate(false);
      }
    };
  }, [selectedUserId, isTyping]);

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
            users.map((chatUser) => (
              <button
                key={chatUser.id}
                onClick={() => setSelectedUserId(chatUser.id)}
                className={cn(
                  "w-full p-4 text-left hover:bg-accent transition-colors flex items-center gap-3",
                  selectedUserId === chatUser.id && "bg-accent"
                )}
              >
                <Avatar>
                  {chatUser.profilePicture ? (
                    <img src={chatUser.profilePicture} alt={chatUser.username} />
                  ) : (
                    <div className="bg-primary/10 w-full h-full flex items-center justify-center text-primary font-semibold">
                      {chatUser.username[0].toUpperCase()}
                    </div>
                  )}
                </Avatar>
                <div>
                  <div className="font-medium">
                    {chatUser.companyName || chatUser.username}
                    {chatUser.is_admin && (
                      <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        Admin
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {chatUser.is_admin ? "Support Agent" : chatUser.email}
                  </div>
                </div>
              </button>
            ))
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
              {messagesLoading ? (
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
                          <p className="whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                          <div
                            className={cn(
                              "text-xs mt-1",
                              message.senderId === user?.id
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground"
                            )}
                          >
                            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
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
              <div className="flex gap-2">
                <Input
                  value={messageInput}
                  onChange={handleMessageInputChange}
                  placeholder="Type a message..."
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
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
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select a {isAdmin ? "customer" : "support agent"} to start chatting
          </div>
        )}
      </div>
    </div>
  );
}