import { users } from "@shared/schema";
import type { User, InsertUser } from "@shared/schema";
import type { Domain, InsertDomain, Order, OrderComment, InsertOrderComment } from "@shared/schema";
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
  createDomain(domain: InsertDomain): Promise<Domain>;

  // Order operations
  getOrders(userId: number): Promise<Order[]>;
  createOrder(order: any): Promise<Order>;

  // Comment operations
  getOrderComments(orderId: number): Promise<OrderComment[]>;
  createOrderComment(comment: InsertOrderComment): Promise<OrderComment>;

  // Session store
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private domains: Map<number, Domain>;
  private orders: Map<number, Order>;
  private comments: Map<number, OrderComment>;
  private currentIds: { [key: string]: number };
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.domains = new Map();
    this.orders = new Map();
    this.comments = new Map();
    this.currentIds = {
      users: 2,
      domains: 3,
      orders: 1,
      comments: 1,
    };
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });

    // Initialize with test data
    this.initializeTestUser();
    this.initializeTestDomains();
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

  private initializeTestDomains() {
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

    this.domains.set(engagebay.id, engagebay);
    this.domains.set(powrBlog.id, powrBlog);
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

  // Domain operations
  async getDomains(): Promise<Domain[]> {
    return Array.from(this.domains.values());
  }

  async getDomain(id: number): Promise<Domain | undefined> {
    return this.domains.get(id);
  }

  async createDomain(domain: InsertDomain): Promise<Domain> {
    const id = this.currentIds.domains++;
    const newDomain = {
      ...domain,
      id,
      domainAuthority: domain.domainAuthority || null,
      domainRating: domain.domainRating || null,
      websiteTraffic: domain.websiteTraffic || null,
      guestPostPrice: domain.guestPostPrice || null,
      nicheEditPrice: domain.nicheEditPrice || null,
      guidelines: domain.guidelines || null,
    };
    this.domains.set(id, newDomain);
    return newDomain;
  }

  // Order operations
  async getOrders(userId: number): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(order => order.userId === userId);
  }

  async createOrder(orderData: any): Promise<Order> {
    const id = this.currentIds.orders++;
    const order = {
      ...orderData,
      id,
      dateOrdered: new Date().toISOString(),
      dateCompleted: null,
    };
    this.orders.set(id, order);
    return order;
  }

  // Comment operations
  async getOrderComments(orderId: number): Promise<OrderComment[]> {
    return Array.from(this.comments.values())
      .filter(comment => comment.orderId === orderId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async createOrderComment(comment: InsertOrderComment): Promise<OrderComment> {
    const id = this.currentIds.comments++;
    const newComment = {
      ...comment,
      id,
      createdAt: new Date().toISOString(),
    };
    this.comments.set(id, newComment);
    return newComment;
  }
}

export const storage = new MemStorage();