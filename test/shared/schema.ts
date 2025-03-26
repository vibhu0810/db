import { pgTable, serial, varchar, integer, text, timestamp, boolean, uniqueIndex, numeric, jsonb } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// ========== Organization Model ==========
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  owner_id: integer("owner_id"),
  created_at: timestamp("created_at").defaultNow(),
  logo: varchar("logo", { length: 255 }),
  website: varchar("website", { length: 255 }),
  billing_email: varchar("billing_email", { length: 255 }),
  billing_details: jsonb("billing_details"),
  subscription_plan: varchar("subscription_plan", { length: 50 }).default("basic"),
  admins_count: integer("admins_count").default(1),
  inventory_managers_count: integer("inventory_managers_count").default(1),
  user_managers_count: integer("user_managers_count").default(0),
  users_count: integer("users_count").default(5),
  monthly_order_limit: integer("monthly_order_limit").default(100),
  current_orders_count: integer("current_orders_count").default(0)
});

// ========== User Model ==========
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  organization_id: integer("organization_id").references(() => organizations.id),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 50 }),
  lastName: varchar("last_name", { length: 50 }),
  email: varchar("email", { length: 255 }).notNull(),
  emailVerified: boolean("email_verified").default(false),
  verificationToken: varchar("verification_token", { length: 100 }),
  password_reset_token: varchar("password_reset_token", { length: 100 }),
  password_reset_expires: timestamp("password_reset_expires"),
  companyName: varchar("company_name", { length: 100 }),
  country: varchar("country", { length: 2 }),
  billingAddress: text("billing_address"),
  bio: text("bio"),
  profilePicture: varchar("profile_picture", { length: 255 }),
  companyLogo: varchar("company_logo", { length: 255 }),
  dateOfBirth: varchar("date_of_birth", { length: 10 }),
  phoneNumber: varchar("phone_number", { length: 20 }),
  linkedinUrl: varchar("linkedin_url", { length: 255 }),
  instagramProfile: varchar("instagram_profile", { length: 255 }),
  
  // Role-specific fields
  is_admin: boolean("is_admin").default(false),
  role: varchar("role", { 
    enum: ["admin", "user_manager", "inventory_manager", "user"] 
  }).notNull().default("user"),
  
  // User Manager specific fields
  managed_by: integer("managed_by"),
  monthly_order_limit: integer("monthly_order_limit"),
  
  // Subscription tracking
  subscription_tier: varchar("subscription_tier", { length: 50 }),
  subscription_start: timestamp("subscription_start"),
  subscription_end: timestamp("subscription_end"),
  
  last_login: timestamp("last_login"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at")
});

// ========== User Assignment Model ==========
export const userAssignments = pgTable("user_assignments", {
  id: serial("id").primaryKey(),
  manager_id: integer("manager_id").references(() => users.id, { onDelete: 'cascade' }),
  user_id: integer("user_id").references(() => users.id, { onDelete: 'cascade' }),
  assigned_at: timestamp("assigned_at").defaultNow(),
  assigned_by: integer("assigned_by").references(() => users.id),
  active: boolean("active").default(true),
});

// ========== Domain Model ==========
export const domains = pgTable("domains", {
  id: serial("id").primaryKey(),
  organization_id: integer("organization_id").references(() => organizations.id),
  websiteName: varchar("website_name", { length: 255 }).notNull(),
  websiteUrl: varchar("website_url", { length: 255 }).notNull(),
  domainRating: varchar("domain_rating", { length: 10 }), 
  websiteTraffic: integer("website_traffic"),
  niche: varchar("niche", { length: 100 }),
  type: varchar("type", { 
    enum: ["guest_post", "niche_edit", "both"] 
  }).notNull(),
  guidelines: text("guidelines"),
  guestPostPrice: varchar("guest_post_price", { length: 20 }),
  nicheEditPrice: varchar("niche_edit_price", { length: 20 }),
  gpTat: varchar("gp_tat", { length: 50 }),
  neTat: varchar("ne_tat", { length: 50 }),
  lastMetricsUpdate: timestamp("last_metrics_update"),
  isGlobal: boolean("is_global").default(false),
  userId: integer("user_id").references(() => users.id),
  created_by: integer("created_by").references(() => users.id),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at")
});

