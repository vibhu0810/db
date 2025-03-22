import { users, orders, orderComments, notifications, messages, domains } from "@shared/schema";
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

const MemoryStore = createMemoryStore(session);

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
  updateDomain(id: number, domain: Partial<Domain>): Promise<Domain>;

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

  async updateDomain(id: number, updates: Partial<Domain>): Promise<Domain> {
    const [domain] = await db
      .update(domains)
      .set(updates)
      .where(eq(domains.id, id))
      .returning();
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
      // First verify the order exists
      const order = await this.getOrder(id);
      if (!order) {
        throw new Error(`Order ${id} not found`);
      }

      console.log(`Starting deletion process for order ${id}`);

      // Delete comments first
      await db
        .delete(orderComments)
        .where(eq(orderComments.orderId, id))
        .execute();

      console.log(`Deleted comments for order ${id}`);

      // Delete notifications related to the order by matching the message content
      await db
        .delete(notifications)
        .where(eq(notifications.type, 'order'))
        .execute();

      console.log(`Deleted notifications for order ${id}`);

      // Delete the order
      const result = await db
        .delete(orders)
        .where(eq(orders.id, id))
        .returning();

      if (!result.length) {
        throw new Error(`Order ${id} could not be deleted`);
      }

      console.log(`Successfully deleted order ${id}`);
    } catch (error) {
      console.error('Error in deleteOrder:', error);
      throw error;
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

  async createOrderComment(comment: InsertOrderComment & { isFromAdmin?: boolean }): Promise<OrderComment> {
    try {
      const isFromAdmin = comment.isFromAdmin || false;

      const [newComment] = await db
        .insert(orderComments)
        .values({
          orderId: comment.orderId,
          userId: comment.userId,
          message: comment.message,
          isFromAdmin: isFromAdmin,
          readByUser: isFromAdmin ? false : true, // If from admin, not read by user yet
          readByAdmin: isFromAdmin ? true : false, // If from admin, already read by admin
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
      const user = await this.getUser(userId);
      if (!user) return 0;
      
      const comments = await db
        .select()
        .from(orderComments)
        .where(eq(orderComments.orderId, orderId));

      // For admin, count unread comments from users
      // For users, count unread comments from admin
      const unreadComments = comments.filter(comment => {
        if (user.is_admin) {
          // Admin should see unread comments from users (non-admin comments)
          return !comment.isFromAdmin && !comment.readByAdmin;
        } else {
          // Regular users should see unread comments from admins
          return comment.isFromAdmin && !comment.readByUser;
        }
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
    console.log('Fetching messages between users:', userId1, userId2);
    const messageResults = await db
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

    console.log('Retrieved messages:', messageResults);
    return messageResults;
  }

  async createMessage(messageData: InsertMessage): Promise<Message> {
    console.log('Creating message:', messageData);
    const [message] = await db
      .insert(messages)
      .values({
        ...messageData,
        createdAt: new Date(),
      })
      .returning();

    console.log('Created message:', message);

    // Create notification for the receiver
    await this.createNotification({
      userId: messageData.receiverId,
      type: "message",
      message: "You have a new message",
      createdAt: new Date(),
    });

    return message;
  }
}

export const storage = new DatabaseStorage();