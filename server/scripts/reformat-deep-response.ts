/**
 * One-off script to reformat deep-mode responses using gpt-5.1
 * for known response_ids. It pulls the raw response from the job/message,
 * sends to formatter, and updates the message + job.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import { db } from "../db";
import { messages as messagesTable } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { storage } from "../storage";
import { jobStore } from "../services/jobStore";
import { saveCachedResponse } from "../services/responseCache";

// Load .env manually (no dotenv dependency)
try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const envPath = join(__dirname, "..", "..", ".env");
  const envFile = readFileSync(envPath, "utf-8");
  envFile.split("\n").forEach((line) => {
    const [key, ...values] = line.split("=");
    if (key && values.length > 0 && !process.env[key.trim()]) {
      process.env[key.trim()] = values.join("=").trim();
    }
  });
} catch {
  // ignore if .env not found
}

const targets = [
  {
    question: "How to perform risk profiling in the system?",
    responseId: "resp_00e217e2febe1c3b00693bdbd17e68819c8b15d25ec7d76368",
  },
  {
    question:
      "Write a comprehensive BRD as per the standard industry format on how to perform retirement planning in the application.",
    responseId: "resp_0b075c2ab396491400693bdc2b75448191afa17ce237a25059",
  },
];

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API key not configured");
  }
  return new OpenAI({
    apiKey,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
}

async function formatWithModel(raw: string, question: string, domainResolution: any): Promise<string> {
  const client = getOpenAIClient();
  const model = process.env.OPENAI_FORMATTER_MODEL || "gpt-5.1";
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content:
          "You are ChatGPT 5.1 acting as a formatter. Rewrite the assistant's raw answer to be clear, well-structured, and concise. Preserve substance, fix markdown, and avoid hallucinating new facts. If sources or domains are relevant, keep the references.",
      },
      {
        role: "user",
        content: `Question:\n${question}\n\nResolved Domain: ${
          domainResolution?.domainId || "unknown"
        }\n\nRaw Answer:\n${raw}`,
      },
    ],
  });
  return completion.choices?.[0]?.message?.content?.trim() || raw;
}

async function findMessageByResponseId(responseId: string) {
  const [direct] = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.responseId, responseId))
    .limit(1);
  if (direct) return direct;

  const candidates = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.role, "assistant"))
    .orderBy(desc(messagesTable.createdAt))
    .limit(200);

  for (const msg of candidates) {
    if (!msg.metadata) continue;
    try {
      const meta = JSON.parse(msg.metadata);
      if (meta?.responseId === responseId) {
        return msg;
      }
    } catch {
      // ignore
    }
  }
  return null;
}

async function reformat(target: (typeof targets)[number]) {
  const { responseId, question } = target;
  console.log(`\n=== Reformatting ${responseId} ===`);

  // Locate job/message
  let job = await jobStore.getJobByResponseId(responseId);
  let message = job ? undefined : await findMessageByResponseId(responseId);

  if (!job) {
    if (!message) throw new Error(`No job/message found for ${responseId}`);
    const msgList = await storage.getMessages(message.threadId);
    const idx = msgList.findIndex((m) => m.id === message!.id);
    const userMsg = msgList.slice(0, idx).reverse().find((m) => m.role === "user");
    const inferredQuestion = userMsg?.content || question || "Deep mode question";
    const jobId = await jobStore.createJob(message.threadId, message.id, inferredQuestion, responseId);
    job = await jobStore.getJob(jobId);
    console.log(`Created job ${jobId} for message ${message.id}`);
  }

  if (!message) {
    const msgs = await storage.getMessages(job!.threadId);
    message = msgs.find((m) => m.id === job!.messageId);
  }
  if (!message) throw new Error(`Message ${job!.messageId} not found in thread ${job!.threadId}`);

  let existingMetadata: any = {};
  if (message.metadata) {
    try {
      existingMetadata = JSON.parse(message.metadata);
    } catch {
      existingMetadata = {};
    }
  }

  const raw = job?.rawResponse || message.content || "";
  const formatted = await formatWithModel(raw, question, existingMetadata.domainResolution);

  const metadataPayload = {
    ...existingMetadata,
    status: "completed",
    polled: true,
    poll_status: "completed",
    jobId: job!.id,
    responseId,
  };

  await storage.updateMessage(message.id, {
    content: formatted,
    responseId,
    metadata: JSON.stringify(metadataPayload),
  });
  await storage.updateThreadTimestamp(message.threadId);

  await jobStore.updateJobStatus(job!.id, {
    status: "completed",
    rawResponse: raw,
    formattedResult: formatted,
    metadata: metadataPayload,
  });

  try {
    await saveCachedResponse(question, "deep", formatted, raw, metadataPayload, responseId);
  } catch (err) {
    console.error("Cache save failed:", err);
  }

  console.log(`Formatted and updated message ${message.id} in thread ${message.threadId}`);
}

async function main() {
  for (const target of targets) {
    try {
      await reformat(target);
    } catch (err) {
      console.error(`Failed to reformat ${target.responseId}:`, err);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
