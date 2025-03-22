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

  const { data: notifications = [], isError } = useQuery({
    queryKey: ['/api/notifications'],
    queryFn: () => apiRequest("GET", "/api/notifications").then(res => res.json()),
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/notifications/${id}/read`);
      if (!res.ok) throw new Error("Failed to mark notification as read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unreadNotifications = notifications.filter((n: any) => !n.read);
      await Promise.all(
        unreadNotifications.map((notification: any) =>
          apiRequest("PATCH", `/api/notifications/${notification.id}/read`)
        )
      );
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

      // Check if this is an order-related notification
      const orderIdFromMessage = extractOrderIdFromMessage(notification.message);
      
      if (orderIdFromMessage) {
        console.log('Extracted order ID from message:', orderIdFromMessage);
        
        // Close dropdown and navigate to the specific order page
        setIsOpen(false);
        setLocation(`/orders/${orderIdFromMessage}`);
      } else {
        // Default behavior for non-order notifications
        setIsOpen(false);
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

  const unreadCount = notifications.filter((n: any) => !n.read).length;

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
        {notifications.length === 0 ? (
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
                <p className="text-sm">{notification.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                </p>
              </DropdownMenuItem>
            ))}
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}