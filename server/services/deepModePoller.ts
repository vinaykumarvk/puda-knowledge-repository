import OpenAI from "openai";

// Terminal statuses that indicate polling should stop
const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled", "expired"]);

// Default polling interval in milliseconds (2 minutes)
const DEFAULT_POLL_INTERVAL = 2 * 60 * 1000;

// Maximum polling time (30 minutes) to prevent infinite polling
// Increased to allow for longer processing times
const MAX_POLL_TIME = 30 * 60 * 1000;

/**
 * Initialize OpenAI client for polling responses
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
 * Polls the OpenAI Responses API until the job is completed.
 * Returns the final response object.
 */
export async function pollUntilComplete(
  responseId: string,
  options: {
    pollInterval?: number;
    onPoll?: (info: { pollCount: number; elapsedMs: number; status?: string }) => Promise<void> | void;
  } = {}
): Promise<{ status: string; response: any; error?: string }> {
  const client = getOpenAIClient();
  
  if (!client) {
    return {
      status: "failed",
      response: null,
      error: "OpenAI client not configured. Please set OPENAI_API_KEY.",
    };
  }

  const startTime = Date.now();
  let pollCount = 0;
  const pollInterval = options.pollInterval ?? DEFAULT_POLL_INTERVAL;

  while (true) {
    try {
      const elapsed = Date.now() - startTime;
      pollCount++;
      
      // Log progress every poll (every 2 minutes) or every 5 minutes
      if (pollCount % 1 === 0 || elapsed % 300000 < 10000) {
        console.log(`[${responseId}] Polling... (attempt ${pollCount}, elapsed: ${Math.round(elapsed / 1000)}s)`);
      }
      
      // Check if we've exceeded max poll time
      if (elapsed > MAX_POLL_TIME) {
        console.error(`[${responseId}] Polling timeout exceeded after ${Math.round(elapsed / 1000)}s (max: ${MAX_POLL_TIME / 1000}s)`);
        return {
          status: "timeout",
          response: null,
          error: `Response polling timed out after ${Math.round(elapsed / 1000)} seconds. The query may still be processing on the server.`,
        };
      }

      // Retrieve the response status
      const resp = await (client as any).responses.retrieve(responseId);
      const status = resp.status;
      if (options.onPoll) {
        await options.onPoll({ pollCount, elapsedMs: elapsed, status });
      }

      console.log(`[${responseId}] Current status: ${status} (poll #${pollCount}, elapsed: ${Math.round(elapsed / 1000)}s)`);

      // Check if we've reached a terminal status
      if (TERMINAL_STATUSES.has(status)) {
        console.log(`[${responseId}] Finished with status: ${status}`);
        return {
          status,
          response: resp,
        };
      }

      // Wait before next poll
      await sleep(pollInterval);
    } catch (error) {
      console.error(`[${responseId}] Polling error:`, error);
      return {
        status: "failed",
        response: null,
        error: error instanceof Error ? error.message : "Unknown polling error",
      };
    }
  }
}

/**
 * Safely extracts the text answer from the final Responses API object.
 * Structure is usually: resp.output[0].content[0].text
 * but we walk it defensively.
 */
export function extractAnswerText(resp: any): string {
  if (!resp || !resp.output) {
    return "";
  }

  for (const item of resp.output) {
    // We only care about "message" content
    if (item.type === "message" && item.content) {
      // content is typically a list of blocks (e.g., text, image, tool outputs)
      for (const block of item.content) {
        if (block.type === "output_text" && block.text) {
          return block.text;
        }
        // Also check for regular "text" type blocks
        if (block.type === "text" && block.text) {
          return block.text;
        }
      }
    }
  }

  // Fallback: try to find any text content
  try {
    const jsonStr = JSON.stringify(resp);
    // Look for markdown or answer fields in the response
    if (resp.markdown) return resp.markdown;
    if (resp.answer) return resp.answer;
    if (resp.text) return resp.text;
  } catch (e) {
    // Ignore stringify errors
  }

  return "";
}

/**
 * Helper function to sleep for a given duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if a response from the EKG API indicates it's a deep mode async response
 * that requires polling
 */
export function isAsyncDeepModeResponse(result: any): boolean {
  // Check for background_mode flag from EKG API
  if (result.meta?.background_mode === true || result.background_mode === true) {
    return true;
  }
  
  // Check for background_status indicators
  if (result.meta?.background_status === "queued" || 
      result.meta?.background_status === "in_progress" ||
      result.background_status === "queued" ||
      result.background_status === "in_progress") {
    return true;
  }
  
  // If we have a background_task_id but no actual answer content, it's an async response
  if ((result.meta?.background_task_id || result.background_task_id) && 
      (!result.markdown || result.markdown.includes("Poll status"))) {
    return true;
  }
  
  // Check for explicit async indicator
  if (result.async === true || result.status === "queued" || result.status === "in_progress") {
    return true;
  }
  
  // If we have a response_id but no markdown/answer content, it's an async response
  if (result.response_id && !result.markdown && !result.answer) {
    return true;
  }
  
  return false;
}
