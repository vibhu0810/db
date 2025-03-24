import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startMetricsUpdates } from "./services/domain-metrics";
import http from 'http';

const app = express();
app.use(express.json());
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
    log("Initializing server...");
    
    // Setup Vite first - we only want it to handle non-API routes
    if (app.get("env") === "development") {
      // Register API routes first to ensure they take precedence over Vite
      await registerRoutes(app);
      
      // Then set up Vite for all other routes
      await setupVite(app, server);
    } else {
      await registerRoutes(app);
      serveStatic(app);
    }
    
    // Start domain metrics update service
    try {
      startMetricsUpdates();
      log("Domain metrics update service started");
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