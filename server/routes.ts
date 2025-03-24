import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { generateSEOJoke, generateWelcomeMessage } from "./openai";
import { 
  insertMessageSchema, 
  insertDomainSchema, 
  updateProfileSchema,
  insertInvoiceSchema,
  insertTicketSchema,
  updateTicketSchema
} from "@shared/schema";
import {
  sendOrderNotificationEmail,
  sendCommentNotificationEmail,
  sendStatusUpdateEmail,
  sendChatNotificationEmail,
  sendTicketResponseEmail
} from "./email";
import { uploadthingHandler } from "./uploadthingHandler";

const typingUsers = new Map<number, { isTyping: boolean; timestamp: number }>();
const onlineUsers = new Map<number, { lastActive: number }>();

const OFFLINE_THRESHOLD = 1000 * 60; // 1 minute of inactivity = offline

function updateUserActivity(userId: number) {
  onlineUsers.set(userId, { lastActive: Date.now() });
}

// Clean up old activity records
setInterval(() => {
  const now = Date.now();
  // Convert Map entries to array to avoid TypeScript downlevelIteration issues
  Array.from(onlineUsers.entries()).forEach(([userId, data]) => {
    if (now - data.lastActive > OFFLINE_THRESHOLD) {
      onlineUsers.delete(userId);
    }
  });
}, 60000); // Clean up every minute

const GUEST_POST_STATUSES = [
  "In Progress",
  "Approved",
  "Sent to Editor",
  "Completed",
  "Rejected",
  "Cancelled"
] as const;

const NICHE_EDIT_STATUSES = [
  "In Progress",
  "Sent to Editor",
  "Rejected",
  "Cancelled",
  "Completed"
] as const;

type GuestPostStatus = typeof GUEST_POST_STATUSES[number];
type NicheEditStatus = typeof NICHE_EDIT_STATUSES[number];
type OrderStatus = GuestPostStatus | NicheEditStatus;

