import type { Express, Request, Response, NextFunction } from "express";
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
  updateTicketSchema,
  GUEST_POST_STATUSES,
  NICHE_EDIT_STATUSES
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

const OFFLINE_THRESHOLD = 1000 * 60 * 5; // 5 minutes of inactivity = offline

// Function to update a user's last active timestamp
function updateUserActivity(userId: number) {
  onlineUsers.set(userId, { lastActive: Date.now() });
}

// Clean up old activity records
setInterval(() => {
  const now = Date.now();
  Array.from(onlineUsers.entries()).forEach(([userId, data]) => {
    if (now - data.lastActive > OFFLINE_THRESHOLD) {
      onlineUsers.delete(userId);
    }
  });
}, 60000); // Clean up every minute

type GuestPostStatus = typeof GUEST_POST_STATUSES[number];
type NicheEditStatus = typeof NICHE_EDIT_STATUSES[number];
type OrderStatus = GuestPostStatus | NicheEditStatus;

export async function registerRoutes(app: Express): Promise<Server> {
  const server = createServer(app);

  app.use("/api/uploadthing", uploadthingHandler);

  app.get("/api/jokes/seo", async (req, res) => {
    try {
      const joke = await generateSEOJoke();
      res.json({ joke });
    } catch (error) {
      console.error("Error generating SEO joke:", error);
      res.status(500).json({ error: "Failed to generate joke" });
    }
  });

  app.get("/api/welcome", async (req, res) => {
    const { user } = req.session as any;
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const welcomeMessage = await generateWelcomeMessage(
        user.firstName || user.username,
        user.companyName
      );
      res.json({ message: welcomeMessage });
    } catch (error) {
      console.error("Error generating welcome message:", error);
      res.json({ message: `Welcome back, ${user.firstName || user.username}!` });
    }
  });

  app.get("/api/me", (req, res) => {
    const { user } = req.session as any;
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json(user);
  });

  app.get("/api/users", async (req, res) => {
    const { user } = req.session as any;
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/profile", async (req, res) => {
    const { user } = req.session as any;
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const profileData = updateProfileSchema.parse(req.body);
      const updatedUser = await storage.updateUser(user.id, profileData);

      // Update the session with new user data
      (req.session as any).user = updatedUser;

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(400).json({ error: "Invalid profile data" });
    }
  });

  // Get domains
  app.get("/api/domains", async (req, res) => {
    try {
      const domains = await storage.getDomains();
      res.json(domains);
    } catch (error) {
      console.error("Error fetching domains:", error);
      res.status(500).json({ error: "Failed to fetch domains" });
    }
  });

  // Create domain (admin only)
  app.post("/api/domains", async (req, res) => {
    const { user } = req.session as any;
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!user.is_admin) {
      return res.status(403).json({ error: "Not authorized" });
    }

    try {
      const domainData = insertDomainSchema.parse(req.body);
      const domain = await storage.createDomain(domainData);
      res.status(201).json(domain);
    } catch (error) {
      console.error("Error creating domain:", error);
      res.status(400).json({ error: "Invalid domain data" });
    }
  });

  // Update domain (admin only)
  app.patch("/api/domains/:id", async (req, res) => {
    const { user } = req.session as any;
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!user.is_admin) {
      return res.status(403).json({ error: "Not authorized" });
    }

    try {
      const domainId = parseInt(req.params.id);
      const domain = await storage.updateDomain(domainId, req.body);
      res.json(domain);
    } catch (error) {
      console.error("Error updating domain:", error);
      res.status(400).json({ error: "Invalid domain data" });
    }
  });

  // Get all orders (admin gets all, users get their own)
  app.get("/api/orders", async (req, res) => {
    const { user } = req.session as any;
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      let orders;
      if (user.is_admin) {
        orders = await storage.getAllOrders();
      } else {
        orders = await storage.getOrders(user.id);
      }
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  // Get a specific order
  app.get("/api/orders/:id", async (req, res) => {
    const { user } = req.session as any;
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrder(orderId);

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Only admin or order owner can view the order
      if (!user.is_admin && order.userId !== user.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      res.json(order);
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  // Create a new order
  app.post("/api/orders", async (req, res) => {
    const { user } = req.session as any;
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      // Set the user ID from the session
      const orderData = {
        ...req.body,
        userId: user.is_admin && req.body.userId ? req.body.userId : user.id,
      };

      const order = await storage.createOrder(orderData);

      // Send email notification about the new order
      try {
        await sendOrderNotificationEmail(order, user);
      } catch (emailError) {
        console.error("Failed to send order notification email:", emailError);
      }

      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(400).json({ error: "Invalid order data" });
    }
  });

  // Update an order
  app.patch("/api/orders/:id", async (req, res) => {
    const { user } = req.session as any;
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrder(orderId);

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Only admin or order owner can update the order
      if (!user.is_admin && order.userId !== user.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      // Users who are not admins can only update orders with "In Progress" status
      // (they can only cancel or update certain fields)
      if (!user.is_admin && order.status !== "In Progress") {
        return res.status(403).json({ error: "Cannot update orders that are not In Progress" });
      }

      // Special handling for status changes
      const oldStatus = order.status;
      const newStatus = req.body.status;

      // If status is changing, check if we need to send notifications
      if (newStatus && oldStatus !== newStatus) {
        // Only admins can change status
        if (!user.is_admin) {
          return res.status(403).json({ error: "Not authorized to change order status" });
        }

        // Send status update email
        try {
          const orderUser = await storage.getUser(order.userId);
          if (orderUser) {
            await sendStatusUpdateEmail(
              order,
              orderUser,
              oldStatus as OrderStatus,
              newStatus as OrderStatus
            );
          }
        } catch (emailError) {
          console.error("Failed to send status update email:", emailError);
        }
      }

      const updatedOrder = await storage.updateOrder(orderId, req.body);
      res.json(updatedOrder);
    } catch (error) {
      console.error("Error updating order:", error);
      res.status(400).json({ error: "Invalid order data" });
    }
  });

  // Delete an order (admin only)
  app.delete("/api/orders/:id", async (req, res) => {
    const { user } = req.session as any;
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!user.is_admin) {
      return res.status(403).json({ error: "Not authorized" });
    }

    try {
      const orderId = parseInt(req.params.id);
      await storage.deleteOrder(orderId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting order:", error);
      res.status(500).json({ error: "Failed to delete order" });
    }
  });

  // Get comments for an order
  app.get("/api/orders/:id/comments", async (req, res) => {
    const { user } = req.session as any;
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrder(orderId);

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Only admin or order owner can view the comments
      if (!user.is_admin && order.userId !== user.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const comments = await storage.getOrderComments(orderId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  // Add a comment to an order
  app.post("/api/orders/:id/comments", async (req, res) => {
    const { user } = req.session as any;
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrder(orderId);

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Only admin or order owner can add comments
      if (!user.is_admin && order.userId !== user.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const commentData = {
        ...req.body,
        orderId,
        userId: user.id,
        isFromAdmin: user.is_admin,
      };

      const comment = await storage.createOrderComment(commentData);

      // Mark comments as read for the commenter
      await storage.markCommentsAsRead(orderId, user.id);

      // Send email notification to the other party
      try {
        const recipientId = user.is_admin ? order.userId : await findAdminId();
        const recipient = await storage.getUser(recipientId);
        if (recipient) {
          await sendCommentNotificationEmail(order, user, recipient, comment);
        }
      } catch (emailError) {
        console.error("Failed to send comment notification email:", emailError);
      }

      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(400).json({ error: "Invalid comment data" });
    }
  });

  // Mark comments as read for the current user
  app.post("/api/orders/:id/mark-comments-read", async (req, res) => {
    const { user } = req.session as any;
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrder(orderId);

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Only admin or order owner can mark comments as read
      if (!user.is_admin && order.userId !== user.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      await storage.markCommentsAsRead(orderId, user.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error marking comments as read:", error);
      res.status(500).json({ error: "Failed to mark comments as read" });
    }
  });

  // Get all notifications for the current user
  app.get("/api/notifications", async (req, res) => {
    const { user } = req.session as any;
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const notifications = await storage.getNotifications(user.id);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // Mark a notification as read
  app.patch("/api/notifications/:id/read", async (req, res) => {
    const { user } = req.session as any;
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const notificationId = parseInt(req.params.id);
      const notification = await storage.markNotificationAsRead(notificationId);
      res.json(notification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  // Mark all notifications as read
  app.post("/api/notifications/mark-all-read", async (req, res) => {
    const { user } = req.session as any;
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      await storage.markAllNotificationsAsRead(user.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ error: "Failed to mark all notifications as read" });
    }
  });

  // Get chat messages between two users
  app.get("/api/messages/:userId", async (req, res) => {
    const { user } = req.session as any;
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const otherUserId = parseInt(req.params.userId);
      const messages = await storage.getMessages(user.id, otherUserId);
      
      // Update user activity
      updateUserActivity(user.id);
      
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Send a message to another user
  app.post("/api/messages", async (req, res) => {
    const { user } = req.session as any;
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const messageData = insertMessageSchema.parse({
        ...req.body,
        senderId: user.id,
      });

      const message = await storage.createMessage(messageData);
      
      // Update user activity
      updateUserActivity(user.id);

      // Send email notification if recipient is not online
      try {
        const recipient = await storage.getUser(messageData.recipientId);
        if (recipient) {
          const isRecipientOnline = onlineUsers.has(recipient.id) && 
            (Date.now() - onlineUsers.get(recipient.id)!.lastActive < OFFLINE_THRESHOLD);
          
          if (!isRecipientOnline) {
            await sendChatNotificationEmail(message, user, recipient);
          }
        }
      } catch (emailError) {
        console.error("Failed to send chat notification email:", emailError);
      }

      res.status(201).json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(400).json({ error: "Invalid message data" });
    }
  });

  // Check if a user is online
  app.get("/api/users/:id/online", async (req, res) => {
    const { user } = req.session as any;
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const userId = parseInt(req.params.id);
      const isOnline = onlineUsers.has(userId) && 
        (Date.now() - onlineUsers.get(userId)!.lastActive < OFFLINE_THRESHOLD);
      
      res.json({ online: isOnline });
    } catch (error) {
      console.error("Error checking online status:", error);
      res.status(500).json({ error: "Failed to check online status" });
    }
  });

  // Mark user as online/active
  app.post("/api/users/activity", (req, res) => {
    const { user } = req.session as any;
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    updateUserActivity(user.id);
    res.status(204).send();
  });

  // Get all active admins
  app.get("/api/admins/active", async (req, res) => {
    const { user } = req.session as any;
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const allUsers = await storage.getUsers();
      const admins = allUsers.filter(u => u.is_admin);
      
      const activeAdmins = admins.filter(admin => 
        onlineUsers.has(admin.id) && 
        (Date.now() - onlineUsers.get(admin.id)!.lastActive < OFFLINE_THRESHOLD)
      );
      
      res.json(activeAdmins);
    } catch (error) {
      console.error("Error fetching active admins:", error);
      res.status(500).json({ error: "Failed to fetch active admins" });
    }
  });

  // Get user typing status
  app.get("/api/users/:id/typing", (req, res) => {
    const { user } = req.session as any;
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const userId = parseInt(req.params.id);
      const typingStatus = typingUsers.get(userId);
      const isTyping = typingStatus?.isTyping && (Date.now() - typingStatus.timestamp < 5000);
      
      res.json({ typing: isTyping || false });
    } catch (error) {
      console.error("Error checking typing status:", error);
      res.status(500).json({ error: "Failed to check typing status" });
    }
  });

  // Update typing status
  app.post("/api/users/typing", (req, res) => {
    const { user } = req.session as any;
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { isTyping } = req.body;
      typingUsers.set(user.id, { isTyping, timestamp: Date.now() });
      res.status(204).send();
    } catch (error) {
      console.error("Error updating typing status:", error);
      res.status(500).json({ error: "Failed to update typing status" });
    }
  });

  // Get invoices routes
  app.get("/api/invoices", async (req, res) => {
    const { user } = req.session as any;
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      let invoices;
      if (user.is_admin) {
        invoices = await storage.getAllInvoices();
      } else {
        invoices = await storage.getInvoices(user.id);
      }
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  // Get a specific invoice
  app.get("/api/invoices/:id", async (req, res) => {
    const { user } = req.session as any;
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const invoiceId = parseInt(req.params.id);
      const invoice = await storage.getInvoice(invoiceId);

      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      // Only admin or invoice owner can view the invoice
      if (!user.is_admin && invoice.userId !== user.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      res.json(invoice);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ error: "Failed to fetch invoice" });
    }
  });

  // Create a new invoice (admin only)
  app.post("/api/invoices", async (req, res) => {
    const { user } = req.session as any;
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!user.is_admin) {
      return res.status(403).json({ error: "Not authorized" });
    }

    try {
      const invoiceData = insertInvoiceSchema.parse(req.body);
      const invoice = await storage.createInvoice(invoiceData);
      res.status(201).json(invoice);
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(400).json({ error: "Invalid invoice data" });
    }
  });

  // Mark invoice as paid (admin only)
  app.patch("/api/invoices/:id/mark-paid", async (req, res) => {
    const { user } = req.session as any;
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!user.is_admin) {
      return res.status(403).json({ error: "Not authorized" });
    }

    try {
      const invoiceId = parseInt(req.params.id);
      const invoice = await storage.markInvoiceAsPaid(invoiceId);
      res.json(invoice);
    } catch (error) {
      console.error("Error marking invoice as paid:", error);
      res.status(500).json({ error: "Failed to mark invoice as paid" });
    }
  });

  // Support ticket routes
  // Get all support tickets (admin gets all, users get their own)
  app.get("/api/tickets", async (req, res) => {
    const { user } = req.session as any;
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      let tickets;
      if (user.is_admin) {
        tickets = await storage.getAllSupportTickets();
      } else {
        tickets = await storage.getSupportTickets(user.id);
      }
      res.json({ tickets });
    } catch (error) {
      console.error("Error fetching support tickets:", error);
      res.status(500).json({ error: "Failed to fetch support tickets" });
    }
  });

  // Get a specific ticket
  app.get("/api/tickets/:id", async (req, res) => {
    const { user } = req.session as any;
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const ticketId = parseInt(req.params.id);
      const ticket = await storage.getSupportTicket(ticketId);

      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      // Only admin or ticket owner can view the ticket
      if (!user.is_admin && ticket.userId !== user.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      res.json({ ticket });
    } catch (error) {
      console.error("Error fetching support ticket:", error);
      res.status(500).json({ error: "Failed to fetch support ticket" });
    }
  });

  // Create a new support ticket
  app.post("/api/tickets", async (req, res) => {
    const { user } = req.session as any;
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const ticketData = insertTicketSchema.parse({
        ...req.body,
        userId: user.id,
      });

      const ticket = await storage.createSupportTicket(ticketData);
      
      // Add a system message as the first comment
      await storage.createOrderComment({
        orderId: ticket.orderId,
        userId: user.id,
        content: `Support ticket created: ${ticket.title}`,
        isSystemMessage: true
      });

      res.status(201).json({ ticket });
    } catch (error) {
      console.error("Error creating support ticket:", error);
      res.status(400).json({ error: "Invalid ticket data" });
    }
  });

  // Update a support ticket (admin only)
  app.patch("/api/tickets/:id", async (req, res) => {
    const { user } = req.session as any;
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!user.is_admin) {
      return res.status(403).json({ error: "Not authorized" });
    }

    try {
      const ticketId = parseInt(req.params.id);
      const updateData = updateTicketSchema.parse(req.body);
      const ticket = await storage.updateSupportTicket(ticketId, updateData);
      
      // If there's a response in the update, create a comment
      if (updateData.adminResponse) {
        const supportTicket = await storage.getSupportTicket(ticketId);
        if (supportTicket) {
          // Add admin comment
          await storage.createOrderComment({
            orderId: supportTicket.orderId,
            userId: user.id,
            content: updateData.adminResponse,
            isFromAdmin: true
          });
          
          // Send email notification to ticket owner
          try {
            const ticketUser = await storage.getUser(supportTicket.userId);
            if (ticketUser) {
              await sendTicketResponseEmail(
                supportTicket,
                ticketUser,
                updateData.adminResponse,
                user.username || user.firstName || "Support Team"
              );
            }
          } catch (emailError) {
            console.error("Failed to send ticket response email:", emailError);
          }
        }
      }
      
      res.json({ ticket });
    } catch (error) {
      console.error("Error updating support ticket:", error);
      res.status(400).json({ error: "Invalid ticket data" });
    }
  });

  // Close a support ticket
  app.post("/api/tickets/:id/close", async (req, res) => {
    const { user } = req.session as any;
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const ticketId = parseInt(req.params.id);
      const ticket = await storage.getSupportTicket(ticketId);

      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      // Only admin or ticket owner can close the ticket
      if (!user.is_admin && ticket.userId !== user.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const { rating, feedback } = req.body;
      const closedTicket = await storage.closeSupportTicket(ticketId, rating, feedback);
      
      // Add a system message
      await storage.createOrderComment({
        orderId: ticket.orderId,
        userId: user.id,
        content: `Support ticket closed${rating ? ` with rating: ${rating}/5` : ''}`,
        isSystemMessage: true
      });

      res.json({ ticket: closedTicket });
    } catch (error) {
      console.error("Error closing support ticket:", error);
      res.status(500).json({ error: "Failed to close support ticket" });
    }
  });

  return server;
}

// Helper function to find an admin user ID
async function findAdminId(): Promise<number> {
  const users = await storage.getUsers();
  const admin = users.find(u => u.is_admin);
  if (!admin) {
    throw new Error("No admin user found");
  }
  return admin.id;
}