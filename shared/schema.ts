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
  emailVerified: boolean("email_verified").notNull().default(false),
  verificationToken: text("verification_token"),
  password_reset_token: text("password_reset_token"),
  password_reset_expires: timestamp("password_reset_expires"),
  companyName: text("company_name").notNull(),
  country: text("country").notNull(),
  billingAddress: text("billing_address").notNull(),
  bio: text("bio"),
  profilePicture: text("profile_picture"),
  companyLogo: text("company_logo"),
  dateOfBirth: text("date_of_birth"),
  phoneNumber: text("phone_number"),
  linkedinUrl: text("linkedin_url"),
  instagramProfile: text("instagram_profile"),
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
    password: true,
    billingAddress: true, // Remove billing address field from profile updates
    emailVerified: true,
    verificationToken: true,
    password_reset_token: true,
    password_reset_expires: true
  })
  .extend({
    bio: z.string().min(20, "Bio must be at least 20 characters long").max(2000, "Bio must not exceed 2000 characters"),
    profilePicture: z.string().optional(),
    companyLogo: z.string().optional(),
    dateOfBirth: z.string().min(1, "Date of birth is required"),
    phoneNumber: z.string().min(5, "Phone number is required").max(20, "Phone number is too long"),
    linkedinUrl: z.string().min(1, "LinkedIn URL is required")
      .url("Please enter a valid LinkedIn URL")
      .includes("linkedin.com", { message: "URL must be from LinkedIn" }),
    instagramProfile: z.string().optional(),
  });
  
// Schema for updating username
export const updateUsernameSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(30, "Username must not exceed 30 characters"),
});

// Schema for updating password
export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(8, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Confirm password is required"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Schema for email verification
export const verifyEmailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

// Schema for password reset request
export const passwordResetRequestSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

// Schema for password reset
export const passwordResetSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Confirm password is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Schema for updating billing details
export const updateBillingSchema = z.object({
  billingAddress: z.string().min(5, "Billing address is required").max(500, "Billing address is too long"),
  billingEmail: z.string().email("Please enter a valid email address"),
  billingPreferences: z.enum(["paypal", "wire"]).optional(),
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
  gpTat: text("gp_tat"), // Guest Post Turnaround Time
  neTat: text("ne_tat"), // Niche Edit Turnaround Time
  guidelines: text("guidelines"),
  lastMetricsUpdate: timestamp("last_metrics_update"), // New field for tracking Ahrefs updates
  isGlobal: boolean("is_global").default(true).notNull(), // Indicates if this is a global domain (admin) or user-specific
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }), // For user-specific domains
});

// Create insert schema for domains
// Create base domain insert schema
const baseDomainSchema = createInsertSchema(domains).omit({ id: true });

// Create domain insert schema with data transformation and validation
export const insertDomainSchema = baseDomainSchema
.transform(data => {
  // Handle empty numeric fields by converting them to null
  return {
    ...data,
    // Convert empty strings or 0 to null for numeric fields
    domainRating: data.domainRating === "" || data.domainRating === "0" ? null : data.domainRating,
    domainAuthority: data.domainAuthority === "" || data.domainAuthority === "0" ? null : data.domainAuthority,
    websiteTraffic: data.websiteTraffic === 0 ? null : data.websiteTraffic,
    guestPostPrice: data.guestPostPrice === "" ? null : data.guestPostPrice,
    nicheEditPrice: data.nicheEditPrice === "" ? null : data.nicheEditPrice,
    // Handle empty strings for non-required text fields
    gpTat: data.gpTat === "" ? null : data.gpTat,
    neTat: data.neTat === "" ? null : data.neTat,
    guidelines: data.guidelines === "" ? null : data.guidelines,
  };
})
.refine((data) => {
  // Validation for Guest Post domains
  if (data.type === "guest_post") {
    // Must have guest post price and TAT
    if (!data.guestPostPrice || !data.gpTat) {
      return false;
    }
    // Must not have niche edit price or TAT
    if (data.nicheEditPrice || data.neTat) {
      return false;
    }
  }
  
  // Validation for Niche Edit domains
  if (data.type === "niche_edit") {
    // Must have niche edit price and TAT
    if (!data.nicheEditPrice || !data.neTat) {
      return false;
    }
    // Must not have guest post price or TAT
    if (data.guestPostPrice || data.gpTat) {
      return false;
    }
  }
  
  // Validation for Both type domains
  if (data.type === "both") {
    // Must have both prices and TATs
    if (!data.guestPostPrice || !data.nicheEditPrice || 
        !data.gpTat || !data.neTat) {
      return false;
    }
  }
  
  return true;
}, {
  message: "Domain fields must match the selected type. Guest Post domains need GP Price and TAT, Niche Edit domains need NE Price and TAT, and Both types need all fields."
});

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
  ticketId: integer("ticket_id"), // Added for support ticket notifications
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").notNull(),
});

