import { 
  users, 
  conversations, 
  threads,
  messages,
  quizAttempts,
  quizResponses,
  userMastery,
  quizQuestions,
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
  type QuizQuestion
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
  
  // Old conversation methods (kept for backward compatibility)
  getConversations(): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  deleteConversation(id: number): Promise<void>;
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
    // Group questions by category and get statistics
    const result = await db
      .select({
        category: quizQuestions.category,
        questionCount: sql<number>`count(*)::int`,
        topics: sql<string>`string_agg(DISTINCT ${quizQuestions.topic}, '||')`,
        easyCount: sql<number>`count(*) FILTER (WHERE ${quizQuestions.difficulty} = 'Easy')::int`,
        mediumCount: sql<number>`count(*) FILTER (WHERE ${quizQuestions.difficulty} = 'Medium')::int`,
        hardCount: sql<number>`count(*) FILTER (WHERE ${quizQuestions.difficulty} = 'Hard')::int`,
      })
      .from(quizQuestions)
      .groupBy(quizQuestions.category);
    
    return result;
  }
}

export const storage = new DatabaseStorage();
