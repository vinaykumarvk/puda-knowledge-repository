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
  type InsertHistoricalRfp
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Thread methods
  getThreads(): Promise<Thread[]>;
  getThread(id: number): Promise<Thread | undefined>;
  createThread(thread: InsertThread): Promise<Thread>;
  updateThreadTimestamp(id: number): Promise<void>;
  updateThreadConversationId(id: number, conversationId: string): Promise<void>;
  deleteThread(id: number): Promise<void>;
  
  // Message methods
  getMessages(threadId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
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
  
  // Historical RFP methods (for RAG-based retrieval)
  getAllHistoricalRfps(): Promise<HistoricalRfp[]>;
  getHistoricalRfpById(id: number): Promise<HistoricalRfp | undefined>;
  createHistoricalRfp(rfp: InsertHistoricalRfp): Promise<HistoricalRfp>;
  updateHistoricalRfp(id: number, updates: Partial<InsertHistoricalRfp>): Promise<HistoricalRfp>;
  deleteHistoricalRfp(id: number): Promise<void>;
  searchHistoricalRfpsBySimilarity(embedding: number[], topK: number): Promise<Array<HistoricalRfp & { similarity: number }>>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
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
}

export const storage = new DatabaseStorage();
