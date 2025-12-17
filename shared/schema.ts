// @ts-nocheck
import { pgTable, text, varchar, timestamp, boolean, serial, integer, date, real } from "drizzle-orm/pg-core";
import { vector } from "drizzle-orm/pg-core";
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

// Deep mode background jobs (persisted)
export const deepModeJobs = pgTable("deep_mode_jobs", {
  id: text("id").primaryKey(),
  threadId: integer("thread_id").notNull().references(() => threads.id, { onDelete: "cascade" }),
  messageId: integer("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  responseId: text("response_id").notNull(),
  status: text("status").notNull(), // queued | polling | retrieving | formatting | completed | failed
  rawResponse: text("raw_response"),
  formattedResult: text("formatted_result"),
  metadata: text("metadata"), // JSON string
  error: text("error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDeepModeJobSchema = createInsertSchema(deepModeJobs).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertDeepModeJob = z.infer<typeof insertDeepModeJobSchema>;
export type DeepModeJob = typeof deepModeJobs.$inferSelect;

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

// BA Knowledge Questions - curated prompts for product understanding
export const baKnowledgeQuestions = pgTable("ba_knowledge_questions", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  question: text("question").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBaKnowledgeQuestionSchema = createInsertSchema(baKnowledgeQuestions).omit({
  id: true,
  createdAt: true,
});

export type InsertBaKnowledgeQuestion = z.infer<typeof insertBaKnowledgeQuestionSchema>;
export type BaKnowledgeQuestion = typeof baKnowledgeQuestions.$inferSelect;

// Query schema for graph database chatbot
export const querySchema = z.object({
  question: z.string().min(1, "Question is required"),
  mode: z.enum(["balanced", "deep", "concise"]),
  refresh: z.boolean().optional(),
  refreshCache: z.boolean().optional(), // Bypass cache and get fresh answer
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

// User schema - for authentication and authorization
export const users = pgTable("users", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  username: text("username").notNull().unique(),
  password: text("password").notNull(), // bcrypt hashed
  fullName: text("full_name").notNull(),
  team: text("team").notNull(), // 'admin' | 'presales' | 'ba' | 'management'
  managerId: varchar("manager_id").references(() => users.id), // Links to manager (M1 for BA, M2 for Pre-sales)
  email: text("email"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastLogin: timestamp("last_login"),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLogin: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Sessions table - for managing user login sessions
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // UUID session token
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  createdAt: true,
});

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

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

// Historical RFPs - stores past RFP responses for RAG-based retrieval
export const historicalRfps = pgTable("historical_rfps", {
  id: serial("id").primaryKey(),
  
  // RFP Metadata
  rfpName: text("rfp_name").notNull(),
  clientName: text("client_name"),
  clientIndustry: text("client_industry"),
  submissionDate: date("submission_date"),
  
  // Requirement Details
  category: text("category").notNull(),
  requirement: text("requirement").notNull(),
  response: text("response").notNull(), // The actual approved response used
  
  // Quality Metrics
  successScore: integer("success_score"), // 1-5 rating (did we win the RFP?)
  responseQuality: text("response_quality"), // "excellent", "good", "average"
  
  // Vector Embedding for similarity search (OpenAI text-embedding-3-small: 1536 dimensions)
  embedding: vector("embedding", { dimensions: 1536 }),
  
  // Metadata
  uploadedBy: text("uploaded_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertHistoricalRfpSchema = createInsertSchema(historicalRfps).omit({
  id: true,
  createdAt: true,
});

export type InsertHistoricalRfp = z.infer<typeof insertHistoricalRfpSchema>;
export type HistoricalRfp = typeof historicalRfps.$inferSelect;

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

// ===== Investment Portal Tables =====

// Investment requests table
export const investmentRequests = pgTable("investment_requests", {
  id: serial("id").primaryKey(),
  requestId: text("request_id").notNull().unique(), // INV-2025-001
  reportCode: text("report_code").unique(), // Unique code like RPT-2025-001 for searching and filtering
  requesterId: varchar("requester_id").references(() => users.id), // Changed to varchar for UUID
  targetCompany: text("target_company").notNull(),
  investmentType: text("investment_type").notNull(), // equity, debt, real_estate, alternative, base_document
  reportTitle: text("report_title"), // Title of the report (for report drafting platform)
  reportDate: text("report_date"), // Date of the report
  createdBy: text("created_by"), // Name of the author/creator
  description: text("description"),
  enhancedDescription: text("enhanced_description"), // AI-enhanced version of description
  status: text("status").notNull().default("draft"), // draft, submitted, under_review, approved, rejected, revision_requested
  currentApprovalStage: integer("current_approval_stage").default(0),
  slaDeadline: timestamp("sla_deadline"),
  deletedAt: timestamp("deleted_at"), // Soft delete timestamp
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  currentApprovalCycle: integer("current_approval_cycle").notNull().default(1), // Track current submission cycle
});

// Individual approval records
export const approvals = pgTable("approvals", {
  id: serial("id").primaryKey(),
  requestType: text("request_type").notNull(), // investment, cash_request
  requestId: integer("request_id").notNull(),
  stage: integer("stage").notNull(),
  approverId: varchar("approver_id").references(() => users.id), // Changed to varchar for UUID
  status: text("status").notNull(), // pending, approved, rejected, revision_requested
  comments: text("comments"),
  rejectionReason: text("rejection_reason"), // Detailed reason for rejection or revision request
  editHistory: text("edit_history"), // JSON string tracking manager edits during review
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  approvalCycle: integer("approval_cycle").notNull().default(1), // Track which submission cycle
  isCurrentCycle: boolean("is_current_cycle").notNull().default(true), // Whether this is part of current active cycle
});

// Tasks table
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  assigneeId: varchar("assignee_id").references(() => users.id), // Changed to varchar for UUID
  requestType: text("request_type").notNull(), // investment, cash_request
  requestId: integer("request_id").notNull(),
  taskType: text("task_type").notNull(), // approval, review, changes_requested
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"), // pending, completed, overdue
  priority: text("priority").default("medium"), // low, medium, high
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Document categories table
export const documentCategories = pgTable("document_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  icon: text("icon").default("📄"), // emoji icon for display
  isActive: boolean("is_active").default(true),
  isSystem: boolean("is_system").default(false), // system vs user-created
  createdAt: timestamp("created_at").defaultNow(),
});

// Documents table
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  fileUrl: text("file_url").notNull(),
  uploaderId: varchar("uploader_id").references(() => users.id), // Changed to varchar for UUID
  requestType: text("request_type").notNull(), // investment, cash_request
  requestId: integer("request_id").notNull(),
  categoryId: integer("category_id").references(() => documentCategories.id),
  subcategoryId: integer("subcategory_id"),
  isAutoCategorized: boolean("is_auto_categorized").default(false), // AI vs manual categorization
  analysisStatus: text("analysis_status").default("pending"), // pending, processing, completed, failed
  analysisResult: text("analysis_result"), // JSON string with analysis results
  classification: text("classification"), // document type classification
  extractedText: text("extracted_text"), // extracted text content
  keyInformation: text("key_information"), // JSON string with key extracted info
  riskLevel: text("risk_level"), // low, medium, high
  confidence: text("confidence"), // analysis confidence score
  createdAt: timestamp("created_at").defaultNow(),
  analyzedAt: timestamp("analyzed_at"),
});

// Document-category associations table (for multiple categories per document)
export const documentCategoryAssociations = pgTable("document_category_associations", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => documents.id).notNull(),
  categoryId: integer("category_id").references(() => documentCategories.id).notNull(),
  customCategoryName: text("custom_category_name"), // for "Others" category with custom name
  createdAt: timestamp("created_at").defaultNow(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id), // Changed to varchar for UUID
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // task_assigned, approval_needed, sla_warning, status_update
  isRead: boolean("is_read").default(false),
  relatedType: text("related_type"), // investment, cash_request, task
  relatedId: integer("related_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Templates table
export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // investment, cash_request
  investmentType: text("investment_type"), // equity, debt, real_estate, alternative
  templateData: text("template_data").notNull(), // JSON string with sections and word limits
  createdBy: varchar("created_by").references(() => users.id), // Changed to varchar for UUID
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Investment rationales table
export const investmentRationales = pgTable("investment_rationales", {
  id: serial("id").primaryKey(),
  investmentId: integer("investment_id").references(() => investmentRequests.id).notNull(),
  content: text("content").notNull(),
  type: text("type").notNull(), // manual, ai_generated
  templateId: integer("template_id").references(() => templates.id),
  authorId: varchar("author_id").references(() => users.id), // Changed to varchar for UUID
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Background jobs table
export const backgroundJobs = pgTable("background_jobs", {
  id: serial("id").primaryKey(),
  jobType: varchar("job_type", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, processing, completed, failed
  currentStep: varchar("current_step", { length: 50 }).default("queued"),
  stepProgress: integer("step_progress").default(0), // 0-100 percentage for current step
  totalSteps: integer("total_steps").default(4),
  currentStepNumber: integer("current_step_number").default(0),
  documentId: integer("document_id").references(() => documents.id),
  requestType: varchar("request_type", { length: 50 }),
  requestId: integer("request_id"),
  priority: varchar("priority", { length: 10 }).notNull().default("normal"),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),
  errorMessage: text("error_message"),
  result: text("result"),
  createdAt: timestamp("created_at").defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

// Document queries table
export const documentQueries = pgTable("document_queries", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => documents.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(), // Changed to varchar for UUID
  query: text("query").notNull(),
  response: text("response").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Cross-document queries table
export const crossDocumentQueries = pgTable("cross_document_queries", {
  id: serial("id").primaryKey(),
  requestType: text("request_type").notNull(), // investment, cash_request
  requestId: integer("request_id").notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(), // Changed to varchar for UUID
  query: text("query").notNull(),
  response: text("response").notNull(),
  documentCount: integer("document_count").notNull().default(0),
  openaiResponseId: text("openai_response_id"),
  openaiModel: text("openai_model"),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  totalTokens: integer("total_tokens"),
  processingTimeMs: integer("processing_time_ms"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Web search queries table
export const webSearchQueries = pgTable("web_search_queries", {
  id: serial("id").primaryKey(),
  requestType: text("request_type").notNull(), // investment, cash_request
  requestId: integer("request_id").notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(), // Changed to varchar for UUID
  query: text("query").notNull(),
  response: text("response").notNull(),
  searchType: text("search_type").notNull().default("web_search"),
  openaiResponseId: text("openai_response_id"),
  openaiModel: text("openai_model"),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  totalTokens: integer("total_tokens"),
  processingTimeMs: integer("processing_time_ms"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Sequences table - for sequential ID generation
export const sequences = pgTable("sequences", {
  id: serial("id").primaryKey(),
  sequenceName: text("sequence_name").notNull().unique(), // 'INV', 'CASH', etc.
  currentValue: integer("current_value").notNull().default(0),
  year: integer("year").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Investment Portal Zod Schemas
export const insertInvestmentRequestSchema = createInsertSchema(investmentRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertApprovalSchema = createInsertSchema(approvals).omit({
  id: true,
  createdAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
});

export const insertDocumentCategorySchema = createInsertSchema(documentCategories).omit({
  id: true,
  createdAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
  createdAt: true,
});

export const insertInvestmentRationaleSchema = createInsertSchema(investmentRationales).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Solution Templates - for Business Analyst solution documents
export const solutionTemplates = pgTable("solution_templates", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  createdBy: varchar("created_by").references(() => users.id),
  isDefault: boolean("is_default").default(false), // Whether this is a default template
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Template Sections - individual sections within a template
export const templateSections = pgTable("template_sections", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").references(() => solutionTemplates.id, { onDelete: "cascade" }),
  sectionType: text("section_type").notNull(), // heading, revisionHistory, tableOfContents, changeRequirement, businessImpact, affectedSystems, solution, testScenarios
  title: text("title").notNull(),
  content: text("content"), // Editable content for the section
  orderIndex: integer("order_index").notNull(), // For ordering sections
  isEditable: boolean("is_editable").default(true),
});

// Template Work Items - specific work items within Solution section
export const templateWorkItems = pgTable("template_work_items", {
  id: serial("id").primaryKey(),
  sectionId: integer("section_id").references(() => templateSections.id, { onDelete: "cascade" }),
  title: text("title").notNull(), // e.g., "Description of Change", "Logic and Validations"
  content: text("content"), // Editable content
  orderIndex: integer("order_index").notNull(),
  isIncluded: boolean("is_included").default(true), // Whether this work item is included in current template
});

// Template Revisions - track changes to templates
export const templateRevisions = pgTable("template_revisions", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").references(() => solutionTemplates.id, { onDelete: "cascade" }),
  version: text("version").notNull(), // e.g., "1.0", "1.1"
  changedBy: varchar("changed_by").references(() => users.id),
  changeDate: timestamp("change_date").defaultNow(),
  changeDescription: text("change_description"),
});

// Insert schemas for solution templates
export const insertSolutionTemplateSchema = createInsertSchema(solutionTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTemplateSectionSchema = createInsertSchema(templateSections).omit({
  id: true,
});

export const insertTemplateWorkItemSchema = createInsertSchema(templateWorkItems).omit({
  id: true,
});

export const insertTemplateRevisionSchema = createInsertSchema(templateRevisions).omit({
  id: true,
  changeDate: true,
});

// Investment Portal Types
export type InsertInvestmentRequest = z.infer<typeof insertInvestmentRequestSchema>;
export type InvestmentRequest = typeof investmentRequests.$inferSelect;

export type InsertApproval = z.infer<typeof insertApprovalSchema>;
export type Approval = typeof approvals.$inferSelect;

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

export type InsertDocumentCategory = z.infer<typeof insertDocumentCategorySchema>;
export type DocumentCategory = typeof documentCategories.$inferSelect;

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Template = typeof templates.$inferSelect;

export type InsertInvestmentRationale = z.infer<typeof insertInvestmentRationaleSchema>;
export type InvestmentRationale = typeof investmentRationales.$inferSelect;

// Solution Template Types
export type InsertSolutionTemplate = z.infer<typeof insertSolutionTemplateSchema>;
export type SolutionTemplate = typeof solutionTemplates.$inferSelect;

export type InsertTemplateSection = z.infer<typeof insertTemplateSectionSchema>;
export type TemplateSection = typeof templateSections.$inferSelect;

export type InsertTemplateWorkItem = z.infer<typeof insertTemplateWorkItemSchema>;
export type TemplateWorkItem = typeof templateWorkItems.$inferSelect;

export type InsertTemplateRevision = z.infer<typeof insertTemplateRevisionSchema>;
export type TemplateRevision = typeof templateRevisions.$inferSelect;

// Response Cache - stores cached responses for all modes (concise, balanced, deep)
export const responseCache = pgTable("response_cache", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  questionEmbedding: vector("question_embedding", { dimensions: 1536 }), // OpenAI text-embedding-3-small
  mode: text("mode").notNull(), // "concise" | "balanced" | "deep"
  response: text("response").notNull(), // Final formatted response
  rawResponse: text("raw_response"), // Raw response (for deep mode before formatting)
  metadata: text("metadata"), // JSON string with metadata
  responseId: text("response_id"), // OpenAI/EKG response ID
  isDeepMode: boolean("is_deep_mode").default(false), // Flag for deep mode
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastAccessedAt: timestamp("last_accessed_at").notNull().defaultNow(),
  accessCount: integer("access_count").notNull().default(1),
  isRefreshed: boolean("is_refreshed").default(false), // True if this was a refresh result
  originalCacheId: integer("original_cache_id").references(() => responseCache.id), // Links to original cached entry if refreshed
});

export const insertResponseCacheSchema = createInsertSchema(responseCache).omit({
  id: true,
  createdAt: true,
  lastAccessedAt: true,
});

export type InsertResponseCache = z.infer<typeof insertResponseCacheSchema>;
export type ResponseCache = typeof responseCache.$inferSelect;
