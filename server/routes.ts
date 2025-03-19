import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertOrderSchema, insertDomainSchema, insertReviewSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Order routes
  app.get("/api/orders", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const orders = await storage.getOrders(req.user.id);
    res.json(orders);
  });

  app.post("/api/orders", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const order = await storage.createOrder({
      ...insertOrderSchema.parse(req.body),
      userId: req.user.id,
    });
    res.status(201).json(order);
  });

  app.patch("/api/orders/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const orderId = parseInt(req.params.id);
    const order = await storage.getOrder(orderId);

    if (!order || order.userId !== req.user.id) {
      return res.sendStatus(404);
    }

    const updateData = { ...req.body };

    // If status is being updated to Completed, set dateCompleted
    if (updateData.status === "Completed" && order.status !== "Completed") {
      updateData.dateCompleted = new Date();
    }

    // If status is being changed from Completed, clear dateCompleted
    if (updateData.status && updateData.status !== "Completed") {
      updateData.dateCompleted = null;
    }

    const updated = await storage.updateOrder(order.id, updateData);
    res.json(updated);
  });

  app.delete("/api/orders/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const order = await storage.getOrder(parseInt(req.params.id));
    if (!order || order.userId !== req.user.id) return res.sendStatus(404);
    await storage.deleteOrder(order.id);
    res.sendStatus(200);
  });

  // Domain routes
  app.get("/api/domains", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const domains = await storage.getDomains();
    res.json(domains);
  });

  app.post("/api/domains", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const domain = await storage.createDomain(insertDomainSchema.parse(req.body));
    res.status(201).json(domain);
  });

  app.get("/api/domains/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const domain = await storage.getDomain(parseInt(req.params.id));
    if (!domain) return res.sendStatus(404);
    res.json(domain);
  });

  // Review routes
  app.get("/api/orders/:id/reviews", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const reviews = await storage.getReviews(parseInt(req.params.id));
    res.json(reviews);
  });

  app.post("/api/orders/:id/reviews", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const review = await storage.createReview({
      ...insertReviewSchema.parse(req.body),
      orderId: parseInt(req.params.id),
      userId: req.user.id,
    });
    res.status(201).json(review);
  });

  // Notification routes
  app.get("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const notifications = await storage.getNotifications(req.user.id);
    res.json(notifications);
  });

  app.post("/api/notifications/:id/read", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await storage.markNotificationRead(parseInt(req.params.id));
    res.sendStatus(200);
  });

  // User profile routes
  app.patch("/api/profile", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const schema = z.object({
      companyName: z.string().optional(),
      companyLogo: z.string().optional(),
    });
    const update = schema.parse(req.body);
    const user = await storage.updateUser(req.user.id, update);
    res.json(user);
  });

  const httpServer = createServer(app);
  return httpServer;
}