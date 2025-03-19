import { users, orders, domains, reviews, notifications } from "@shared/schema";
import type { User, InsertUser, Order, InsertOrder, Domain, InsertDomain, Review, InsertReview, Notification, InsertNotification } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User>;

  // Order operations
  getOrders(userId: number): Promise<Order[]>;
  getOrder(id: number): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, order: Partial<Order>): Promise<Order>;
  deleteOrder(id: number): Promise<void>;

  // Domain operations
  getDomains(): Promise<Domain[]>;
  getDomain(id: number): Promise<Domain | undefined>;
  createDomain(domain: InsertDomain): Promise<Domain>;
  updateDomain(id: number, domain: Partial<Domain>): Promise<Domain>;

  // Review operations
  getReviews(orderId: number): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;

  // Notification operations
  getNotifications(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: number): Promise<void>;

  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private orders: Map<number, Order>;
  private domains: Map<number, Domain>;
  private reviews: Map<number, Review>;
  private notifications: Map<number, Notification>;
  private currentIds: { [key: string]: number };
  sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.orders = new Map();
    this.domains = new Map();
    this.reviews = new Map();
    this.notifications = new Map();
    this.currentIds = {
      users: 1,
      orders: 1,
      domains: 1,
      reviews: 1,
      notifications: 1,
    };
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
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
    const user = { ...insertUser, id };
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

  // Order operations
  async getOrders(userId: number): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(
      (order) => order.userId === userId,
    );
  }

  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = this.currentIds.orders++;
    const order = { ...insertOrder, id };
    this.orders.set(id, order);
    return order;
  }

  async updateOrder(id: number, update: Partial<Order>): Promise<Order> {
    const order = await this.getOrder(id);
    if (!order) throw new Error("Order not found");
    const updated = { ...order, ...update };
    this.orders.set(id, updated);
    return updated;
  }

  async deleteOrder(id: number): Promise<void> {
    this.orders.delete(id);
  }

  // Domain operations
  async getDomains(): Promise<Domain[]> {
    return Array.from(this.domains.values());
  }

  async getDomain(id: number): Promise<Domain | undefined> {
    return this.domains.get(id);
  }

  async createDomain(insertDomain: InsertDomain): Promise<Domain> {
    const id = this.currentIds.domains++;
    const domain = { ...insertDomain, id };
    this.domains.set(id, domain);
    return domain;
  }

  async updateDomain(id: number, update: Partial<Domain>): Promise<Domain> {
    const domain = await this.getDomain(id);
    if (!domain) throw new Error("Domain not found");
    const updated = { ...domain, ...update };
    this.domains.set(id, updated);
    return updated;
  }

  // Review operations
  async getReviews(orderId: number): Promise<Review[]> {
    return Array.from(this.reviews.values()).filter(
      (review) => review.orderId === orderId,
    );
  }

  async createReview(insertReview: InsertReview): Promise<Review> {
    const id = this.currentIds.reviews++;
    const review = { ...insertReview, id };
    this.reviews.set(id, review);
    return review;
  }

  // Notification operations
  async getNotifications(userId: number): Promise<Notification[]> {
    return Array.from(this.notifications.values()).filter(
      (notification) => notification.userId === userId,
    );
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const id = this.currentIds.notifications++;
    const notification = { ...insertNotification, id };
    this.notifications.set(id, notification);
    return notification;
  }

  async markNotificationRead(id: number): Promise<void> {
    const notification = this.notifications.get(id);
    if (notification) {
      this.notifications.set(id, { ...notification, read: true });
    }
  }
}

export const storage = new MemStorage();
