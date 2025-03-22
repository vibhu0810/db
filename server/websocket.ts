import { Server } from 'http';
import WebSocket from 'ws';
import { WebSocketServer } from 'ws';
import { User } from '@shared/schema';

// Type definitions
type WebSocketMessage = {
  type: string;
  payload: any;
};

type ClientConnection = {
  userId: number;
  isAdmin: boolean;
  socket: WebSocket;
};

// WebSocket server state
const clients = new Map<WebSocket, ClientConnection>();

export function setupWebsocketServer(server: Server) {
  // Create WebSocket server with a specific path to avoid conflicts with Vite
  const wss = new WebSocketServer({ 
    server, 
    path: '/api/ws'  // Use a specific path for our WebSocket server
  });
  
  // Connection handler
  wss.on('connection', (ws: WebSocket) => {
    console.log('API WebSocket connection established');

    // Setup ping interval for keepalive
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 30000);

    // Message handler
    ws.on('message', (message: WebSocket.Data) => {
      try {
        const data = JSON.parse(message.toString()) as WebSocketMessage;
        
        // Handle authentication message to associate socket with user
        if (data.type === 'auth') {
          const { userId, isAdmin } = data.payload;
          if (userId) {
            clients.set(ws, { userId, isAdmin, socket: ws });
            console.log(`Authenticated WebSocket for user ${userId}`);
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    // Close handler
    ws.on('close', () => {
      console.log('WebSocket connection closed');
      clearInterval(pingInterval);
      clients.delete(ws);
    });

    // Error handler
    ws.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
      clearInterval(pingInterval);
      clients.delete(ws);
    });
  });

  console.log('WebSocket server initialized');
  return wss;
}

/**
 * Send a notification to a specific user
 */
export function notifyUser(userId: number, data: WebSocketMessage) {
  let notified = false;

  clients.forEach((client) => {
    if (client.userId === userId && client.socket.readyState === WebSocket.OPEN) {
      client.socket.send(JSON.stringify(data));
      notified = true;
    }
  });

  return notified;
}

/**
 * Send notification about order status update to order owner and admins
 */
export function notifyOrderStatusUpdate(orderId: number, status: string, userId: number) {
  // Notify order owner
  notifyUser(userId, {
    type: 'order_status_update',
    payload: {
      orderId,
      status
    }
  });

  // Notify all admins
  notifyAllAdmins({
    type: 'order_status_update',
    payload: {
      orderId,
      status
    }
  });
}

/**
 * Send notification about new comment to order owner and admins
 */
export function notifyNewComment(orderId: number, comment: any, orderOwnerId: number) {
  console.log(`Sending WebSocket notification for new comment on order ${orderId}, orderOwnerId: ${orderOwnerId}`);
  console.log(`Comment data:`, JSON.stringify(comment, null, 2));
  
  // Get the comment author's user ID
  const commentAuthorId = comment.userId || comment.user?.id;
  
  console.log(`Comment author ID: ${commentAuthorId}, is admin: ${comment.user?.is_admin}`);
  
  // Always notify the order owner (unless they're the one who made the comment)
  if (orderOwnerId !== commentAuthorId) {
    console.log(`Notifying order owner (userId: ${orderOwnerId})`);
    notifyUser(orderOwnerId, {
      type: 'new_comment',
      payload: {
        orderId,
        comment
      }
    });
  } else {
    console.log(`Order owner is the comment author, not sending duplicate notification`);
  }

  // Notify all admins if the comment is from a regular user
  if (!comment.user?.is_admin) {
    console.log(`Comment is from regular user, notifying all admins`);
    notifyAllAdmins({
      type: 'new_comment',
      payload: {
        orderId,
        comment
      }
    });
  } else {
    console.log(`Comment is from admin, skipping admin notification`);
  }
  
  // Always notify the comment author to see their own comment appear immediately
  if (commentAuthorId) {
    console.log(`Notifying comment author (userId: ${commentAuthorId})`);
    notifyUser(commentAuthorId, {
      type: 'new_comment',
      payload: {
        orderId,
        comment
      }
    });
  }
  
  // Log the notification completion
  console.log(`Comment notification process completed for order ${orderId}`);
}

/**
 * Send notification to all admin users
 */
export function notifyAllAdmins(data: WebSocketMessage) {
  let notifiedCount = 0;

  clients.forEach((client) => {
    if (client.isAdmin && client.socket.readyState === WebSocket.OPEN) {
      client.socket.send(JSON.stringify(data));
      notifiedCount++;
    }
  });

  return notifiedCount;
}