import { pgTable, text, varchar, timestamp, boolean, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Threads table - represents conversation threads (like chat sessions)
export const threads = pgTable("threads", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(), // Generated from first question
  conversationId: text("conversation_id"), // EKG API conversation_id for long-running context
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertThreadSchema = createInsertSchema(threads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertThread = z.infer<typeof insertThreadSchema>;
export type Thread = typeof threads.$inferSelect;

// Messages table - individual messages within threads
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id").notNull().references(() => threads.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // "user" | "assistant"
  content: text("content").notNull(),
  responseId: text("response_id"), // EKG API response_id for conversational chaining
  sources: text("sources"), // JSON string of sources/citations
  metadata: text("metadata"), // JSON string of metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Old conversations table - kept for backward compatibility
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
  threadId: z.number().optional(), // Optional thread ID for conversational mode
});

export type Query = z.infer<typeof querySchema>;

// Response schema
export const responseSchema = z.object({
  data: z.string(), // Markdown formatted response
  metadata: z.string().optional(), // Metadata (mode, model, timestamp)
  citations: z.string().optional(), // Sources/citations if available
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

// Quiz Attempts - tracks each quiz completion
export const quizAttempts = pgTable("quiz_attempts", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id").notNull().references(() => threads.id, { onDelete: "cascade" }),
  totalQuestions: integer("total_questions").notNull(),
  correctAnswers: integer("correct_answers").notNull(),
  scorePercentage: integer("score_percentage").notNull(), // 0-100
  timeSpent: integer("time_spent"), // seconds to complete (optional for now)
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertQuizAttemptSchema = createInsertSchema(quizAttempts).omit({
  id: true,
  createdAt: true,
});

export type InsertQuizAttempt = z.infer<typeof insertQuizAttemptSchema>;
export type QuizAttempt = typeof quizAttempts.$inferSelect;

// Quiz Responses - individual question answers
export const quizResponses = pgTable("quiz_responses", {
  id: serial("id").primaryKey(),
  attemptId: integer("attempt_id").notNull().references(() => quizAttempts.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  userAnswer: text("user_answer").notNull(), // A, B, C, or D
  correctAnswer: text("correct_answer").notNull(),
  isCorrect: boolean("is_correct").notNull(),
  topic: text("topic"), // Extracted topic (optional for now)
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertQuizResponseSchema = createInsertSchema(quizResponses).omit({
  id: true,
  createdAt: true,
});

export type InsertQuizResponse = z.infer<typeof insertQuizResponseSchema>;
export type QuizResponse = typeof quizResponses.$inferSelect;

// User Mastery - calculated mastery scores
export const userMastery = pgTable("user_mastery", {
  id: serial("id").primaryKey(),
  overallScore: integer("overall_score").notNull().default(0), // 0-100
  currentLevel: text("current_level").notNull().default("Novice"), // Novice, Learning, Intermediate, Advanced, Expert
  quizPerformanceScore: integer("quiz_performance_score").notNull().default(0), // 0-50
  topicCoverageScore: integer("topic_coverage_score").notNull().default(0), // 0-30
  retentionScore: integer("retention_score").notNull().default(0), // 0-20
  topicsMastered: integer("topics_mastered").notNull().default(0),
  totalQuizzesTaken: integer("total_quizzes_taken").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserMasterySchema = createInsertSchema(userMastery).omit({
  id: true,
  updatedAt: true,
});

export type InsertUserMastery = z.infer<typeof insertUserMasterySchema>;
export type UserMastery = typeof userMastery.$inferSelect;
