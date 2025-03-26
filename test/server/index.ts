import express, { type Express, type Request, type Response, NextFunction } from "express";
import { db } from "./db";
import session from "express-session";
import { storage } from "./storage";
import cors from "cors";
import passport from "passport";
import logger from "console-log-level";
import { setupAuth } from "./auth";
import { registerRoutes } from "./routes";

const log = logger({
  prefix: level => `${new Date().toISOString()} [test-${level}]`,
  level: 'info'
});

/**
 * Initialize the test environment.
 * This sets up database connections, auth, and any other required middleware or services.
 */
export async function initializeTestEnvironment() {
  // Initialize Database Connection
  try {
    await db.$executeQuery({ text: 'SELECT 1' });
    log.info("Test database connection established");
  } catch (error) {
    log.error("Failed to connect to test database:", error);
    throw new Error("Test database connection failed");
  }

  // Set up API routes for the test environment
  const app = express.Router();

  // Add middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Set up session
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "test-session-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
      },
      store: storage.sessionStore,
    })
  );

  // Set up authentication
  app.use(passport.initialize());
  app.use(passport.session());
  setupAuth(app as unknown as Express);

  // Register test API routes
  app.get("/api/test/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", environment: "test" });
  });

  // Feedback system API endpoints
  app.get("/api/test/feedback-questions", async (_req: Request, res: Response) => {
    try {
      const questions = await storage.getFeedbackQuestions();
      res.json({ questions });
    } catch (error) {
      log.error("Failed to fetch feedback questions:", error);
      res.status(500).json({ error: "Failed to fetch feedback questions" });
    }
  });

  app.get("/api/test/feedback-campaigns", async (_req: Request, res: Response) => {
    try {
      const campaigns = await storage.getAllFeedback();
      res.json({ campaigns });
    } catch (error) {
      log.error("Failed to fetch feedback campaigns:", error);
      res.status(500).json({ error: "Failed to fetch feedback campaigns" });
    }
  });

  // Register the test API routes with the main Express app
  express().use(app);

  log.info("Test environment initialized successfully");
  return app;
}