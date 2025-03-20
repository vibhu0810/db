import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';
import { queryClient } from '@/lib/queryClient';

interface WebSocketMessage {
  type: string;
  message?: any;
  orderId?: number;
  comment?: any;
}

export function useWebSocket() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnecting, setIsConnecting] = useState(false); // Track connection status
  const { user } = useAuth();
  const { toast } = useToast();

  const connect = useCallback(() => {
    if (!user || isConnecting) return;

    try {
      setIsConnecting(true);
      
      // Use explicitly specified path to avoid conflicts with Vite's WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/ws`;
      
      console.log('Attempting to connect WebSocket to:', wsUrl);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnecting(false);
        
        // Send authentication message with userId once connected
        if (user?.id) {
          ws.send(JSON.stringify({
            type: 'auth',
            userId: user.id
          }));
          console.log('Sent WebSocket authentication with userId:', user.id);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnecting(false);
        // Attempt to reconnect after 5 seconds
        setTimeout(connect, 5000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnecting(false);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WebSocketMessage;
          
          if (data.type === 'new_message' && data.message) {
            toast({
              title: 'New Message',
              description: `New message from ${data.message.senderName}`,
            });
          } else if (data.type === 'new_comment' && data.orderId !== undefined) {
            // Trigger a query invalidation for the comments
            queryClient.invalidateQueries({ 
              queryKey: ['/api/orders', String(data.orderId), 'comments'] 
            });
            
            // Also invalidate orders list to update unread comment counts
            queryClient.invalidateQueries({ 
              queryKey: ['/api/orders'] 
            });
            
            toast({
              title: 'New Comment',
              description: `New comment on order #${data.orderId}`,
            });
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      setSocket(ws);

      return () => {
        ws.close();
      };
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
      setIsConnecting(false);
      // Attempt to reconnect after 5 seconds
      setTimeout(connect, 5000);
      return undefined;
    }
  }, [user, toast]);

  useEffect(() => {
    const cleanup = connect();
    return () => cleanup?.();
  }, [connect]);

  return socket;
}
