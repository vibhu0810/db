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
      console.log("Retrieved orders:", orders);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  // Add order comments routes
  app.get("/api/orders/:orderId/comments", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const comments = await storage.getOrderComments(parseInt(req.params.orderId));
      console.log('Retrieved comments:', comments);
      res.json(comments);
    } catch (error) {
      console.error('Error fetching comments:', error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  // Create order with validation
  app.post("/api/orders", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      console.log("Creating order with data:", { ...req.body, userId: req.user.id });
      const orderData = {
        ...req.body,
        userId: req.user.id,
        status: "Sent",
      };
      const order = await storage.createOrder(orderData);
      console.log("Created order:", order);
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

  // Add this route for admin to get all orders with user details
  app.get("/api/orders/all", async (req, res) => {
    try {
      if (!req.user?.is_admin) {
        return res.status(403).json({ error: "Unauthorized: Admin access required" });
      }

      const orders = await storage.getAllOrders();
      const users = await storage.getUsers();

      // Join orders with user data
      const ordersWithUserDetails = orders.map(order => {
        const user = users.find(u => u.id === order.userId);
        return {
          ...order,
          user: user ? {
            username: user.username,
            companyName: user.companyName,
            email: user.email
          } : null
        };
      });

      res.json(ordersWithUserDetails);
    } catch (error) {
      console.error("Error fetching all orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });


  // Add this route for updating order status
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

      res.json(order);
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ error: "Failed to update order status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}