// ========== Domain Pricing Model ==========
export const domainPricing = pgTable("domain_pricing", {
  id: serial("id").primaryKey(),
  domainId: integer("domain_id").references(() => domains.id, { onDelete: 'cascade' }),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }),
  guestPostPrice: varchar("guest_post_price", { length: 20 }),
  nicheEditPrice: varchar("niche_edit_price", { length: 20 }),
  isCustom: boolean("is_custom").default(true),
  pricingTierId: integer("pricing_tier_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
  createdBy: integer("created_by").references(() => users.id),
});

// ========== Pricing Tier Model ==========
export const pricingTiers = pgTable("pricing_tiers", {
  id: serial("id").primaryKey(),
  organization_id: integer("organization_id").references(() => organizations.id),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  multiplier: numeric("multiplier", { precision: 5, scale: 2 }).default("1.00"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
  createdBy: integer("created_by").references(() => users.id),
});

// ========== User Pricing Tier Model ==========
export const userPricingTiers = pgTable("user_pricing_tiers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }),
  tierId: integer("tier_id").references(() => pricingTiers.id, { onDelete: 'cascade' }),
  assignedAt: timestamp("assigned_at").defaultNow(),
  assignedBy: integer("assigned_by").references(() => users.id),
});

// ========== Order Model ==========
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  organization_id: integer("organization_id").references(() => organizations.id),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }),
  domainId: integer("domain_id").references(() => domains.id),
  sourceUrl: varchar("source_url", { length: 255 }).notNull(),
  targetUrl: varchar("target_url", { length: 255 }).notNull(),
  anchorText: varchar("anchor_text", { length: 255 }).notNull(),
  textEdit: text("text_edit"),
  notes: text("notes"),
  price: varchar("price", { length: 20 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  type: varchar("type", { 
    enum: ["guest_post", "niche_edit"] 
  }).notNull(),
  dateOrdered: timestamp("date_ordered").defaultNow(),
  dateCompleted: timestamp("date_completed"),
  title: varchar("title", { length: 255 }),
  linkUrl: varchar("link_url", { length: 255 }),
  contentDoc: varchar("content_doc", { length: 255 }),
  created_by: integer("created_by").references(() => users.id),
  assigned_to: integer("assigned_to").references(() => users.id),
  updated_at: timestamp("updated_at")
});

// ========== Order Comments Model ==========
export const orderComments = pgTable("order_comments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id, { onDelete: 'cascade' }),
  userId: integer("user_id").references(() => users.id),
  comment: text("comment").notNull(),
  isRead: boolean("is_read").default(false),
  readBy: jsonb("read_by").default([]),
  isFromAdmin: boolean("is_from_admin").default(false),
  isSystemMessage: boolean("is_system_message").default(false),
  ticketId: integer("ticket_id"),
  createdAt: timestamp("created_at").defaultNow()
});

// ========== Support Ticket Model ==========
export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  organization_id: integer("organization_id").references(() => organizations.id),
  title: varchar("title", { length: 255 }).notNull(),
  userId: integer("user_id").references(() => users.id),
  orderId: integer("order_id").references(() => orders.id),
  status: varchar("status", { 
    enum: ["open", "in_progress", "waiting", "resolved", "closed"] 
  }).notNull().default("open"),
  priority: varchar("priority", { 
    enum: ["low", "medium", "high", "urgent"] 
  }).notNull().default("medium"),
  category: varchar("category", { length: 100 }),
  description: text("description").notNull(),
  attachments: jsonb("attachments").default('[]'),
  resolution: text("resolution"),
  resolvedAt: timestamp("resolved_at"),
  rating: integer("rating"),
  feedback: text("feedback"),
  dueDate: timestamp("due_date"),
  assigned_to: integer("assigned_to").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  closedAt: timestamp("closed_at"),
  updatedAt: timestamp("updated_at")
});

// ========== Ticket Comments Model ==========
export const ticketComments = pgTable("ticket_comments", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").references(() => supportTickets.id, { onDelete: 'cascade' }),
  userId: integer("user_id").references(() => users.id),
  content: text("content").notNull(),
  isInternal: boolean("is_internal").default(false),
  attachments: jsonb("attachments").default('[]'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
});

