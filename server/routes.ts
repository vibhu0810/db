import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { generateSEOJoke, generateWelcomeMessage } from "./openai";
import { insertMessageSchema, insertDomainSchema, updateProfileSchema } from "@shared/schema";
import {
  sendOrderNotificationEmail,
  sendCommentNotificationEmail,
  sendStatusUpdateEmail,
  sendChatNotificationEmail
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
  for (const [userId, data] of onlineUsers.entries()) {
    if (now - data.lastActive > OFFLINE_THRESHOLD) {
      onlineUsers.delete(userId);
    }
  }
}, 60000); // Clean up every minute

const GUEST_POST_STATUSES = [
  "Title Approval Pending",
  "Title Approved",
  "Content Writing",
  "Sent To Editor",
  "Completed",
  "Rejected",
  "Cancelled"
] as const;

const NICHE_EDIT_STATUSES = [
  "In Progress",
  "Sent",
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
        // Admins see all non-admin users
        users = users.filter(u => !u.is_admin);
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

  // Get a single order by ID
  app.get("/api/orders/:id", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

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
      
      console.log("Order found:", order);
      res.json(order);
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ error: "Failed to fetch order" });
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
      
      res.json(unreadCounts);
    } catch (error) {
      console.error("Error fetching unread comments:", error);
      res.status(500).json({ error: "Failed to get unread comment counts" });
    }
  });
  
  // Mark comments as read for an order
  app.post("/api/orders/:orderId/comments/read", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    try {
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

      // Set initial status based on type
      const initialStatus = orderType === "guest_post" ? "Title Approval Pending" : "In Progress";

      const orderData = {
        ...req.body,
        userId,
        status: initialStatus,
        dateOrdered: new Date(),
      };

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

  // Update order status
  app.patch("/api/orders/:orderId/status", async (req, res) => {
    try {
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

        // Check if order is a niche edit order (no title means it's a niche edit)
        if (order.title !== null) {
          return res.status(400).json({ error: "Only Niche Edit orders can be cancelled" });
        }

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
        billingAddress: updatedUser.billingAddress,
        bio: updatedUser.bio,
        profilePicture: updatedUser.profilePicture,
        companyLogo: updatedUser.companyLogo,
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

  // Configure UploadThing routes
  app.use("/api/uploadthing", uploadthingHandler);

  const httpServer = createServer(app);
  return httpServer;
}