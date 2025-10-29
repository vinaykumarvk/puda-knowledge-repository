import { pgTable, text, varchar, timestamp, boolean, serial, integer, date, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

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
  threadId: integer("thread_id").references(() => threads.id, { onDelete: "cascade" }),
  topic: text("topic").notNull(), // Quiz topic name
  category: text("category").notNull(), // Quiz category
  totalQuestions: integer("total_questions").notNull(),
  correctAnswers: integer("correct_answers").notNull(),
  scorePercentage: integer("score_percentage").notNull(), // 0-100
  pointsEarned: integer("points_earned").notNull(), // Points added to cumulative score
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
  overallScore: integer("overall_score").notNull().default(0), // 0-100 percentage for UI display
  totalCumulativePoints: integer("total_cumulative_points").notNull().default(0), // Cumulative points (unbounded)
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

// Quiz Questions - master quiz question bank
export const quizQuestions = pgTable("quiz_questions", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(), // "Order Management", etc.
  topic: text("topic").notNull(), // "Introduction to Order Management", "SEBI Regulatory Changes", etc.
  difficulty: text("difficulty").notNull(), // "Easy", "Medium", "Hard"
  questionText: text("question_text").notNull(),
  optionA: text("option_a"),
  optionB: text("option_b"),
  optionC: text("option_c"),
  optionD: text("option_d"),
  correctAnswer: text("correct_answer").notNull(), // "a", "b", "c", "d", or "true", "false"
  questionType: text("question_type").notNull(), // "multiple_choice" or "true_false"
  explanation: text("explanation"), // Optional explanation for the answer
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertQuizQuestionSchema = createInsertSchema(quizQuestions).omit({
  id: true,
  createdAt: true,
});

export type InsertQuizQuestion = z.infer<typeof insertQuizQuestionSchema>;
export type QuizQuestion = typeof quizQuestions.$inferSelect;

// ===== RFP Response Generator Tables =====

// RFP Responses - tracks template-based RFP responses
export const rfpResponses = pgTable("rfp_responses", {
  id: serial("id").primaryKey(),
  clientName: text("client_name").notNull(),
  clientIndustry: text("client_industry").notNull(),
  rfpTitle: text("rfp_title").notNull(),
  rfpId: text("rfp_id"),
  submissionDate: date("submission_date").notNull(),
  budgetRange: text("budget_range"),
  projectSummary: text("project_summary").notNull(),
  companyName: text("company_name").notNull(),
  pointOfContact: text("point_of_contact").notNull(),
  companyStrengths: text("company_strengths"),
  selectedTemplate: text("selected_template").notNull(),
  customizations: text("customizations"),
  generatedContent: text("generated_content"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const insertRfpResponseSchema = createInsertSchema(rfpResponses).omit({
  id: true,
  createdAt: true,
  lastUpdated: true,
});

export type InsertRfpResponse = z.infer<typeof insertRfpResponseSchema>;
export type RfpResponse = typeof rfpResponses.$inferSelect;

// Excel Requirement Responses - stores individual requirement answers with AI responses
export const excelRequirementResponses = pgTable("excel_requirement_responses", {
  id: serial("id").primaryKey(),
  // RFP identification
  rfpName: text("rfp_name"),
  requirementId: text("requirement_id"),
  uploadedBy: text("uploaded_by"),
  
  // Requirement details
  category: text("category").notNull(),
  requirement: text("requirement").notNull(),
  
  // AI-generated responses from different models
  finalResponse: text("final_response"),
  openaiResponse: text("openai_response"),
  anthropicResponse: text("anthropic_response"),
  deepseekResponse: text("deepseek_response"),
  moaResponse: text("moa_response"), // Mixture of Agents synthesized response
  
  // Similar questions (stored as JSON string)
  similarQuestions: text("similar_questions"),
  
  // Metadata
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  rating: integer("rating"),
  feedback: text("feedback"), // 'positive', 'negative', or null
  modelProvider: text("model_provider"),
});

export const insertExcelRequirementResponseSchema = createInsertSchema(excelRequirementResponses).omit({
  id: true,
  timestamp: true,
});

export type InsertExcelRequirementResponse = z.infer<typeof insertExcelRequirementResponseSchema>;
export type ExcelRequirementResponse = typeof excelRequirementResponses.$inferSelect;

// Reference Responses - stores similar past responses for each requirement
export const referenceResponses = pgTable("reference_responses", {
  id: serial("id").primaryKey(),
  // Link to the parent response
  responseId: integer("response_id").notNull().references(() => excelRequirementResponses.id, { onDelete: 'cascade' }),
  // Reference information from vector similarity search
  category: text("category").notNull(),
  requirement: text("requirement").notNull(),
  response: text("response").notNull(),
  reference: text("reference"),
  score: real("score").notNull(), // Similarity score from vector search
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertReferenceResponseSchema = createInsertSchema(referenceResponses).omit({
  id: true,
  timestamp: true,
});

export type InsertReferenceResponse = z.infer<typeof insertReferenceResponseSchema>;
export type ReferenceResponse = typeof referenceResponses.$inferSelect;

// Relations for RFP tables
export const excelRequirementResponsesRelations = relations(excelRequirementResponses, ({ many }) => ({
  references: many(referenceResponses),
}));

export const referenceResponsesRelations = relations(referenceResponses, ({ one }) => ({
  parentResponse: one(excelRequirementResponses, {
    fields: [referenceResponses.responseId],
    references: [excelRequirementResponses.id],
  }),
}));
