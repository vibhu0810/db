import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  try {
    console.log('Starting password comparison');

    // Clean up the password string by removing any quotes
    supplied = supplied.replace(/['"]/g, '');
    console.log('Cleaned supplied password:', supplied, 'Length:', supplied.length);

    const [hashedHex, salt] = stored.split(".");
    if (!hashedHex || !salt) {
      console.log('Invalid stored password format - missing hash or salt');
      return false;
    }

    console.log('Salt:', salt, 'Length:', salt.length);
    console.log('Computing hash for supplied password');
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    const storedBuf = Buffer.from(hashedHex, 'hex');

    console.log('Comparing hashes');
    console.log('Supplied hash length:', suppliedBuf.length);
    console.log('Stored hash length:', storedBuf.length);

    const result = timingSafeEqual(storedBuf, suppliedBuf);
    console.log('Password comparison result:', result);

    return result;
  } catch (error) {
    console.error('Error in comparePasswords:', error);
    return false;
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log('Login attempt with:', username);
        let user;
        
        // First, try to find the user by username
        user = await storage.getUserByUsername(username);
        
        // If not found, check if username input is actually an email
        if (!user && username.includes('@')) {
          console.log('Trying to login with email:', username);
          user = await storage.getUserByEmail(username);
          
          // We only allow login with verified emails
          if (user && !user.emailVerified) {
            console.log('Email not verified:', username);
            return done(null, false, { message: "Email address not verified. Please verify your email first." });
          }
        }

        if (!user) {
          console.log('User not found:', username);
          return done(null, false, { message: "Invalid username or password" });
        }

        console.log('Found user:', user.username);
        
        const isValid = await comparePasswords(password, user.password);
        console.log('Password validation result:', isValid);

        if (!isValid) {
          return done(null, false, { message: "Invalid username or password" });
        }

        return done(null, user);
      } catch (error) {
        console.error('Authentication error:', error);
        return done(error);
      }
    })
  );

  passport.serializeUser((user, done) => {
    console.log('Serializing user:', user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log('Deserializing user:', id);
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      console.error('Deserialize error:', error);
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const hashedPassword = await hashPassword(req.body.password);
      console.log('Creating new user:', req.body.username);
      console.log('Generated hash:', hashedPassword);

      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log('Login request received for:', req.body.username);

    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error('Authentication error:', err);
        return next(err);
      }
      if (!user) {
        console.log('Authentication failed:', info?.message);
        return res.status(401).json({ error: info?.message || "Authentication failed" });
      }
      req.login(user, (err) => {
        if (err) {
          console.error('Login error:', err);
          return next(err);
        }
        console.log('Login successful for:', user.username);
        res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    console.log("GET /api/user called, authenticated:", req.isAuthenticated());
    console.log("Session ID:", req.sessionID);
    console.log("Session:", req.session);
    console.log("User:", req.user);
    
    if (!req.isAuthenticated()) {
      console.log("User not authenticated");
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json(req.user);
  });
  
  // Debug endpoint to check auth status
  app.get("/api/auth-status", (req, res) => {
    console.log("GET /api/auth-status called");
    console.log("Session ID:", req.sessionID);
    console.log("Is authenticated:", req.isAuthenticated());
    
    const status = {
      isAuthenticated: req.isAuthenticated(),
      sessionID: req.sessionID,
      sessionExists: !!req.session,
      sessionData: req.session,
      userExists: !!req.user,
      // Only include user data if authenticated
      user: req.isAuthenticated() ? req.user : null,
    };
    
    console.log("Auth status:", JSON.stringify(status, null, 2));
    res.json(status);
  });
}