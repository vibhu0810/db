import { users, orderComments } from "@shared/schema";
import type { User, InsertUser, Domain, Order, OrderComment, InsertOrderComment } from "@shared/schema";
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

  // Domain operations
  getDomains(): Promise<Domain[]>;
  getDomain(id: number): Promise<Domain | undefined>;

  // Order operations
  getOrders(userId: number): Promise<Order[]>;
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

  // Domain operations remain as MemStorage for now
  private initializeTestDomains(): Domain[] {
    const engagebay: Domain = {
      id: 1,
      websiteName: "Engagebay",
      websiteUrl: "engagebay.com",
      domainAuthority: "52",
      domainRating: "78",
      websiteTraffic: 34200,
      niche: "Marketing",
      type: "niche_edit",
      nicheEditPrice: "300",
      guestPostPrice: null,
      guidelines: "Branded anchor text is not allowed."
    };

    const powrBlog: Domain = {
      id: 2,
      websiteName: "POWR Blog",
      websiteUrl: "blog.powr.io",
      domainAuthority: "55",
      domainRating: "89",
      websiteTraffic: 18300,
      niche: "Technology",
      type: "both",
      guestPostPrice: "500",
      nicheEditPrice: "230",
      guidelines: "Linking domain must be DR 50+"
    };

    return [engagebay, powrBlog];
  }

  async getDomains(): Promise<Domain[]> {
    return this.initializeTestDomains();
  }

  async getDomain(id: number): Promise<Domain | undefined> {
    const domains = this.initializeTestDomains();
    return domains.find(d => d.id === id);
  }

  // Order operations remain as MemStorage for now
  private initializeTestOrder(userId: number): Order {
    return {
      id: 1,
      userId,
      sourceUrl: "https://example.com/blog/post1",
      targetUrl: "https://yourdomain.com",
      anchorText: "Sample Link",
      textEdit: "Please add the link here",
      notes: "Test order",
      domainAuthority: "50",
      domainRating: "60",
      websiteTraffic: 1000,
      pageTraffic: 500,
      price: "300",
      status: "Sent",
      dateOrdered: new Date().toISOString(),
      dateCompleted: null,
      title: null,
      linkUrl: null,
    };
  }

  async getOrders(userId: number): Promise<Order[]> {
    const order = this.initializeTestOrder(userId);
    return [order];
  }

  async createOrder(orderData: any): Promise<Order> {
    // For now, return a test order
    return this.initializeTestOrder(orderData.userId);
  }

  // Comment operations use database
  async getOrderComments(orderId: number): Promise<OrderComment[]> {
    return await db
      .select()
      .from(orderComments)
      .where(eq(orderComments.orderId, orderId))
      .orderBy(orderComments.createdAt);
  }

  async createOrderComment(comment: InsertOrderComment): Promise<OrderComment> {
    const [newComment] = await db
      .insert(orderComments)
      .values({
        ...comment,
        createdAt: new Date(),
      })
      .returning();
    return newComment;
  }
}

export const storage = new DatabaseStorage();