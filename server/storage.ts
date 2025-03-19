import { users, orders, domains, orderComments } from "@shared/schema";
import type { User, InsertUser, Domain, InsertDomain, Order, OrderComment, InsertOrderComment } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const MemoryStore = createMemoryStore(session);
const scryptAsync = promisify(scrypt);

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
  getUsers(): Promise<User[]>;  // Added this method

  // Domain operations
  getDomains(): Promise<Domain[]>;
  getDomain(id: number): Promise<Domain | undefined>;
  createDomain(domain: InsertDomain): Promise<Domain>;

  // Order operations
  getOrders(userId: number): Promise<Order[]>;
  getAllOrders(): Promise<Order[]>;  // Added this method
  createOrder(order: any): Promise<Order>;

  // Comment operations
  getOrderComments(orderId: number): Promise<OrderComment[]>;
  createOrderComment(comment: InsertOrderComment): Promise<OrderComment>;

  // Session store
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, update: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(update)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Added new method to get all users
  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Domain operations
  async getDomains(): Promise<Domain[]> {
    return await db.select().from(domains);
  }

  async getDomain(id: number): Promise<Domain | undefined> {
    const [domain] = await db.select().from(domains).where(eq(domains.id, id));
    return domain;
  }

  async createDomain(domainData: InsertDomain): Promise<Domain> {
    const [domain] = await db.insert(domains).values(domainData).returning();
    return domain;
  }

  // Order operations
  async getOrders(userId: number): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.userId, userId));
  }

  // Added new method to get all orders
  async getAllOrders(): Promise<Order[]> {
    return await db.select().from(orders);
  }

  async createOrder(orderData: any): Promise<Order> {
    const [order] = await db.insert(orders).values(orderData).returning();
    return order;
  }

  // Comment operations
  async getOrderComments(orderId: number): Promise<OrderComment[]> {
    try {
      const comments = await db
        .select()
        .from(orderComments)
        .where(eq(orderComments.orderId, orderId))
        .orderBy(orderComments.createdAt);

      console.log('Retrieved comments:', comments);
      return comments;
    } catch (error) {
      console.error('Error fetching comments:', error);
      throw new Error('Failed to fetch comments');
    }
  }

  async createOrderComment(comment: InsertOrderComment): Promise<OrderComment> {
    try {
      const [newComment] = await db
        .insert(orderComments)
        .values({
          orderId: comment.orderId,
          userId: comment.userId,
          message: comment.message,
        })
        .returning();

      if (!newComment) {
        throw new Error('Failed to create comment');
      }

      console.log('Created new comment:', newComment);
      return newComment;
    } catch (error) {
      console.error('Error creating comment:', error);
      throw new Error('Failed to create comment');
    }
  }
}

export const storage = new DatabaseStorage();