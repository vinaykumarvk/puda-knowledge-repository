// @ts-nocheck
/**
 * SupabaseStorage - Implements IStorage using Supabase JS client
 * This provides the same interface as DatabaseStorage but uses Supabase REST API
 * which works over HTTPS and doesn't require direct PostgreSQL connection
 */
import { supabase } from './db';
import type {
  User,
  InsertUser,
  Thread,
  InsertThread,
  Message,
  InsertMessage,
  Session,
  InsertSession,
  Conversation,
  InsertConversation,
  QuizAttempt,
  InsertQuizAttempt,
  QuizResponse,
  InsertQuizResponse,
  UserMastery,
  InsertUserMastery,
  QuizQuestion,
  ExcelRequirementResponse,
  InsertExcelRequirementResponse,
  HistoricalRfp,
  InsertHistoricalRfp,
  InvestmentRequest,
  InsertInvestmentRequest,
  Approval,
  InsertApproval,
  Task,
  InsertTask,
  Document,
  InsertDocument,
  DocumentCategory,
  InsertDocumentCategory,
  Notification,
  InsertNotification,
  Template,
  InsertTemplate,
  InvestmentRationale,
  InsertInvestmentRationale,
} from '@shared/schema';
import type { IStorage } from './storage';

if (!supabase) {
  throw new Error('Supabase client not initialized. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
}

/**
 * Helper to convert Supabase error to a more readable format
 */
function handleSupabaseError(error: any, operation: string): never {
  console.error(`Supabase ${operation} error:`, error);
  throw new Error(`${operation} failed: ${error.message || 'Unknown error'}`);
}

/**
 * Helper to convert database row to type (handles snake_case to camelCase if needed)
 */
function mapRow<T>(row: any): T {
  // Supabase returns snake_case by default, but our types expect camelCase
  // Convert common field names from snake_case to camelCase
  if (!row) return row as T;
  
  const mapped: any = {};
  for (const [key, value] of Object.entries(row)) {
    // Convert snake_case to camelCase
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    mapped[camelKey] = value;
  }
  return mapped as T;
}

export class SupabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const { data, error } = await supabase!
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined; // Not found
      handleSupabaseError(error, 'getUser');
    }
    
    return data ? mapRow<User>(data) : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const { data, error } = await supabase!
      .from('users')
      .select('*')
      .eq('username', username)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined;
      handleSupabaseError(error, 'getUserByUsername');
    }
    
    return data ? mapRow<User>(data) : undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const { data, error } = await supabase!
      .from('users')
      .insert(user)
      .select()
      .single();
    
    if (error) handleSupabaseError(error, 'createUser');
    return mapRow<User>(data!);
  }

  async updateUserLastLogin(id: string): Promise<void> {
    const { error } = await supabase!
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', id);
    
    if (error) handleSupabaseError(error, 'updateUserLastLogin');
  }

  async getUserManager(userId: string): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user || !user.managerId) return undefined;
    return this.getUser(user.managerId);
  }

  // Session methods
  async createSession(session: InsertSession): Promise<Session> {
    const { data, error } = await supabase!
      .from('sessions')
      .insert(session)
      .select()
      .single();
    
    if (error) handleSupabaseError(error, 'createSession');
    return mapRow<Session>(data!);
  }

  async getSession(id: string): Promise<Session | undefined> {
    const { data, error } = await supabase!
      .from('sessions')
      .select('*')
      .eq('id', id)
      .gte('expires_at', new Date().toISOString())
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined;
      handleSupabaseError(error, 'getSession');
    }
    
    return data ? mapRow<Session>(data) : undefined;
  }

  async getSessionWithUser(id: string): Promise<(Session & { user: User }) | undefined> {
    const { data, error } = await supabase!
      .from('sessions')
      .select('*, users(*)')
      .eq('id', id)
      .gte('expires_at', new Date().toISOString())
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined;
      handleSupabaseError(error, 'getSessionWithUser');
    }
    
    if (!data) return undefined;
    
    // Supabase returns nested user data as an object or array
    // Handle both cases: users(*) can return an object or array
    const userData = Array.isArray(data.users) ? data.users[0] : data.users;
    
    if (!userData) {
      console.warn(`Session ${id} found but user data is missing`);
      return undefined;
    }
    
    return {
      ...mapRow<Session>(data),
      user: mapRow<User>(userData),
    };
  }

  async deleteSession(id: string): Promise<void> {
    const { error } = await supabase!
      .from('sessions')
      .delete()
      .eq('id', id);
    
    if (error) handleSupabaseError(error, 'deleteSession');
  }

  async deleteExpiredSessions(): Promise<void> {
    const { error } = await supabase!
      .from('sessions')
      .delete()
      .lt('expires_at', new Date().toISOString());
    
    if (error) handleSupabaseError(error, 'deleteExpiredSessions');
  }

  // Thread methods
  async getThreads(): Promise<Thread[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data, error } = await supabase!
      .from('threads')
      .select('*')
      .gte('updated_at', thirtyDaysAgo.toISOString())
      .order('updated_at', { ascending: false });
    
    if (error) handleSupabaseError(error, 'getThreads');
    
    // Deduplicate by ID (in case of any duplicates)
    const threads = (data || []).map(mapRow<Thread>);
    const uniqueThreads = Array.from(
      new Map(threads.map((thread) => [thread.id, thread])).values()
    );
    
    return uniqueThreads;
  }

  async getThread(id: number): Promise<Thread | undefined> {
    const { data, error } = await supabase!
      .from('threads')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined;
      handleSupabaseError(error, 'getThread');
    }
    
    return data ? mapRow<Thread>(data) : undefined;
  }

  async createThread(thread: InsertThread): Promise<Thread> {
    // Convert camelCase to snake_case and exclude auto-generated fields
    // InsertThread should only have title and optionally conversationId
    const insertData: any = {
      title: thread.title,
    };
    // Only include conversation_id if conversationId is provided
    if ('conversationId' in thread && thread.conversationId !== undefined) {
      insertData.conversation_id = thread.conversationId;
    }
    // Explicitly exclude id, createdAt, updatedAt - these are auto-generated
    // Note: If id is not auto-increment, we need to get next value from sequence
    // But first, try without id - Supabase should handle it if the column has a default
    
    const { data, error } = await supabase!
      .from('threads')
      .insert(insertData)
      .select()
      .single();
    
    if (error) {
      console.error('createThread error:', error);
      console.error('Insert data:', insertData);
      console.error('Full error:', JSON.stringify(error, null, 2));
      
      // If error is about null id, the table might not have auto-increment
      // Try to get next ID from sequence
      if (error.message && error.message.includes('null value in column "id"')) {
        console.log('Attempting to get next ID from sequence...');
        try {
          // Get the max id and add 1, or use a sequence if available
          const { data: maxData } = await supabase!
            .from('threads')
            .select('id')
            .order('id', { ascending: false })
            .limit(1)
            .single();
          
          const nextId = maxData ? (maxData.id as number) + 1 : 1;
          insertData.id = nextId;
          
          const { data: retryData, error: retryError } = await supabase!
            .from('threads')
            .insert(insertData)
            .select()
            .single();
          
          if (retryError) {
            handleSupabaseError(retryError, 'createThread');
          }
          return mapRow<Thread>(retryData!);
        } catch (seqError) {
          console.error('Failed to get next ID:', seqError);
          handleSupabaseError(error, 'createThread');
        }
      } else {
        handleSupabaseError(error, 'createThread');
      }
    }
    return mapRow<Thread>(data!);
  }

  async updateThreadTimestamp(id: number): Promise<void> {
    const { error } = await supabase!
      .from('threads')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) handleSupabaseError(error, 'updateThreadTimestamp');
  }

  async updateThreadConversationId(id: number, conversationId: string): Promise<void> {
    const { error } = await supabase!
      .from('threads')
      .update({ 
        conversation_id: conversationId,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) handleSupabaseError(error, 'updateThreadConversationId');
  }

  async deleteThread(id: number): Promise<void> {
    const { error } = await supabase!
      .from('threads')
      .delete()
      .eq('id', id);
    
    if (error) handleSupabaseError(error, 'deleteThread');
  }

  // Message methods
  async getMessages(threadId: number): Promise<Message[]> {
    console.log('[SupabaseStorage] getMessages for threadId:', threadId);
    const { data, error } = await supabase!
      .from('messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('[SupabaseStorage] getMessages error:', error);
      handleSupabaseError(error, 'getMessages');
    } else {
      console.log('[SupabaseStorage] getMessages success:', { threadId, count: data?.length || 0, messageIds: data?.map(m => ({ id: m.id, role: m.role, contentLength: m.content?.length || 0 })) });
    }
    
    return (data || []).map(mapRow<Message>);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    // Convert camelCase to snake_case and exclude auto-generated fields
    // InsertMessage should have: threadId, role, content, responseId (optional), sources (optional), metadata (optional)
    const insertData: any = {
      thread_id: message.threadId,
      role: message.role,
      content: message.content,
    };
    // Only include optional fields if they are provided
    if (message.responseId !== undefined && message.responseId !== null) {
      insertData.response_id = message.responseId;
    }
    if (message.sources !== undefined && message.sources !== null) {
      insertData.sources = message.sources;
    }
    if (message.metadata !== undefined && message.metadata !== null) {
      insertData.metadata = message.metadata;
    }
    // Explicitly exclude id, createdAt - these are auto-generated
    // Note: If id is not auto-increment, we need to get next value from sequence
    
    const { data, error } = await supabase!
      .from('messages')
      .insert(insertData)
      .select()
      .single();
    
    if (error) {
      console.error('createMessage error:', error);
      console.error('Insert data:', insertData);
      console.error('Full error:', JSON.stringify(error, null, 2));
      
      // If error is about null id, the table might not have auto-increment
      // Try to get next ID from sequence
      if (error.message && error.message.includes('null value in column "id"')) {
        console.log('Attempting to get next ID from sequence for messages...');
        try {
          // Get the max id and add 1, or use a sequence if available
          const { data: maxData } = await supabase!
            .from('messages')
            .select('id')
            .order('id', { ascending: false })
            .limit(1)
            .single();
          
          const nextId = maxData ? (maxData.id as number) + 1 : 1;
          insertData.id = nextId;
          
          const { data: retryData, error: retryError } = await supabase!
            .from('messages')
            .insert(insertData)
            .select()
            .single();
          
          if (retryError) {
            handleSupabaseError(retryError, 'createMessage');
          }
          return mapRow<Message>(retryData!);
        } catch (seqError) {
          console.error('Failed to get next ID for messages:', seqError);
          handleSupabaseError(error, 'createMessage');
        }
      } else {
        handleSupabaseError(error, 'createMessage');
      }
    }
    return mapRow<Message>(data!);
  }

  async updateMessage(
    id: number,
    updates: Partial<Pick<Message, 'content' | 'responseId' | 'sources' | 'metadata'>>
  ): Promise<Message> {
    const updateData: any = {};
    if (updates.content !== undefined) updateData.content = updates.content;
    if (updates.responseId !== undefined) updateData.response_id = updates.responseId;
    if (updates.sources !== undefined) updateData.sources = updates.sources;
    if (updates.metadata !== undefined) updateData.metadata = updates.metadata;
    
    console.log('[SupabaseStorage] updateMessage:', { id, updateData: { ...updateData, content: updateData.content?.substring(0, 50) + '...' } });
    
    const { data, error } = await supabase!
      .from('messages')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('[SupabaseStorage] updateMessage error:', error);
      handleSupabaseError(error, 'updateMessage');
    } else {
      console.log('[SupabaseStorage] updateMessage success:', { id, contentLength: data?.content?.length || 0 });
    }
    
    return mapRow<Message>(data!);
  }

  async getLastAssistantMessage(threadId: number): Promise<Message | undefined> {
    const { data, error } = await supabase!
      .from('messages')
      .select('*')
      .eq('thread_id', threadId)
      .eq('role', 'assistant')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined;
      handleSupabaseError(error, 'getLastAssistantMessage');
    }
    
    return data ? mapRow<Message>(data) : undefined;
  }

  async getRecentMessagePairs(threadId: number, pairCount: number): Promise<Message[]> {
    // Get the last N pairs (user + assistant)
    const { data, error } = await supabase!
      .from('messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })
      .limit(pairCount * 2);
    
    if (error) handleSupabaseError(error, 'getRecentMessagePairs');
    return (data || []).reverse().map(mapRow<Message>);
  }

  // Quiz tracking methods - Stub implementations
  // TODO: Implement these methods
  async createQuizAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt> {
    const { data, error } = await supabase!
      .from('quiz_attempts')
      .insert(attempt)
      .select()
      .single();
    
    if (error) handleSupabaseError(error, 'createQuizAttempt');
    return mapRow<QuizAttempt>(data!);
  }

  async createQuizResponse(response: InsertQuizResponse): Promise<QuizResponse> {
    const { data, error } = await supabase!
      .from('quiz_responses')
      .insert(response)
      .select()
      .single();
    
    if (error) handleSupabaseError(error, 'createQuizResponse');
    return mapRow<QuizResponse>(data!);
  }

  async getQuizAttempts(limit?: number): Promise<QuizAttempt[]> {
    let query = supabase!
      .from('quiz_attempts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (limit) query = query.limit(limit);
    
    const { data, error } = await query;
    if (error) handleSupabaseError(error, 'getQuizAttempts');
    return (data || []).map(mapRow<QuizAttempt>);
  }

  async getRecentQuizzes(count: number): Promise<QuizAttempt[]> {
    return this.getQuizAttempts(count);
  }

  // User mastery methods
  async getUserMastery(): Promise<UserMastery | undefined> {
    const { data, error } = await supabase!
      .from('user_mastery')
      .select('*')
      .limit(1)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined;
      handleSupabaseError(error, 'getUserMastery');
    }
    
    return data ? mapRow<UserMastery>(data) : undefined;
  }

  async updateUserMastery(mastery: InsertUserMastery): Promise<UserMastery> {
    // Upsert logic - update if exists, insert if not
    const { data, error } = await supabase!
      .from('user_mastery')
      .upsert(mastery, { onConflict: 'user_id' })
      .select()
      .single();
    
    if (error) handleSupabaseError(error, 'updateUserMastery');
    return mapRow<UserMastery>(data!);
  }

  // Quiz question bank methods - Stub implementations
  async getQuizCategories(): Promise<any[]> {
    const { data, error } = await supabase!
      .from('quiz_questions')
      .select('category')
      .order('category');
    
    if (error) handleSupabaseError(error, 'getQuizCategories');
    // Get unique categories
    const categories = [...new Set((data || []).map((r: any) => r.category))];
    return categories.map(cat => ({ name: cat }));
  }

  async getQuizQuestions(topic: string): Promise<QuizQuestion[]> {
    const { data, error } = await supabase!
      .from('quiz_questions')
      .select('*')
      .eq('topic', topic);
    
    if (error) handleSupabaseError(error, 'getQuizQuestions');
    return (data || []).map(mapRow<QuizQuestion>);
  }

  async saveQuizAttemptAndUpdateMastery(
    topic: string,
    category: string,
    score: number,
    totalQuestions: number,
    responses: any[]
  ): Promise<{ attempt: QuizAttempt; mastery: UserMastery }> {
    // This is a complex operation - implement as needed
    throw new Error('saveQuizAttemptAndUpdateMastery not yet implemented in SupabaseStorage');
  }

  // Conversation methods
  async getConversations(): Promise<Conversation[]> {
    const { data, error } = await supabase!
      .from('conversations')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) handleSupabaseError(error, 'getConversations');
    return (data || []).map(mapRow<Conversation>);
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const { data, error } = await supabase!
      .from('conversations')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined;
      handleSupabaseError(error, 'getConversation');
    }
    
    return data ? mapRow<Conversation>(data) : undefined;
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const { data, error } = await supabase!
      .from('conversations')
      .insert(conversation)
      .select()
      .single();
    
    if (error) handleSupabaseError(error, 'createConversation');
    return mapRow<Conversation>(data!);
  }

  async deleteConversation(id: number): Promise<void> {
    const { error } = await supabase!
      .from('conversations')
      .delete()
      .eq('id', id);
    
    if (error) handleSupabaseError(error, 'deleteConversation');
  }

  // Investment request methods - Stub implementations
  async getInvestmentRequest(id: number): Promise<InvestmentRequest | undefined> {
    const { data, error } = await supabase!
      .from('investment_requests')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined;
      handleSupabaseError(error, 'getInvestmentRequest');
    }
    
    return data ? mapRow<InvestmentRequest>(data) : undefined;
  }

  async createInvestmentRequest(request: InsertInvestmentRequest): Promise<InvestmentRequest> {
    const { data, error } = await supabase!
      .from('investment_requests')
      .insert(request)
      .select()
      .single();
    
    if (error) handleSupabaseError(error, 'createInvestmentRequest');
    return mapRow<InvestmentRequest>(data!);
  }

  async updateInvestmentRequest(id: number, request: Partial<InvestmentRequest>): Promise<InvestmentRequest> {
    const { data, error } = await supabase!
      .from('investment_requests')
      .update(request)
      .eq('id', id)
      .select()
      .single();
    
    if (error) handleSupabaseError(error, 'updateInvestmentRequest');
    return mapRow<InvestmentRequest>(data!);
  }

  async deleteInvestmentRequest(id: number): Promise<void> {
    const { error } = await supabase!
      .from('investment_requests')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) handleSupabaseError(error, 'deleteInvestmentRequest');
  }

  // Approval methods
  async createApproval(approval: InsertApproval): Promise<Approval> {
    const { data, error } = await supabase!
      .from('approvals')
      .insert(approval)
      .select()
      .single();
    
    if (error) handleSupabaseError(error, 'createApproval');
    return mapRow<Approval>(data!);
  }

  async getApprovalsByRequestId(requestId: number): Promise<Approval[]> {
    const { data, error } = await supabase!
      .from('approvals')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: false });
    
    if (error) handleSupabaseError(error, 'getApprovalsByRequestId');
    return (data || []).map(mapRow<Approval>);
  }

  async getApprovalsByUserId(userId: string): Promise<Approval[]> {
    const { data, error } = await supabase!
      .from('approvals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) handleSupabaseError(error, 'getApprovalsByUserId');
    return (data || []).map(mapRow<Approval>);
  }

  async updateApproval(id: number, updateData: Partial<Approval>): Promise<Approval> {
    const { data, error } = await supabase!
      .from('approvals')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) handleSupabaseError(error, 'updateApproval');
    return mapRow<Approval>(data!);
  }

  // Task methods
  async createTask(task: InsertTask): Promise<Task> {
    const { data, error } = await supabase!
      .from('tasks')
      .insert(task)
      .select()
      .single();
    
    if (error) handleSupabaseError(error, 'createTask');
    return mapRow<Task>(data!);
  }

  async updateTask(id: number, task: Partial<Task>): Promise<Task> {
    const { data, error } = await supabase!
      .from('tasks')
      .update(task)
      .eq('id', id)
      .select()
      .single();
    
    if (error) handleSupabaseError(error, 'updateTask');
    return mapRow<Task>(data!);
  }

  async getTasks(filters?: any): Promise<Task[]> {
    let query = supabase!
      .from('tasks')
      .select('*');
    
    // Apply filters if provided
    if (filters?.userId) query = query.eq('user_id', filters.userId);
    if (filters?.status) query = query.eq('status', filters.status);
    
    query = query.order('created_at', { ascending: false });
    
    const { data, error } = await query;
    if (error) handleSupabaseError(error, 'getTasks');
    return (data || []).map(mapRow<Task>);
  }

  // Document methods - Stub implementations
  async getDocuments(): Promise<Document[]> {
    const { data, error } = await supabase!
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) handleSupabaseError(error, 'getDocuments');
    return (data || []).map(mapRow<Document>);
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const { data, error } = await supabase!
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined;
      handleSupabaseError(error, 'getDocument');
    }
    
    return data ? mapRow<Document>(data) : undefined;
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const { data, error } = await supabase!
      .from('documents')
      .insert(document)
      .select()
      .single();
    
    if (error) handleSupabaseError(error, 'createDocument');
    return mapRow<Document>(data!);
  }

  async updateDocument(id: number, updates: Partial<Document>): Promise<Document> {
    const { data, error } = await supabase!
      .from('documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) handleSupabaseError(error, 'updateDocument');
    return mapRow<Document>(data!);
  }

  async deleteDocument(id: number): Promise<void> {
    const { error } = await supabase!
      .from('documents')
      .delete()
      .eq('id', id);
    
    if (error) handleSupabaseError(error, 'deleteDocument');
  }

  // Template methods - Stub implementations
  async getTemplates(): Promise<Template[]> {
    const { data, error } = await supabase!
      .from('templates')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) handleSupabaseError(error, 'getTemplates');
    return (data || []).map(mapRow<Template>);
  }

  async getTemplate(id: number): Promise<Template | undefined> {
    const { data, error } = await supabase!
      .from('templates')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined;
      handleSupabaseError(error, 'getTemplate');
    }
    
    return data ? mapRow<Template>(data) : undefined;
  }

  async getTemplatesByType(type: string): Promise<Template[]> {
    const { data, error } = await supabase!
      .from('templates')
      .select('*')
      .eq('type', type)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) handleSupabaseError(error, 'getTemplatesByType');
    return (data || []).map(mapRow<Template>);
  }

  async createTemplate(template: InsertTemplate): Promise<Template> {
    const { data, error } = await supabase!
      .from('templates')
      .insert(template)
      .select()
      .single();
    
    if (error) handleSupabaseError(error, 'createTemplate');
    return mapRow<Template>(data!);
  }

  async updateTemplate(id: number, template: Partial<Template>): Promise<Template> {
    const { data, error } = await supabase!
      .from('templates')
      .update(template)
      .eq('id', id)
      .select()
      .single();
    
    if (error) handleSupabaseError(error, 'updateTemplate');
    return mapRow<Template>(data!);
  }

  async deleteTemplate(id: number): Promise<void> {
    const { error } = await supabase!
      .from('templates')
      .delete()
      .eq('id', id);
    
    if (error) handleSupabaseError(error, 'deleteTemplate');
  }

  // Additional methods from IStorage interface - Stub implementations
  // These need to be implemented based on your specific requirements
  async getExcelRequirementResponses(rfpId: number): Promise<ExcelRequirementResponse[]> {
    const { data, error } = await supabase!
      .from('excel_requirement_responses')
      .select('*')
      .eq('rfp_id', rfpId);
    
    if (error) handleSupabaseError(error, 'getExcelRequirementResponses');
    return (data || []).map(mapRow<ExcelRequirementResponse>);
  }

  async getHistoricalRfps(): Promise<HistoricalRfp[]> {
    const { data, error } = await supabase!
      .from('historical_rfps')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) handleSupabaseError(error, 'getHistoricalRfps');
    return (data || []).map(mapRow<HistoricalRfp>);
  }

  async createHistoricalRfp(rfp: InsertHistoricalRfp): Promise<HistoricalRfp> {
    const { data, error } = await supabase!
      .from('historical_rfps')
      .insert(rfp)
      .select()
      .single();
    
    if (error) handleSupabaseError(error, 'createHistoricalRfp');
    return mapRow<HistoricalRfp>(data!);
  }

  // Add other stub methods as needed...
  // This is a partial implementation - you'll need to add the remaining methods
  // from the IStorage interface
}
