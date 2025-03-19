import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Add domains routes
  app.get("/api/domains", async (req, res) => {
    try {
      const domains = await storage.getDomains();
      res.json(domains);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch domains" });
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
      res.status(500).json({ error: "Failed to fetch domain" });
    }
  });

  // Add orders routes
  app.get("/api/orders", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const orders = await storage.getOrders(req.user.id);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  // Add order comments routes
  app.get("/api/orders/:orderId/comments", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const comments = await storage.getOrderComments(parseInt(req.params.orderId));
      res.json(comments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  app.post("/api/orders/:orderId/comments", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const comment = await storage.createOrderComment({
        orderId: parseInt(req.params.orderId),
        userId: req.user.id,
        message: req.body.message,
      });
      res.status(201).json(comment);
    } catch (error) {
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  // Create order with initial "Sent" status
  app.post("/api/orders", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const order = await storage.createOrder({
        ...req.body,
        userId: req.user.id,
        status: "Sent",
      });
      res.status(201).json(order);
    } catch (error) {
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}