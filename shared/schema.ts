import { pgTable, text, serial, timestamp, integer, decimal, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  companyName: text("company_name").notNull(),
  country: text("country").notNull(),
  billingAddress: text("billing_address").notNull(),
  bio: text("bio"),
  profilePicture: text("profile_picture"),
  companyLogo: text("company_logo"),
  is_admin: boolean("is_admin").notNull().default(false),
});

// Create insert schema for users
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  firstName: true,
  lastName: true,
  email: true,
  companyName: true,
  country: true,
  billingAddress: true,
  bio: true,
  profilePicture: true,
  companyLogo: true,
  is_admin: true,
});

// Update schema for profile
export const updateProfileSchema = createInsertSchema(users)
  .omit({ 
    id: true, 
    username: true, 
    password: true 
  })
  .extend({
    bio: z.string().optional(),
    profilePicture: z.string().optional(),
    companyLogo: z.string().optional(),
  });

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;
export type User = typeof users.$inferSelect;

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  sourceUrl: text("source_url").notNull(),
  targetUrl: text("target_url").notNull(),
  anchorText: text("anchor_text").notNull(),
  textEdit: text("text_edit"),
  notes: text("notes"),
  domainAuthority: decimal("domain_authority"),
  domainRating: decimal("domain_rating"),
  websiteTraffic: integer("website_traffic"),
  pageTraffic: integer("page_traffic"),
  price: decimal("price").notNull(),
  status: text("status").notNull(),
  dateOrdered: timestamp("date_ordered").notNull(),
  dateCompleted: timestamp("date_completed"),
  // New fields for different order types
  title: text("title"), // For guest posts
  linkUrl: text("link_url"), // For niche edits
});

export const domains = pgTable("domains", {
  id: serial("id").primaryKey(),
  websiteName: text("website_name").notNull(),
  websiteUrl: text("website_url").notNull(),
  domainAuthority: decimal("domain_authority"),
  domainRating: decimal("domain_rating"),
  websiteTraffic: integer("website_traffic"),
  niche: text("niche").notNull(),
  type: text("type").notNull(), // guest_post, niche_edit, or both
  guestPostPrice: decimal("guest_post_price"),
  nicheEditPrice: decimal("niche_edit_price"),
  guidelines: text("guidelines"),
  lastMetricsUpdate: timestamp("last_metrics_update"), // New field for tracking Ahrefs updates
});

// Create insert schema for domains
export const insertDomainSchema = createInsertSchema(domains).omit({ id: true });

// Types
export type InsertDomain = z.infer<typeof insertDomainSchema>;
export type Domain = typeof domains.$inferSelect;

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  userId: integer("user_id").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(),
  orderId: integer("order_id"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").notNull(),
});

// Add timestamp type to order comments
export const orderComments = pgTable("order_comments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  userId: integer("user_id").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isFromAdmin: boolean("is_from_admin").notNull().default(false),
  readByUser: boolean("read_by_user").notNull().default(false),
  readByAdmin: boolean("read_by_admin").notNull().default(false),
});

// Create insert schema for comments
export const insertOrderCommentSchema = createInsertSchema(orderComments).omit({
  id: true,
  createdAt: true,
  isFromAdmin: true,
  readByUser: true,
  readByAdmin: true,
});

// Types
export type InsertOrderComment = z.infer<typeof insertOrderCommentSchema>;
export type OrderComment = typeof orderComments.$inferSelect;

// Update the order schema section
export const insertOrderSchema = createInsertSchema(orders)
  .omit({
    id: true,
    dateCompleted: true,
  })
  .extend({
    title: z.string().optional(),
    linkUrl: z.string().optional(),
    content: z.string().optional(),
    weWriteContent: z.boolean().optional(),
  });

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// Add the status type constants
export const GUEST_POST_STATUSES = [
  "Title Approval Pending",
  "Title Approved",
  "Content Writing",
  "Sent To Editor",
  "Completed",
  "Rejected",
  "Cancelled"
] as const;

export const NICHE_EDIT_STATUSES = [
  "In Progress",
  "Sent",
  "Rejected",
  "Cancelled",
  "Completed"
] as const;

export type GuestPostStatus = typeof GUEST_POST_STATUSES[number];
export type NicheEditStatus = typeof NICHE_EDIT_STATUSES[number];
export type OrderStatus = GuestPostStatus | NicheEditStatus;

export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true });

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true });

// Types
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type Review = typeof reviews.$inferSelect;
export type Notification = typeof notifications.$inferSelect;


// Update the messages table definition
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull(),
  receiverId: integer("receiver_id").notNull(),
  content: text("content").notNull(), // This is the message content
  attachmentUrl: text("attachment_url"),
  attachmentType: text("attachment_type"), // 'image', 'video', 'document'
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Update insert schema for messages
export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  read: true,
});

// Types remain the same
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;