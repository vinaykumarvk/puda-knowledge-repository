// @ts-nocheck
import { 
  users, 
  conversations, 
  threads,
  messages,
  quizAttempts,
  quizResponses,
  userMastery,
  quizQuestions,
  excelRequirementResponses,
  referenceResponses,
  historicalRfps,
  sessions,
  investmentRequests,
  approvals,
  tasks,
  documents,
  documentCategories,
  documentCategoryAssociations,
  notifications,
  templates,
  investmentRationales,
  sequences,
  type User, 
  type InsertUser, 
  type Conversation, 
  type InsertConversation,
  type Thread,
  type InsertThread,
  type Message,
  type InsertMessage,
  type QuizAttempt,
  type InsertQuizAttempt,
  type QuizResponse,
  type InsertQuizResponse,
  type UserMastery,
  type InsertUserMastery,
  type QuizQuestion,
  type ExcelRequirementResponse,
  type InsertExcelRequirementResponse,
  type HistoricalRfp,
  type InsertHistoricalRfp,
  type Session,
  type InsertSession,
  type InvestmentRequest,
  type InsertInvestmentRequest,
  type Approval,
  type InsertApproval,
  type Task,
  type InsertTask,
  type Document,
  type InsertDocument,
  type DocumentCategory,
  type InsertDocumentCategory,
  type Notification,
  type InsertNotification,
  type Template,
  type InsertTemplate,
  type InvestmentRationale,
  type InsertInvestmentRationale,
  solutionTemplates,
  templateSections,
  templateWorkItems,
  templateRevisions,
  baKnowledgeQuestions,
  type SolutionTemplate,
  type InsertSolutionTemplate,
  type TemplateSection,
  type InsertTemplateSection,
  type TemplateWorkItem,
  type InsertTemplateWorkItem,
  type TemplateRevision,
  type InsertTemplateRevision,
  type BaKnowledgeQuestion
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, sql, or, ne, isNull } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserLastLogin(id: string): Promise<void>;
  getUserManager(userId: string): Promise<User | undefined>;
  
  // Session methods
  createSession(session: InsertSession): Promise<Session>;
  getSession(id: string): Promise<Session | undefined>;
  getSessionWithUser(id: string): Promise<(Session & { user: User }) | undefined>;
  deleteSession(id: string): Promise<void>;
  deleteExpiredSessions(): Promise<void>;
  
  // Thread methods
  getThreads(): Promise<Thread[]>;
  getThread(id: number): Promise<Thread | undefined>;
  createThread(thread: InsertThread): Promise<Thread>;
  updateThreadTitle(id: number, title: string): Promise<Thread>;
  updateThreadTimestamp(id: number): Promise<void>;
  updateThreadConversationId(id: number, conversationId: string): Promise<void>;
  deleteThread(id: number): Promise<void>;
  
  // Message methods
  getMessages(threadId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: number, updates: Partial<Pick<Message, 'content' | 'responseId' | 'sources' | 'metadata'>>): Promise<Message>;
  getLastAssistantMessage(threadId: number): Promise<Message | undefined>;
  getRecentMessagePairs(threadId: number, pairCount: number): Promise<Message[]>;
  
  // Quiz tracking methods
  createQuizAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt>;
  createQuizResponse(response: InsertQuizResponse): Promise<QuizResponse>;
  getQuizAttempts(limit?: number): Promise<QuizAttempt[]>;
  getRecentQuizzes(count: number): Promise<QuizAttempt[]>;
  
  // User mastery methods
  getUserMastery(): Promise<UserMastery | undefined>;
  updateUserMastery(mastery: InsertUserMastery): Promise<UserMastery>;
  
  // Quiz question bank methods
  getQuizCategories(): Promise<any[]>;
  getQuizQuestions(topic: string): Promise<QuizQuestion[]>;
  saveQuizAttemptAndUpdateMastery(
    topic: string,
    category: string,
    score: number,
    totalQuestions: number,
    correctAnswers: number
  ): Promise<{ mastery: UserMastery; attempt: QuizAttempt }>;
  
  // Old conversation methods (kept for backward compatibility)
  getConversations(): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  deleteConversation(id: number): Promise<void>;
  
  // RFP Response methods
  getAllRfpResponses(): Promise<ExcelRequirementResponse[]>;
  getRfpResponseById(id: number): Promise<ExcelRequirementResponse | undefined>;
  createRfpResponse(response: InsertExcelRequirementResponse): Promise<ExcelRequirementResponse>;
  updateRfpResponse(id: number, updates: Partial<InsertExcelRequirementResponse>): Promise<ExcelRequirementResponse>;
  deleteRfpResponse(id: number): Promise<void>;
  getReferencesForResponse(responseId: number): Promise<any[]>;
  getAllQuizStats(): Promise<Record<string, { bestScore: number; attempts: number }>>;
  
  // Investment Portal methods
  // Investment operations
  getInvestmentRequest(id: number): Promise<InvestmentRequest | undefined>;
  getInvestmentRequests(filters?: { userId?: string; status?: string }): Promise<(InvestmentRequest & { documentCount: number })[]>;
  createInvestmentRequest(request: InsertInvestmentRequest): Promise<InvestmentRequest>;
  updateInvestmentRequest(id: number, request: Partial<InsertInvestmentRequest>): Promise<InvestmentRequest>;
  softDeleteInvestmentRequest(id: number): Promise<boolean>;
  
  // Approval operations
  createApproval(approval: InsertApproval): Promise<Approval>;
  getApprovalById(id: number): Promise<Approval | undefined>;
  getApprovalsByRequest(requestType: string, requestId: number): Promise<Approval[]>;
  getApprovalsByApproverId(approverId: string, status?: string): Promise<Approval[]>;
  updateApprovalStatus(id: number, status: string, rejectionReason?: string, editHistory?: string, comments?: string): Promise<Approval>;
  
  // Task operations
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task>;
  getTasksByUser(userId: string): Promise<Task[]>;
  getTaskById(id: number): Promise<Task | undefined>;
  
  // Document operations
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document>;
  deleteDocument(id: number): Promise<void>;
  getDocumentsByRequest(requestType: string, requestId: number): Promise<Document[]>;
  getDocument(id: number): Promise<Document | undefined>;
  
  // Document category operations
  getDocumentCategories(): Promise<DocumentCategory[]>;
  createDocumentCategory(category: InsertDocumentCategory): Promise<DocumentCategory>;
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: string): Promise<Notification[]>;
  markNotificationAsRead(id: number): Promise<void>;
  deleteNotification(id: number): Promise<void>;
  
  // Template operations
  createTemplate(template: InsertTemplate): Promise<Template>;
  getTemplatesByType(type: string): Promise<Template[]>;
  getTemplate(id: number): Promise<Template | undefined>;
  updateTemplate(id: number, template: Partial<InsertTemplate>): Promise<Template>;
  deleteTemplate(id: number): Promise<void>;
  
  // Investment rationale operations
  createInvestmentRationale(rationale: InsertInvestmentRationale): Promise<InvestmentRationale>;
  getInvestmentRationales(investmentId: number): Promise<InvestmentRationale[]>;
  updateInvestmentRationale(id: number, rationale: Partial<InsertInvestmentRationale>): Promise<InvestmentRationale>;
  deleteInvestmentRationale(id: number): Promise<void>;
  
  // Sequence operations
  getNextSequenceValue(sequenceName: string, year: number): Promise<number>;
  
  // Historical RFP methods (for RAG-based retrieval)
  getAllHistoricalRfps(): Promise<HistoricalRfp[]>;
  getHistoricalRfpById(id: number): Promise<HistoricalRfp | undefined>;
  createHistoricalRfp(rfp: InsertHistoricalRfp): Promise<HistoricalRfp>;
  updateHistoricalRfp(id: number, updates: Partial<InsertHistoricalRfp>): Promise<HistoricalRfp>;
  deleteHistoricalRfp(id: number): Promise<void>;
  searchHistoricalRfpsBySimilarity(embedding: number[], topK: number): Promise<Array<HistoricalRfp & { similarity: number }>>;
  
  // Solution Template operations
  createSolutionTemplate(template: InsertSolutionTemplate): Promise<SolutionTemplate>;
  getSolutionTemplate(id: number): Promise<SolutionTemplate | undefined>;
  getAllSolutionTemplates(): Promise<SolutionTemplate[]>;
  updateSolutionTemplate(id: number, template: Partial<InsertSolutionTemplate>): Promise<SolutionTemplate>;
  deleteSolutionTemplate(id: number): Promise<void>;
  getDefaultSolutionTemplate(): Promise<SolutionTemplate | undefined>;
  
  // Template Section operations
  createTemplateSection(section: InsertTemplateSection): Promise<TemplateSection>;
  getTemplateSections(templateId: number): Promise<TemplateSection[]>;
  updateTemplateSection(id: number, section: Partial<InsertTemplateSection>): Promise<TemplateSection>;
  deleteTemplateSection(id: number): Promise<void>;
  
  // Template Work Item operations
  createTemplateWorkItem(workItem: InsertTemplateWorkItem): Promise<TemplateWorkItem>;
  getTemplateWorkItems(sectionId: number): Promise<TemplateWorkItem[]>;
  updateTemplateWorkItem(id: number, workItem: Partial<InsertTemplateWorkItem>): Promise<TemplateWorkItem>;
  deleteTemplateWorkItem(id: number): Promise<void>;
  
  // Template Revision operations
  createTemplateRevision(revision: InsertTemplateRevision): Promise<TemplateRevision>;
  getTemplateRevisions(templateId: number): Promise<TemplateRevision[]>;

  // BA knowledge questions
  getBaKnowledgeQuestions(limit: number): Promise<BaKnowledgeQuestion[]>;
  
  // Complete template with sections and work items
  getCompleteTemplate(templateId: number): Promise<{
    template: SolutionTemplate;
    sections: Array<TemplateSection & { workItems: TemplateWorkItem[] }>;
    revisions: TemplateRevision[];
  } | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    return await db.query.users.findFirst({ 
      where: eq(users.id, id) 
    });
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return await db.query.users.findFirst({ 
      where: eq(users.username, username) 
    });
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserLastLogin(id: string): Promise<void> {
    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, id));
  }

  async getUserManager(userId: string): Promise<User | undefined> {
    const user = await db.query.users.findFirst({ 
      where: eq(users.id, userId) 
    });
    if (!user || !user.managerId) return undefined;
    
    return await db.query.users.findFirst({ 
      where: eq(users.id, user.managerId) 
    });
  }

  // Session methods
  async createSession(insertSession: InsertSession): Promise<Session> {
    const [session] = await db
      .insert(sessions)
      .values(insertSession)
      .returning();
    return session;
  }

  async getSession(id: string): Promise<Session | undefined> {
    const [session] = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, id), gte(sessions.expiresAt, new Date())));
    return session || undefined;
  }

  async getSessionWithUser(id: string): Promise<(Session & { user: User }) | undefined> {
    const result = await db
      .select()
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.id, id), gte(sessions.expiresAt, new Date())));
    
    if (result.length === 0) return undefined;
    
    return {
      ...result[0].sessions,
      user: result[0].users,
    };
  }

  async deleteSession(id: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.id, id));
  }

  async deleteExpiredSessions(): Promise<void> {
    await db.delete(sessions).where(sql`${sessions.expiresAt} < NOW()`);
  }

  // Thread methods
  async getThreads(): Promise<Thread[]> {
    // Only return threads from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return await db
      .select()
      .from(threads)
      .where(gte(threads.updatedAt, thirtyDaysAgo))
      .orderBy(desc(threads.updatedAt));
  }

  async getThread(id: number): Promise<Thread | undefined> {
    const [thread] = await db.select().from(threads).where(eq(threads.id, id));
    return thread || undefined;
  }

  async createThread(insertThread: InsertThread): Promise<Thread> {
    const [thread] = await db
      .insert(threads)
      .values(insertThread)
      .returning();
    return thread;
  }

  async updateThreadTitle(id: number, title: string): Promise<Thread> {
    const [thread] = await db
      .update(threads)
      .set({ title, updatedAt: new Date() })
      .where(eq(threads.id, id))
      .returning();

    if (!thread) {
      throw new Error(`Thread ${id} not found`);
    }

    return thread;
  }

  async updateThreadTimestamp(id: number): Promise<void> {
    await db
      .update(threads)
      .set({ updatedAt: new Date() })
      .where(eq(threads.id, id));
  }

  async updateThreadConversationId(id: number, conversationId: string): Promise<void> {
    await db
      .update(threads)
      .set({ conversationId, updatedAt: new Date() })
      .where(eq(threads.id, id));
  }

  async deleteThread(id: number): Promise<void> {
    await db.delete(threads).where(eq(threads.id, id));
  }

  // Message methods
  async getMessages(threadId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.threadId, threadId))
      .orderBy(messages.createdAt);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async updateMessage(id: number, updates: Partial<Pick<Message, 'content' | 'responseId' | 'sources' | 'metadata'>>): Promise<Message> {
    const [updated] = await db
      .update(messages)
      .set(updates)
      .where(eq(messages.id, id))
      .returning();
    if (!updated) {
      throw new Error(`Message ${id} not found`);
    }
    return updated;
  }

  async getLastAssistantMessage(threadId: number): Promise<Message | undefined> {
    const [message] = await db
      .select()
      .from(messages)
      .where(and(eq(messages.threadId, threadId), eq(messages.role, "assistant")))
      .orderBy(desc(messages.createdAt))
      .limit(1);
    return message || undefined;
  }

  async getRecentMessagePairs(threadId: number, pairCount: number): Promise<Message[]> {
    // Get the last N*2 messages (pairs of user + assistant messages)
    const recentMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.threadId, threadId))
      .orderBy(desc(messages.createdAt))
      .limit(pairCount * 2);
    
    // Reverse to get chronological order (oldest first)
    return recentMessages.reverse();
  }

  // Old conversation methods (kept for backward compatibility)
  async getConversations(): Promise<Conversation[]> {
    return await db.select().from(conversations).orderBy(desc(conversations.createdAt));
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation || undefined;
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values(insertConversation)
      .returning();
    return conversation;
  }

  async deleteConversation(id: number): Promise<void> {
    await db.delete(conversations).where(eq(conversations.id, id));
  }

  // Quiz tracking methods
  async createQuizAttempt(insertAttempt: InsertQuizAttempt): Promise<QuizAttempt> {
    const [attempt] = await db
      .insert(quizAttempts)
      .values(insertAttempt)
      .returning();
    return attempt;
  }

  async createQuizResponse(insertResponse: InsertQuizResponse): Promise<QuizResponse> {
    const [response] = await db
      .insert(quizResponses)
      .values(insertResponse)
      .returning();
    return response;
  }

  async getQuizAttempts(limit?: number): Promise<QuizAttempt[]> {
    const query = db
      .select()
      .from(quizAttempts)
      .orderBy(desc(quizAttempts.createdAt));
    
    if (limit) {
      return await query.limit(limit);
    }
    return await query;
  }

  async getRecentQuizzes(count: number): Promise<QuizAttempt[]> {
    return await db
      .select()
      .from(quizAttempts)
      .orderBy(desc(quizAttempts.createdAt))
      .limit(count);
  }

  async getQuizStatsByTopic(topic: string): Promise<{ bestScore: number; attempts: number }> {
    const attempts = await db
      .select()
      .from(quizAttempts)
      .where(eq(quizAttempts.topic, topic))
      .orderBy(desc(quizAttempts.scorePercentage));
    
    if (attempts.length === 0) {
      return { bestScore: 0, attempts: 0 };
    }
    
    return {
      bestScore: attempts[0].scorePercentage,
      attempts: attempts.length,
    };
  }

  async getAllQuizStats(): Promise<Record<string, { bestScore: number; attempts: number }>> {
    const allAttempts = await db
      .select()
      .from(quizAttempts)
      .orderBy(desc(quizAttempts.scorePercentage));
    
    const stats: Record<string, { bestScore: number; attempts: number }> = {};
    
    for (const attempt of allAttempts) {
      if (!stats[attempt.topic]) {
        stats[attempt.topic] = {
          bestScore: attempt.scorePercentage,
          attempts: 0,
        };
      }
      stats[attempt.topic].attempts += 1;
      // Update best score if this one is higher
      if (attempt.scorePercentage > stats[attempt.topic].bestScore) {
        stats[attempt.topic].bestScore = attempt.scorePercentage;
      }
    }
    
    return stats;
  }

  // User mastery methods
  async getUserMastery(): Promise<UserMastery | undefined> {
    // For single-user system, get the first (and only) mastery record
    const [mastery] = await db.select().from(userMastery).limit(1);
    return mastery || undefined;
  }

  async updateUserMastery(insertMastery: InsertUserMastery): Promise<UserMastery> {
    // Check if mastery record exists
    const existing = await this.getUserMastery();
    
    if (existing) {
      // Update existing record
      const [updated] = await db
        .update(userMastery)
        .set({ ...insertMastery, updatedAt: new Date() })
        .where(eq(userMastery.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new record
      const [created] = await db
        .insert(userMastery)
        .values(insertMastery)
        .returning();
      return created;
    }
  }

  // Quiz question bank methods
  async getQuizCategories(): Promise<any[]> {
    // Group questions by topic (not category) to show individual sub-topic quizzes
    // Order topics in a logical learning progression
    const result = await db
      .select({
        category: quizQuestions.category,
        topic: quizQuestions.topic,
        questionCount: sql<number>`count(*)::int`,
        easyCount: sql<number>`count(*) FILTER (WHERE ${quizQuestions.difficulty} = 'Easy')::int`,
        mediumCount: sql<number>`count(*) FILTER (WHERE ${quizQuestions.difficulty} = 'Medium')::int`,
        hardCount: sql<number>`count(*) FILTER (WHERE ${quizQuestions.difficulty} = 'Hard')::int`,
      })
      .from(quizQuestions)
      .groupBy(quizQuestions.category, quizQuestions.topic)
      .orderBy(sql`
        CASE ${quizQuestions.topic}
          WHEN 'Order Flow Fundamentals' THEN 1
          WHEN 'Order Capture & Document Validation' THEN 2
          WHEN 'Order Modification & Cancellation' THEN 3
          WHEN 'Partial Confirmations & Status' THEN 4
          WHEN 'Account Management & FIFO' THEN 5
          WHEN 'Reconciliation Process' THEN 6
          WHEN 'Pre-Trade Validations' THEN 7
          WHEN 'Order Execution & Settlement' THEN 8
          WHEN 'Transaction Management & Alerts' THEN 9
          WHEN 'Advanced Validations & Partial Confirmations' THEN 10
          ELSE 99
        END ASC
      `);
    
    return result;
  }

  async getQuizQuestions(topic: string): Promise<QuizQuestion[]> {
    return await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.topic, topic))
      .orderBy(sql`RANDOM()`);
  }

  async getQuizHistory(): Promise<any[]> {
    // Get quiz history grouped by topic with best scores and attempt counts
    const result = await db
      .select({
        topic: quizAttempts.topic,
        category: quizAttempts.category,
        bestScore: sql<number>`MAX(${quizAttempts.scorePercentage})`,
        totalAttempts: sql<number>`COUNT(*)`,
        lastAttemptDate: sql<string>`MAX(${quizAttempts.createdAt})`,
        averageScore: sql<number>`ROUND(AVG(${quizAttempts.scorePercentage}))`,
        totalCorrect: sql<number>`SUM(${quizAttempts.correctAnswers})`,
        totalQuestions: sql<number>`SUM(${quizAttempts.totalQuestions})`,
      })
      .from(quizAttempts)
      .groupBy(quizAttempts.topic, quizAttempts.category)
      .execute();
    
    // Convert aggregated values to proper types
    return result.map(row => ({
      topic: row.topic,
      category: row.category,
      bestScore: Number(row.bestScore) || 0,
      totalAttempts: Number(row.totalAttempts) || 0,
      lastAttemptDate: row.lastAttemptDate,
      averageScore: Number(row.averageScore) || 0,
      totalCorrect: Number(row.totalCorrect) || 0,
      totalQuestions: Number(row.totalQuestions) || 0,
    }));
  }

  async saveQuizAttemptAndUpdateMastery(
    topic: string,
    category: string,
    score: number,
    totalQuestions: number,
    correctAnswers: number
  ): Promise<{ mastery: UserMastery; attempt: QuizAttempt }> {
    // Calculate points earned (score as percentage out of 100)
    const pointsEarned = Math.round(score);

    // Save quiz attempt
    const [attempt] = await db
      .insert(quizAttempts)
      .values({
        topic,
        category,
        totalQuestions,
        correctAnswers,
        scorePercentage: score,
        pointsEarned,
      })
      .returning();

    // Get current mastery or create new one
    let mastery = await this.getUserMastery();
    
    if (!mastery) {
      // Create initial mastery record
      const percentage = Math.min(100, Math.round((pointsEarned / 600) * 100));
      const [newMastery] = await db
        .insert(userMastery)
        .values({
          totalCumulativePoints: pointsEarned,
          overallScore: percentage,
          currentLevel: this.calculateLevel(pointsEarned),
          quizPerformanceScore: pointsEarned,
          topicCoverageScore: 0,
          retentionScore: 0,
          topicsMastered: score >= 70 ? 1 : 0,
          totalQuizzesTaken: 1,
        })
        .returning();
      mastery = newMastery;
    } else {
      // Update existing mastery - add points cumulatively
      const newTotalPoints = mastery.totalCumulativePoints + pointsEarned;
      const newQuizCount = mastery.totalQuizzesTaken + 1;
      const percentage = Math.min(100, Math.round((newTotalPoints / 600) * 100));
      
      // Check if this topic was passed (≥70%)
      const topicPassed = score >= 70;
      
      const [updatedMastery] = await db
        .update(userMastery)
        .set({
          totalCumulativePoints: newTotalPoints,
          overallScore: percentage,
          currentLevel: this.calculateLevel(newTotalPoints),
          quizPerformanceScore: newTotalPoints, // Simplified: all points go here
          totalQuizzesTaken: newQuizCount,
          topicsMastered: topicPassed ? mastery.topicsMastered + 1 : mastery.topicsMastered,
          updatedAt: new Date(),
        })
        .where(eq(userMastery.id, mastery.id))
        .returning();
      mastery = updatedMastery;
    }

    return { mastery, attempt };
  }

  // RFP Response methods
  async getAllRfpResponses(): Promise<ExcelRequirementResponse[]> {
    return await db
      .select()
      .from(excelRequirementResponses)
      .orderBy(desc(excelRequirementResponses.timestamp));
  }

  async getRfpResponseById(id: number): Promise<ExcelRequirementResponse | undefined> {
    const [response] = await db
      .select()
      .from(excelRequirementResponses)
      .where(eq(excelRequirementResponses.id, id));
    return response || undefined;
  }

  async createRfpResponse(insertResponse: InsertExcelRequirementResponse): Promise<ExcelRequirementResponse> {
    const [response] = await db
      .insert(excelRequirementResponses)
      .values(insertResponse)
      .returning();
    return response;
  }

  async updateRfpResponse(id: number, updates: Partial<InsertExcelRequirementResponse>): Promise<ExcelRequirementResponse> {
    const [response] = await db
      .update(excelRequirementResponses)
      .set(updates)
      .where(eq(excelRequirementResponses.id, id))
      .returning();
    return response;
  }

  async deleteRfpResponse(id: number): Promise<void> {
    await db
      .delete(excelRequirementResponses)
      .where(eq(excelRequirementResponses.id, id));
  }

  async getReferencesForResponse(responseId: number): Promise<any[]> {
    return await db
      .select()
      .from(referenceResponses)
      .where(eq(referenceResponses.responseId, responseId))
      .orderBy(desc(referenceResponses.score));
  }

  // Historical RFP methods (for RAG-based retrieval)
  async getAllHistoricalRfps(): Promise<HistoricalRfp[]> {
    return await db
      .select()
      .from(historicalRfps)
      .orderBy(desc(historicalRfps.createdAt));
  }

  async getHistoricalRfpById(id: number): Promise<HistoricalRfp | undefined> {
    const [rfp] = await db
      .select()
      .from(historicalRfps)
      .where(eq(historicalRfps.id, id));
    return rfp || undefined;
  }

  async createHistoricalRfp(insertRfp: InsertHistoricalRfp): Promise<HistoricalRfp> {
    const [rfp] = await db
      .insert(historicalRfps)
      .values(insertRfp)
      .returning();
    return rfp;
  }

  async updateHistoricalRfp(id: number, updates: Partial<InsertHistoricalRfp>): Promise<HistoricalRfp> {
    const [rfp] = await db
      .update(historicalRfps)
      .set(updates)
      .where(eq(historicalRfps.id, id))
      .returning();
    return rfp;
  }

  async deleteHistoricalRfp(id: number): Promise<void> {
    await db
      .delete(historicalRfps)
      .where(eq(historicalRfps.id, id));
  }

  async searchHistoricalRfpsBySimilarity(
    embedding: number[], 
    topK: number = 5
  ): Promise<Array<HistoricalRfp & { similarity: number }>> {
    // Use pgvector's cosine distance operator (<=>)
    // Similarity = 1 - distance (convert distance to similarity score)
    const results = await db
      .select({
        id: historicalRfps.id,
        rfpName: historicalRfps.rfpName,
        clientName: historicalRfps.clientName,
        clientIndustry: historicalRfps.clientIndustry,
        submissionDate: historicalRfps.submissionDate,
        category: historicalRfps.category,
        requirement: historicalRfps.requirement,
        response: historicalRfps.response,
        successScore: historicalRfps.successScore,
        responseQuality: historicalRfps.responseQuality,
        embedding: historicalRfps.embedding,
        uploadedBy: historicalRfps.uploadedBy,
        createdAt: historicalRfps.createdAt,
        distance: sql<number>`${historicalRfps.embedding} <=> ${JSON.stringify(embedding)}::vector`
      })
      .from(historicalRfps)
      .orderBy(sql`${historicalRfps.embedding} <=> ${JSON.stringify(embedding)}::vector`)
      .limit(topK);

    // Convert distance to similarity score (1 - distance)
    return results.map(r => ({
      ...r,
      similarity: 1 - r.distance
    }));
  }

  private calculateLevel(points: number): string{
    if (points >= 481) return "Expert";
    if (points >= 361) return "Advanced";
    if (points >= 241) return "Intermediate";
    if (points >= 121) return "Learning";
    return "Novice";
  }

  // ===== Investment Portal Methods =====
  
  async getInvestmentRequest(id: number): Promise<InvestmentRequest | undefined> {
    const [request] = await db.select().from(investmentRequests).where(eq(investmentRequests.id, id));
    return request;
  }

  async getInvestmentRequests(filters?: { userId?: string; status?: string }): Promise<(InvestmentRequest & { documentCount: number })[]> {
    const conditions = [isNull(investmentRequests.deletedAt)];
    if (filters?.userId) conditions.push(eq(investmentRequests.requesterId, filters.userId));
    if (filters?.status) conditions.push(eq(investmentRequests.status, filters.status));
    
    // Use SQL to count documents in a single query
    const requests = await db
      .select({
        id: investmentRequests.id,
        requestId: investmentRequests.requestId,
        reportCode: investmentRequests.reportCode,
        requesterId: investmentRequests.requesterId,
        targetCompany: investmentRequests.targetCompany,
        investmentType: investmentRequests.investmentType,
        description: investmentRequests.description,
        enhancedDescription: investmentRequests.enhancedDescription,
        status: investmentRequests.status,
        currentApprovalStage: investmentRequests.currentApprovalStage,
        slaDeadline: investmentRequests.slaDeadline,
        deletedAt: investmentRequests.deletedAt,
        createdAt: investmentRequests.createdAt,
        updatedAt: investmentRequests.updatedAt,
        currentApprovalCycle: investmentRequests.currentApprovalCycle,
        reportTitle: investmentRequests.reportTitle,
        reportDate: investmentRequests.reportDate,
        createdBy: investmentRequests.createdBy,
        documentCount: sql<number>`COALESCE(COUNT(${documents.id}), 0)`
      })
      .from(investmentRequests)
      .leftJoin(
        documents, 
        and(
          eq(documents.requestId, investmentRequests.id),
          eq(documents.requestType, 'investment')
        )
      )
      .where(and(...conditions))
      .groupBy(investmentRequests.id)
      .orderBy(desc(investmentRequests.createdAt));
    
    return requests;
  }

  async createInvestmentRequest(request: InsertInvestmentRequest): Promise<InvestmentRequest> {
    // Generate unique request ID if not provided (INV-YYYY-XXX format)
    let requestId = request.requestId;
    if (!requestId) {
      const year = new Date().getFullYear();
      const sequenceValue = await this.getNextSequenceValue('investment-request', year);
      requestId = `INV-${year}-${String(sequenceValue).padStart(3, '0')}`;
    }
    
    // Generate unique report code if not provided (RPT-YYYY-XXX format)
    let reportCode = request.reportCode;
    if (!reportCode) {
      const year = new Date().getFullYear();
      const sequenceValue = await this.getNextSequenceValue('report-code', year);
      reportCode = `RPT-${year}-${String(sequenceValue).padStart(3, '0')}`;
    }
    
    const requestData = {
      ...request,
      requestId,
      reportCode
    };
    
    const [newRequest] = await db.insert(investmentRequests).values(requestData).returning();
    return newRequest;
  }

  async updateInvestmentRequest(id: number, request: Partial<InsertInvestmentRequest>): Promise<InvestmentRequest> {
    const [updated] = await db.update(investmentRequests).set(request).where(eq(investmentRequests.id, id)).returning();
    return updated;
  }

  async softDeleteInvestmentRequest(id: number): Promise<boolean> {
    await db.update(investmentRequests).set({ deletedAt: new Date() }).where(eq(investmentRequests.id, id));
    return true;
  }

  async createApproval(approval: InsertApproval): Promise<Approval> {
    const [newApproval] = await db.insert(approvals).values(approval).returning();
    return newApproval;
  }

  async getApprovalById(id: number): Promise<Approval | undefined> {
    return await db.query.approvals.findFirst({ 
      where: eq(approvals.id, id) 
    });
  }

  async getApprovalsByRequest(requestType: string, requestId: number): Promise<Approval[]> {
    return await db.select().from(approvals)
      .where(and(eq(approvals.requestType, requestType), eq(approvals.requestId, requestId)))
      .orderBy(desc(approvals.createdAt));
  }

  async getApprovalsByApproverId(approverId: string, status?: string): Promise<Approval[]> {
    const conditions = status 
      ? and(eq(approvals.approverId, approverId), eq(approvals.status, status))
      : eq(approvals.approverId, approverId);
    
    return await db.select().from(approvals)
      .where(conditions)
      .orderBy(desc(approvals.createdAt));
  }

  async updateApprovalStatus(id: number, status: string, rejectionReason?: string, editHistory?: string, comments?: string): Promise<Approval> {
    const updateData: any = { status, approvedAt: status === 'approved' ? new Date() : null };
    if (rejectionReason !== undefined) updateData.rejectionReason = rejectionReason;
    if (editHistory !== undefined) updateData.editHistory = editHistory;
    if (comments !== undefined) updateData.comments = comments;
    
    const [updated] = await db.update(approvals).set(updateData).where(eq(approvals.id, id)).returning();
    return updated;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async updateTask(id: number, task: Partial<InsertTask>): Promise<Task> {
    const [updated] = await db.update(tasks).set(task).where(eq(tasks.id, id)).returning();
    return updated;
  }

  async getTasksByUser(userId: string): Promise<Task[]> {
    return await db.select().from(tasks)
      .where(eq(tasks.assigneeId, userId))
      .orderBy(desc(tasks.createdAt));
  }

  async getTaskById(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const [newDoc] = await db.insert(documents).values(document).returning();
    return newDoc;
  }

  async updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document> {
    const [updated] = await db.update(documents).set(document).where(eq(documents.id, id)).returning();
    return updated;
  }

  async deleteDocument(id: number): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  async getDocumentsByRequest(requestType: string, requestId: number): Promise<Document[]> {
    return await db.select().from(documents)
      .where(and(eq(documents.requestType, requestType), eq(documents.requestId, requestId)))
      .orderBy(desc(documents.createdAt));
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc;
  }

  async getDocumentCategories(): Promise<DocumentCategory[]> {
    return await db.select().from(documentCategories).where(eq(documentCategories.isActive, true));
  }

  async createDocumentCategory(category: InsertDocumentCategory): Promise<DocumentCategory> {
    const [newCategory] = await db.insert(documentCategories).values(category).returning();
    return newCategory;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(id: number): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }

  async deleteNotification(id: number): Promise<void> {
    await db.delete(notifications).where(eq(notifications.id, id));
  }

  async createTemplate(template: InsertTemplate): Promise<Template> {
    const [newTemplate] = await db.insert(templates).values(template).returning();
    return newTemplate;
  }

  async getTemplatesByType(type: string): Promise<Template[]> {
    return await db.select().from(templates)
      .where(and(eq(templates.type, type), eq(templates.isActive, true)))
      .orderBy(desc(templates.createdAt));
  }

  async getTemplate(id: number): Promise<Template | undefined> {
    const [template] = await db.select().from(templates).where(eq(templates.id, id));
    return template;
  }

  async updateTemplate(id: number, template: Partial<InsertTemplate>): Promise<Template> {
    const [updated] = await db.update(templates).set(template).where(eq(templates.id, id)).returning();
    return updated;
  }

  async deleteTemplate(id: number): Promise<void> {
    await db.delete(templates).where(eq(templates.id, id));
  }

  async createInvestmentRationale(rationale: InsertInvestmentRationale): Promise<InvestmentRationale> {
    const [newRationale] = await db.insert(investmentRationales).values(rationale).returning();
    return newRationale;
  }

  async getInvestmentRationales(investmentId: number): Promise<InvestmentRationale[]> {
    return await db.select().from(investmentRationales)
      .where(eq(investmentRationales.investmentId, investmentId))
      .orderBy(desc(investmentRationales.createdAt));
  }

  async updateInvestmentRationale(id: number, rationale: Partial<InsertInvestmentRationale>): Promise<InvestmentRationale> {
    const [updated] = await db.update(investmentRationales).set(rationale).where(eq(investmentRationales.id, id)).returning();
    return updated;
  }

  async deleteInvestmentRationale(id: number): Promise<void> {
    await db.delete(investmentRationales).where(eq(investmentRationales.id, id));
  }

  async getNextSequenceValue(sequenceName: string, year: number): Promise<number> {
    const [existing] = await db.select().from(sequences)
      .where(and(eq(sequences.sequenceName, sequenceName), eq(sequences.year, year)));
    
    if (existing) {
      const nextValue = existing.currentValue + 1;
      await db.update(sequences)
        .set({ currentValue: nextValue, updatedAt: new Date() })
        .where(eq(sequences.id, existing.id));
      return nextValue;
    } else {
      const [newSeq] = await db.insert(sequences)
        .values({ sequenceName, year, currentValue: 1 })
        .returning();
      return 1;
    }
  }

  async createSolutionTemplate(template: InsertSolutionTemplate): Promise<SolutionTemplate> {
    const [newTemplate] = await db.insert(solutionTemplates).values(template).returning();
    return newTemplate;
  }

  async getSolutionTemplate(id: number): Promise<SolutionTemplate | undefined> {
    const [template] = await db.select().from(solutionTemplates).where(eq(solutionTemplates.id, id));
    return template;
  }

  async getAllSolutionTemplates(): Promise<SolutionTemplate[]> {
    return await db.select().from(solutionTemplates).orderBy(desc(solutionTemplates.createdAt));
  }

  async updateSolutionTemplate(id: number, template: Partial<InsertSolutionTemplate>): Promise<SolutionTemplate> {
    const [updated] = await db.update(solutionTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(solutionTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteSolutionTemplate(id: number): Promise<void> {
    await db.delete(solutionTemplates).where(eq(solutionTemplates.id, id));
  }

  async getDefaultSolutionTemplate(): Promise<SolutionTemplate | undefined> {
    const [template] = await db.select().from(solutionTemplates)
      .where(eq(solutionTemplates.isDefault, true));
    return template;
  }

  async createTemplateSection(section: InsertTemplateSection): Promise<TemplateSection> {
    const [newSection] = await db.insert(templateSections).values(section).returning();
    return newSection;
  }

  async getTemplateSections(templateId: number): Promise<TemplateSection[]> {
    return await db.select().from(templateSections)
      .where(eq(templateSections.templateId, templateId))
      .orderBy(templateSections.orderIndex);
  }

  async updateTemplateSection(id: number, section: Partial<InsertTemplateSection>): Promise<TemplateSection> {
    const [updated] = await db.update(templateSections)
      .set(section)
      .where(eq(templateSections.id, id))
      .returning();
    return updated;
  }

  async deleteTemplateSection(id: number): Promise<void> {
    await db.delete(templateSections).where(eq(templateSections.id, id));
  }

  async createTemplateWorkItem(workItem: InsertTemplateWorkItem): Promise<TemplateWorkItem> {
    const [newWorkItem] = await db.insert(templateWorkItems).values(workItem).returning();
    return newWorkItem;
  }

  async getTemplateWorkItems(sectionId: number): Promise<TemplateWorkItem[]> {
    return await db.select().from(templateWorkItems)
      .where(eq(templateWorkItems.sectionId, sectionId))
      .orderBy(templateWorkItems.orderIndex);
  }

  async updateTemplateWorkItem(id: number, workItem: Partial<InsertTemplateWorkItem>): Promise<TemplateWorkItem> {
    const [updated] = await db.update(templateWorkItems)
      .set(workItem)
      .where(eq(templateWorkItems.id, id))
      .returning();
    return updated;
  }

  async deleteTemplateWorkItem(id: number): Promise<void> {
    await db.delete(templateWorkItems).where(eq(templateWorkItems.id, id));
  }

  async createTemplateRevision(revision: InsertTemplateRevision): Promise<TemplateRevision> {
    const [newRevision] = await db.insert(templateRevisions).values(revision).returning();
    return newRevision;
  }

  async getTemplateRevisions(templateId: number): Promise<TemplateRevision[]> {
    return await db.select().from(templateRevisions)
      .where(eq(templateRevisions.templateId, templateId))
      .orderBy(desc(templateRevisions.changeDate));
  }

  async getBaKnowledgeQuestions(limit: number): Promise<BaKnowledgeQuestion[]> {
    return await db
      .select()
      .from(baKnowledgeQuestions)
      .where(eq(baKnowledgeQuestions.isActive, true))
      .orderBy(sql`random()`)
      .limit(limit);
  }

  async getCompleteTemplate(templateId: number): Promise<{
    template: SolutionTemplate;
    sections: Array<TemplateSection & { workItems: TemplateWorkItem[] }>;
    revisions: TemplateRevision[];
  } | undefined> {
    const template = await this.getSolutionTemplate(templateId);
    if (!template) return undefined;

    const sections = await this.getTemplateSections(templateId);
    const sectionsWithWorkItems = await Promise.all(
      sections.map(async (section) => {
        const workItems = await this.getTemplateWorkItems(section.id);
        return { ...section, workItems };
      })
    );

    const revisions = await this.getTemplateRevisions(templateId);

    return {
      template,
      sections: sectionsWithWorkItems,
      revisions,
    };
  }
}

// Export storage - PostgreSQL + Drizzle only
export const storage = new DatabaseStorage();
