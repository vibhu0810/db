import { pgTable, text, serial, timestamp, integer, decimal, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  companyName: text("company_name"),
  companyLogo: text("company_logo"),
});

// Create insert schema for users
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  companyName: true,
  companyLogo: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
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
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").notNull(),
});

export const insertOrderSchema = createInsertSchema(orders)
  .omit({
    id: true,
    dateCompleted: true,
  })
  .extend({
    title: z.string().optional(),
    linkUrl: z.string().optional(),
  });


export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true });

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true });

// Types
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type Order = typeof orders.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Notification = typeof notifications.$inferSelect;