// ========== Ticket History Model ==========
export const ticketHistory = pgTable("ticket_history", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").references(() => supportTickets.id, { onDelete: 'cascade' }),
  userId: integer("user_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  details: jsonb("details").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

// ========== Feedback Questions Model ==========
export const feedbackQuestions = pgTable("feedback_questions", {
  id: serial("id").primaryKey(),
  organization_id: integer("organization_id").references(() => organizations.id),
  question: text("question").notNull(),
  type: varchar("type", { 
    enum: ["rating", "text", "multiple_choice", "checkbox"] 
  }).notNull(),
  options: jsonb("options").default('[]'),
  category: varchar("category", { length: 100 }),
  isRequired: boolean("is_required").default(true),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").notNull(),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
});

// ========== Feedback Campaigns Model ==========
export const feedbackCampaigns = pgTable("feedback_campaigns", {
  id: serial("id").primaryKey(),
  organization_id: integer("organization_id").references(() => organizations.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  targetUserRole: varchar("target_user_role", { 
    enum: ["all", "admin", "user_manager", "inventory_manager", "user"] 
  }).notNull().default("all"),
  frequency: varchar("frequency", { 
    enum: ["one_time", "daily", "weekly", "monthly", "quarterly"] 
  }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow()
});

// ========== Campaign Questions Model ==========
export const campaignQuestions = pgTable("campaign_questions", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => feedbackCampaigns.id, { onDelete: 'cascade' }),
  questionId: integer("question_id").references(() => feedbackQuestions.id, { onDelete: 'cascade' }),
  sortOrder: integer("sort_order").notNull()
});

// ========== Feedback Model ==========
export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  organization_id: integer("organization_id").references(() => organizations.id),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }),
  campaignId: integer("campaign_id").references(() => feedbackCampaigns.id),
  responses: jsonb("responses").notNull(),
  averageRating: numeric("average_rating", { precision: 3, scale: 2 }),
  comments: text("comments"),
  isCompleted: boolean("is_completed").default(false),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow()
});

// ========== Order Feedback Model ==========
export const orderFeedback = pgTable("order_feedback", {
  id: serial("id").primaryKey(),
  organization_id: integer("organization_id").references(() => organizations.id),
  orderId: integer("order_id").references(() => orders.id, { onDelete: 'cascade' }),
  userId: integer("user_id").references(() => users.id),
  rating: integer("rating").notNull(),
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow()
});

// ========== Notifications Model ==========
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  isRead: boolean("is_read").default(false),
  relatedId: integer("related_id"),
  relatedType: varchar("related_type", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow()
});

// ========== Invoices Model ==========
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  organization_id: integer("organization_id").references(() => organizations.id),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  dueDate: timestamp("due_date").notNull(),
  status: varchar("status", { 
    enum: ["pending", "paid", "overdue", "cancelled"]
  }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  fileUrl: varchar("file_url", { length: 255 }),
  fileName: varchar("file_name", { length: 255 }),
  paidAt: timestamp("paid_at"),
  clientEmail: varchar("client_email", { length: 255 }),
  paymentMethod: varchar("payment_method", { length: 50 }),
  paymentFee: numeric("payment_fee", { precision: 10, scale: 2 }),
  created_by: integer("created_by").references(() => users.id)
});

// ========== Create Zod Schemas ==========

// Organization Schemas
export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  created_at: true,
  current_orders_count: true
});

// User Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  created_at: true,
  updated_at: true,
  last_login: true
});

export const updateProfileSchema = createInsertSchema(users).pick({
  firstName: true,
  lastName: true,
  email: true,
  companyName: true,
  country: true,
  billingAddress: true,
  bio: true,
  profilePicture: true,
  companyLogo: true,
  dateOfBirth: true,
  phoneNumber: true,
  linkedinUrl: true,
  instagramProfile: true
});

export const updateUsernameSchema = z.object({
  username: z.string().min(3).max(50)
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6)
});

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

// User Assignment Schemas
export const insertUserAssignmentSchema = createInsertSchema(userAssignments).omit({
  id: true,
  assigned_at: true,
});

// Domain Schemas
export const insertDomainSchema = createInsertSchema(domains).omit({
  id: true,
  created_at: true,
  updated_at: true,
  lastMetricsUpdate: true
});