// Add timestamp type to order comments
export const orderComments = pgTable("order_comments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  userId: integer("user_id").notNull(),
  message: text("message").notNull(),
  ticketId: integer("ticket_id"), // Added for ticket-related comments
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isFromAdmin: boolean("is_from_admin").notNull().default(false),
  isSystemMessage: boolean("is_system_message").notNull().default(false),
  readByUser: boolean("read_by_user").notNull().default(false),
  readByAdmin: boolean("read_by_admin").notNull().default(false),
  attachmentUrl: text("attachment_url"),
  attachmentType: text("attachment_type"), // 'image', 'audio', etc.
});

// Create insert schema for comments
export const insertOrderCommentSchema = createInsertSchema(orderComments).omit({
  id: true,
  createdAt: true,
}).extend({
  ticketId: z.number().optional(),
  isFromAdmin: z.boolean().optional(),
  isSystemMessage: z.boolean().optional(),
  readByUser: z.boolean().optional(),
  readByAdmin: z.boolean().optional(),
  attachmentUrl: z.string().nullable().optional(),
  attachmentType: z.string().nullable().optional(),
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
    website: z.string().optional(), // Added website field for guest posts
  });

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// Add the status type constants
export const GUEST_POST_STATUSES = [
  "In Progress",
  "Approved",
  "Sent to Editor",
  "Completed",
  "Rejected",
  "Cancelled"
] as const;

export const NICHE_EDIT_STATUSES = [
  "In Progress",
  "Sent to Editor",
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

// Invoices schema
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(), // Amount in cents
  dueDate: timestamp("due_date").notNull(),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  status: text("status", { enum: ["pending", "paid", "overdue"] }).default("pending").notNull(),
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  clientEmail: text("client_email"), // Email where invoice is sent
  paymentMethod: text("payment_method"), // "paypal" or "wire"
  paymentFee: integer("payment_fee").default(0), // Fee amount in cents (e.g., 5% for PayPal)
});

export const insertInvoiceSchema = createInsertSchema(invoices);

export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

// Support Tickets schema
export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  orderId: integer("order_id").references(() => orders.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  status: text("status", { enum: ["open", "closed"] }).default("open").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
  rating: integer("rating"), // 1-5 stars
  feedback: text("feedback"),
});

export const insertTicketSchema = createInsertSchema(supportTickets).omit({
  id: true,
  createdAt: true,
  closedAt: true,
});

export const updateTicketSchema = z.object({
  status: z.enum(["open", "closed"]).optional(),
  rating: z.number().min(1).max(5).optional(),
  feedback: z.string().optional(),
});

export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type UpdateTicket = z.infer<typeof updateTicketSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;

// Feedback schema
export const feedbackQuestionTable = pgTable("feedback_questions", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => users.id),
  sortOrder: integer("sort_order").default(0).notNull()
});

export const insertFeedbackQuestionSchema = createInsertSchema(feedbackQuestionTable, {
  id: undefined
});

export type InsertFeedbackQuestion = z.infer<typeof insertFeedbackQuestionSchema>;
export type FeedbackQuestion = typeof feedbackQuestionTable.$inferSelect;

// Default feedback questions (used as initial data)
export const defaultFeedbackQuestions = [
  "How satisfied are you with the quality of our link building services?",
  "How would you rate the communication during the order process?",
  "How satisfied are you with the turnaround time for your orders?", 
  "How likely are you to recommend our services to others?",
  "How would you rate the value for money of our services?"
];

export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  ratings: text("ratings").notNull(), // Will store JSON as string
  averageRating: text("average_rating").notNull(),
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isCompleted: boolean("is_completed").default(false).notNull()
});

export const insertFeedbackSchema = createInsertSchema(feedback, {
  id: undefined
});

export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedback.$inferSelect;