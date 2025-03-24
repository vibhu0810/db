import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startMetricsUpdates } from "./services/domain-metrics";
import http from 'http';
import { setupAuth } from "./auth";
import cors from 'cors';

const app = express();

// Apply global middleware
// 1. CORS setup for development environment
app.use(cors({
  origin: process.env.NODE_ENV === "production" ? false : true,
  credentials: true
}));

// 2. Body parsing
app.use(express.json({limit: '10mb'}));
app.use(express.urlencoded({ extended: false }));

// Create HTTP server
const server = http.createServer(app);

// Add request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

// Initialize server with error handling
(async () => {
  try {    
    // Set up authentication first - must be done before registering routes!
    setupAuth(app);
    
    // Register API routes
    await registerRoutes(app);
    
    // Setup Vite for development or static files for production
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }
    
    // Start domain metrics update service
    try {
      startMetricsUpdates();
    } catch (error) {
      console.error("Failed to start domain metrics service:", error);
      // Continue server startup even if metrics service fails
    }

    // Global error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error("Server error:", err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });

    // Start server
    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
    }, () => {
      log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();