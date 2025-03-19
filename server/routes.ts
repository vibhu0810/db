import type { Express } from "express";
import { createServer, type Server } from "http";
import { createUploadthing } from "uploadthing/server";
import { uploadRouter } from "./uploadthing";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { generateSEOJoke } from "./openai";
import { insertDomainSchema, insertOrderSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Add uploadthing route
  console.log("Setting up UploadThing Express handler...");
  const { createUploadthingExpressHandler } = await import("uploadthing/express");
  app.use("/api/uploadthing", async (req, res, next) => {
    console.log("Received upload request:", req.method, req.url);
    try {
      await createUploadthingExpressHandler({
        router: uploadRouter,
        config: { callbackUrl: "/api/uploadthing" }
      })(req, res, next);
    } catch (error) {
      console.error("Error in upload handler:", error);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  // Add user statistics route for admin
  app.get("/api/users/stats", async (req, res) => {
    try {
      if (!req.user?.is_admin) {
        return res.status(403).json({ error: "Unauthorized: Admin access required" });
      }

      const fromDate = req.query.from ? new Date(req.query.from as string) : undefined;
      const toDate = req.query.to ? new Date(req.query.to as string) : undefined;

      const users = await storage.getUsers();
      const orders = await storage.getAllOrders();

      const usersWithStats = users
        .filter(user => !user.is_admin) // Filter out admin users
        .map(user => {
          const userOrders = orders
            .filter(order => order.userId === user.id)
            .filter(order => {
              if (!fromDate || !toDate) return true;
              const orderDate = new Date(order.dateOrdered);
              return orderDate >= fromDate && orderDate <= toDate;
            });

          const stats = {
            total: userOrders.length,
            completed: userOrders.filter(o => o.status === "Completed").length,
            pending: userOrders.filter(o => o.status === "Sent").length,
            totalSpent: userOrders.reduce((sum, order) => sum + Number(order.price), 0)
          };

          return {
            ...user,
            orders: stats
          };
        });

      res.json(usersWithStats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ error: "Failed to fetch user statistics" });
    }
  });

  // Add profile update route
  app.patch("/api/user/profile", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const updatedUser = await storage.updateUser(req.user.id, req.body);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Add domains routes with logging
  app.get("/api/domains", async (req, res) => {
    try {
      console.log("Fetching domains...");
      const domains = await storage.getDomains();
      console.log("Retrieved domains:", domains);
      res.json(domains);
    } catch (error) {
      console.error("Error fetching domains:", error);
      res.status(500).json({ error: "Failed to fetch domains" });
    }
  });

  // Add domain creation route
  app.post("/api/domains", async (req, res) => {
    try {
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

  // Add orders routes with logging
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

  // Add order comments routes
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

      // Create notifications
      const admins = await storage.getUsers().then(users => users.filter(u => u.is_admin));

      if (req.user.is_admin) {
        // Admin commented - notify the order owner
        await storage.createNotification({
          userId: order.userId,
          message: `Admin commented on your order #${orderId}`,
          type: "comment",
          orderId,
        });
      } else {
        // User commented - notify all admins
        await Promise.all(admins.map(admin =>
          storage.createNotification({
            userId: admin.id,
            message: `${req.user?.username} commented on order #${orderId}`,
            type: "comment",
            orderId,
          })
        ));
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

  // Create new order
  app.post("/api/orders", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      const orderData = {
        ...req.body,
        userId: req.user.id,
        status: "Sent",
      };

      const order = await storage.createOrder(orderData);

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

  app.get("/api/seo-joke", async (_req, res) => {
    try {
      const joke = await generateSEOJoke();
      res.json({ joke });
    } catch (error) {
      console.error("Error getting SEO joke:", error);
      res.status(500).json({ error: "Failed to generate joke" });
    }
  });

  // Update the GET /api/orders/all route for admin similarly
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


  // Add DELETE order route
  app.delete("/api/orders/:orderId", async (req, res) => {
    try {
      if (!req.user?.is_admin) {
        return res.status(403).json({ error: "Unauthorized: Admin access required" });
      }

      const orderId = parseInt(req.params.orderId);
      const order = await storage.getOrder(orderId);

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      await storage.deleteOrder(orderId);

      res.sendStatus(204);
    } catch (error) {
      console.error("Error deleting order:", error);
      res.status(500).json({ error: "Failed to delete order" });
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

  // Add an endpoint to mark all notifications as read
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

  // Add PATCH route for updating orders
  app.patch("/api/orders/:orderId", async (req, res) => {
    try {
      if (!req.user?.is_admin) {
        return res.status(403).json({ error: "Unauthorized: Admin access required" });
      }

      const orderId = parseInt(req.params.orderId);
      const order = await storage.getOrder(orderId);

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      const updatedOrder = await storage.updateOrder(orderId, req.body);

      // Create notification for the order owner about the update
      await storage.createNotification({
        userId: order.userId,
        message: `Your order #${orderId} has been updated by admin`,
        type: "update",
        orderId,
      });

      res.json(updatedOrder);
    } catch (error) {
      console.error("Error updating order:", error);
      res.status(500).json({ error: "Failed to update order" });
    }
  });

  // Add an endpoint to mark comments as read when opening the comments sheet
  app.post("/api/orders/:orderId/comments/read", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      const orderId = parseInt(req.params.orderId);
      await storage.markCommentsAsRead(orderId, req.user.id);

      res.sendStatus(200);
    } catch (error) {
      console.error("Error marking comments as read:", error);
      res.status(500).json({ error: "Failed to mark comments as read" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}