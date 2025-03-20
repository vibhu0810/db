import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { generateSEOJoke } from "./openai";
import { insertMessageSchema, insertDomainSchema } from "@shared/schema";
import { 
  sendOrderNotificationEmail, 
  sendCommentNotificationEmail, 
  sendStatusUpdateEmail 
} from "./email";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Add users route for admins
  app.get("/api/users", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      let users = await storage.getUsers();

      // Filter users based on role
      if (req.user.is_admin) {
        // Admins see all non-admin users (customers)
        users = users.filter(user => !user.is_admin && user.id !== req.user.id);
      } else {
        // Regular users only see admin users
        users = users.filter(user => user.is_admin);
      }

      console.log(`Filtered users for ${req.user.is_admin ? 'admin' : 'user'}:`, users.map(u => ({id: u.id, username: u.username, is_admin: u.is_admin})));

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
            pending: userOrders.filter(o => ["Sent", "Revision"].includes(o.status)).length,
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

      const messages = await storage.getMessages(req.user.id, otherUserId);
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
        ...req.body,
        senderId: req.user.id,
      });

      const message = await storage.createMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ error: "Failed to create message" });
    }
  });

  // Add notifications routes
  app.get("/api/notifications", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const userNotifications = await storage.getNotifications(req.user.id);
      res.json(userNotifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const notification = await storage.markNotificationAsRead(parseInt(req.params.id));
      res.json(notification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  app.post("/api/notifications/mark-all-read", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      await storage.markAllNotificationsAsRead(req.user.id);
      res.sendStatus(200);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ error: "Failed to mark all notifications as read" });
    }
  });

  // Add orders routes
  app.get("/api/orders", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      console.log("Fetching orders for user:", req.user.id);

      const orders = await storage.getOrders(req.user.id);

      // Add unread comments count for each order
      const ordersWithUnreadCounts = await Promise.all(orders.map(async (order) => {
        const unreadComments = await storage.getUnreadCommentCount(order.id, req.user.id);
        return {
          ...order,
          unreadComments
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

      // Join orders with user data and add unread counts
      const ordersWithUserDetails = await Promise.all(orders.map(async (order) => {
        const user = users.find(u => u.id === order.userId);
        const unreadComments = await storage.getUnreadCommentCount(order.id, req.user!.id);
        return {
          ...order,
          unreadComments,
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

  // Add order comments routes
  app.get("/api/orders/:orderId/comments", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

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

      const orderData = {
        ...req.body,
        userId,
        status: "Sent",
      };

      const order = await storage.createOrder(orderData);

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
        createdAt: new Date(),
      });

      // Get admins and order owner
      const admins = await storage.getUsers().then(users => users.filter(u => u.is_admin));
      const orderOwner = await storage.getUser(order.userId);

      if (req.user.is_admin) {
        // Admin commented - notify the order owner
        if (orderOwner) {
          await sendCommentNotificationEmail(
            order,
            comment,
            req.user,
            orderOwner
          );
        }

        await storage.createNotification({
          userId: order.userId,
          message: `Admin commented on your order #${orderId}`,
          type: "comment",
          orderId,
        });
      } else {
        // User commented - notify all admins
        await Promise.all(admins.map(async (admin) => {
          await sendCommentNotificationEmail(
            order,
            comment,
            req.user,
            admin
          );

          await storage.createNotification({
            userId: admin.id,
            message: `${req.user?.username} commented on order #${orderId}`,
            type: "comment",
            orderId,
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

  // Update order status
  app.patch("/api/orders/:orderId/status", async (req, res) => {
    try {
      if (!req.user?.is_admin) {
        return res.status(403).json({ error: "Unauthorized: Admin access required" });
      }

      const orderId = parseInt(req.params.orderId);
      const { status } = req.body;

      // Validate status
      if (!["Sent", "Completed", "Rejected", "Revision"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const order = await storage.updateOrder(orderId, {
        status,
        dateCompleted: status === "Completed" ? new Date() : null
      });

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

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
      });

      res.json(order);
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ error: "Failed to update order status" });
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


  const httpServer = createServer(app);
  return httpServer;
}