import { users } from "@shared/schema";
import type { User, InsertUser } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const MemoryStore = createMemoryStore(session);
const scryptAsync = promisify(scrypt);

// Helper function to hash password for initial data
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User>;

  // Session store
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private currentIds: { [key: string]: number };
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.currentIds = {
      users: 2, // Start from 2 since we have one initial user
    };
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // Clear expired entries every 24h
    });

    // Initialize with a test user
    this.initializeTestUser();
  }

  private async initializeTestUser() {
    const hashedPassword = await hashPassword("test123");
    const testUser: User = {
      id: 1,
      username: "testuser",
      password: hashedPassword,
      companyName: "Test Company",
      companyLogo: null
    };
    this.users.set(testUser.id, testUser);
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentIds.users++;
    const user = { 
      ...insertUser, 
      id,
      companyName: insertUser.companyName || null,
      companyLogo: insertUser.companyLogo || null
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, update: Partial<User>): Promise<User> {
    const user = await this.getUser(id);
    if (!user) throw new Error("User not found");
    const updated = { ...user, ...update };
    this.users.set(id, updated);
    return updated;
  }
}

export const storage = new MemStorage();