import express from 'express';
import { type Server } from 'http';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { type IncomingMessage, type ServerResponse } from 'http';

/**
 * Logging utility for the test environment
 */
export function log(message: string, source = "test-express") {
  console.log(`[${source}] ${message}`);
}

/**
 * Sets up Vite development server for the test environment
 * This handles serving the test client application
 */
export async function setupTestVite(app: express.Express, server: Server) {
  // Check if we're in production mode
  const isProd = process.env.NODE_ENV === 'production';
  
  // Set up Vite middleware for development
  if (!isProd) {
    try {
      // Create a Vite dev server instance
      const vite = await createViteServer({
        server: { 
          middlewareMode: true,
          hmr: {
            server: server,
          },
          fs: {
            allow: ['./test/client']
          }
        },
        root: './test/client',
        base: '/test/',
        appType: 'spa',
        optimizeDeps: {
          // Force these to be pre-bundled
          include: ['react', 'react-dom', 'wouter']
        },
        logLevel: 'info'
      });

      // Use Vite's middleware
      app.use(vite.middlewares);

      log("Test Vite development server initialized");
    } catch (error) {
      console.error("Failed to set up test Vite server:", error);
      throw error;
    }
  } else {
    // Production mode - serve the built client files
    serveTestStatic(app);
    log("Serving built test client in production mode");
  }
}

/**
 * Serve static files for the test client in production mode
 */
export function serveTestStatic(app: express.Express) {
  const testClientDir = path.resolve(__dirname, '../test/client/dist');
  
  // Check if the build directory exists
  if (fs.existsSync(testClientDir)) {
    // Serve static assets from the test client build
    app.use('/test/assets', express.static(path.join(testClientDir, 'assets')));
    
    // Handle all routes under /test/ to serve the index.html
    app.get('/test*', (req, res) => {
      res.sendFile(path.join(testClientDir, 'index.html'));
    });
    
    log("Serving static files from test client build");
  } else {
    log("Warning: Test client build directory not found", "test-express-error");
  }
}