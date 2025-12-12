/**
 * Test script to validate Deep Mode OpenAI response ID storage and retrieval
 * This script checks:
 * 1. If response IDs are stored in the messages table
 * 2. If response IDs are stored in the deep_mode_jobs table
 * 3. If response IDs are stored in the response_cache table
 * 4. If metadata contains all expected attributes
 * 5. If the frontend can access this data via API endpoints
 */

// Load environment variables from .env file
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  const envFile = readFileSync(join(__dirname, '.env'), 'utf-8');
  envFile.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) {
      const value = values.join('=').trim();
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = value;
      }
    }
  });
} catch (e) {
  console.warn('Could not load .env file, using environment variables');
}

import { db } from './server/db';
import { messages, deepModeJobs, responseCache } from './shared/schema';
import { eq, desc, and, isNotNull } from 'drizzle-orm';
import { storage } from './server/storage';
import { jobStore } from './server/services/jobStore';

interface ValidationResult {
  table: string;
  hasData: boolean;
  recordCount: number;
  sampleRecords: any[];
  issues: string[];
}

async function validateDeepModeStorage(): Promise<void> {
  console.log('🔍 Starting Deep Mode Storage Validation...\n');
  
  const results: ValidationResult[] = [];

  // 1. Check messages table for responseId
  console.log('📋 Checking messages table...');
  try {
    const messagesWithResponseId = await db
      .select()
      .from(messages)
      .where(isNotNull(messages.responseId))
      .orderBy(desc(messages.createdAt))
      .limit(10);

    const deepModeMessages = await db
      .select()
      .from(messages)
      .where(and(
        eq(messages.role, 'assistant'),
        isNotNull(messages.metadata)
      ))
      .orderBy(desc(messages.createdAt))
      .limit(10);

    const deepModeMessagesParsed = deepModeMessages.map(msg => {
      let metadata = null;
      try {
        metadata = msg.metadata ? JSON.parse(msg.metadata) : null;
      } catch (e) {
        // Ignore parse errors
      }
      return {
        ...msg,
        parsedMetadata: metadata,
      };
    });

    const issues: string[] = [];
    deepModeMessagesParsed.forEach(msg => {
      if (msg.parsedMetadata?.status && !msg.responseId) {
        issues.push(`Message ${msg.id} has status "${msg.parsedMetadata.status}" but no responseId`);
      }
      if (msg.parsedMetadata?.responseId && msg.responseId !== msg.parsedMetadata.responseId) {
        issues.push(`Message ${msg.id} has mismatched responseId: DB=${msg.responseId}, metadata=${msg.parsedMetadata.responseId}`);
      }
    });

    results.push({
      table: 'messages',
      hasData: messagesWithResponseId.length > 0,
      recordCount: messagesWithResponseId.length,
      sampleRecords: deepModeMessagesParsed.slice(0, 3).map(msg => ({
        id: msg.id,
        threadId: msg.threadId,
        role: msg.role,
        responseId: msg.responseId,
        status: msg.parsedMetadata?.status,
        jobId: msg.parsedMetadata?.jobId,
        hasDomainResolution: !!msg.parsedMetadata?.domainResolution,
        contentPreview: msg.content.substring(0, 100),
      })),
      issues,
    });

    console.log(`   ✓ Found ${messagesWithResponseId.length} messages with responseId`);
    console.log(`   ✓ Found ${deepModeMessages.length} assistant messages with metadata`);
  } catch (error) {
    console.error('   ✗ Error checking messages:', error);
    results.push({
      table: 'messages',
      hasData: false,
      recordCount: 0,
      sampleRecords: [],
      issues: [`Error: ${error instanceof Error ? error.message : String(error)}`],
    });
  }

  // 2. Check deep_mode_jobs table
  console.log('\n📋 Checking deep_mode_jobs table...');
  try {
    const allJobs = await jobStore.getAllJobs();
    const completedJobs = allJobs.filter(j => j.status === 'completed');
    const failedJobs = allJobs.filter(j => j.status === 'failed');
    const activeJobs = allJobs.filter(j => 
      ['queued', 'polling', 'retrieving', 'formatting'].includes(j.status)
    );

    const issues: string[] = [];
    allJobs.forEach(job => {
      if (!job.responseId) {
        issues.push(`Job ${job.id} has no responseId`);
      }
      if (job.status === 'completed' && !job.formattedResult) {
        issues.push(`Job ${job.id} is completed but has no formattedResult`);
      }
      if (job.status === 'failed' && !job.error) {
        issues.push(`Job ${job.id} is failed but has no error message`);
      }
    });

    results.push({
      table: 'deep_mode_jobs',
      hasData: allJobs.length > 0,
      recordCount: allJobs.length,
      sampleRecords: allJobs.slice(0, 5).map(job => ({
        id: job.id,
        threadId: job.threadId,
        messageId: job.messageId,
        responseId: job.responseId,
        status: job.status,
        hasRawResponse: !!job.rawResponse,
        hasFormattedResult: !!job.formattedResult,
        hasMetadata: !!job.metadata,
        error: job.error,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      })),
      issues,
    });

    console.log(`   ✓ Total jobs: ${allJobs.length}`);
    console.log(`   ✓ Completed: ${completedJobs.length}`);
    console.log(`   ✓ Failed: ${failedJobs.length}`);
    console.log(`   ✓ Active: ${activeJobs.length}`);
  } catch (error) {
    console.error('   ✗ Error checking deep_mode_jobs:', error);
    results.push({
      table: 'deep_mode_jobs',
      hasData: false,
      recordCount: 0,
      sampleRecords: [],
      issues: [`Error: ${error instanceof Error ? error.message : String(error)}`],
    });
  }

  // 3. Check response_cache table
  console.log('\n📋 Checking response_cache table...');
  try {
    const cachedResponses = await db
      .select()
      .from(responseCache)
      .where(eq(responseCache.isDeepMode, true))
      .orderBy(desc(responseCache.createdAt))
      .limit(10);

    const allCached = await db
      .select()
      .from(responseCache)
      .orderBy(desc(responseCache.createdAt))
      .limit(10);

    const issues: string[] = [];
    cachedResponses.forEach(cache => {
      if (!cache.responseId) {
        issues.push(`Cache entry ${cache.id} (deep mode) has no responseId`);
      }
      if (!cache.response) {
        issues.push(`Cache entry ${cache.id} (deep mode) has no response`);
      }
    });

    results.push({
      table: 'response_cache',
      hasData: cachedResponses.length > 0,
      recordCount: cachedResponses.length,
      sampleRecords: cachedResponses.slice(0, 3).map(cache => ({
        id: cache.id,
        question: cache.question.substring(0, 100),
        mode: cache.mode,
        responseId: cache.responseId,
        hasRawResponse: !!cache.rawResponse,
        hasMetadata: !!cache.metadata,
        isDeepMode: cache.isDeepMode,
        createdAt: cache.createdAt,
      })),
      issues,
    });

    console.log(`   ✓ Found ${cachedResponses.length} deep mode cached responses`);
    console.log(`   ✓ Total cached responses: ${allCached.length}`);
  } catch (error) {
    console.error('   ✗ Error checking response_cache:', error);
    results.push({
      table: 'response_cache',
      hasData: false,
      recordCount: 0,
      sampleRecords: [],
      issues: [`Error: ${error instanceof Error ? error.message : String(error)}`],
    });
  }

  // 4. Test data consistency across tables
  console.log('\n🔗 Checking data consistency...');
  try {
    const jobs = await jobStore.getAllJobs();
    const consistencyIssues: string[] = [];

    for (const job of jobs.slice(0, 5)) {
      // Check if message exists and has matching responseId
      const message = await storage.getMessages(job.threadId).then(msgs => 
        msgs.find(m => m.id === job.messageId)
      );

      if (!message) {
        consistencyIssues.push(`Job ${job.id} references message ${job.messageId} that doesn't exist`);
      } else if (message.responseId !== job.responseId) {
        consistencyIssues.push(
          `Job ${job.id} has responseId ${job.responseId} but message ${job.messageId} has ${message.responseId}`
        );
      }

      // Check if metadata matches
      if (message?.metadata) {
        try {
          const metadata = JSON.parse(message.metadata);
          if (metadata.responseId && metadata.responseId !== job.responseId) {
            consistencyIssues.push(
              `Job ${job.id} responseId ${job.responseId} doesn't match message metadata ${metadata.responseId}`
            );
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }

    console.log(`   ✓ Checked ${Math.min(5, jobs.length)} jobs for consistency`);
    if (consistencyIssues.length > 0) {
      console.log(`   ⚠ Found ${consistencyIssues.length} consistency issues`);
    } else {
      console.log(`   ✓ No consistency issues found`);
    }

    results.push({
      table: 'consistency_check',
      hasData: true,
      recordCount: jobs.length,
      sampleRecords: [],
      issues: consistencyIssues,
    });
  } catch (error) {
    console.error('   ✗ Error checking consistency:', error);
  }

  // 5. Test frontend-accessible endpoints
  console.log('\n🌐 Testing frontend-accessible endpoints...');
  try {
    const jobs = await jobStore.getAllJobs();
    if (jobs.length > 0) {
      const testJob = jobs[0];
      console.log(`   Testing with job: ${testJob.id}`);
      
      // Test job status endpoint (simulating what frontend would call)
      const jobStatus = await jobStore.getJob(testJob.id);
      if (jobStatus) {
        const message = await storage.getMessages(testJob.threadId).then(msgs => 
          msgs.find(m => m.id === testJob.messageId)
        );
        
        console.log(`   ✓ Job status accessible: ${jobStatus.status}`);
        console.log(`   ✓ Response ID: ${jobStatus.responseId}`);
        console.log(`   ✓ Message content accessible: ${message ? 'Yes' : 'No'}`);
        console.log(`   ✓ Message responseId: ${message?.responseId || 'N/A'}`);
        
        if (message?.metadata) {
          try {
            const metadata = JSON.parse(message.metadata);
            console.log(`   ✓ Metadata accessible: Yes`);
            console.log(`   ✓ Metadata status: ${metadata.status || 'N/A'}`);
            console.log(`   ✓ Metadata responseId: ${metadata.responseId || 'N/A'}`);
            console.log(`   ✓ Metadata jobId: ${metadata.jobId || 'N/A'}`);
            console.log(`   ✓ Has domainResolution: ${!!metadata.domainResolution}`);
          } catch (e) {
            console.log(`   ⚠ Metadata parse error`);
          }
        }
      }
    } else {
      console.log('   ⚠ No jobs found to test endpoints');
    }
  } catch (error) {
    console.error('   ✗ Error testing endpoints:', error);
  }

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 VALIDATION SUMMARY');
  console.log('='.repeat(80));

  results.forEach(result => {
    console.log(`\n${result.table.toUpperCase()}:`);
    console.log(`  Data exists: ${result.hasData ? '✅ Yes' : '❌ No'}`);
    console.log(`  Record count: ${result.recordCount}`);
    if (result.issues.length > 0) {
      console.log(`  ⚠ Issues found: ${result.issues.length}`);
      result.issues.forEach(issue => console.log(`    - ${issue}`));
    } else {
      console.log(`  ✅ No issues found`);
    }
    if (result.sampleRecords.length > 0) {
      console.log(`  Sample records:`);
      result.sampleRecords.forEach((record, idx) => {
        console.log(`    ${idx + 1}. ${JSON.stringify(record, null, 2)}`);
      });
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log('✅ Validation complete!');
  console.log('='.repeat(80) + '\n');
}

// Run the validation
validateDeepModeStorage()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });

