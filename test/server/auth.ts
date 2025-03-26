import { Express, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import session from 'express-session';
import * as crypto from 'crypto';
import { storage } from './storage';
import { User } from '../shared/schema';
import dotenv from 'dotenv';

dotenv.config();

// Define the User interface for the Express session
declare global {
  namespace Express {
    interface User extends User {}
  }
}

// Password hashing function using PBKDF2
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Generate a random salt
    const salt = crypto.randomBytes(16).toString('hex');
    
    // Use PBKDF2 to hash the password
    crypto.pbkdf2(password, salt, 1000, 64, 'sha512', (err, derivedKey) => {
      if (err) reject(err);
      resolve(derivedKey.toString('hex') + '.' + salt);
    });
  });
}

// Password comparison function
export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    // Extract the salt from the stored password
    const [hash, salt] = stored.split('.');
    
    // Hash the supplied password using the same salt
    crypto.pbkdf2(supplied, salt, 1000, 64, 'sha512', (err, derivedKey) => {
      if (err) reject(err);
      resolve(derivedKey.toString('hex') === hash);
    });
  });
}

// Setup authentication middleware
export function setupAuth(app: Express) {
  // Configure session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'test-session-secret',
      resave: false,
      saveUninitialized: false,
      store: storage.sessionStore,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
      }
    })
  );

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure local strategy for username/password authentication
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Find the user by username
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: 'Invalid username' });
        }

        // Verify the password
        const isValid = await comparePasswords(password, user.password);
        if (!isValid) {
          return done(null, false, { message: 'Invalid password' });
        }

        // Update last login timestamp
        await storage.updateUser(user.id, { last_login: new Date() });

        // Return the authenticated user
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

  // Serialize user to the session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from the session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Middleware to check if the user is authenticated
  const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: 'Not authenticated' });
  };

  // Middleware to check if the user has a specific role
  const hasRole = (role: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      if (req.user.role !== role && !req.user.is_admin) {
        return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
      }
      
      return next();
    };
  };

  // Middleware to check if the user is an admin
  const isAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    if (!req.user.is_admin) {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    
    return next();
  };

  // Middleware to check if the user is a manager (user_manager or inventory_manager)
  const isManager = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const isUserManager = req.user.role === 'user_manager';
    const isInventoryManager = req.user.role === 'inventory_manager';
    
    if (!isUserManager && !isInventoryManager && !req.user.is_admin) {
      return res.status(403).json({ message: 'Access denied. Manager privileges required.' });
    }
    
    return next();
  };

  // Middleware to check if user has organization admin privileges
  const isOrganizationAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    // Check if this user is the organization owner or admin
    const organizationId = req.params.organizationId || req.body.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }
    
    // Admins can access any organization
    if (req.user.is_admin) {
      return next();
    }
    
    // Check if user is the organization owner
    if (req.user.organization_id === parseInt(organizationId as string)) {
      return next();
    }
    
    return res.status(403).json({ message: 'Access denied. Organization admin privileges required.' });
  };

  // Export middleware for use in routes
  return {
    isAuthenticated,
    hasRole,
    isAdmin,
    isManager,
    isOrganizationAdmin
  };
}