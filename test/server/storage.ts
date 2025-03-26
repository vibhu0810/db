import { eq, and, or, desc, sql, asc, like, gte, lte, isNull, between } from 'drizzle-orm';
import { db } from './db';
import * as session from 'express-session';
import pgSessionStore from 'connect-pg-simple';

import {
  User, InsertUser, UpdateProfile,
  Organization, InsertOrganization,
  UserAssignment, InsertUserAssignment,
  Domain, InsertDomain,
  DomainPricing, InsertDomainPricing,
  PricingTier, InsertPricingTier,
  UserPricingTier, InsertUserPricingTier,
  Order, InsertOrder,
  OrderComment, InsertOrderComment, 
  SupportTicket, InsertTicket, UpdateTicket,
  TicketComment, InsertTicketComment,
  FeedbackQuestion, InsertFeedbackQuestion,
  FeedbackCampaign, InsertFeedbackCampaign,
  Feedback, InsertFeedback,
  OrderFeedback, InsertOrderFeedback,
  Notification, InsertNotification,
  Invoice, InsertInvoice,
  users, organizations, userAssignments, domains, domainPricing, pricingTiers,
  userPricingTiers, orders, orderComments, supportTickets, ticketComments,
  ticketHistory, feedbackQuestions, feedbackCampaigns, campaignQuestions,
  feedback, orderFeedback, notifications, invoices
} from '../shared/schema';

import { comparePasswords, hashPassword } from './auth';
import { Pool } from 'pg';

