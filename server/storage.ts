import { 
  users, 
  conversations, 
  threads,
  messages,
  type User, 
  type InsertUser, 
  type Conversation, 
  type InsertConversation,
  type Thread,
  type InsertThread,
  type Message,
  type InsertMessage
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Thread methods
  getThreads(): Promise<Thread[]>;
  getThread(id: number): Promise<Thread | undefined>;
  createThread(thread: InsertThread): Promise<Thread>;
  updateThreadTimestamp(id: number): Promise<void>;
  deleteThread(id: number): Promise<void>;
  
  // Message methods
  getMessages(threadId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  getLastAssistantMessage(threadId: number): Promise<Message | undefined>;
  
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
    return await db.select().from(threads).orderBy(desc(threads.updatedAt));
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
}

export const storage = new DatabaseStorage();
