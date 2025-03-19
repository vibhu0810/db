import { users, orders, domains, orderComments, notifications } from "@shared/schema";
import type { User, InsertUser, Domain, InsertDomain, Order, OrderComment, InsertOrderComment, Notification, InsertNotification } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const MemoryStore = createMemoryStore(session);
const scryptAsync = promisify(scrypt);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User>;
  getUsers(): Promise<User[]>;

  // Domain operations
  getDomains(): Promise<Domain[]>;
  getDomain(id: number): Promise<Domain | undefined>;
  createDomain(domain: InsertDomain): Promise<Domain>;

  // Order operations
  getOrder(id: number): Promise<Order | undefined>;
  getOrders(userId: number): Promise<Order[]>;
  getAllOrders(): Promise<Order[]>;
  createOrder(order: any): Promise<Order>;
  updateOrder(id: number, updates: Partial<Order>): Promise<Order>;

  // Comment operations
  getOrderComments(orderId: number): Promise<OrderComment[]>;
  createOrderComment(comment: InsertOrderComment): Promise<OrderComment>;

  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotifications(userId: number): Promise<Notification[]>;
  markNotificationAsRead(id: number): Promise<Notification>;

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
  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }
  async getOrders(userId: number): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.userId, userId));
  }

  // Added new method to get all orders
  async getAllOrders(): Promise<Order[]> {
    return await db.select().from(orders);
  }

  async createOrder(orderData: any): Promise<Order> {
    const [order] = await db
      .insert(orders)
      .values({
        ...orderData,
        status: "Sent",
        dateOrdered: new Date(),
      })
      .returning();
    return order;
  }

  async updateOrder(id: number, updates: Partial<Order>): Promise<Order> {
    const [order] = await db
      .update(orders)
      .set(updates)
      .where(eq(orders.id, id))
      .returning();
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

  // Notification methods
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values({
        ...notificationData,
        createdAt: new Date(),
        read: false,
      })
      .returning();
    return notification;
  }

  async getNotifications(userId: number): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(id: number): Promise<Notification> {
    const [notification] = await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, id))
      .returning();
    return notification;
  }
}

export const storage = new DatabaseStorage();