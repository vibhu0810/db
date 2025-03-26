import express, { Express, Request, Response, NextFunction } from 'express';
import { registerRoutes } from './routes';
import bodyParser from 'body-parser';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import logger from 'console-log-level';

// Load environment variables
dotenv.config();

// Setup logger
const log = logger({
  level: process.env.LOG_LEVEL || 'info',
  prefix: function (level: string) {
    return `${new Date().toLocaleTimeString()} [test-express] ${level.toUpperCase()}`;
  }
});

// Create Express app
const app: Express = express();

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Log requests
app.use((req: Request, _res: Response, next: NextFunction) => {
  log.debug(`${req.method} ${req.path}`);
  next();
});

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  log.error('Error:', err);
  res.status(500).json({
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message
  });
});

// Healthcheck route
app.get('/api/test/healthcheck', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'API is running' });
});

// Initialize the test environment and register routes
async function initializeTestEnvironment() {
  try {
    log.info('Initializing test environment...');
    
    // Register all API routes
    const server = await registerRoutes(app);
    
    // Log that routes are registered
    log.info('Test API routes registered');
    
    // Return the server instance
    return server;
  } catch (error) {
    log.error('Failed to initialize test environment:', error);
    throw error;
  }
}

// Start the server if this is the main module
if (require.main === module) {
  const port = process.env.TEST_PORT || 5050;
  
  initializeTestEnvironment()
    .then(server => {
      log.info(`Test server running on port ${port}`);
    })
    .catch(error => {
      log.error('Failed to start test server:', error);
      process.exit(1);
    });
}

// Export for testing/importing
export { app, initializeTestEnvironment };