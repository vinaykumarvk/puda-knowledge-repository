import { db } from '../db';
import { deepModeJobs, DeepModeJob as DbDeepModeJob } from '@shared/schema';
import { and, eq, inArray, lt, desc } from 'drizzle-orm';

type JobStatus = 'queued' | 'polling' | 'retrieving' | 'formatting' | 'completed' | 'failed';
const NON_TERMINAL: JobStatus[] = ['queued', 'polling', 'retrieving', 'formatting'];

export interface DeepModeJob extends Omit<DbDeepModeJob, 'metadata'> {
  metadata?: any;
}

class JobStore {
  private serializeMetadata(metadata?: any): string | null {
    if (metadata === undefined || metadata === null) return null;
    if (typeof metadata === 'string') return metadata;
    try {
      return JSON.stringify(metadata);
    } catch {
      return null;
    }
  }

  private hydrate(job: DbDeepModeJob | undefined): DeepModeJob | null {
    if (!job) return null;
    let metadata: any = undefined;
    if (job.metadata) {
      try {
        metadata = JSON.parse(job.metadata);
      } catch {
        metadata = job.metadata;
      }
    }
    return { ...job, metadata };
  }

  async createJob(
    threadId: number,
    messageId: number,
    question: string,
    responseId: string
  ): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await db.insert(deepModeJobs).values({
      id: jobId,
      threadId,
      messageId,
      question,
      responseId,
      status: 'queued',
    });
    return jobId;
  }

  async getJob(jobId: string): Promise<DeepModeJob | null> {
    const rows = await db.select().from(deepModeJobs).where(eq(deepModeJobs.id, jobId)).limit(1);
    return this.hydrate(rows[0]);
  }

  async updateJobStatus(
    jobId: string,
    updates: Partial<Pick<DeepModeJob, 'status' | 'rawResponse' | 'formattedResult' | 'error' | 'metadata'>>
  ): Promise<void> {
    const payload: Record<string, any> = { updatedAt: new Date() };
    if (updates.status) payload.status = updates.status as JobStatus;
    if (updates.rawResponse !== undefined) payload.rawResponse = updates.rawResponse;
    if (updates.formattedResult !== undefined) payload.formattedResult = updates.formattedResult;
    if (updates.error !== undefined) payload.error = updates.error;
    if (updates.metadata !== undefined) payload.metadata = this.serializeMetadata(updates.metadata);

    await db.update(deepModeJobs).set(payload).where(eq(deepModeJobs.id, jobId));
  }

  async getJobByResponseId(responseId: string): Promise<DeepModeJob | null> {
    const rows = await db.select().from(deepModeJobs).where(eq(deepModeJobs.responseId, responseId)).limit(1);
    return this.hydrate(rows[0]);
  }

  async getStuckJobs(maxAgeMinutes: number = 40): Promise<DeepModeJob[]> {
    const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
    const rows = await db
      .select()
      .from(deepModeJobs)
      .where(
        and(
          inArray(deepModeJobs.status, ['polling', 'queued', 'retrieving', 'formatting']),
          lt(deepModeJobs.updatedAt, cutoff)
        )
      );
    return rows.map((row) => this.hydrate(row)!).filter(Boolean);
  }

  async getActiveJobs(): Promise<DeepModeJob[]> {
    const rows = await db
      .select()
      .from(deepModeJobs)
      .where(inArray(deepModeJobs.status, NON_TERMINAL));
    return rows.map((row) => this.hydrate(row)!).filter(Boolean);
  }

  async getAllJobs(): Promise<DeepModeJob[]> {
    const rows = await db.select().from(deepModeJobs).orderBy(desc(deepModeJobs.updatedAt));
    return rows.map((row) => this.hydrate(row)!).filter(Boolean);
  }

  async cleanupOldJobs(): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    await db
      .delete(deepModeJobs)
      .where(
        and(
          inArray(deepModeJobs.status, ['completed', 'failed']),
          lt(deepModeJobs.updatedAt, oneHourAgo)
        )
      );
  }
}

export const jobStore = new JobStore();

// Cleanup old jobs every hour (best-effort; async void)
setInterval(() => {
  void jobStore.cleanupOldJobs();
}, 60 * 60 * 1000);
