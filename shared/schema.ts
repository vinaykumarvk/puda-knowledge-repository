import { pgTable, text, varchar, timestamp, boolean, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Conversations table for chat history
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  mode: text("mode").notNull(), // "balanced" | "deep" | "concise"
  useCache: boolean("use_cache").notNull().default(true),
  response: text("response").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

// Query schema for graph database chatbot
export const querySchema = z.object({
  question: z.string().min(1, "Question is required"),
  mode: z.enum(["balanced", "deep", "concise"]),
  refresh: z.boolean(),
});

export type Query = z.infer<typeof querySchema>;

// Response schema
export const responseSchema = z.object({
  data: z.string(), // Markdown formatted response
  citations: z.string().optional(), // Citations if available
  error: z.string().optional(),
});

export type QueryResponse = z.infer<typeof responseSchema>;

// User schema (keeping existing for compatibility)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
