import type { Express } from "express";
import { createServer, type Server } from "http";
import { createUploadthing } from "uploadthing/server";
import { uploadRouter } from "./uploadthing";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { generateWelcomeMessage, getBusinessInsight } from "./openai";

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
      console.log('Retrieved comments:', comments); // Add logging
      res.json(comments);
    } catch (error) {
      console.error('Error fetching comments:', error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  // Update the comment creation route
  app.post("/api/orders/:orderId/comments", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      const comment = await storage.createOrderComment({
        orderId: parseInt(req.params.orderId),
        userId: req.user.id,
        message: req.body.message,
      });

      console.log('Created new comment:', comment); // Add logging
      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
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

  // Add welcome message route
  app.get("/api/welcome-message", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      const welcomeMessage = await generateWelcomeMessage(
        req.user.username,
        req.user.companyName
      );

      const businessInsight = await getBusinessInsight(req.user.companyName);

      res.json({ welcomeMessage, businessInsight });
    } catch (error) {
      console.error("Error getting welcome message:", error);
      res.status(500).json({ error: "Failed to generate welcome message" });
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}