import { 
  users, orders, orderComments, notifications, messages, domains, 
  invoices, supportTickets, feedback, feedbackQuestionTable, defaultFeedbackQuestions 
} from "@shared/schema";
import type {
  User, InsertUser, Domain, InsertDomain,
  Order, OrderComment, InsertOrderComment,
  Notification, InsertNotification,
  Message, InsertMessage,
  Invoice, InsertInvoice,
  SupportTicket, InsertTicket, UpdateTicket,
  Feedback, InsertFeedback,
  FeedbackQuestion, InsertFeedbackQuestion
} from "@shared/schema";
import { db } from "./db";
import { eq, or, and, desc, gte, lte, between, asc, isNull } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPgSimple from "connect-pg-simple";

// For development and debugging, we'll log when the session store is initialized
console.log("Initializing session store...");

// Create session stores
const MemoryStore = createMemoryStore(session);
const PgStore = connectPgSimple(session);
const isProduction = process.env.NODE_ENV === "production";

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
  deleteDomain(id: number): Promise<void>;
  
  // User-specific domain operations
  getUserDomains(userId: number): Promise<Domain[]>; 
  createUserDomain(userId: number, domain: InsertDomain): Promise<Domain>;
  getGlobalDomains(): Promise<Domain[]>;

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
  updateMessage(id: number, updates: Partial<Message>): Promise<Message>;

  // Invoice operations
  getInvoice(id: number): Promise<Invoice | undefined>;
  getInvoices(userId: number): Promise<Invoice[]>;
  getAllInvoices(): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, updates: Partial<Invoice>): Promise<Invoice>;
  markInvoiceAsPaid(id: number): Promise<Invoice>;
  getInvoicesByDateRange(userId: number, startDate: Date, endDate: Date): Promise<Invoice[]>;
  getInvoicesByAmount(userId: number, minAmount: number, maxAmount: number): Promise<Invoice[]>;
  
  // Support Ticket operations
  getSupportTicket(id: number): Promise<SupportTicket | undefined>;
  getSupportTickets(userId: number): Promise<SupportTicket[]>;
  getSupportTicketByOrder(orderId: number): Promise<SupportTicket | undefined>;
  getAllSupportTickets(): Promise<SupportTicket[]>;
  createSupportTicket(ticket: InsertTicket): Promise<SupportTicket>;
  updateSupportTicket(id: number, updates: UpdateTicket): Promise<SupportTicket>;
  closeSupportTicket(id: number, rating?: number, feedback?: string): Promise<SupportTicket>;
  
  // Feedback questions operations
  getFeedbackQuestions(): Promise<FeedbackQuestion[]>;
  getActiveFeedbackQuestions(): Promise<FeedbackQuestion[]>;
  getFeedbackQuestion(id: number): Promise<FeedbackQuestion | undefined>;
  createFeedbackQuestion(question: InsertFeedbackQuestion): Promise<FeedbackQuestion>;
  updateFeedbackQuestion(id: number, updates: Partial<FeedbackQuestion>): Promise<FeedbackQuestion>;
  toggleFeedbackQuestionStatus(id: number): Promise<FeedbackQuestion>;
  reorderFeedbackQuestions(questionIds: number[]): Promise<FeedbackQuestion[]>;
  
  // Feedback operations
  getFeedback(id: number): Promise<Feedback | undefined>;
  getUserFeedback(userId: number): Promise<Feedback[]>;
  getCurrentMonthFeedback(userId: number): Promise<Feedback | undefined>;
  getAllFeedback(): Promise<Feedback[]>;
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;
  updateFeedback(id: number, updates: Partial<Feedback>): Promise<Feedback>;
  getUserAverageRating(userId: number): Promise<number | null>;
  checkFeedbackNeeded(userId: number): Promise<boolean>;
  generateMonthlyFeedbackRequests(): Promise<number>; // Returns number of feedback requests created

  // Session store
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  
  // Feedback questions operations
  async getFeedbackQuestions(): Promise<FeedbackQuestion[]> {
    return await db.select().from(feedbackQuestionTable).orderBy(feedbackQuestionTable.sortOrder);
  }
  
  async getActiveFeedbackQuestions(): Promise<FeedbackQuestion[]> {
    return await db.select().from(feedbackQuestionTable)
      .where(eq(feedbackQuestionTable.isActive, true))
      .orderBy(feedbackQuestionTable.sortOrder);
  }
  
  async getFeedbackQuestion(id: number): Promise<FeedbackQuestion | undefined> {
    const [result] = await db.select().from(feedbackQuestionTable).where(eq(feedbackQuestionTable.id, id));
    return result;
  }
  
  async createFeedbackQuestion(question: InsertFeedbackQuestion): Promise<FeedbackQuestion> {
    // Get the highest current sort order
    const questions = await this.getFeedbackQuestions();
    const maxSortOrder = questions.length > 0 
      ? Math.max(...questions.map(q => q.sortOrder || 0))
      : 0;
    
    // Set the new question's sort order to be next in sequence
    const questionWithSortOrder = {
      ...question,
      sortOrder: maxSortOrder + 1
    };
    
    const [result] = await db.insert(feedbackQuestionTable).values(questionWithSortOrder).returning();
    return result;
  }
  
  async updateFeedbackQuestion(id: number, updates: Partial<FeedbackQuestion>): Promise<FeedbackQuestion> {
    const [result] = await db.update(feedbackQuestionTable)
      .set(updates)
      .where(eq(feedbackQuestionTable.id, id))
      .returning();
    return result;
  }
  
  async toggleFeedbackQuestionStatus(id: number): Promise<FeedbackQuestion> {
    // Get current question
    const question = await this.getFeedbackQuestion(id);
    if (!question) {
      throw new Error(`Feedback question with id ${id} not found`);
    }
    
    // Toggle the status
    const [result] = await db.update(feedbackQuestionTable)
      .set({ isActive: !question.isActive })
      .where(eq(feedbackQuestionTable.id, id))
      .returning();
    
    return result;
  }
  
  async reorderFeedbackQuestions(questionIds: number[]): Promise<FeedbackQuestion[]> {
    // Update sort order for each question
    const updates = questionIds.map((id, index) => {
      return db.update(feedbackQuestionTable)
        .set({ sortOrder: index + 1 })
        .where(eq(feedbackQuestionTable.id, id));
    });
    
    // Execute all updates
    await Promise.all(updates.map(update => update.execute()));
    
    // Return the reordered questions
    return this.getFeedbackQuestions();
  }
  
  // Feedback operations implementation
  async getFeedback(id: number): Promise<Feedback | undefined> {
    const [result] = await db.select().from(feedback).where(eq(feedback.id, id));
    return result;
  }
  
  async getUserFeedback(userId: number): Promise<Feedback[]> {
    return await db.select().from(feedback).where(eq(feedback.userId, userId)).orderBy(desc(feedback.createdAt));
  }
  
  async getCurrentMonthFeedback(userId: number): Promise<Feedback | undefined> {
    const currentMonth = new Date().getMonth() + 1; // JavaScript months are 0-indexed
    const currentYear = new Date().getFullYear();
    
    const [result] = await db.select().from(feedback).where(
      and(
        eq(feedback.userId, userId),
        eq(feedback.month, currentMonth),
        eq(feedback.year, currentYear)
      )
    );
    
    return result;
  }
  
  async getAllFeedback(): Promise<Feedback[]> {
    // Get all feedback
    const allFeedback = await db.select().from(feedback).orderBy(desc(feedback.createdAt));
    
    // Get all users to join with feedback data
    const allUsers = await this.getUsers();
    
    // Join users with feedback
    return allFeedback.map(feedbackItem => {
      const user = allUsers.find(u => u.id === feedbackItem.userId);
      return {
        ...feedbackItem,
        user: user ? {
          id: user.id,
          username: user.username,
          email: user.email,
          companyName: user.companyName
        } : undefined
      };
    });
  }
  
  async createFeedback(feedbackData: InsertFeedback): Promise<Feedback> {
    const [result] = await db.insert(feedback).values(feedbackData).returning();
    return result;
  }
  
  async updateFeedback(id: number, updates: Partial<Feedback>): Promise<Feedback> {
    const [result] = await db.update(feedback).set(updates).where(eq(feedback.id, id)).returning();
    return result;
  }
  
  async getUserAverageRating(userId: number): Promise<number | null> {
    // Get all completed feedback for this user
    const userFeedbacks = await db.select().from(feedback)
      .where(and(
        eq(feedback.userId, userId),
        eq(feedback.isCompleted, true)
      ));
    
    if (userFeedbacks.length === 0) {
      return null;
    }
    
    // Calculate overall average from all feedback averages
    const sum = userFeedbacks.reduce((acc, curr) => acc + Number(curr.averageRating), 0);
    return Number((sum / userFeedbacks.length).toFixed(2));
  }
  
  async checkFeedbackNeeded(userId: number): Promise<boolean> {
    // Check if user has any completed orders
    const completedOrders = await db.select().from(orders)
      .where(and(
        eq(orders.userId, userId),
        eq(orders.status, 'Completed')
      ));
    
    if (completedOrders.length === 0) {
      return false; // No completed orders, no feedback needed
    }
    
    // Check if user already has feedback for current month
    const currentMonthFeedback = await this.getCurrentMonthFeedback(userId);
    return !currentMonthFeedback; // Returns true if no feedback for current month
  }
  
  async generateMonthlyFeedbackRequests(): Promise<number> {
    // Get all users with completed orders
    const usersWithCompletedOrders = await db.select({
      userId: orders.userId
    })
    .from(orders)
    .where(eq(orders.status, 'Completed'))
    .groupBy(orders.userId);
    
    // Current month and year
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    let createdCount = 0;
    
    // Create feedback requests for each user
    for (const { userId } of usersWithCompletedOrders) {
      // Check if feedback already exists for this month
      const [existingFeedback] = await db.select().from(feedback).where(
        and(
          eq(feedback.userId, userId),
          eq(feedback.month, currentMonth),
          eq(feedback.year, currentYear)
        )
      );
      
      if (!existingFeedback) {
        // Create a new feedback request
        await this.createFeedback({
          userId,
          month: currentMonth,
          year: currentYear,
          ratings: JSON.stringify({}), // Empty ratings initially
          averageRating: "0.0",
          isCompleted: false,
          createdAt: new Date()
        });
        
        // Create notification for user
        await this.createNotification({
          userId,
          type: "feedback",
          message: "Please provide feedback on your experience with our services this month",
          createdAt: new Date()
        });
        
        createdCount++;
      }
    }
    
    return createdCount;
  }

  constructor() {
    // In production or if PostgreSQL is available, use PostgreSQL for session storage
    try {
      // Use PostgreSQL session store for persistence across restarts
      const connectionString = process.env.DATABASE_URL;
      
      if (connectionString) {
        console.log("Using PostgreSQL session store for persistence");
        this.sessionStore = new PgStore({
          conObject: {
            connectionString,
          },
          tableName: 'session', // Default table name
          createTableIfMissing: true,
        });
      } else {
        throw new Error("No DATABASE_URL found");
      }
    } catch (error) {
      // Fallback to memory store if PostgreSQL setup fails
      console.error("Failed to set up PostgreSQL session store, falling back to memory store:", error);
      this.sessionStore = new MemoryStore({
        checkPeriod: 86400000, // Clear expired sessions every 24h
      });
    }
    
    console.log("Session store initialized");
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
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
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
    // For compatibility: get all domains (both global and user-specific)
    return await db.select().from(domains);
  }

  async getDomain(id: number): Promise<Domain | undefined> {
    const [domain] = await db.select().from(domains).where(eq(domains.id, id));
    return domain;
  }

  async createDomain(domainData: InsertDomain): Promise<Domain> {
    // Set the isGlobal flag to true for backward compatibility
    const dataWithGlobalFlag = {
      ...domainData,
      isGlobal: true
    };
    const [domain] = await db.insert(domains).values(dataWithGlobalFlag).returning();
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
  
  async deleteDomain(id: number): Promise<void> {
    try {
      // First verify the domain exists
      const domain = await this.getDomain(id);
      if (!domain) {
        throw new Error(`Domain ${id} not found`);
      }

      console.log(`Starting deletion process for domain ${id}`);

      // Delete the domain
      const result = await db
        .delete(domains)
        .where(eq(domains.id, id))
        .returning();

      if (!result.length) {
        throw new Error(`Domain ${id} could not be deleted`);
      }

      console.log(`Successfully deleted domain ${id}`);
    } catch (error) {
      console.error('Error in deleteDomain:', error);
      throw error;
    }
  }

  // User-specific domain operations
  async getUserDomains(userId: number): Promise<Domain[]> {
    return await db.select()
      .from(domains)
      .where(
        or(
          // Get domains that belong to this user
          eq(domains.userId, userId),
          // Also include global domains
          eq(domains.isGlobal, true)
        )
      );
  }
  
  async createUserDomain(userId: number, domainData: InsertDomain): Promise<Domain> {
    const dataWithUserInfo = {
      ...domainData,
      isGlobal: false,
      userId: userId
    };
    const [domain] = await db.insert(domains).values(dataWithUserInfo).returning();
    return domain;
  }
  
  async getGlobalDomains(): Promise<Domain[]> {
    return await db.select()
      .from(domains)
      .where(eq(domains.isGlobal, true));
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
  async getOrderComments(orderId: number, ticketId?: number): Promise<OrderComment[]> {
    try {
      // Get all comments for this order
      const allComments = await db
        .select()
        .from(orderComments)
        .where(eq(orderComments.orderId, orderId))
        .orderBy(orderComments.createdAt);
      
      // Filter comments based on ticketId parameter
      let comments: OrderComment[];
      
      if (ticketId !== undefined) {
        // Get only comments for the specific ticket
        comments = allComments.filter(comment => comment.ticketId === ticketId);
      } else {
        // Get comments that don't belong to any ticket
        comments = allComments.filter(comment => !comment.ticketId);
      }
      
      console.log('Retrieved comments:', comments.length);
      return comments;
    } catch (error) {
      console.error('Error fetching comments:', error);
      throw new Error('Failed to fetch comments');
    }
  }

  async createOrderComment(comment: InsertOrderComment & { isFromAdmin?: boolean, isSystemMessage?: boolean }): Promise<OrderComment> {
    try {
      const isFromAdmin = comment.isFromAdmin || false;
      const isSystemMessage = comment.isSystemMessage || false;

      const [newComment] = await db
        .insert(orderComments)
        .values({
          orderId: comment.orderId,
          userId: comment.userId,
          message: comment.message,
          ticketId: comment.ticketId || undefined, // Include ticket ID if provided
          isFromAdmin: isFromAdmin,
          isSystemMessage: isSystemMessage,
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
    // Validate userId is a valid number (not null or undefined)
    if (typeof notificationData.userId !== 'number') {
      throw new Error('Invalid userId: must be a number');
    }
    
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

  async updateMessage(id: number, updates: Partial<Message>): Promise<Message> {
    console.log('Updating message:', id, updates);
    const [message] = await db
      .update(messages)
      .set(updates)
      .where(eq(messages.id, id))
      .returning();
    
    console.log('Updated message:', message);
    return message;
  }

  // Invoice operations
  async getInvoice(id: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice;
  }

  async getInvoices(userId: number): Promise<Invoice[]> {
    return await db
      .select()
      .from(invoices)
      .where(eq(invoices.userId, userId))
      .orderBy(desc(invoices.createdAt));
  }

  async getAllInvoices(): Promise<Invoice[]> {
    return await db
      .select()
      .from(invoices)
      .orderBy(desc(invoices.createdAt));
  }

  async createInvoice(invoiceData: InsertInvoice): Promise<Invoice> {
    const [invoice] = await db
      .insert(invoices)
      .values({
        ...invoiceData,
        createdAt: new Date(),
      })
      .returning();
    
    // Only create notification if there's a valid userId
    if (invoiceData.userId) {
      // Create notification for the user
      await this.createNotification({
        userId: invoiceData.userId,
        type: "invoice",
        message: "A new invoice has been added to your account",
        createdAt: new Date(),
        read: false,
      });
    }

    return invoice;
  }

  async updateInvoice(id: number, updates: Partial<Invoice>): Promise<Invoice> {
    const [invoice] = await db
      .update(invoices)
      .set(updates)
      .where(eq(invoices.id, id))
      .returning();
    return invoice;
  }

  async markInvoiceAsPaid(id: number): Promise<Invoice> {
    const [invoice] = await db
      .update(invoices)
      .set({ 
        status: "paid",
        paidAt: new Date(),
      })
      .where(eq(invoices.id, id))
      .returning();
    
    // Get the full invoice to access userId for notification
    const fullInvoice = await this.getInvoice(id);
    
    // Only create notification if there's a valid userId
    if (fullInvoice && fullInvoice.userId) {
      await this.createNotification({
        userId: fullInvoice.userId,
        type: "invoice_paid",
        message: `Invoice #${id} has been marked as paid`,
        createdAt: new Date(),
        read: false,
      });
    }
    
    return invoice;
  }

  async getInvoicesByDateRange(userId: number, startDate: Date, endDate: Date): Promise<Invoice[]> {
    return await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.userId, userId),
          gte(invoices.dueDate, startDate),
          lte(invoices.dueDate, endDate)
        )
      )
      .orderBy(desc(invoices.createdAt));
  }

  async getInvoicesByAmount(userId: number, minAmount: number, maxAmount: number): Promise<Invoice[]> {
    return await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.userId, userId),
          gte(invoices.amount, minAmount),
          lte(invoices.amount, maxAmount)
        )
      )
      .orderBy(desc(invoices.createdAt));
  }
  
  async deleteInvoice(id: number): Promise<void> {
    // First get the invoice to access the user ID for notification
    const invoice = await this.getInvoice(id);
    
    if (!invoice) {
      throw new Error("Invoice not found");
    }
    
    // Delete the invoice
    await db
      .delete(invoices)
      .where(eq(invoices.id, id));

    // Only create notification if there's a valid userId
    if (invoice.userId) {
      // Create notification for the user
      await this.createNotification({
        userId: invoice.userId,
        type: "invoice_deleted",
        message: `Invoice #${id} has been deleted`,
        createdAt: new Date(),
        read: false,
      });
    }
  }

  // Support Ticket operations
  async getSupportTicket(id: number): Promise<SupportTicket | undefined> {
    const [ticket] = await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.id, id));
    return ticket;
  }

  async getSupportTickets(userId: number): Promise<SupportTicket[]> {
    return await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.userId, userId))
      .orderBy(desc(supportTickets.createdAt));
  }

  async getSupportTicketByOrder(orderId: number): Promise<SupportTicket | undefined> {
    const [ticket] = await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.orderId, orderId));
    return ticket;
  }

  async getAllSupportTickets(): Promise<SupportTicket[]> {
    return await db
      .select()
      .from(supportTickets)
      .orderBy(desc(supportTickets.createdAt));
  }

  async createSupportTicket(ticket: InsertTicket): Promise<SupportTicket> {
    const [newTicket] = await db
      .insert(supportTickets)
      .values({
        ...ticket,
        status: "open",
        createdAt: new Date(),
      })
      .returning();
    
    // Create an automated welcome message as a system comment
    await this.createOrderComment({
      orderId: ticket.orderId || 0, // Use 0 if orderId is null/undefined
      userId: -1, // System user (using -1 for system user consistent with the client code)
      message: `Thank you for opening a support ticket! Our team will respond to your inquiry as soon as possible. 
      
Please provide any additional details that might help us assist you better with ${ticket.orderId ? `<a href="/orders/${ticket.orderId}" class="text-primary hover:underline">order #${ticket.orderId}</a>` : 'your request'}.`,
      ticketId: newTicket.id,
      isSystemMessage: true,
      isFromAdmin: true,
    });
    
    // Create notification for admins
    // Find all admin users and notify them
    const admins = await db
      .select()
      .from(users)
      .where(eq(users.is_admin, true));
    
    // Create notification for each admin
    for (const admin of admins) {
      await this.createNotification({
        userId: admin.id,
        type: "support_ticket",
        message: `New support ticket: ${ticket.title}`,
        createdAt: new Date(),
        read: false,
        ticketId: newTicket.id, // Include the ticket ID in the notification for admins too
      });
      
      // Create initial message from user to admin for each admin
      // This starts the conversation automatically when a ticket is created
      // Only create the message if we have a valid userId
      if (ticket.userId) {
        await this.createMessage({
          senderId: ticket.userId,
          receiverId: admin.id,
          content: `Support Ticket #${newTicket.id}: ${ticket.title}\n\nI've created this support ticket for assistance. Order ID: ${ticket.orderId || 'N/A'}`,
        });
      }
    }
    
    // Also create a notification for the user who opened the ticket
    if (ticket.userId) {
      await this.createNotification({
        userId: ticket.userId,
        type: "support_ticket",
        message: "Your support ticket has been created. Our team will respond shortly.",
        createdAt: new Date(),
        read: false,
        ticketId: newTicket.id, // Include the ticket ID in the notification
      });
    }
    
    return newTicket;
  }

  async updateSupportTicket(id: number, updates: UpdateTicket): Promise<SupportTicket> {
    const [ticket] = await db
      .update(supportTickets)
      .set(updates)
      .where(eq(supportTickets.id, id))
      .returning();
    
    // If the ticket is being closed, set closedAt
    if (updates.status === "closed") {
      await db
        .update(supportTickets)
        .set({ closedAt: new Date() })
        .where(eq(supportTickets.id, id));
    }
    
    // Notify user that ticket status has changed
    const updatedTicket = await this.getSupportTicket(id);
    if (updatedTicket) {
      // Add a system message about the status change
      await this.createOrderComment({
        orderId: updatedTicket.orderId || 0,
        userId: -1, // System user (consistent with other places)
        message: `Support ticket status has been updated to "${updates.status || updatedTicket.status}".`,
        ticketId: updatedTicket.id,
        isSystemMessage: true,
        isFromAdmin: true,
      });
      
      // Only create notification if userId is valid
      if (updatedTicket.userId) {
        await this.createNotification({
          userId: updatedTicket.userId,
          type: "support_ticket",
          message: `Your support ticket status has been updated to ${updates.status || updatedTicket.status}`,
          createdAt: new Date(),
          read: false,
          ticketId: updatedTicket.id,
        });
      }
    }
    
    return ticket;
  }

  async closeSupportTicket(id: number, rating?: number, feedback?: string): Promise<SupportTicket> {
    const updateData: UpdateTicket = {
      status: "closed",
    };
    
    if (rating !== undefined) {
      updateData.rating = rating;
    }
    
    if (feedback) {
      updateData.feedback = feedback;
    }
    
    const [ticket] = await db
      .update(supportTickets)
      .set({
        ...updateData,
        closedAt: new Date(),
      })
      .where(eq(supportTickets.id, id))
      .returning();
    
    // Notify user that ticket is closed
    const fullTicket = await this.getSupportTicket(id);
    if (fullTicket) {
      // Create closing system message
      await this.createOrderComment({
        orderId: fullTicket.orderId || 0,
        userId: -1, // System user (consistent with other places)
        message: `This support ticket has been closed. ${feedback ? `User feedback: "${feedback}"` : ''} ${rating ? `Rating: ${rating}/5 stars` : ''}`,
        ticketId: fullTicket.id,
        isSystemMessage: true,
        isFromAdmin: true,
      });
      
      // Only create notification if userId is valid
      if (fullTicket.userId) {
        await this.createNotification({
          userId: fullTicket.userId,
          type: "support_ticket",
          message: "Your support ticket has been closed. Thank you for your feedback!",
          createdAt: new Date(),
          read: false,
          ticketId: fullTicket.id,
        });
      }
      
      // Also notify admin about the feedback
      if (rating !== undefined || feedback) {
        const admins = await db
          .select()
          .from(users)
          .where(eq(users.is_admin, true));
        
        for (const admin of admins) {
          await this.createNotification({
            userId: admin.id,
            type: "feedback",
            message: `User provided feedback on ticket #${id}: ${rating ? `${rating}/5 stars` : ''} ${feedback || ''}`,
            createdAt: new Date(),
            read: false,
            ticketId: id, // Include the ticket ID in the notification
          });
        }
      }
    }
    
    return ticket;
  }
}

export const storage = new DatabaseStorage();