import OpenAI from 'openai';
import { db } from '../db';
import { responseCache, type InsertResponseCache } from '@shared/schema';
import { sql, eq, and } from 'drizzle-orm';

// Similarity threshold (80% = 0.80) - configurable later
const SIMILARITY_THRESHOLD = 0.80;

/**
 * Initialize OpenAI client for generating embeddings
 */
function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new OpenAI({
    apiKey,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
}

/**
 * Generate embedding for question using OpenAI text-embedding-3-small
 * Returns null if OpenAI is not configured (cache will be skipped)
 */
async function generateEmbedding(question: string): Promise<number[] | null> {
  const client = getOpenAIClient();
  if (!client) {
    console.warn("OpenAI client not configured for embeddings - caching will be skipped");
    return null;
  }

  try {
    const response = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: question,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    return null; // Return null instead of throwing - cache will be skipped
  }
}

/**
 * Find similar cached responses using cosine similarity
 * Returns cached response if similarity >= 80%
 */
export async function findSimilarCachedResponse(
  question: string,
  mode: "concise" | "balanced" | "deep"
): Promise<{
  id: number;
  question: string;
  response: string;
  similarity: number;
  metadata?: any;
  responseId?: string;
} | null> {
  try {
    // Generate embedding for the question
    const questionEmbedding = await generateEmbedding(question);
    
    // If embedding generation failed (OpenAI not configured), skip cache lookup
    if (!questionEmbedding) {
      console.log(`[Cache SKIP] OpenAI not configured - skipping cache lookup for mode: ${mode}`);
      return null;
    }

    // Search for similar questions in the same mode using cosine similarity
    // Cosine similarity: 1 - (distance), where distance is <=> operator in pgvector
    const results = await db
      .select({
        id: responseCache.id,
        question: responseCache.question,
        response: responseCache.response,
        metadata: responseCache.metadata,
        responseId: responseCache.responseId,
        similarity: sql<number>`
          1 - (${responseCache.questionEmbedding} <=> ${questionEmbedding}::vector)
        `.as('similarity')
      })
      .from(responseCache)
      .where(
        and(
          eq(responseCache.mode, mode),
          sql`1 - (${responseCache.questionEmbedding} <=> ${questionEmbedding}::vector) >= ${SIMILARITY_THRESHOLD}`
        )
      )
      .orderBy(sql`similarity DESC`)
      .limit(1);

    if (results.length > 0 && results[0].similarity >= SIMILARITY_THRESHOLD) {
      const cached = results[0];
      
      // Update access statistics
      await db.update(responseCache)
        .set({
          lastAccessedAt: new Date(),
          accessCount: sql`${responseCache.accessCount} + 1`
        })
        .where(eq(responseCache.id, cached.id));

      console.log(`[Cache HIT] Found similar response (${(cached.similarity * 100).toFixed(1)}% similarity) for mode: ${mode}`);

      return {
        id: cached.id,
        question: cached.question,
        response: cached.response,
        similarity: cached.similarity,
        metadata: cached.metadata ? JSON.parse(cached.metadata) : undefined,
        responseId: cached.responseId || undefined
      };
    }

    console.log(`[Cache MISS] No similar response found (threshold: ${SIMILARITY_THRESHOLD * 100}%) for mode: ${mode}`);
    return null;
  } catch (error) {
    console.error("Error finding cached response:", error);
    // Don't throw - if cache lookup fails, proceed with normal flow
    return null;
  }
}

/**
 * Save response to cache
 */
export async function saveCachedResponse(
  question: string,
  mode: "concise" | "balanced" | "deep",
  response: string,
  rawResponse?: string,
  metadata?: any,
  responseId?: string,
  originalCacheId?: number
): Promise<void> {
  try {
    const questionEmbedding = await generateEmbedding(question);
    
    // If embedding generation failed (OpenAI not configured), skip caching
    if (!questionEmbedding) {
      console.log(`[Cache SKIP] OpenAI not configured - skipping cache save for mode: ${mode}`);
      return;
    }
    
    const isDeepMode = mode === "deep";

    const cacheEntry: InsertResponseCache = {
      question,
      questionEmbedding: questionEmbedding as any, // Type casting for vector
      mode,
      response,
      rawResponse: rawResponse ? rawResponse.substring(0, 10000) : null, // Limit size to 10k chars
      metadata: metadata ? JSON.stringify(metadata) : null,
      responseId: responseId || null,
      isDeepMode,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      accessCount: 1,
      isRefreshed: originalCacheId !== undefined,
      originalCacheId: originalCacheId || null
    };

    await db.insert(responseCache).values(cacheEntry);
    console.log(`[Cache SAVE] Saved response to cache for mode: ${mode}, isRefreshed: ${!!originalCacheId}`);
  } catch (error) {
    console.error("Error saving cached response:", error);
    // Don't throw - if cache save fails, continue normally
  }
}

/**
 * Cleanup old cache entries (run periodically)
 * Remove entries not accessed in specified number of days
 */
export async function cleanupOldCacheEntries(daysOld: number = 30): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await db.delete(responseCache)
      .where(sql`${responseCache.lastAccessedAt} < ${cutoffDate}`);

    const deletedCount = result.rowCount || 0;
    console.log(`[Cache CLEANUP] Deleted ${deletedCount} old cache entries (older than ${daysOld} days)`);
    return deletedCount;
  } catch (error) {
    console.error("Error cleaning up cache entries:", error);
    return 0;
  }
}

