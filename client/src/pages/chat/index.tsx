import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { Loader2, Send, Image as ImageIcon, Video, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { useUploadThing } from "@/lib/uploadthing";
import { cn } from "@/lib/utils";

export default function ChatPage() {
  const { user, isAdmin } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [fileUploading, setFileUploading] = useState(false);

  // Get all users for admin, or just admin users for regular users
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users");
      const allUsers = await res.json();
      return isAdmin ? allUsers.filter((u: any) => !u.is_admin) : allUsers.filter((u: any) => u.is_admin);
    },
  });

  // Get messages for the selected conversation
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['/api/messages', selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return [];
      const res = await apiRequest("GET", `/api/messages/${selectedUserId}`);
      return res.json();
    },
    enabled: !!selectedUserId,
  });

  // Upload handlers using uploadthing
  const { startUpload } = useUploadThing("messageAttachment");

  const handleFileUpload = async (file: File) => {
    try {
      setFileUploading(true);
      const [res] = await startUpload([file]);
      if (res) {
        // Send message with attachment
        await sendMessageMutation.mutate({
          receiverId: selectedUserId!,
          attachmentUrl: res.url,
          attachmentType: file.type.startsWith('image/') ? 'image' :
                         file.type.startsWith('video/') ? 'video' : 'document',
        });
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setFileUploading(false);
    }
  };

  const sendMessageMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/messages", {
        ...data,
        content: data.content || null,
        receiverId: selectedUserId,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages', selectedUserId] });
      setMessageInput("");
    },
  });

  const handleSendMessage = () => {
    if (!messageInput.trim() && !fileUploading) return;
    sendMessageMutation.mutate({ content: messageInput });
  };

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
            {isAdmin ? "Customers" : "Support"}
          </h2>
        </div>
        <ScrollArea className="h-[calc(100%-4rem)]">
          {users.map((chatUser: any) => (
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
                <div className="font-medium">{chatUser.username}</div>
                <div className="text-sm text-muted-foreground">{chatUser.companyName}</div>
              </div>
            </button>
          ))}
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
                  {messages.map((message: any) => (
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
                        {message.content && (
                          <p className="whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                        )}
                        {message.attachmentUrl && (
                          <div className="mt-2">
                            {message.attachmentType === 'image' ? (
                              <img
                                src={message.attachmentUrl}
                                alt="Attachment"
                                className="max-w-full rounded"
                              />
                            ) : message.attachmentType === 'video' ? (
                              <video
                                src={message.attachmentUrl}
                                controls
                                className="max-w-full rounded"
                              />
                            ) : (
                              <a
                                href={message.attachmentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-blue-500 hover:underline"
                              >
                                <FileText className="h-4 w-4" />
                                Download attachment
                              </a>
                            )}
                          </div>
                        )}
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
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Input area */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type a message..."
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                />
                <div className="flex gap-1">
                  <input
                    type="file"
                    id="image-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  />
                  <input
                    type="file"
                    id="video-upload"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  />
                  <input
                    type="file"
                    id="document-upload"
                    accept=".pdf,.doc,.docx,.txt"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    type="button"
                    onClick={() => document.getElementById('image-upload')?.click()}
                  >
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    type="button"
                    onClick={() => document.getElementById('video-upload')?.click()}
                  >
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    type="button"
                    onClick={() => document.getElementById('document-upload')?.click()}
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={handleSendMessage}
                    disabled={(!messageInput.trim() && !fileUploading) || sendMessageMutation.isPending}
                  >
                    {sendMessageMutation.isPending || fileUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
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