export async function registerRoutes(app: Express): Promise<Server> {
  // Add JSON parsing middleware before routes
  app.use(express.json());

  setupAuth(app);
  
  // Debug authentication endpoint
  app.get("/api/debug-auth", (req, res) => {
    console.log("Debug auth endpoint called, session:", req.session);
    console.log("User in request:", req.user);
    res.json({
      authenticated: !!req.user,
      user: req.user || null,
      sessionID: req.sessionID,
      session: req.session
    });
  });

  // Add check online status endpoint
  app.get("/api/users/online-status", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      const userIds = req.query.userIds?.toString().split(',').map(Number) || [];
      const now = Date.now();

      const onlineStatus = Object.fromEntries(
        userIds.map(id => [
          id,
          onlineUsers.has(id) &&
          (now - onlineUsers.get(id)!.lastActive) < OFFLINE_THRESHOLD
        ])
      );

      res.json(onlineStatus);
    } catch (error) {
      console.error("Error fetching online status:", error);
      res.status(500).json({ error: "Failed to fetch online status" });
    }
  });

  // Update user's last active timestamp on any authenticated request
  app.use((req, res, next) => {
    if (req.user?.id) {
      updateUserActivity(req.user.id);
    }
    next();
  });

  // Add users route for admins
  app.get("/api/users", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      let users = await storage.getUsers();

      console.log("All users before filtering:",
        users.map(u => ({ id: u.id, username: u.username, is_admin: u.is_admin })));

      // Filter users based on role
      if (req.user.is_admin) {
        // Admins see all users (both customers and other admins)
        // No filtering needed for admins
      } else {
        // Regular users only see admin users
        users = users.filter(u => u.is_admin);
      }

      console.log("Filtered users for", req.user.is_admin ? "admin" : "user", ":",
        users.map(u => ({ id: u.id, username: u.username, is_admin: u.is_admin })));

      const filteredUsers = users.map(user => ({
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        companyName: user.companyName,
        country: user.country,
        is_admin: user.is_admin,
        profilePicture: user.profilePicture
      }));

      res.json(filteredUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });
  
  // Add single user route
  app.get("/api/users/:id", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Check permissions: Admins can view any user, regular users can only view themselves and admins
      if (!req.user.is_admin && req.user.id !== userId && !user.is_admin) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      // Return filtered user info
      const filteredUser = {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        companyName: user.companyName,
        country: user.country,
        is_admin: user.is_admin,
        profilePicture: user.profilePicture
      };
      
      res.json(filteredUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Add user statistics endpoint for admin
  app.get("/api/users/stats", async (req, res) => {
    try {
      if (!req.user?.is_admin) {
        return res.status(403).json({ error: "Unauthorized: Admin access required" });
      }

      const users = await storage.getUsers();
      const orders = await storage.getAllOrders();

      const usersWithStats = users.map(user => {
        const userOrders = orders.filter(order => order.userId === user.id);
        return {
          id: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          companyName: user.companyName,
          country: user.country,
          orders: {
            total: userOrders.length,
            completed: userOrders.filter(o => o.status === "Completed").length,
            pending: userOrders.filter(o => ["Sent to Editor", "Revision"].includes(o.status)).length,
            totalSpent: userOrders.reduce((sum, order) => sum + parseFloat(order.price || "0"), 0)
          }
        };
      });

      res.json(usersWithStats);
    } catch (error) {
      console.error("Error fetching user statistics:", error);
      res.status(500).json({ error: "Failed to fetch user statistics" });
    }
  });

  // Add messages routes
  app.get("/api/messages/:userId", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      const otherUserId = parseInt(req.params.userId);

      // Verify the other user exists
      const otherUser = await storage.getUser(otherUserId);
      if (!otherUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Validate that regular users can only view messages with admins
      if (!req.user.is_admin && !otherUser.is_admin) {
        return res.status(403).json({ error: "Unauthorized: Can only message support staff" });
      }

      console.log('Fetching messages between users:', req.user.id, otherUserId);
      const messages = await storage.getMessages(req.user.id, otherUserId);
      console.log('Retrieved messages:', messages);

      // Try to mark messages as read, but don't fail if it errors
      try {
        const unreadMessages = messages.filter(m =>
          m.receiverId === req.user?.id && !m.read
        );

        if (unreadMessages.length > 0) {
          await Promise.all(
            unreadMessages.map(msg =>
              storage.updateMessage(msg.id, { ...msg, read: true })
            )
          );
        }
      } catch (error) {
        console.error('Error marking messages as read:', error);
        // Continue without failing the request
      }

      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      const receiverId = parseInt(req.body.receiverId);

      // Verify the receiver exists
      const receiver = await storage.getUser(receiverId);
      if (!receiver) {
        return res.status(404).json({ error: "Recipient not found" });
      }

      // Validate that regular users can only message admins
      if (!req.user.is_admin && !receiver.is_admin) {
        return res.status(403).json({ error: "Unauthorized: Can only message support staff" });
      }

      const messageData = insertMessageSchema.parse({
        content: req.body.content,
        senderId: req.user.id,
        receiverId: receiverId,
        attachmentUrl: req.body.attachmentUrl || null,
        attachmentType: req.body.attachmentType || null,
      });

      const message = await storage.createMessage(messageData);

      // Create a notification for the recipient
      await storage.createNotification({
        userId: receiverId,
        message: `New message from ${req.user.username}`,
        type: "message",
        createdAt: new Date(),
        read: false,
      });

      // Send email notification about the new message
      try {
        if (receiver.email) {
          await sendChatNotificationEmail(
            message,
            {
              username: req.user.username,
              companyName: req.user.companyName
            },
            {
              email: receiver.email,
              username: receiver.username,
              id: receiver.id
            }
          );
        }
      } catch (emailError) {
        console.error("Error sending chat notification email:", emailError);
        // Continue without failing the message creation
      }

      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ error: "Failed to create message" });
    }
  });

  // Add notifications routes
  app.get("/api/notifications", async (req, res) => {
    try {
      if (!req.user) {
        console.warn("Unauthorized access to /api/notifications");
        return res.status(401).json({ notifications: [], error: "Unauthorized" });
      }
      
      const userNotifications = await storage.getNotifications(req.user.id);
      
      // Return a consistent object format with a notifications array
      res.json({ notifications: userNotifications });
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ notifications: [], error: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ notification: null, error: "Unauthorized" });
      const notification = await storage.markNotificationAsRead(parseInt(req.params.id));
      
      // Return consistent format
      res.json({ notification });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ notification: null, error: "Failed to mark notification as read" });
    }
  });

  app.post("/api/notifications/mark-all-read", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ notifications: [], error: "Unauthorized" });
      await storage.markAllNotificationsAsRead(req.user.id);
      
      // Return empty notifications array after marking all as read
      res.json({ notifications: [] });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ notifications: [], error: "Failed to mark all notifications as read" });
    }
  });

  // Support Tickets routes
  app.get("/api/support-tickets/order/:id", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      
      const orderId = parseInt(req.params.id);
      if (isNaN(orderId)) {
        return res.status(400).json({ error: "Invalid order ID" });
      }
      
      const ticket = await storage.getSupportTicketByOrder(orderId);
      
      // Only allow access if user is owner of the order or an admin
      if (ticket && ticket.userId !== req.user.id && !req.user.is_admin) {
        return res.status(403).json({ error: "Unauthorized access to support ticket" });
      }
      
      res.json({ ticket });
    } catch (error) {
      console.error("Error fetching support ticket by order:", error);
      res.status(500).json({ error: "Failed to fetch support ticket" });
    }
  });
  
  // Admin endpoint to close all active support tickets
  app.post("/api/support-tickets/close-all", async (req, res) => {
    try {
      if (!req.user || !req.user.is_admin) {
        return res.status(403).json({ error: "Unauthorized - Admin only operation" });
      }

      // Get all open tickets
      const tickets = await storage.getAllSupportTickets();
      const openTickets = tickets.filter(ticket => ticket.status.toLowerCase() === 'open');
      
      // Close each open ticket
      const closePromises = openTickets.map(ticket => 
        storage.closeSupportTicket(ticket.id)
      );
      
      await Promise.all(closePromises);
      
      res.json({ 
        success: true, 
        message: `Closed ${openTickets.length} tickets successfully` 
      });
    } catch (error) {
      console.error("Error closing all tickets:", error);
      res.status(500).json({ error: "Failed to close all tickets" });
    }
  });

  app.get("/api/support-tickets", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      
      // If admin, return all tickets, otherwise only return user's tickets
      let tickets;
      if (req.user.is_admin) {
        tickets = await storage.getAllSupportTickets();
      } else {
        tickets = await storage.getSupportTickets(req.user.id);
      }
      
      res.json({ tickets });
    } catch (error) {
      console.error("Error fetching support tickets:", error);
      res.status(500).json({ tickets: [], error: "Failed to fetch support tickets" });
    }
  });
  
  // Get comments for a specific support ticket
  app.get("/api/support-tickets/:id/comments", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      
      const ticketId = parseInt(req.params.id);
      if (isNaN(ticketId)) {
        return res.status(400).json({ error: "Invalid ticket ID" });
      }
      
      // First check if user has access to this ticket
      const ticket = await storage.getSupportTicket(ticketId);
      if (!ticket) {
        return res.status(404).json({ error: "Support ticket not found" });
      }
      
      // Only allow access to ticket comments if user is the owner or an admin
      if (ticket.userId !== req.user.id && !req.user.is_admin) {
        return res.status(403).json({ error: "Unauthorized access to support ticket comments" });
      }
      
      // Get comments for this ticket
      // Make sure we have a valid order ID, default to 0 if missing
      const orderId = ticket.orderId || 0;
      const comments = await storage.getOrderComments(orderId, ticketId);
      const users = await storage.getUsers();
      
      // Map user details to comments
      const commentsWithUserDetails = comments.map(comment => {
        // For system user with ID -1, don't try to look up the user
        if (comment.userId === -1) {
          return {
            ...comment,
            user: { username: "System", is_admin: true }
          };
        }
        
        const user = users.find(u => u.id === comment.userId);
        return {
          ...comment,
          user: user ? {
            username: user.username,
            companyName: user.companyName,
            is_admin: user.is_admin
          } : null
        };
      });
      
      console.log("Retrieved ticket comments:", commentsWithUserDetails.length);
      res.json(commentsWithUserDetails);
    } catch (error) {
      console.error("Error fetching ticket comments:", error);
      res.status(500).json({ error: "Failed to fetch ticket comments" });
    }
  });
  
  // Add a comment to a support ticket
  app.post("/api/support-tickets/:id/comments", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      
      const ticketId = parseInt(req.params.id);
      if (isNaN(ticketId)) {
        return res.status(400).json({ error: "Invalid ticket ID" });
      }
      
      // First check if user has access to this ticket
      const ticket = await storage.getSupportTicket(ticketId);
      if (!ticket) {
        return res.status(404).json({ error: "Support ticket not found" });
      }
      
      // Only allow comments if user is the owner or an admin
      if (ticket.userId !== req.user.id && !req.user.is_admin) {
        return res.status(403).json({ error: "Unauthorized to comment on this ticket" });
      }
      
      // Create the comment
      const orderId = ticket.orderId || 0;
      const comment = await storage.createOrderComment({
        orderId: orderId,
        userId: req.user.id,
        message: req.body.content,
        ticketId: ticket.id,
        isFromAdmin: req.body.isFromAdmin || req.user.is_admin,
        attachmentUrl: req.body.attachmentUrl || null,
        attachmentType: req.body.attachmentType || null
      });

      // If the comment is from an admin, create a notification for the ticket owner
      if (req.user.is_admin && ticket.userId !== req.user.id) {
        // Ensure ticket.userId is not null before creating notification
        if (ticket.userId) {
          // Create notification for the user
          await storage.createNotification({
            userId: ticket.userId,
            type: "support_ticket",
            message: `You have got a response on your support ticket for Order #${ticket.orderId}`,
            createdAt: new Date(),
            read: false,
            ticketId: ticket.id as number
          });
          
          // Also send an email notification
          try {
            // Get the user details
            const ticketOwner = await storage.getUser(ticket.userId);
            if (ticketOwner && ticketOwner.email) {
              await sendTicketResponseEmail(
                {
                  id: ticket.id,
                  title: ticket.title,
                  orderId: ticket.orderId
                },
                {
                  email: ticketOwner.email,
                  username: ticketOwner.username,
                  companyName: ticketOwner.companyName
                },
                req.user.username
              );
            }
          } catch (emailError) {
            console.error("Error sending ticket response email:", emailError);
            // Continue without failing the comment creation
          }
        }
      }
      
      // Return the created comment with user details
      res.status(201).json({
        ...comment,
        user: {
          username: req.user.username,
          companyName: req.user.companyName,
          is_admin: req.user.is_admin
        }
      });
    } catch (error) {
      console.error("Error creating ticket comment:", error);
      res.status(500).json({ error: "Failed to create ticket comment" });
    }
  });

  app.get("/api/support-tickets/:id", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      
      const ticketId = parseInt(req.params.id);
      const ticket = await storage.getSupportTicket(ticketId);
      
      if (!ticket) {
        return res.status(404).json({ error: "Support ticket not found" });
      }
      
      // Only allow access to ticket if user is the owner or an admin
      if (ticket.userId !== req.user.id && !req.user.is_admin) {
        return res.status(403).json({ error: "Unauthorized access to support ticket" });
      }
      
      res.json({ ticket });
    } catch (error) {
      console.error("Error fetching support ticket:", error);
      res.status(500).json({ ticket: null, error: "Failed to fetch support ticket" });
    }
  });

  app.get("/api/orders/:id/support-ticket", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      
      const orderId = parseInt(req.params.id);
      const ticket = await storage.getSupportTicketByOrder(orderId);
      
      res.json({ ticket: ticket || null });
    } catch (error) {
      console.error("Error fetching support ticket for order:", error);
      res.status(500).json({ ticket: null, error: "Failed to fetch support ticket" });
    }
  });

  app.post("/api/support-tickets", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      
      const ticketData = insertTicketSchema.parse({
        ...req.body,
        userId: req.user.id
      });
      
      // The createSupportTicket function in storage already creates an automated welcome message,
      // so we don't need to create a duplicate one here.
      const ticket = await storage.createSupportTicket(ticketData);
      
      res.status(201).json({ ticket });
    } catch (error) {
      console.error("Error creating support ticket:", error);
      res.status(500).json({ ticket: null, error: "Failed to create support ticket" });
    }
  });

  app.patch("/api/support-tickets/:id", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      
      const ticketId = parseInt(req.params.id);
      const ticket = await storage.getSupportTicket(ticketId);
      
      if (!ticket) {
        return res.status(404).json({ error: "Support ticket not found" });
      }
      
      // Only allow updates if user is the owner or an admin
      if (ticket.userId !== req.user.id && !req.user.is_admin) {
        return res.status(403).json({ error: "Unauthorized to update this support ticket" });
      }
      
      const updateData = updateTicketSchema.parse(req.body);
      const updatedTicket = await storage.updateSupportTicket(ticketId, updateData);
      
      res.json({ ticket: updatedTicket });
    } catch (error) {
      console.error("Error updating support ticket:", error);
      res.status(500).json({ ticket: null, error: "Failed to update support ticket" });
    }
  });

  app.post("/api/support-tickets/:id/close", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      
      const ticketId = parseInt(req.params.id);
      const ticket = await storage.getSupportTicket(ticketId);
      
      if (!ticket) {
        return res.status(404).json({ error: "Support ticket not found" });
      }
      
      // Both user and admin can close the ticket
      if (ticket.userId !== req.user.id && !req.user.is_admin) {
        return res.status(403).json({ error: "Unauthorized to close this support ticket" });
      }
      
      const { rating, feedback } = req.body;
      const closedTicket = await storage.closeSupportTicket(ticketId, rating, feedback);
      
      res.json({ ticket: closedTicket });
    } catch (error) {
      console.error("Error closing support ticket:", error);
      res.status(500).json({ ticket: null, error: "Failed to close support ticket" });
    }
  });

  // Add orders routes
  app.get("/api/orders", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      console.log("Fetching orders for user:", req.user.id);

      const orders = await storage.getOrders(req.user.id);
      const allDomains = await storage.getDomains();

      // Add unread comments count for each order and domain information
      // At this point, we know req.user exists because of the check above
      const userId = req.user!.id;
      const ordersWithUnreadCounts = await Promise.all(orders.map(async (order) => {
        const unreadComments = await storage.getUnreadCommentCount(order.id, userId);
        
        // For guest posts, identify if there's a matching domain based on price
        const isGuestPost = order.sourceUrl === "not_applicable" && order.title;
        
        // Find potential domain matches
        let websiteInfo = null;
        if (isGuestPost) {
          // Try to find a matching domain with the same price
          const matchingDomain = allDomains.find(d => 
            d.guestPostPrice?.toString() === order.price?.toString() &&
            (d.type === 'guest_post' || d.type === 'both')
          );
          
          if (matchingDomain) {
            websiteInfo = {
              name: matchingDomain.websiteName,
              url: matchingDomain.websiteUrl
            };
          }
        }
        
        return {
          ...order,
          unreadComments,
          website: websiteInfo
        };
      }));

      console.log("Retrieved orders with unread counts:", ordersWithUnreadCounts);
      res.json(ordersWithUnreadCounts);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  // Admin route to get all orders
  app.get("/api/orders/all", async (req, res) => {
    try {
      if (!req.user?.is_admin) {
        return res.status(403).json({ error: "Unauthorized: Admin access required" });
      }

      const orders = await storage.getAllOrders();
      const users = await storage.getUsers();
      const allDomains = await storage.getDomains();

      // Join orders with user data and add unread counts
      const ordersWithUserDetails = await Promise.all(orders.map(async (order) => {
        const user = users.find(u => u.id === order.userId);
        const unreadComments = await storage.getUnreadCommentCount(order.id, req.user!.id);
        
        // For guest posts, identify if there's a matching domain based on price
        const isGuestPost = order.sourceUrl === "not_applicable" && order.title;
        
        // Find potential domain matches
        let websiteInfo = null;
        if (isGuestPost) {
          // Try to find a matching domain with the same price
          const matchingDomain = allDomains.find(d => 
            d.guestPostPrice?.toString() === order.price?.toString() &&
            (d.type === 'guest_post' || d.type === 'both')
          );
          
          if (matchingDomain) {
            websiteInfo = {
              name: matchingDomain.websiteName,
              url: matchingDomain.websiteUrl
            };
          }
        }
        
        return {
          ...order,
          unreadComments,
          website: websiteInfo,
          user: user ? {
            username: user.username,
            companyName: user.companyName,
            email: user.email
          } : null
        };
      }));

      res.json(ordersWithUserDetails);
    } catch (error) {
      console.error("Error fetching all orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  // Get unread comments counts for all user's orders
  app.get("/api/orders/unread-comments", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    try {
      // Get all orders for this user
      const orders = req.user.is_admin 
        ? await storage.getAllOrders()
        : await storage.getOrders(req.user.id);
      
      // Create a map of order ID to unread comment count
      const unreadCounts: Record<number, number> = {};
      
      // Fetch unread comment counts for each order
      for (const order of orders) {
        const count = await storage.getUnreadCommentCount(order.id, req.user.id);
        if (count > 0) {
          unreadCounts[order.id] = count;
        }
      }
      
      console.log("Retrieved unread comment counts:", unreadCounts);
      res.json(unreadCounts);
    } catch (error) {
      console.error("Error fetching unread comments:", error);
      res.status(500).json({ error: "Failed to get unread comment counts" });
    }
  });

  // Get a single order by ID
  app.get("/api/orders/:id", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      // Special handling for "new" route used for creating orders
      if (req.params.id === "new") {
        // Return an empty order object for the new order form
        return res.json({
          id: null,
          userId: req.user.id,
          sourceUrl: "",
          targetUrl: "",
          anchorText: "",
          textEdit: "",
          notes: "",
          price: "0",
          status: "Not Started",
          dateOrdered: new Date().toISOString(),
          website: null
        });
      }

      const orderId = parseInt(req.params.id);
      console.log("Fetching order by ID:", orderId);
      
      const order = await storage.getOrder(orderId);
      
      if (!order) {
        console.log("Order not found:", orderId);
        return res.status(404).json({ error: "Order not found" });
      }
      
      // Check if user is authorized to view this order
      if (!req.user.is_admin && order.userId !== req.user.id) {
        return res.status(403).json({ error: "Unauthorized: You don't have permission to view this order" });
      }
      
      // Get domain information
      const allDomains = await storage.getDomains();
      
      // For guest posts, identify if there's a matching domain based on price
      const isGuestPost = order.sourceUrl === "not_applicable" && order.title;
      
      // Find potential domain matches
      let websiteInfo = null;
      if (isGuestPost) {
        // Try to find a matching domain with the same price
        const matchingDomain = allDomains.find(d => 
          d.guestPostPrice?.toString() === order.price?.toString() &&
          (d.type === 'guest_post' || d.type === 'both')
        );
        
        if (matchingDomain) {
          websiteInfo = {
            name: matchingDomain.websiteName || matchingDomain.websiteUrl,
            url: matchingDomain.websiteUrl
          };
        }
      }
      
      // Add website information to the order
      const orderWithWebsite = {
        ...order,
        website: websiteInfo
      };
      
      console.log("Order found:", orderWithWebsite);
      res.json(orderWithWebsite);
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });
  
  // Add order comments routes
  app.get("/api/orders/:orderId/comments", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      // Special handling for "new" route
      if (req.params.orderId === "new") {
        return res.json([]);
      }

      const orderId = parseInt(req.params.orderId);
      const comments = await storage.getOrderComments(orderId);
      const users = await storage.getUsers();

      const commentsWithUserDetails = await Promise.all(comments.map(async comment => {
        const user = users.find(u => u.id === comment.userId);
        return {
          ...comment,
          user: user ? {
            username: user.username,
            companyName: user.companyName,
            is_admin: user.is_admin
          } : null
        };
      }));

      res.json(commentsWithUserDetails);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  
  // Mark comments as read for an order
  app.post("/api/orders/:orderId/comments/read", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    try {
      // Special handling for "new" route
      if (req.params.orderId === "new") {
        return res.status(200).json({ success: true });
      }
      
      const orderId = parseInt(req.params.orderId);
      await storage.markCommentsAsRead(orderId, req.user.id);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error marking comments as read:", error);
      res.status(500).json({ error: "Failed to mark comments as read" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      let userId = req.user.id;

      // If admin is creating order for another user
      if (req.user.is_admin && req.body.userId) {
        // Verify the target user exists
        const targetUser = await storage.getUser(req.body.userId);
        if (!targetUser) {
          return res.status(404).json({ error: "User not found" });
        }
        userId = req.body.userId;
      }

      // Check order type from the request body
      const orderType = req.body.type;

      // Validate order type and set initial status
      if (orderType !== "guest_post" && orderType !== "niche_edit") {
        return res.status(400).json({ error: "Invalid order type. Must be either 'guest_post' or 'niche_edit'" });
      }

      // Set initial status based on type (if not already set in req.body)
      const initialStatus = "In Progress";

      // Prepare order data
      let orderData = {
        ...req.body,
        userId,
        status: req.body.status || initialStatus,
        dateOrdered: new Date(),
      };

      // For guest posts, ensure sourceUrl is set to not_applicable
      if (orderType === "guest_post") {
        orderData.sourceUrl = "not_applicable";
        
        // For guest posts using the new form format, copy textEdit to title for backwards compatibility
        if (!orderData.title && orderData.textEdit) {
          orderData.title = orderData.textEdit;
        }
      }

      console.log('Creating order with data:', orderData);

      const order = await storage.createOrder(orderData);

      // Log the created order to verify status
      console.log('Order created with status:', order.status);

      // Send email notification to admin
      try {
        const orderUser = userId === req.user.id ? req.user : await storage.getUser(userId);
        await sendOrderNotificationEmail(order, orderUser);
      } catch (error) {
        console.error("Failed to send order notification email:", error);
        // Continue even if email fails
      }

      // Notify all admins about new order
      const admins = await storage.getUsers().then(users => users.filter(u => u.is_admin));
      await Promise.all(admins.map(admin =>
        storage.createNotification({
          userId: admin.id,
          message: `New order #${order.id} placed by ${req.user?.username}`,
          type: "order",
          orderId: order.id,
          createdAt: new Date(),
          read: false,
        })
      ));

      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  app.post("/api/orders/:orderId/comments", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      // Special handling for "new" route - comments cannot be added to a new order
      if (req.params.orderId === "new") {
        return res.status(400).json({ error: "Cannot add comments to a new order" });
      }

      const orderId = parseInt(req.params.orderId);

      // Verify order exists
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Create comment
      const comment = await storage.createOrderComment({
        orderId,
        userId: req.user.id,
        message: req.body.message,
        isFromAdmin: req.user.is_admin,
      });

      // Get admins and order owner
      const admins = await storage.getUsers().then(users => users.filter(u => u.is_admin));
      const orderOwner = await storage.getUser(order.userId);

      if (req.user.is_admin) {
        // Admin commented - notify the order owner
        if (orderOwner) {
          if (req.user) {
            await sendCommentNotificationEmail(
              order,
              comment,
              {
                username: req.user.username,
                companyName: req.user.companyName
              },
              orderOwner
            );
          }
        }

        await storage.createNotification({
          userId: order.userId,
          message: `Admin commented on your order #${orderId}`,
          type: "comment",
          orderId,
          createdAt: new Date(),
        });
      } else {
        // User commented - notify all admins
        await Promise.all(admins.map(async (admin) => {
          if (req.user) {
            await sendCommentNotificationEmail(
              order,
              comment,
              {
                username: req.user.username,
                companyName: req.user.companyName
              },
              admin
            );
          }

          await storage.createNotification({
            userId: admin.id,
            message: `${req.user?.username} commented on order #${orderId}`,
            type: "comment",
            orderId,
            createdAt: new Date(),
          });
        }));
      }

      // Get user details for response
      const user = await storage.getUser(req.user.id);
      res.status(201).json({
        ...comment,
        user: {
          username: user?.username,
          companyName: user?.companyName,
          is_admin: user?.is_admin,
        }
      });

    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  // General order update endpoint
  app.patch("/api/orders/:orderId", async (req, res) => {
    try {
      // Special handling for "new" route - cannot update a new order that doesn't exist
      if (req.params.orderId === "new") {
        return res.status(400).json({ error: "Cannot update a non-existent order" });
      }
      
      const orderId = parseInt(req.params.orderId);
      
      // Get the order first
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      // Check permissions
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Users can only update their own orders, admins can update any
      if (!req.user.is_admin && order.userId !== req.user.id) {
        return res.status(403).json({ error: "You don't have permission to update this order" });
      }
      
      // Only allow editing orders that are "In Progress"
      if (order.status !== "In Progress" && !req.user.is_admin) {
        return res.status(403).json({ 
          error: "Only orders in 'In Progress' status can be edited"
        });
      }
      
      // User can only update specific fields
      const allowedFields = ['sourceUrl', 'targetUrl', 'anchorText', 'textEdit', 'notes', 'title'];
      
      // Extract only allowed fields from request body
      const updates: any = {};
      for (const field of allowedFields) {
        if (field in req.body) {
          updates[field] = req.body[field];
        }
      }
      
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }
      
      // Update the order
      const updatedOrder = await storage.updateOrder(orderId, updates);
      
      // Add system comment about edit
      await storage.createOrderComment({
        orderId,
        userId: req.user.id,
        message: `Order has been edited by ${req.user.username}`,
        isSystemMessage: true
      });
      
      res.json(updatedOrder);
    } catch (error) {
      console.error("Error updating order:", error);
      res.status(500).json({ error: "An error occurred while updating the order" });
    }
  });

  // Update order status
  app.patch("/api/orders/:orderId/status", async (req, res) => {
    try {
      // Special handling for "new" route - status cannot be updated for a new order
      if (req.params.orderId === "new") {
        return res.status(400).json({ error: "Cannot update status for a new order" });
      }
      
      const orderId = parseInt(req.params.orderId);
      const { status } = req.body;

      // Get the order first
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Check permissions
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Only admins can update order status (except for cancellation)
      if (!req.user.is_admin) {
        if (order.userId !== req.user.id) {
          return res.status(403).json({ error: "Unauthorized: You can only modify your own orders" });
        }

        if (status !== "Cancelled") {
          return res.status(403).json({ error: "Unauthorized: Only admins can update order status" });
        }

        // Both Guest Post and Niche Edit orders can be cancelled, but only if they're in "In Progress" status
        if (order.status !== "In Progress") {
          return res.status(400).json({ error: "Orders can only be cancelled while In Progress" });
        }
      }

      // For admin updates, validate status based on order type
      if (req.user.is_admin) {
        const isGuestPost = order.title !== null;
        const validStatuses = isGuestPost ? GUEST_POST_STATUSES : NICHE_EDIT_STATUSES;

        if (!validStatuses.includes(status as any)) {
          return res.status(400).json({
            error: `Invalid status. Valid statuses for ${isGuestPost ? 'guest post' : 'niche edit'} orders are: ${validStatuses.join(', ')}`
          });
        }
      }

      const updatedOrder = await storage.updateOrder(orderId, {
        status,
        dateCompleted: status === "Completed" ? new Date() : null
      });

      // Get order owner and send email
      const orderOwner = await storage.getUser(order.userId);
      if (orderOwner) {
        try {
          await sendStatusUpdateEmail(order, orderOwner);
        } catch (error) {
          console.error("Failed to send status update email:", error);
          // Continue even if email fails
        }
      }

      // Create notification for the order owner
      await storage.createNotification({
        userId: order.userId,
        message: `Your order #${orderId} status has been updated to ${status}`,
        type: "status",
        orderId,
        createdAt: new Date(),
      });

      res.json(updatedOrder);
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ error: "Failed to update order status" });
    }
  });

  // Delete order (admin only)
  app.delete("/api/orders/:orderId", async (req, res) => {
    try {
      if (!req.user?.is_admin) {
        return res.status(403).json({ error: "Unauthorized: Admin access required" });
      }

      const orderId = parseInt(req.params.orderId);

      // Delete the order (this will also delete associated comments and notifications)
      await storage.deleteOrder(orderId);

      res.sendStatus(200);
    } catch (error) {
      console.error("Error deleting order:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to delete order",
        details: error instanceof Error ? error.stack : undefined
      });
    }
  });


  app.get("/api/seo-joke", async (_req, res) => {
    try {
      const joke = await generateSEOJoke();
      res.json({ joke });
    } catch (error) {
      console.error("Error getting SEO joke:", error);
      res.status(500).json({ error: "Failed to generate joke" });
    }
  });

  // Welcome message endpoint
  app.get("/api/welcome-message", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      
      const username = req.user.firstName || req.user.username;
      const companyName = req.user.companyName;
      
      const welcomeMessage = await generateWelcomeMessage(username, companyName);
      res.json({ message: welcomeMessage });
    } catch (error) {
      console.error("Error generating welcome message:", error);
      res.status(500).json({ error: "Failed to generate welcome message" });
    }
  });

  // Link strategy advice endpoint
  app.post("/api/link-strategy", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      
      const { message } = req.body;
      
      // Generate response based on keywords in the message
      let response = "";
      const query = message.toLowerCase();
      
      // Check for simple greetings first
      const greetings = ["hi", "hello", "hey", "hey there", "hi there", "hello there", "greetings"];
      const isSimpleGreeting = greetings.some(greeting => 
        query.includes(greeting) && message.length < 25
      );
      
      if (isSimpleGreeting) {
        response = "Hello! I'm your AI link-building strategy assistant. How can I help you with your link building strategy today? You can ask me about anchor text distribution, guest posts vs niche edits, competitor analysis, or budget allocation.";
      } else if (query.includes("domain authority") || query.includes("da")) {
        response = "Domain Authority (DA) is an important metric for link building. Higher DA sites typically provide more SEO value, but don't focus exclusively on DA. Relevance to your niche is equally important for effective link building.";
      } else if (query.includes("anchor text")) {
        response = "For anchor text strategy, I recommend using a diverse mix: about 20% exact match, 30% partial match, 30% branded, and 20% generic. This natural distribution helps avoid over-optimization penalties while still targeting your key terms.";
      } else if (query.includes("guest post") || query.includes("niche edit")) {
        response = "Both guest posts and niche edits have their place in a balanced link building strategy. Guest posts provide branding and referral traffic benefits along with links, while niche edits can target high-authority existing content. I'd recommend a mix of both.";
      } else if (query.includes("competitor")) {
        response = "Analyzing competitor backlinks is a smart approach! Look for domains linking to multiple competitors but not to you - these represent easy opportunities. Tools like Ahrefs or Semrush can help you identify these gap opportunities.";
      } else if (query.includes("budget") || query.includes("cost")) {
        response = "For link building budgets, quality over quantity is key. It's better to invest in 5 high-quality, relevant links than 20 low-quality ones. Consider allocating 30-40% of your SEO budget to link acquisition for a balanced approach.";
      } else {
        response = "That's a great question about link building strategy. The most effective approach is to focus on relevance and authority. Create link-worthy content assets, build relationships in your industry, and ensure your anchor text distribution looks natural. Would you like more specific advice on any aspect of your link building campaign?";
      }
      
      res.json({ message: response });
    } catch (error) {
      console.error("Error generating link strategy advice:", error);
      res.status(500).json({ error: "Failed to generate link building advice" });
    }
  });

  // Add domains routes with logging
  app.get("/api/domains", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      console.log("Fetching domains...");
      const domains = await storage.getDomains();
      console.log("Retrieved domains:", domains);
      res.json(domains);
    } catch (error) {
      console.error("Error fetching domains:", error);
      res.status(500).json({ error: "Failed to fetch domains" });
    }
  });

  // Add domain creation route (admin only)
  app.post("/api/domains", async (req, res) => {
    try {
      if (!req.user?.is_admin) {
        return res.status(403).json({ error: "Unauthorized: Admin access required" });
      }
      console.log("Creating domain with data:", req.body);
      const domainData = insertDomainSchema.parse(req.body);
      const domain = await storage.createDomain(domainData);
      console.log("Created domain:", domain);
      res.status(201).json(domain);
    } catch (error) {
      console.error("Error creating domain:", error);
      res.status(500).json({ error: "Failed to create domain" });
    }
  });

  // Add single domain route
  app.get("/api/domains/:id", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const domain = await storage.getDomain(parseInt(req.params.id));
      if (!domain) {
        return res.status(404).json({ error: "Domain not found" });
      }
      res.json(domain);
    } catch (error) {
      console.error("Error fetching domain:", error);
      res.status(500).json({ error: "Failed to fetch domain" });
    }
  });

  // Add this with the other routes before the httpServer creation
  app.patch("/api/user/profile", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const profileData = updateProfileSchema.parse(req.body);
      const updatedUser = await storage.updateUser(req.user.id, profileData);

      // Return only the necessary user data
      const sanitizedUser = {
        id: updatedUser.id,
        username: updatedUser.username,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        companyName: updatedUser.companyName,
        country: updatedUser.country,
        bio: updatedUser.bio,
        profilePicture: updatedUser.profilePicture,
        companyLogo: updatedUser.companyLogo,
        dateOfBirth: updatedUser.dateOfBirth,
        phoneNumber: updatedUser.phoneNumber,
        linkedinUrl: updatedUser.linkedinUrl,
        instagramProfile: updatedUser.instagramProfile,
        is_admin: updatedUser.is_admin
      };

      res.json(sanitizedUser);
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(400).json({ 
        error: "Failed to update profile",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/typing-status", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      const { receiverId, isTyping } = req.body;

      if (isTyping) {
        typingUsers.set(req.user.id, {
          isTyping: true,
          timestamp: Date.now()
        });
      } else {
        typingUsers.delete(req.user.id);
      }

      res.sendStatus(200);
    } catch (error) {
      console.error("Error updating typing status:", error);
      res.status(500).json({ error: "Failed to update typing status" });
    }
  });

  app.get("/api/typing-status/:userId", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      const userId = parseInt(req.params.userId);
      const status = typingUsers.get(userId);

      // Clear old typing status (older than 5 seconds)
      if (status && Date.now() - status.timestamp > 5000) {
        typingUsers.delete(userId);
        return res.json({ isTyping: false });
      }

      res.json({ isTyping: !!status?.isTyping });
    } catch (error) {
      console.error("Error getting typing status:", error);
      res.status(500).json({ error: "Failed to get typing status" });
    }
  });

  // Invoice routes
  // Get all invoices for the current user
  app.get("/api/invoices", async (req, res) => {
    try {
      console.log("Accessing /api/invoices route, user:", req.user?.id);
      if (!req.user) {
        console.log("No user found, returning 401");
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Add debug output for session
      console.log("Session ID:", req.sessionID);
      console.log("Session data:", req.session);
      
      console.log("Fetching invoices for user", req.user.id);
      const invoices = await storage.getInvoices(req.user.id);
      console.log("Invoices found:", invoices.length);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  // Get invoices with amount filter
  app.get("/api/invoices/filter/amount", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      
      const minAmount = parseInt(req.query.min as string) || 0;
      const maxAmount = parseInt(req.query.max as string) || Number.MAX_SAFE_INTEGER;
      
      const invoices = await storage.getInvoicesByAmount(req.user.id, minAmount, maxAmount);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices by amount:", error);
      res.status(500).json({ error: "Failed to fetch invoices by amount" });
    }
  });

  // Get invoices with date filter
  app.get("/api/invoices/filter/date", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      
      const startDate = req.query.start ? new Date(req.query.start as string) : new Date(0);
      const endDate = req.query.end ? new Date(req.query.end as string) : new Date();
      
      const invoices = await storage.getInvoicesByDateRange(req.user.id, startDate, endDate);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices by date:", error);
      res.status(500).json({ error: "Failed to fetch invoices by date" });
    }
  });

  // Admin route to get all invoices
  app.get("/api/invoices/all", async (req, res) => {
    try {
      console.log("Accessing /api/invoices/all route, user:", req.user?.id);
      console.log("User object:", req.user);
      console.log("Session ID:", req.sessionID);
      console.log("Session:", req.session);
      
      // First check if user is authenticated
      if (!req.user) {
        console.log("No authenticated user found");
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Then check if they're an admin
      if (!req.user.is_admin) {
        console.log("User is not admin, access denied");
        return res.status(403).json({ error: "Unauthorized: Admin access required" });
      }
      
      console.log("User is admin, proceeding with invoice fetching");
      
      try {
        console.log("Fetching all invoices");
        const invoices = await storage.getAllInvoices();
        console.log("Invoices fetched successfully:", invoices.length);
        
        console.log("Fetching users");
        const users = await storage.getUsers();
        console.log("Users fetched successfully:", users.length);
        
        // Join invoices with user data
        const invoicesWithUserDetails = invoices.map(invoice => {
          const user = users.find(u => u.id === invoice.userId);
          return {
            ...invoice,
            user: user ? {
              username: user.username,
              companyName: user.companyName,
              email: user.email
            } : null
          };
        });
        
        console.log("Successfully processed invoices with user details");
        res.json(invoicesWithUserDetails);
      } catch (innerError) {
        console.error("Error in data processing:", innerError);
        res.status(500).json({ error: "Failed to process invoice data" });
      }
    } catch (error) {
      console.error("Error fetching all invoices:", error);
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });
  
  // Get completed orders that haven't been billed yet for a specific user (admin only)
  app.get("/api/orders/completed-unbilled/:userId", async (req, res) => {
    try {
      if (!req.user?.is_admin) {
        return res.status(403).json({ error: "Unauthorized: Admin access required" });
      }
      
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      
      // Get all orders for the specified user
      const userOrders = await storage.getOrders(userId);
      
      // Filter to only completed orders
      const completedOrders = userOrders.filter(order => {
        return order.status === "Completed" || 
          order.status === "completed" || 
          order.status === "guest_post_published" || 
          order.status === "niche_edit_completed";
      });
      
      // Get all invoices for this user
      const userInvoices = await storage.getInvoices(userId);
      
      // Create a set of invoiced order IDs
      const invoicedOrderIds = new Set();
      
      // Iterate through invoices to find order IDs that have been billed
      for (const invoice of userInvoices) {
        // Extract order ID from invoice notes if they follow our pattern
        if (invoice.notes) {
          const orderIdMatch = invoice.notes.match(/Link Building Services.+?#?(\d+)/i);
          if (orderIdMatch && orderIdMatch[1]) {
            invoicedOrderIds.add(parseInt(orderIdMatch[1]));
          }
        }
      }
      
      // Filter orders that haven't been billed yet
      const unbilledOrders = completedOrders.filter(order => !invoicedOrderIds.has(order.id));
      
      res.json(unbilledOrders);
    } catch (error) {
      console.error("Error fetching completed unbilled orders:", error);
      res.status(500).json({ error: "Failed to fetch completed unbilled orders" });
    }
  });
  
  // Get completed orders that have not been invoiced (admin only)
  app.get("/api/orders/completed-not-invoiced", async (req, res) => {
    try {
      if (!req.user?.is_admin) {
        return res.status(403).json({ error: "Unauthorized: Admin access required" });
      }
      
      // Get all orders with status that indicates completion
      const allOrders = await storage.getAllOrders();
      const completedOrders = allOrders.filter(order => {
        return order.status === "Completed" || 
          order.status === "completed" || 
          order.status === "guest_post_published" || 
          order.status === "niche_edit_completed";
      });
      
      // Get all invoices
      const allInvoices = await storage.getAllInvoices();
      
      // Find completed orders that don't have an invoice
      // We'll check the notes field which should contain the order ID
      const notInvoicedOrders = completedOrders.filter(order => {
        return !allInvoices.some(invoice => 
          invoice.notes && invoice.notes.includes(`Order #${order.id}`)
        );
      });
      
      // Get user details for each order
      const users = await storage.getUsers();
      
      const ordersWithUserDetails = await Promise.all(notInvoicedOrders.map(async order => {
        const user = users.find(u => u.id === order.userId);
        return {
          ...order,
          user: user ? {
            id: user.id,
            username: user.username,
            companyName: user.companyName,
            email: user.email,
            billingAddress: user.billingAddress
          } : null
        };
      }));
      
      res.json(ordersWithUserDetails);
    } catch (error) {
      console.error("Error fetching completed orders:", error);
      res.status(500).json({ error: "Failed to fetch completed orders" });
    }
  });
  
  // Admin route to get all invoices
  app.get("/api/invoices/all", async (req, res) => {
    try {
      console.log("Accessing /api/invoices/all route, user:", req.user?.id);
      console.log("User object:", req.user);
      console.log("Session ID:", req.sessionID);
      console.log("Session:", req.session);
      
      // First check if user is authenticated
      if (!req.user) {
        console.log("No authenticated user found");
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Then check if they're an admin
      if (!req.user.is_admin) {
        console.log("User is not admin, access denied");
        return res.status(403).json({ error: "Unauthorized: Admin access required" });
      }
      
      console.log("User is admin, proceeding with invoice fetching");
      
      try {
        console.log("Fetching all invoices");
        const invoices = await storage.getAllInvoices();
        console.log("Invoices fetched successfully:", invoices.length);
        
        console.log("Fetching users");
        const users = await storage.getUsers();
        console.log("Users fetched successfully:", users.length);
        
        // Join invoices with user data
        const invoicesWithUserDetails = invoices.map(invoice => {
          const user = users.find(u => u.id === invoice.userId);
          return {
            ...invoice,
            user: user ? {
              username: user.username,
              companyName: user.companyName,
              email: user.email
            } : null
          };
        });
        
        console.log("Successfully processed invoices with user details");
        res.json(invoicesWithUserDetails);
      } catch (innerError) {
        console.error("Error in data processing:", innerError);
        res.status(500).json({ error: "Failed to process invoice data" });
      }
    } catch (error) {
      console.error("Error fetching all invoices:", error);
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });
  
  // Get a single invoice
  app.get("/api/invoices/:id", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      
      const invoiceId = parseInt(req.params.id);
      if (isNaN(invoiceId)) {
        return res.status(400).json({ error: "Invalid invoice ID" });
      }
      const invoice = await storage.getInvoice(invoiceId);
      
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      
      // Check if user is authorized to view this invoice
      if (!req.user.is_admin && invoice.userId !== req.user.id) {
        return res.status(403).json({ error: "Unauthorized: You don't have permission to view this invoice" });
      }
      
      res.json(invoice);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ error: "Failed to fetch invoice" });
    }
  });

  // Create a new invoice (admin only)
  app.post("/api/invoices", async (req, res) => {
    try {
      if (!req.user?.is_admin) {
        return res.status(403).json({ error: "Unauthorized: Admin access required" });
      }
      
      const invoiceData = insertInvoiceSchema.parse(req.body);
      const invoice = await storage.createInvoice(invoiceData);
      
      res.status(201).json(invoice);
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(500).json({ error: "Failed to create invoice" });
    }
  });

  // Mark an invoice as paid (admin only)
  app.patch("/api/invoices/:id/paid", async (req, res) => {
    try {
      if (!req.user?.is_admin) {
        return res.status(403).json({ error: "Unauthorized: Admin access required" });
      }
      
      const invoiceId = parseInt(req.params.id);
      if (isNaN(invoiceId)) {
        return res.status(400).json({ error: "Invalid invoice ID" });
      }
      const invoice = await storage.markInvoiceAsPaid(invoiceId);
      
      res.json(invoice);
    } catch (error) {
      console.error("Error marking invoice as paid:", error);
      res.status(500).json({ error: "Failed to mark invoice as paid" });
    }
  });

  // Update an invoice (admin only)
  app.patch("/api/invoices/:id", async (req, res) => {
    try {
      if (!req.user?.is_admin) {
        return res.status(403).json({ error: "Unauthorized: Admin access required" });
      }
      
      const invoiceId = parseInt(req.params.id);
      if (isNaN(invoiceId)) {
        return res.status(400).json({ error: "Invalid invoice ID" });
      }
      const updates = req.body;
      
      const invoice = await storage.updateInvoice(invoiceId, updates);
      
      res.json(invoice);
    } catch (error) {
      console.error("Error updating invoice:", error);
      res.status(500).json({ error: "Failed to update invoice" });
    }
  });
  
  // Delete an invoice (admin only)
  app.delete("/api/invoices/:id", async (req, res) => {
    try {
      if (!req.user?.is_admin) {
        return res.status(403).json({ error: "Unauthorized: Admin access required" });
      }
      
      const invoiceId = parseInt(req.params.id);
      if (isNaN(invoiceId)) {
        return res.status(400).json({ error: "Invalid invoice ID" });
      }
      
      // Check if the invoice exists
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      
      // Delete the invoice using our new storage method
      await storage.deleteInvoice(invoiceId);
      
      res.status(200).json({ success: true, message: "Invoice deleted successfully" });
    } catch (error) {
      console.error("Error deleting invoice:", error);
      res.status(500).json({ error: "Failed to delete invoice" });
    }
  });
  
  // Get completed orders that haven't been billed yet for a specific user
  app.get("/api/orders/completed-unbilled/:userId", async (req, res) => {
    const { userId } = req.params;
    
    if (!req.user?.is_admin) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    
    try {
      const numUserId = parseInt(userId, 10);
      if (isNaN(numUserId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      
      // Get all orders for this user
      const allOrders = await storage.getOrders(numUserId);
      
      // Get all invoices for this user
      const userInvoices = await storage.getInvoices(numUserId);
      
      // Determine which orders have been completed but not billed
      // Get the orders that are completed (status includes "completed" or "published")
      const completedOrders = allOrders.filter(order => {
        const isCompleted = order.status === "completed" || 
                           order.status === "guest_post_published" || 
                           order.status === "niche_edit_completed";
                           
        // Check if this order has already been included in an invoice
        // This is a simplified check - in a real app, you'd track this in the database
        const alreadyBilled = userInvoices.some(invoice => {
          // Check if the invoice notes contain the order ID
          return invoice.notes && invoice.notes.includes(`#${order.id}`);
        });
        
        return isCompleted && !alreadyBilled;
      });
      
      return res.json(completedOrders);
    } catch (error) {
      console.error("Error fetching completed unbilled orders:", error);
      return res.status(500).json({ error: "Failed to fetch orders" });
    }
  });
  
  // Specific endpoint for getting clients for invoice creation
  app.get("/api/clients", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      
      // Only admins can get the client list
      if (!req.user.is_admin) {
        return res.status(403).json({ error: "Forbidden: Admin access required" });
      }
      
      // Get all users
      const users = await storage.getUsers();
      
      // Filter out admins - we only want clients
      const clients = users.filter(u => !u.is_admin).map(client => ({
        id: client.id,
        username: client.username,
        companyName: client.companyName,
        email: client.email,
        is_admin: client.is_admin
      }));
      
      console.log(`Retrieved ${clients.length} clients for invoice creation`);
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  // Configure UploadThing routes
  app.use("/api/uploadthing", uploadthingHandler);
  
  // Debug endpoint to check auth status
  app.get("/api/auth-status", (req, res) => {
    const status = {
      isAuthenticated: !!req.user,
      userId: req.user?.id || null,
      isAdmin: req.user?.is_admin || false,
      sessionID: req.sessionID
    };
    console.log("Auth status check:", status);
    res.json(status);
  });

  // Test endpoint for creating a test support ticket with welcome message
  app.post("/api/test-create-ticket", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      // Create a test support ticket
      const testTicket = {
        userId: req.user.id,
        orderId: 108, // Using an existing order ID from our database
        title: 'Test Support Ticket',
        status: "open" as "open" | "closed"
      };
      
      console.log("Creating test support ticket:", testTicket);
      const createdTicket = await storage.createSupportTicket(testTicket);
      console.log("Created test ticket:", createdTicket);
      
      // Get the comments (including welcome message) for this ticket
      const comments = await storage.getOrderComments(testTicket.orderId, createdTicket.id);
      console.log("Retrieved ticket comments:", comments);
      
      res.json({
        ticket: createdTicket,
        comments: comments
      });
    } catch (error: any) {
      console.error('Error creating test ticket:', error);
      res.status(500).json({ 
        error: 'Failed to create test ticket', 
        details: error.message || String(error) 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}