// Define the storage interface for all operations
export interface IStorage {
  // Organization operations
  getOrganization(id: number): Promise<Organization | undefined>;
  getOrganizationByName(name: string): Promise<Organization | undefined>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  updateOrganization(id: number, org: Partial<Organization>): Promise<Organization>;
  getOrganizations(): Promise<Organization[]>;
  incrementOrganizationOrderCount(id: number): Promise<Organization>;
  decrementOrganizationOrderCount(id: number): Promise<Organization>;

  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User>;
  getUsers(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  getUsersByOrganization(organizationId: number): Promise<User[]>;
  
  // User assignment operations
  assignUserToManager(assignment: InsertUserAssignment): Promise<UserAssignment>;
  removeUserAssignment(managerId: number, userId: number): Promise<void>;
  getUserAssignments(managerId: number): Promise<UserAssignment[]>;
  getUserManagers(userId: number): Promise<User[]>;
  getManagedUsers(managerId: number): Promise<User[]>;

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
  getOrganizationDomains(organizationId: number): Promise<Domain[]>;
  
  // Domain pricing operations
  getDomainPricing(domainId: number, userId: number): Promise<DomainPricing | undefined>;
  setDomainPricing(pricing: InsertDomainPricing): Promise<DomainPricing>;
  updateDomainPricing(id: number, pricing: Partial<DomainPricing>): Promise<DomainPricing>;
  getUserDomainPricing(userId: number): Promise<DomainPricing[]>;
  deleteDomainPricing(id: number): Promise<void>;
  
  // Pricing tier operations
  getPricingTiers(organizationId: number): Promise<PricingTier[]>;
  getPricingTier(id: number): Promise<PricingTier | undefined>;
  createPricingTier(tier: InsertPricingTier): Promise<PricingTier>;
  updatePricingTier(id: number, tier: Partial<PricingTier>): Promise<PricingTier>;
  deletePricingTier(id: number): Promise<void>;
  
  // User pricing tier operations
  assignPricingTierToUser(assignment: InsertUserPricingTier): Promise<UserPricingTier>;
  removeUserPricingTier(userId: number, tierId: number): Promise<void>;
  getUserPricingTiers(userId: number): Promise<PricingTier[]>;
  getUsersWithPricingTier(tierId: number): Promise<User[]>;

  // Order operations
  getOrder(id: number): Promise<Order | undefined>;
  getOrders(userId: number): Promise<Order[]>;
  getAllOrders(): Promise<Order[]>;
  getOrganizationOrders(organizationId: number): Promise<Order[]>;
  getManagedUserOrders(managerId: number): Promise<Order[]>;
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

  // Invoice operations
  getInvoice(id: number): Promise<Invoice | undefined>;
  getInvoices(userId: number): Promise<Invoice[]>;
  getAllInvoices(): Promise<Invoice[]>;
  getOrganizationInvoices(organizationId: number): Promise<Invoice[]>;
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
  getOrganizationSupportTickets(organizationId: number): Promise<SupportTicket[]>;
  createSupportTicket(ticket: InsertTicket): Promise<SupportTicket>;
  updateSupportTicket(id: number, updates: UpdateTicket): Promise<SupportTicket>;
  closeSupportTicket(id: number, rating?: number, feedback?: string): Promise<SupportTicket>;
  assignTicket(ticketId: number, assignedTo: number): Promise<SupportTicket>;
  
  // Ticket Comment operations
  getTicketComments(ticketId: number): Promise<TicketComment[]>;
  createTicketComment(comment: InsertTicketComment): Promise<TicketComment>;
  
  // Feedback questions operations
  getFeedbackQuestions(organizationId: number): Promise<FeedbackQuestion[]>;
  getActiveFeedbackQuestions(organizationId: number): Promise<FeedbackQuestion[]>;
  getFeedbackQuestion(id: number): Promise<FeedbackQuestion | undefined>;
  createFeedbackQuestion(question: InsertFeedbackQuestion): Promise<FeedbackQuestion>;
  updateFeedbackQuestion(id: number, updates: Partial<FeedbackQuestion>): Promise<FeedbackQuestion>;
  toggleFeedbackQuestionStatus(id: number): Promise<FeedbackQuestion>;
  reorderFeedbackQuestions(questionIds: number[]): Promise<FeedbackQuestion[]>;
  
  // Feedback Campaign operations
  getFeedbackCampaigns(organizationId: number): Promise<FeedbackCampaign[]>;
  getActiveFeedbackCampaigns(organizationId: number): Promise<FeedbackCampaign[]>;
  getFeedbackCampaign(id: number): Promise<FeedbackCampaign | undefined>;
  createFeedbackCampaign(campaign: InsertFeedbackCampaign): Promise<FeedbackCampaign>;
  updateFeedbackCampaign(id: number, updates: Partial<FeedbackCampaign>): Promise<FeedbackCampaign>;
  toggleFeedbackCampaignStatus(id: number): Promise<FeedbackCampaign>;
  addQuestionToCampaign(campaignId: number, questionId: number, sortOrder: number): Promise<void>;
  removeQuestionFromCampaign(campaignId: number, questionId: number): Promise<void>;
  getCampaignQuestions(campaignId: number): Promise<FeedbackQuestion[]>;
  
  // Feedback operations
  getFeedback(id: number): Promise<Feedback | undefined>;
  getUserFeedback(userId: number): Promise<Feedback[]>;
  getCampaignFeedback(campaignId: number): Promise<Feedback[]>;
  getCurrentCampaignFeedback(userId: number, campaignId: number): Promise<Feedback | undefined>;
  getAllFeedback(organizationId: number): Promise<Feedback[]>;
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;
  updateFeedback(id: number, updates: Partial<Feedback>): Promise<Feedback>;
  getUserAverageRating(userId: number): Promise<number | null>;
  checkFeedbackNeeded(userId: number, campaignId: number): Promise<boolean>;
  generateCampaignFeedbackRequests(campaignId: number): Promise<number>; // Returns number of feedback requests created

  // Order Feedback operations
  getOrderFeedback(orderId: number): Promise<OrderFeedback | undefined>;
  createOrderFeedback(feedback: InsertOrderFeedback): Promise<OrderFeedback>;
  getOrderFeedbackByUser(userId: number): Promise<OrderFeedback[]>;
  
  // Session store
  sessionStore: session.Store;
}

// Implementation of the storage interface
export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    const PgStore = pgSessionStore(session);
    this.sessionStore = new PgStore({
      pool: db.config.client as unknown as Pool, // Type assertion to satisfy PgStore constructor
      tableName: 'test_sessions',
      createTableIfMissing: true,
      schemaName: undefined, // Use default schema
    });
  }

  // ================= Organization Operations =================
  async getOrganization(id: number): Promise<Organization | undefined> {
    const results = await db.select().from(organizations).where(eq(organizations.id, id));
    return results[0];
  }

  async getOrganizationByName(name: string): Promise<Organization | undefined> {
    const results = await db.select().from(organizations).where(eq(organizations.name, name));
    return results[0];
  }

  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const results = await db.insert(organizations).values(org).returning();
    return results[0];
  }

  async updateOrganization(id: number, org: Partial<Organization>): Promise<Organization> {
    const results = await db.update(organizations).set(org).where(eq(organizations.id, id)).returning();
    return results[0];
  }

  async getOrganizations(): Promise<Organization[]> {
    return await db.select().from(organizations);
  }

  async incrementOrganizationOrderCount(id: number): Promise<Organization> {
    const results = await db
      .update(organizations)
      .set({ 
        current_orders_count: sql`${organizations.current_orders_count} + 1` 
      })
      .where(eq(organizations.id, id))
      .returning();
    return results[0];
  }

  async decrementOrganizationOrderCount(id: number): Promise<Organization> {
    const results = await db
      .update(organizations)
      .set({ 
        current_orders_count: sql`${organizations.current_orders_count} - 1` 
      })
      .where(eq(organizations.id, id))
      .returning();
    return results[0];
  }

  // ================= User Operations =================
  async getUser(id: number): Promise<User | undefined> {
    const results = await db.select().from(users).where(eq(users.id, id));
    return results[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const results = await db.select().from(users).where(eq(users.username, username));
    return results[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const results = await db.select().from(users).where(eq(users.email, email));
    return results[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Hash the password before storing
    const hashedPassword = await hashPassword(insertUser.password);
    const userWithHashedPassword = { ...insertUser, password: hashedPassword };
    
    const results = await db.insert(users).values(userWithHashedPassword).returning();
    return results[0];
  }

  async updateUser(id: number, update: Partial<User>): Promise<User> {
    // If the update includes a password, hash it
    if (update.password) {
      update.password = await hashPassword(update.password);
    }
    
    const results = await db.update(users).set(update).where(eq(users.id, id)).returning();
    return results[0];
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role));
  }

  async getUsersByOrganization(organizationId: number): Promise<User[]> {
    return await db.select().from(users).where(eq(users.organization_id, organizationId));
  }

  // ================= User Assignment Operations =================
  async assignUserToManager(assignment: InsertUserAssignment): Promise<UserAssignment> {
    const results = await db.insert(userAssignments).values(assignment).returning();
    return results[0];
  }

  async removeUserAssignment(managerId: number, userId: number): Promise<void> {
    await db.delete(userAssignments)
      .where(
        and(
          eq(userAssignments.manager_id, managerId),
          eq(userAssignments.user_id, userId)
        )
      );
  }

  async getUserAssignments(managerId: number): Promise<UserAssignment[]> {
    return await db.select()
      .from(userAssignments)
      .where(eq(userAssignments.manager_id, managerId));
  }

  async getUserManagers(userId: number): Promise<User[]> {
    const assignments = await db.select({
      managerId: userAssignments.manager_id
    })
    .from(userAssignments)
    .where(
      and(
        eq(userAssignments.user_id, userId),
        eq(userAssignments.active, true)
      )
    );

    if (assignments.length === 0) return [];

    const managerIds = assignments.map(a => a.managerId);
    return await db.select()
      .from(users)
      .where(sql`${users.id} IN (${managerIds.join(', ')})`);
  }

  async getManagedUsers(managerId: number): Promise<User[]> {
    const assignments = await db.select({
      userId: userAssignments.user_id
    })
    .from(userAssignments)
    .where(
      and(
        eq(userAssignments.manager_id, managerId),
        eq(userAssignments.active, true)
      )
    );

    if (assignments.length === 0) return [];

    const userIds = assignments.map(a => a.userId);
    return await db.select()
      .from(users)
      .where(sql`${users.id} IN (${userIds.join(', ')})`);
  }

  // ================= Domain Operations =================
  async getDomains(): Promise<Domain[]> {
    return await db.select().from(domains);
  }

  async getDomain(id: number): Promise<Domain | undefined> {
    const results = await db.select().from(domains).where(eq(domains.id, id));
    return results[0];
  }

  async createDomain(domainData: InsertDomain): Promise<Domain> {
    const results = await db.insert(domains).values(domainData).returning();
    return results[0];
  }

  async updateDomain(id: number, updates: Partial<Domain>): Promise<Domain> {
    const results = await db.update(domains).set(updates).where(eq(domains.id, id)).returning();
    return results[0];
  }

  async deleteDomain(id: number): Promise<void> {
    await db.delete(domains).where(eq(domains.id, id));
  }

  async getUserDomains(userId: number): Promise<Domain[]> {
    return await db.select()
      .from(domains)
      .where(eq(domains.userId, userId));
  }

  async createUserDomain(userId: number, domainData: InsertDomain): Promise<Domain> {
    const data = { ...domainData, userId, isGlobal: false };
    const results = await db.insert(domains).values(data).returning();
    return results[0];
  }

  async getGlobalDomains(): Promise<Domain[]> {
    return await db.select()
      .from(domains)
      .where(eq(domains.isGlobal, true));
  }

  async getOrganizationDomains(organizationId: number): Promise<Domain[]> {
    return await db.select()
      .from(domains)
      .where(eq(domains.organization_id, organizationId));
  }

  // ================= Domain Pricing Operations =================
  async getDomainPricing(domainId: number, userId: number): Promise<DomainPricing | undefined> {
    const results = await db.select()
      .from(domainPricing)
      .where(
        and(
          eq(domainPricing.domainId, domainId),
          eq(domainPricing.userId, userId)
        )
      );
    return results[0];
  }

  async setDomainPricing(pricing: InsertDomainPricing): Promise<DomainPricing> {
    // Check if pricing already exists
    const existing = await this.getDomainPricing(pricing.domainId, pricing.userId);
    
    if (existing) {
      // Update existing pricing
      return await this.updateDomainPricing(existing.id, pricing);
    } else {
      // Create new pricing
      const results = await db.insert(domainPricing).values(pricing).returning();
      return results[0];
    }
  }

  async updateDomainPricing(id: number, pricing: Partial<DomainPricing>): Promise<DomainPricing> {
    const results = await db.update(domainPricing)
      .set(pricing)
      .where(eq(domainPricing.id, id))
      .returning();
    return results[0];
  }

  async getUserDomainPricing(userId: number): Promise<DomainPricing[]> {
    return await db.select()
      .from(domainPricing)
      .where(eq(domainPricing.userId, userId));
  }

  async deleteDomainPricing(id: number): Promise<void> {
    await db.delete(domainPricing).where(eq(domainPricing.id, id));
  }

  // ================= Pricing Tier Operations =================
  async getPricingTiers(organizationId: number): Promise<PricingTier[]> {
    return await db.select()
      .from(pricingTiers)
      .where(eq(pricingTiers.organization_id, organizationId));
  }

  async getPricingTier(id: number): Promise<PricingTier | undefined> {
    const results = await db.select().from(pricingTiers).where(eq(pricingTiers.id, id));
    return results[0];
  }

  async createPricingTier(tier: InsertPricingTier): Promise<PricingTier> {
    const results = await db.insert(pricingTiers).values(tier).returning();
    return results[0];
  }

  async updatePricingTier(id: number, tier: Partial<PricingTier>): Promise<PricingTier> {
    const results = await db.update(pricingTiers)
      .set(tier)
      .where(eq(pricingTiers.id, id))
      .returning();
    return results[0];
  }

  async deletePricingTier(id: number): Promise<void> {
    await db.delete(pricingTiers).where(eq(pricingTiers.id, id));
  }

  // ================= User Pricing Tier Operations =================
  async assignPricingTierToUser(assignment: InsertUserPricingTier): Promise<UserPricingTier> {
    const results = await db.insert(userPricingTiers).values(assignment).returning();
    return results[0];
  }

  async removeUserPricingTier(userId: number, tierId: number): Promise<void> {
    await db.delete(userPricingTiers)
      .where(
        and(
          eq(userPricingTiers.userId, userId),
          eq(userPricingTiers.tierId, tierId)
        )
      );
  }

  async getUserPricingTiers(userId: number): Promise<PricingTier[]> {
    const assignments = await db.select({
      tierId: userPricingTiers.tierId
    })
    .from(userPricingTiers)
    .where(eq(userPricingTiers.userId, userId));

    if (assignments.length === 0) return [];

    const tierIds = assignments.map(a => a.tierId);
    return await db.select()
      .from(pricingTiers)
      .where(sql`${pricingTiers.id} IN (${tierIds.join(', ')})`);
  }

  async getUsersWithPricingTier(tierId: number): Promise<User[]> {
    const assignments = await db.select({
      userId: userPricingTiers.userId
    })
    .from(userPricingTiers)
    .where(eq(userPricingTiers.tierId, tierId));

    if (assignments.length === 0) return [];

    const userIds = assignments.map(a => a.userId);
    return await db.select()
      .from(users)
      .where(sql`${users.id} IN (${userIds.join(', ')})`);
  }

  // ================= Order Operations =================
  async getOrder(id: number): Promise<Order | undefined> {
    const results = await db.select().from(orders).where(eq(orders.id, id));
    return results[0];
  }

  async getOrders(userId: number): Promise<Order[]> {
    return await db.select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.dateOrdered));
  }

  async getAllOrders(): Promise<Order[]> {
    return await db.select()
      .from(orders)
      .orderBy(desc(orders.dateOrdered));
  }

  async getOrganizationOrders(organizationId: number): Promise<Order[]> {
    return await db.select()
      .from(orders)
      .where(eq(orders.organization_id, organizationId))
      .orderBy(desc(orders.dateOrdered));
  }

  async getManagedUserOrders(managerId: number): Promise<Order[]> {
    // Get all users managed by this manager
    const managedUsers = await this.getManagedUsers(managerId);
    if (managedUsers.length === 0) return [];
    
    const userIds = managedUsers.map(user => user.id);
    
    // Get all orders for these users
    return await db.select()
      .from(orders)
      .where(sql`${orders.userId} IN (${userIds.join(', ')})`)
      .orderBy(desc(orders.dateOrdered));
  }

  async createOrder(orderData: any): Promise<Order> {
    const newOrder = { ...orderData, dateOrdered: new Date() };
    
    // Get organization ID for this user
    if (orderData.userId && !orderData.organization_id) {
      const user = await this.getUser(orderData.userId);
      if (user && user.organization_id) {
        newOrder.organization_id = user.organization_id;
        
        // Increment organization order count
        await this.incrementOrganizationOrderCount(user.organization_id);
      }
    }
    
    const results = await db.insert(orders).values(newOrder).returning();
    return results[0];
  }

  async updateOrder(id: number, updates: Partial<Order>): Promise<Order> {
    const currentOrder = await this.getOrder(id);
    
    // If status is changing to completed, set dateCompleted
    if (updates.status === 'completed' && (!currentOrder || currentOrder.status !== 'completed')) {
      updates.dateCompleted = new Date();
    }
    
    const results = await db.update(orders).set(updates).where(eq(orders.id, id)).returning();
    return results[0];
  }

  async deleteOrder(id: number): Promise<void> {
    const order = await this.getOrder(id);
    
    if (order && order.organization_id) {
      // Decrement organization order count
      await this.decrementOrganizationOrderCount(order.organization_id);
    }
    
    await db.delete(orders).where(eq(orders.id, id));
  }

  // ================= Comment Operations =================
  async getOrderComments(orderId: number): Promise<OrderComment[]> {
    return await db.select()
      .from(orderComments)
      .where(eq(orderComments.orderId, orderId))
      .orderBy(asc(orderComments.createdAt));
  }

  async createOrderComment(comment: InsertOrderComment & { isFromAdmin?: boolean, isSystemMessage?: boolean }): Promise<OrderComment> {
    const newComment = {
      ...comment,
      isRead: false,
      readBy: [],
      isFromAdmin: comment.isFromAdmin || false,
      isSystemMessage: comment.isSystemMessage || false
    };
    
    const results = await db.insert(orderComments).values(newComment).returning();
    return results[0];
  }

  async getUnreadCommentCount(orderId: number, userId: number): Promise<number> {
    const comments = await db.select()
      .from(orderComments)
      .where(
        and(
          eq(orderComments.orderId, orderId),
          sql`NOT (${orderComments.readBy})::jsonb @> '[${userId}]'::jsonb`
        )
      );
    
    return comments.length;
  }

  async markCommentsAsRead(orderId: number, userId: number): Promise<void> {
    // Get all unread comments for this order and user
    const unreadComments = await db.select()
      .from(orderComments)
      .where(
        and(
          eq(orderComments.orderId, orderId),
          sql`NOT (${orderComments.readBy})::jsonb @> '[${userId}]'::jsonb`
        )
      );
    
    // Mark each comment as read by this user
    for (const comment of unreadComments) {
      const readBy = Array.isArray(comment.readBy) ? comment.readBy : [];
      readBy.push(userId);
      
      await db.update(orderComments)
        .set({ readBy })
        .where(eq(orderComments.id, comment.id));
    }
  }

  // ================= Notification Operations =================
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const results = await db.insert(notifications).values(notificationData).returning();
    return results[0];
  }

  async getNotifications(userId: number): Promise<Notification[]> {
    return await db.select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(id: number): Promise<Notification> {
    const results = await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    
    return results[0];
  }

  async markAllNotificationsAsRead(userId: number): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }

  // ================= Invoice Operations =================
  async getInvoice(id: number): Promise<Invoice | undefined> {
    const results = await db.select().from(invoices).where(eq(invoices.id, id));
    return results[0];
  }

  async getInvoices(userId: number): Promise<Invoice[]> {
    return await db.select()
      .from(invoices)
      .where(eq(invoices.userId, userId))
      .orderBy(desc(invoices.createdAt));
  }

  async getAllInvoices(): Promise<Invoice[]> {
    return await db.select()
      .from(invoices)
      .orderBy(desc(invoices.createdAt));
  }

  async getOrganizationInvoices(organizationId: number): Promise<Invoice[]> {
    return await db.select()
      .from(invoices)
      .where(eq(invoices.organization_id, organizationId))
      .orderBy(desc(invoices.createdAt));
  }

  async createInvoice(invoiceData: InsertInvoice): Promise<Invoice> {
    const results = await db.insert(invoices).values(invoiceData).returning();
    return results[0];
  }

  async updateInvoice(id: number, updates: Partial<Invoice>): Promise<Invoice> {
    const results = await db.update(invoices)
      .set(updates)
      .where(eq(invoices.id, id))
      .returning();
    
    return results[0];
  }

  async markInvoiceAsPaid(id: number): Promise<Invoice> {
    const results = await db.update(invoices)
      .set({ 
        status: 'paid', 
        paidAt: new Date() 
      })
      .where(eq(invoices.id, id))
      .returning();
    
    return results[0];
  }

  async getInvoicesByDateRange(userId: number, startDate: Date, endDate: Date): Promise<Invoice[]> {
    return await db.select()
      .from(invoices)
      .where(
        and(
          eq(invoices.userId, userId),
          gte(invoices.createdAt, startDate),
          lte(invoices.createdAt, endDate)
        )
      )
      .orderBy(desc(invoices.createdAt));
  }

  async getInvoicesByAmount(userId: number, minAmount: number, maxAmount: number): Promise<Invoice[]> {
    return await db.select()
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

  // ================= Support Ticket Operations =================
  async getSupportTicket(id: number): Promise<SupportTicket | undefined> {
    const results = await db.select().from(supportTickets).where(eq(supportTickets.id, id));
    return results[0];
  }

  async getSupportTickets(userId: number): Promise<SupportTicket[]> {
    return await db.select()
      .from(supportTickets)
      .where(eq(supportTickets.userId, userId))
      .orderBy(desc(supportTickets.createdAt));
  }

  async getSupportTicketByOrder(orderId: number): Promise<SupportTicket | undefined> {
    const results = await db.select()
      .from(supportTickets)
      .where(eq(supportTickets.orderId, orderId));
    
    return results[0];
  }

  async getAllSupportTickets(): Promise<SupportTicket[]> {
    return await db.select()
      .from(supportTickets)
      .orderBy(desc(supportTickets.createdAt));
  }

  async getOrganizationSupportTickets(organizationId: number): Promise<SupportTicket[]> {
    return await db.select()
      .from(supportTickets)
      .where(eq(supportTickets.organization_id, organizationId))
      .orderBy(desc(supportTickets.createdAt));
  }

  async createSupportTicket(ticket: InsertTicket): Promise<SupportTicket> {
    const results = await db.insert(supportTickets).values(ticket).returning();
    return results[0];
  }

  async updateSupportTicket(id: number, updates: UpdateTicket): Promise<SupportTicket> {
    // Update the updatedAt timestamp
    const updatedTicket = {
      ...updates,
      updatedAt: new Date()
    };
    
    const results = await db.update(supportTickets)
      .set(updatedTicket)
      .where(eq(supportTickets.id, id))
      .returning();
    
    return results[0];
  }

  async closeSupportTicket(id: number, rating?: number, feedback?: string): Promise<SupportTicket> {
    const updateData: any = {
      status: 'closed',
      closedAt: new Date(),
      updatedAt: new Date()
    };
    
    if (rating !== undefined) {
      updateData.rating = rating;
    }
    
    if (feedback) {
      updateData.feedback = feedback;
    }
    
    const results = await db.update(supportTickets)
      .set(updateData)
      .where(eq(supportTickets.id, id))
      .returning();
    
    return results[0];
  }

  async assignTicket(ticketId: number, assignedTo: number): Promise<SupportTicket> {
    const results = await db.update(supportTickets)
      .set({ 
        assigned_to: assignedTo,
        status: 'in_progress',
        updatedAt: new Date()
      })
      .where(eq(supportTickets.id, ticketId))
      .returning();
    
    return results[0];
  }

  // ================= Ticket Comment Operations =================
  async getTicketComments(ticketId: number): Promise<TicketComment[]> {
    return await db.select()
      .from(ticketComments)
      .where(eq(ticketComments.ticketId, ticketId))
      .orderBy(asc(ticketComments.createdAt));
  }

  async createTicketComment(comment: InsertTicketComment): Promise<TicketComment> {
    const results = await db.insert(ticketComments).values(comment).returning();
    return results[0];
  }

  // ================= Feedback Question Operations =================
  async getFeedbackQuestions(organizationId: number): Promise<FeedbackQuestion[]> {
    return await db.select()
      .from(feedbackQuestions)
      .where(eq(feedbackQuestions.organization_id, organizationId))
      .orderBy(asc(feedbackQuestions.sortOrder));
  }

  async getActiveFeedbackQuestions(organizationId: number): Promise<FeedbackQuestion[]> {
    return await db.select()
      .from(feedbackQuestions)
      .where(
        and(
          eq(feedbackQuestions.organization_id, organizationId),
          eq(feedbackQuestions.isActive, true)
        )
      )
      .orderBy(asc(feedbackQuestions.sortOrder));
  }

  async getFeedbackQuestion(id: number): Promise<FeedbackQuestion | undefined> {
    const results = await db.select().from(feedbackQuestions).where(eq(feedbackQuestions.id, id));
    return results[0];
  }

  async createFeedbackQuestion(question: InsertFeedbackQuestion): Promise<FeedbackQuestion> {
    // Get the max sort order for this organization
    const questions = await this.getFeedbackQuestions(question.organization_id);
    const maxSortOrder = questions.length > 0 
      ? Math.max(...questions.map(q => q.sortOrder))
      : 0;
    
    // Set the sort order to be one more than the current max
    const newQuestion = {
      ...question,
      sortOrder: maxSortOrder + 1
    };
    
    const results = await db.insert(feedbackQuestions).values(newQuestion).returning();
    return results[0];
  }

  async updateFeedbackQuestion(id: number, updates: Partial<FeedbackQuestion>): Promise<FeedbackQuestion> {
    const results = await db.update(feedbackQuestions)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(feedbackQuestions.id, id))
      .returning();
    
    return results[0];
  }

  async toggleFeedbackQuestionStatus(id: number): Promise<FeedbackQuestion> {
    // Get the current question
    const question = await this.getFeedbackQuestion(id);
    if (!question) throw new Error('Feedback question not found');
    
    // Toggle the isActive status
    const results = await db.update(feedbackQuestions)
      .set({ 
        isActive: !question.isActive,
        updatedAt: new Date()
      })
      .where(eq(feedbackQuestions.id, id))
      .returning();
    
    return results[0];
  }

  async reorderFeedbackQuestions(questionIds: number[]): Promise<FeedbackQuestion[]> {
    const updatedQuestions: FeedbackQuestion[] = [];
    
    // Update each question with its new sort order
    for (let i = 0; i < questionIds.length; i++) {
      const id = questionIds[i];
      const sortOrder = i + 1;
      
      const results = await db.update(feedbackQuestions)
        .set({ sortOrder })
        .where(eq(feedbackQuestions.id, id))
        .returning();
      
      if (results.length > 0) {
        updatedQuestions.push(results[0]);
      }
    }
    
    // Return the updated questions sorted by their new order
    return updatedQuestions.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  // ================= Feedback Campaign Operations =================
  async getFeedbackCampaigns(organizationId: number): Promise<FeedbackCampaign[]> {
    return await db.select()
      .from(feedbackCampaigns)
      .where(eq(feedbackCampaigns.organization_id, organizationId))
      .orderBy(desc(feedbackCampaigns.createdAt));
  }

  async getActiveFeedbackCampaigns(organizationId: number): Promise<FeedbackCampaign[]> {
    const now = new Date();
    
    return await db.select()
      .from(feedbackCampaigns)
      .where(
        and(
          eq(feedbackCampaigns.organization_id, organizationId),
          eq(feedbackCampaigns.isActive, true),
          lte(feedbackCampaigns.startDate, now),
          or(
            isNull(feedbackCampaigns.endDate),
            gte(feedbackCampaigns.endDate, now)
          )
        )
      )
      .orderBy(desc(feedbackCampaigns.createdAt));
  }

  async getFeedbackCampaign(id: number): Promise<FeedbackCampaign | undefined> {
    const results = await db.select().from(feedbackCampaigns).where(eq(feedbackCampaigns.id, id));
    return results[0];
  }

  async createFeedbackCampaign(campaign: InsertFeedbackCampaign): Promise<FeedbackCampaign> {
    const results = await db.insert(feedbackCampaigns).values(campaign).returning();
    return results[0];
  }

  async updateFeedbackCampaign(id: number, updates: Partial<FeedbackCampaign>): Promise<FeedbackCampaign> {
    const results = await db.update(feedbackCampaigns)
      .set(updates)
      .where(eq(feedbackCampaigns.id, id))
      .returning();
    
    return results[0];
  }

  async toggleFeedbackCampaignStatus(id: number): Promise<FeedbackCampaign> {
    // Get the current campaign
    const campaign = await this.getFeedbackCampaign(id);
    if (!campaign) throw new Error('Feedback campaign not found');
    
    // Toggle the isActive status
    const results = await db.update(feedbackCampaigns)
      .set({ isActive: !campaign.isActive })
      .where(eq(feedbackCampaigns.id, id))
      .returning();
    
    return results[0];
  }

  async addQuestionToCampaign(campaignId: number, questionId: number, sortOrder: number): Promise<void> {
    await db.insert(campaignQuestions).values({
      campaignId,
      questionId,
      sortOrder
    });
  }

  async removeQuestionFromCampaign(campaignId: number, questionId: number): Promise<void> {
    await db.delete(campaignQuestions)
      .where(
        and(
          eq(campaignQuestions.campaignId, campaignId),
          eq(campaignQuestions.questionId, questionId)
        )
      );
  }

  async getCampaignQuestions(campaignId: number): Promise<FeedbackQuestion[]> {
    const campaignQuestionsResult = await db.select({
      questionId: campaignQuestions.questionId,
      sortOrder: campaignQuestions.sortOrder
    })
    .from(campaignQuestions)
    .where(eq(campaignQuestions.campaignId, campaignId))
    .orderBy(asc(campaignQuestions.sortOrder));
    
    if (campaignQuestionsResult.length === 0) return [];
    
    const questionIds = campaignQuestionsResult.map(cq => cq.questionId);
    
    const questionsResult = await db.select()
      .from(feedbackQuestions)
      .where(sql`${feedbackQuestions.id} IN (${questionIds.join(', ')})`);
    
    // Sort the questions according to the campaign sort order
    return questionsResult.sort((a, b) => {
      const aIndex = campaignQuestionsResult.findIndex(cq => cq.questionId === a.id);
      const bIndex = campaignQuestionsResult.findIndex(cq => cq.questionId === b.id);
      return aIndex - bIndex;
    });
  }

  // ================= Feedback Operations =================
  async getFeedback(id: number): Promise<Feedback | undefined> {
    const results = await db.select().from(feedback).where(eq(feedback.id, id));
    return results[0];
  }

  async getUserFeedback(userId: number): Promise<Feedback[]> {
    return await db.select()
      .from(feedback)
      .where(eq(feedback.userId, userId))
      .orderBy(desc(feedback.createdAt));
  }

  async getCampaignFeedback(campaignId: number): Promise<Feedback[]> {
    return await db.select()
      .from(feedback)
      .where(eq(feedback.campaignId, campaignId))
      .orderBy(desc(feedback.createdAt));
  }

  async getCurrentCampaignFeedback(userId: number, campaignId: number): Promise<Feedback | undefined> {
    const results = await db.select()
      .from(feedback)
      .where(
        and(
          eq(feedback.userId, userId),
          eq(feedback.campaignId, campaignId)
        )
      )
      .orderBy(desc(feedback.createdAt));
    
    return results[0];
  }

  async getAllFeedback(organizationId: number): Promise<Feedback[]> {
    return await db.select()
      .from(feedback)
      .where(eq(feedback.organization_id, organizationId))
      .orderBy(desc(feedback.createdAt));
  }

  async createFeedback(feedbackData: InsertFeedback): Promise<Feedback> {
    const results = await db.insert(feedback).values(feedbackData).returning();
    return results[0];
  }

  async updateFeedback(id: number, updates: Partial<Feedback>): Promise<Feedback> {
    // If marking as completed, set the submitted timestamp
    if (updates.isCompleted && updates.isCompleted === true) {
      updates.submittedAt = new Date();
    }
    
    const results = await db.update(feedback)
      .set(updates)
      .where(eq(feedback.id, id))
      .returning();
    
    return results[0];
  }

  async getUserAverageRating(userId: number): Promise<number | null> {
    // Get all completed feedback for this user
    const userFeedback = await db.select()
      .from(feedback)
      .where(
        and(
          eq(feedback.userId, userId),
          eq(feedback.isCompleted, true)
        )
      );
    
    if (userFeedback.length === 0) return null;
    
    // Calculate the average rating
    const total = userFeedback.reduce((sum, fb) => {
      const avgRating = parseFloat(fb.averageRating as string);
      return isNaN(avgRating) ? sum : sum + avgRating;
    }, 0);
    
    return total / userFeedback.length;
  }

  async checkFeedbackNeeded(userId: number, campaignId: number): Promise<boolean> {
    // Check if the user has already completed feedback for this campaign
    const existingFeedback = await this.getCurrentCampaignFeedback(userId, campaignId);
    
    if (!existingFeedback) return true;
    if (!existingFeedback.isCompleted) return true;
    
    return false;
  }

  async generateCampaignFeedbackRequests(campaignId: number): Promise<number> {
    // Get the campaign
    const campaign = await this.getFeedbackCampaign(campaignId);
    if (!campaign) throw new Error('Feedback campaign not found');
    
    // Skip if campaign is not active
    if (!campaign.isActive) return 0;
    
    // Get users that match the target role
    let targetUsers: User[] = [];
    
    if (campaign.targetUserRole === 'all') {
      // Get all users in the organization
      targetUsers = await this.getUsersByOrganization(campaign.organization_id);
    } else {
      // Get users with the specific role
      targetUsers = await this.getUsersByRole(campaign.targetUserRole);
      
      // Filter to users in this organization
      targetUsers = targetUsers.filter(user => 
        user.organization_id === campaign.organization_id);
    }
    
    // Create feedback requests for users
    let createdCount = 0;
    
    for (const user of targetUsers) {
      const needsFeedback = await this.checkFeedbackNeeded(user.id, campaign.id);
      
      if (needsFeedback) {
        // Create new feedback request
        await this.createFeedback({
          userId: user.id,
          campaignId: campaign.id,
          organization_id: campaign.organization_id,
          responses: {},
          isCompleted: false
        });
        
        createdCount++;
      }
    }
    
    return createdCount;
  }

  // ================= Order Feedback Operations =================
  async getOrderFeedback(orderId: number): Promise<OrderFeedback | undefined> {
    const results = await db.select()
      .from(orderFeedback)
      .where(eq(orderFeedback.orderId, orderId));
    
    return results[0];
  }

  async createOrderFeedback(feedbackData: InsertOrderFeedback): Promise<OrderFeedback> {
    const results = await db.insert(orderFeedback).values(feedbackData).returning();
    return results[0];
  }

  async getOrderFeedbackByUser(userId: number): Promise<OrderFeedback[]> {
    return await db.select()
      .from(orderFeedback)
      .where(eq(orderFeedback.userId, userId))
      .orderBy(desc(orderFeedback.createdAt));
  }
}

// Create and export a single instance of the storage
export const storage = new DatabaseStorage();