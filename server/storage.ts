import { users, orders, orderComments, notifications, messages } from "@shared/schema";
import type {
  User, InsertUser, Domain, InsertDomain,
  Order, OrderComment, InsertOrderComment,
  Notification, InsertNotification,
  Message, InsertMessage
} from "@shared/schema";
import { db } from "./db";
import { eq, or, and, desc } from "drizzle-orm";
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
  deleteOrder(id: number): Promise<void>;

  // Comment operations
  getOrderComments(orderId: number): Promise<OrderComment[]>;
  createOrderComment(comment: InsertOrderComment): Promise<OrderComment>;
  getUnreadCommentCount(orderId: number, userId: number): Promise<number>;
  markCommentsAsRead(orderId: number, userId: number): Promise<void>;

  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotifications(userId: number): Promise<Notification[]>;
  markNotificationAsRead(id: number): Promise<Notification>;
  markAllNotificationsAsRead(userId: number): Promise<void>;

  // Message operations
  getMessages(userId1: number, userId2: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

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

  async deleteOrder(id: number): Promise<void> {
    try {
      // First delete any associated comments to maintain referential integrity
      await db.delete(orderComments).where(eq(orderComments.orderId, id));
      // Then delete the order
      await db.delete(orders).where(eq(orders.id, id));
    } catch (error) {
      console.error('Error deleting order:', error);
      throw new Error('Failed to delete order');
    }
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

  async getUnreadCommentCount(orderId: number, userId: number): Promise<number> {
    try {
      const comments = await db
        .select()
        .from(orderComments)
        .where(eq(orderComments.orderId, orderId));

      // For admin, count unread comments from users
      // For users, count unread comments from admin
      const unreadComments = comments.filter(comment => {
        const isAdminComment = comment.isFromAdmin;
        const isUser = !comment.isFromAdmin;
        return (isAdminComment && !comment.readByUser) || (isUser && !comment.readByAdmin);
      });

      return unreadComments.length;
    } catch (error) {
      console.error('Error getting unread comment count:', error);
      return 0;
    }
  }

  async markCommentsAsRead(orderId: number, userId: number): Promise<void> {
    try {
      const user = await this.getUser(userId);
      if (!user) return;

      // Update read status based on user role
      if (user.is_admin) {
        await db
          .update(orderComments)
          .set({ readByAdmin: true })
          .where(eq(orderComments.orderId, orderId));
      } else {
        await db
          .update(orderComments)
          .set({ readByUser: true })
          .where(eq(orderComments.orderId, orderId));
      }
    } catch (error) {
      console.error('Error marking comments as read:', error);
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

  async markAllNotificationsAsRead(userId: number): Promise<void> {
    try {
      await db
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.userId, userId));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw new Error('Failed to mark all notifications as read');
    }
  }

  // Message methods
  async getMessages(userId1: number, userId2: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(
        or(
          and(
            eq(messages.senderId, userId1),
            eq(messages.receiverId, userId2)
          ),
          and(
            eq(messages.senderId, userId2),
            eq(messages.receiverId, userId1)
          )
        )
      )
      .orderBy(messages.createdAt);
  }

  async createMessage(messageData: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values({
        ...messageData,
        createdAt: new Date(),
      })
      .returning();
    return message;
  }
}

export const storage = new DatabaseStorage();