// Domain Pricing Schemas
export const insertDomainPricingSchema = createInsertSchema(domainPricing).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Pricing Tier Schemas
export const insertPricingTierSchema = createInsertSchema(pricingTiers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// User Pricing Tier Schemas
export const insertUserPricingTierSchema = createInsertSchema(userPricingTiers).omit({
  id: true,
  assignedAt: true,
});

// Order Schemas
export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  dateOrdered: true,
  dateCompleted: true,
  updated_at: true
});

// Order Comment Schemas
export const insertOrderCommentSchema = createInsertSchema(orderComments).omit({
  id: true,
  createdAt: true,
  isRead: true,
  readBy: true,
  isFromAdmin: true,
  isSystemMessage: true
});

// Support Ticket Schemas
export const insertTicketSchema = createInsertSchema(supportTickets).omit({
  id: true,
  createdAt: true,
  closedAt: true,
  updatedAt: true,
  resolvedAt: true
});

export const updateTicketSchema = z.object({
  title: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  resolution: z.string().optional(),
  assigned_to: z.number().optional(),
  dueDate: z.date().optional()
});

// Ticket Comment Schemas
export const insertTicketCommentSchema = createInsertSchema(ticketComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Feedback Question Schemas
export const insertFeedbackQuestionSchema = createInsertSchema(feedbackQuestions).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Feedback Campaign Schemas
export const insertFeedbackCampaignSchema = createInsertSchema(feedbackCampaigns).omit({
  id: true,
  createdAt: true
});

// Feedback Schemas
export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  createdAt: true,
  submittedAt: true
});

// Order Feedback Schemas
export const insertOrderFeedbackSchema = createInsertSchema(orderFeedback).omit({
  id: true,
  createdAt: true
});

// Notification Schemas
export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  isRead: true
});

// Invoice Schemas
export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  paidAt: true
});

// ========== Export Types ==========

// Organization Types
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;

// User Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;
export type User = typeof users.$inferSelect;

// User Assignment Types
export type InsertUserAssignment = z.infer<typeof insertUserAssignmentSchema>;
export type UserAssignment = typeof userAssignments.$inferSelect;

// Domain Types
export type InsertDomain = z.infer<typeof insertDomainSchema>;
export type Domain = typeof domains.$inferSelect;

// Domain Pricing Types
export type InsertDomainPricing = z.infer<typeof insertDomainPricingSchema>;
export type DomainPricing = typeof domainPricing.$inferSelect;

// Pricing Tier Types
export type InsertPricingTier = z.infer<typeof insertPricingTierSchema>;
export type PricingTier = typeof pricingTiers.$inferSelect;

// User Pricing Tier Types
export type InsertUserPricingTier = z.infer<typeof insertUserPricingTierSchema>;
export type UserPricingTier = typeof userPricingTiers.$inferSelect;

// Order Types
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// Order Comment Types
export type InsertOrderComment = z.infer<typeof insertOrderCommentSchema>;
export type OrderComment = typeof orderComments.$inferSelect;

// Support Ticket Types
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type UpdateTicket = z.infer<typeof updateTicketSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;

// Ticket Comment Types
export type InsertTicketComment = z.infer<typeof insertTicketCommentSchema>;
export type TicketComment = typeof ticketComments.$inferSelect;

// Feedback Question Types
export type InsertFeedbackQuestion = z.infer<typeof insertFeedbackQuestionSchema>;
export type FeedbackQuestion = typeof feedbackQuestions.$inferSelect;

// Feedback Campaign Types
export type InsertFeedbackCampaign = z.infer<typeof insertFeedbackCampaignSchema>;
export type FeedbackCampaign = typeof feedbackCampaigns.$inferSelect;

// Feedback Types
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedback.$inferSelect;

// Order Feedback Types
export type InsertOrderFeedback = z.infer<typeof insertOrderFeedbackSchema>;
export type OrderFeedback = typeof orderFeedback.$inferSelect;

// Notification Types
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Invoice Types
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

// Status constants
export const GUEST_POST_STATUSES = [
  "pending", 
  "researching", 
  "writing", 
  "submitted", 
  "published", 
  "completed", 
  "canceled"
] as const;

export const NICHE_EDIT_STATUSES = [
  "pending", 
  "in_progress", 
  "published", 
  "completed", 
  "canceled"
] as const;

export type GuestPostStatus = typeof GUEST_POST_STATUSES[number];
export type NicheEditStatus = typeof NICHE_EDIT_STATUSES[number];
export type OrderStatus = GuestPostStatus | NicheEditStatus;