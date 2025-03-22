import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';

interface WebSocketMessage {
  type: string;
  payload?: any;
  message?: any;
}

export function useWebSocket(options?: {
  onOrderUpdate?: (orderId: number, status: string) => void;
  onNewComment?: (orderId: number, comment: any) => void;
}) {
  console.log("useWebSocket hook called with options:", options ? 
    `onOrderUpdate: ${!!options.onOrderUpdate}, onNewComment: ${!!options.onNewComment}` : 
    "no options"
  );
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const connect = useCallback(() => {
    if (!user) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws`;
    
    console.log('Connecting to WebSocket at:', wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      // Send authentication message
      if (user) {
        ws.send(JSON.stringify({
          type: 'auth',
          payload: {
            userId: user.id,
            isAdmin: user.is_admin
          }
        }));
        console.log('Sent WebSocket authentication for user:', user.id);
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
        console.log('Received WebSocket message:', data);
        
        if (data.type === 'new_message') {
          toast({
            title: 'New Message',
            description: `New message from ${data.message.senderName}`,
          });
        } 
        else if (data.type === 'order_status_update') {
          toast({
            title: 'Order Status Updated',
            description: `Order #${data.payload?.orderId} status updated to ${data.payload?.status}`,
          });
          
          // Call the onOrderUpdate callback if provided
          if (options?.onOrderUpdate && data.payload) {
            options.onOrderUpdate(data.payload.orderId, data.payload.status);
          }
        }
        else if (data.type === 'new_comment') {
          console.log('🔴 Received new comment via WebSocket:', JSON.stringify(data.payload, null, 2));
          
          // Extract the correct values
          const orderId = data.payload?.orderId;
          // The comment might be nested inside data.payload.comment or directly in data.payload
          const comment = data.payload?.comment || data.payload;
          
          console.log(`🔴 Extracted orderId=${orderId}, comment:`, comment);
          
          // Call the onNewComment callback if provided
          if (options?.onNewComment && orderId) {
            console.log('🔴 Calling onNewComment callback with:', {
              orderId,
              comment
            });
            
            try {
              // Create a direct force refresh by just sending minimal but consistent data
              // This ensures we don't have issues with comment structure
              const minimalComment = {
                id: comment.id || new Date().getTime(),
                message: comment.message || 'New comment',
                createdAt: comment.createdAt || new Date().toISOString(),
                userId: comment.userId || comment.user?.id,
                user: {
                  username: comment.user?.username || 'User',
                  is_admin: comment.user?.is_admin
                }
              };
              
              options.onNewComment(orderId, minimalComment);
              console.log('🔴 onNewComment callback executed successfully with minimal comment data');
            } catch (err) {
              console.error('🔴 Error in onNewComment callback:', err);
            }
            
            toast({
              title: 'New Comment',
              description: `New comment on Order #${orderId}`,
            });
          } else {
            console.log('🔴 No onNewComment callback or missing orderId:', {
              hasOptions: !!options,
              hasCallback: !!(options && options.onNewComment),
              hasOrderId: !!orderId
            });
          }
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [user, toast, options]);

  useEffect(() => {
    const cleanup = connect();
    return () => cleanup?.();
  }, [connect]);

  return socket;
}
