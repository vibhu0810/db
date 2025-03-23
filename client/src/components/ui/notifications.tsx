import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Bell, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

export function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: notificationsData = { notifications: [] }, isError } = useQuery({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/notifications");
        if (res.status === 401) {
          // Return empty array for unauthorized
          console.log("User not authenticated, returning empty notifications array");
          return { notifications: [] };
        }
        
        const data = await res.json();
        console.log("Notifications API response:", data);
        
        // Ensure we return an object with a notifications array
        if (Array.isArray(data)) {
          console.log("API returned an array, converting to object format");
          return { notifications: data };
        } else if (data && typeof data === 'object') {
          if (Array.isArray(data.notifications)) {
            console.log("API returned correct object format");
            return data;
          } else {
            console.log("API returned object without notifications array");
            return { notifications: [] };
          }
        } else {
          console.log("API returned unexpected format");
          return { notifications: [] };
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
        return { notifications: [] };
      }
    },
    refetchInterval: 5000, // Refetch every 5 seconds
  });
  
  // Extract the notifications array from the data
  const notifications = notificationsData?.notifications || [];

  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      try {
        const res = await apiRequest("PATCH", `/api/notifications/${id}/read`);
        if (!res.ok) throw new Error("Failed to mark notification as read");
        return res.json();
      } catch (error) {
        console.error("Error marking notification as read:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
    onError: (error) => {
      console.error("Mutation error marking notification as read:", error);
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      // Use the bulk mark as read endpoint
      await apiRequest("POST", "/api/notifications/mark-all-read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({
        title: "Notifications marked as read",
        description: "All notifications have been marked as read.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to mark notifications as read",
        variant: "destructive",
      });
    },
  });

  const handleNotificationClick = async (notification: any) => {
    try {
      console.log('Handling notification click:', notification);

      // Mark as read first
      if (!notification.read) {
        await markAsReadMutation.mutate(notification.id);
      }

      setIsOpen(false);
      
      // Handle different notification types
      switch(notification.type) {
        case "message":
          // Chat notification
          console.log('Detected chat notification, redirecting to chat');
          setLocation('/chat');
          break;
        
        case "support_ticket":
          // Support ticket notification - redirect to chat
          console.log('Detected support ticket notification, redirecting to chat');
          
          // We need to extract the ticket ID from the notification - first check if it's a property
          if (notification.ticketId) {
            console.log('Using ticketId from notification:', notification.ticketId);
            setLocation(`/chat?ticket=${notification.ticketId}`);
          } else {
            // Try to parse ticket ID from the message
            const ticketIdMatch = notification.message.match(/ticket\s+#?(\d+)/i);
            if (ticketIdMatch && ticketIdMatch[1]) {
              const parsedTicketId = parseInt(ticketIdMatch[1], 10);
              console.log('Extracted ticket ID from message:', parsedTicketId);
              setLocation(`/chat?ticket=${parsedTicketId}`);
            } else {
              // Extract the ticket info from notification data somehow - for now, just go to chat
              console.log('No ticketId found, redirecting to main chat page');
              setLocation('/chat');
            }
          }
          break;
          
        case "order":
        case "status":
        case "comment":
          // Order-related notification
          if (notification.orderId) {
            // If we have an orderId directly in the notification, use it
            console.log('Using orderId from notification:', notification.orderId);
            setLocation(`/orders/${notification.orderId}`);
          } else {
            // Fallback to extract from message if needed
            const orderIdFromMessage = extractOrderIdFromMessage(notification.message);
            if (orderIdFromMessage) {
              console.log('Extracted order ID from message:', orderIdFromMessage);
              setLocation(`/orders/${orderIdFromMessage}`);
            } else {
              // Can't determine specific order, go to orders list
              setLocation('/orders');
            }
          }
          break;
          
        default:
          // Default behavior for other notification types
          console.log('Unknown notification type:', notification.type);
          setLocation('/orders');
      }
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };
  
  // Helper function to extract order ID from notification message
  const extractOrderIdFromMessage = (message: string): number | null => {
    // Look for patterns like "order #123" or "#123" in the message
    const regex = /(?:order\s+)?#(\d+)/i;
    const match = message.match(regex);
    
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    
    return null;
  };

  // Safely get unread count (handle case where notifications is not an array)
  const unreadCount = Array.isArray(notifications) ? 
    notifications.filter((n: any) => !n.read).length : 0;

  if (isError) {
    return null;
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className={cn(
            "relative",
            unreadCount > 0 && "animate-[pulse_2s_ease-in-out_infinite]"
          )}
        >
          <Bell className={cn(
            "h-4 w-4",
            unreadCount > 0 && "animate-[wiggle_1s_ease-in-out_infinite]"
          )} />
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center animate-[bounce_1s_ease-in-out_infinite]">
              {unreadCount}
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-2">
          <span className="text-sm font-medium">Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1 text-xs"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
            >
              <Check className="h-3 w-3" />
              Mark all as read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        {!Array.isArray(notifications) || notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No notifications
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            {notifications.map((notification: any) => (
              <DropdownMenuItem
                key={notification.id}
                className={cn(
                  "flex flex-col items-start p-4 cursor-pointer",
                  !notification.read && "bg-muted"
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                <p className="text-sm">{notification.message || "New notification"}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {notification.createdAt 
                    ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })
                    : "Just now"}
                </p>
              </DropdownMenuItem>
            ))}
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}