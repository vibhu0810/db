import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';
import { queryClient } from '@/lib/queryClient';

interface WebSocketMessage {
  type: string;
  data: any;
}

export function useWebSocket() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const connect = useCallback(() => {
    if (!user) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      
      // Authenticate the WebSocket connection
      if (user) {
        ws.send(JSON.stringify({
          type: 'auth',
          userId: user.id,
          username: user.username
        }));
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Attempt to reconnect after 5 seconds
      setTimeout(connect, 5000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        
        if (data.type === 'new_message') {
          toast({
            title: 'New Message',
            description: `New message from ${data.data.senderName}`,
          });
        }
        
        // Handle new comments
        if (data.type === 'new_comment') {
          const { orderId, comment } = data.data;
          
          // Invalidate the comments query to refresh the data
          queryClient.invalidateQueries({ queryKey: ['/api/orders', orderId, 'comments'] });
          
          // Optionally show a toast notification
          toast({
            title: 'New Comment',
            description: `New comment from ${comment.user.username}`,
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
  }, [user, toast]);

  useEffect(() => {
    const cleanup = connect();
    return () => cleanup?.();
  }, [connect]);

  return { socket };
}
