import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { generateSEOJoke } from "./openai";
import { insertMessageSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Add users route for chat
  app.get("/api/users", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Add messages routes
  app.get("/api/messages/:userId", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      const otherUserId = parseInt(req.params.userId);
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

  app.get("/api/seo-joke", async (_req, res) => {
    try {
      const joke = await generateSEOJoke();
      res.json({ joke });
    } catch (error) {
      console.error("Error getting SEO joke:", error);
      res.status(500).json({ error: "Failed to generate joke" });
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}