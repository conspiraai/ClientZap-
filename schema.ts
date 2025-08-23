import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  zapLink: text("zap_link").notNull().unique(), // Unique 6-character alphanumeric code
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // Profile settings
  displayName: text("display_name"),
  profilePicture: text("profile_picture"),
  freelancerType: text("freelancer_type"), // Designer, Developer, Consultant, etc.
  businessName: text("business_name"),
  businessLogo: text("business_logo"),
  website: text("website"),
  socialLinks: jsonb("social_links"), // { twitter, linkedin, instagram, etc. }
  brandColor: text("brand_color").default("#3b82f6"), // Primary brand color
  emailSignature: text("email_signature"),
  subscriptionType: text("subscription_type").default("free"), // free, pro
  subscriptionStatus: text("subscription_status").default("inactive"), // inactive, active, canceled, past_due
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionEndsAt: timestamp("subscription_ends_at"),
});

export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  formStatus: text("form_status").notNull().default("pending"), // pending, completed
  contractStatus: text("contract_status").notNull().default("not_sent"), // not_sent, sent, signed
  callStatus: text("call_status").notNull().default("not_scheduled"), // not_scheduled, scheduled, completed
  progress: integer("progress").notNull().default(0), // 0-100
  formData: jsonb("form_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const forms = pgTable("forms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  fields: jsonb("fields").notNull(), // Array of form field definitions
  isPublished: boolean("is_published").notNull().default(false),
  shareableLink: text("shareable_link").unique(),
  calendlyLink: text("calendly_link"), // Optional Calendly scheduling link
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Table for shared forms (Zap Inbox)
export const sharedForms = pgTable("shared_forms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  formId: varchar("form_id").notNull().references(() => forms.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  recipientId: varchar("recipient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  viewedAt: timestamp("viewed_at"),
  status: text("status").default("pending"), // pending, viewed, responded
});

export const contracts = pgTable("contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("draft"), // draft, sent, signed
  docusignEnvelopeId: text("docusign_envelope_id"),
  contractData: jsonb("contract_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const waitlistSignups = pgTable("waitlist_signups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const formSubmissions = pgTable("form_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  formId: varchar("form_id").notNull().references(() => forms.id, { onDelete: "cascade" }),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email").notNull(),
  submissionData: jsonb("submission_data").notNull(), // All form field responses
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  contractGenerated: boolean("contract_generated").default(false),
  contractUrl: text("contract_url"),
  calendlyLink: text("calendly_link"), // Store scheduling link for this submission
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
});

export const updateUserProfileSchema = createInsertSchema(users).pick({
  displayName: true,
  email: true,
  freelancerType: true,
  businessName: true,
  website: true,
  socialLinks: true,
  brandColor: true,
  emailSignature: true,
}).extend({
  displayName: z.string().min(1, "Display name is required"),
  email: z.string().email("Invalid email address"),
  freelancerType: z.string().optional(),
  businessName: z.string().optional(),
  website: z.string().url("Invalid website URL").optional().or(z.literal("")),
  socialLinks: z.object({
    twitter: z.string().optional(),
    linkedin: z.string().optional(),
    instagram: z.string().optional(),
    behance: z.string().optional(),
    github: z.string().optional(),
  }).optional(),
  brandColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color").optional(),
  emailSignature: z.string().optional(),
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
});

export const insertFormSchema = createInsertSchema(forms).omit({
  id: true,
  createdAt: true,
  shareableLink: true,
}).extend({
  calendlyLink: z.string().optional(), // Add optional Calendly link to form creation
});

export const insertContractSchema = createInsertSchema(contracts).omit({
  id: true,
  createdAt: true,
});

export const insertWaitlistSchema = createInsertSchema(waitlistSignups).pick({
  email: true,
});

export const insertFormSubmissionSchema = createInsertSchema(formSubmissions).omit({
  id: true,
  submittedAt: true,
  contractGenerated: true,
  contractUrl: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertForm = z.infer<typeof insertFormSchema>;
export type Form = typeof forms.$inferSelect;
export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;
export type InsertWaitlist = z.infer<typeof insertWaitlistSchema>;
export type WaitlistSignup = typeof waitlistSignups.$inferSelect;
export type InsertFormSubmission = z.infer<typeof insertFormSubmissionSchema>;
export type FormSubmission = typeof formSubmissions.$inferSelect;

export const insertSharedFormSchema = createInsertSchema(sharedForms).omit({
  id: true,
  sentAt: true,
});

export type InsertSharedForm = z.infer<typeof insertSharedFormSchema>;
export type SharedForm = typeof sharedForms.$inferSelect;
