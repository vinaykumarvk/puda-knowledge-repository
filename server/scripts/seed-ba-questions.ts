import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import { sql } from "drizzle-orm";
import { db, pool } from "../db";
import {
  DEFAULT_DOMAIN_ID,
  getDomainConfig,
  initializeDomainRegistry,
} from "../services/domainRegistry";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const QUESTION_PROMPT = [
  "Use the wealth management vector store to generate questions.",
  "Create 50 distinct questions a business analyst should ask to gain deep product knowledge.",
  "Questions must be grounded in the vector store content; avoid generic or speculative items.",
  "Group into 8-12 categories with clear, domain-relevant names.",
  "Return a JSON array of objects: {\"category\": string, \"question\": string}.",
  "No markdown, no commentary, no trailing text.",
].join(" ");

type GeneratedQuestion = {
  category: string;
  question: string;
};

async function getWealthVectorStoreId(): Promise<string> {
  if (process.env.WEALTH_VECTOR_STORE_ID) {
    return process.env.WEALTH_VECTOR_STORE_ID;
  }
  await initializeDomainRegistry();
  const domain = getDomainConfig(DEFAULT_DOMAIN_ID);
  if (!domain?.defaultVectorStoreId) {
    throw new Error("Wealth domain vector store ID is not configured.");
  }
  return domain.defaultVectorStoreId;
}

function extractJsonArray(text: string): GeneratedQuestion[] {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1) {
    throw new Error("No JSON array found in assistant response.");
  }
  const jsonText = cleaned.slice(start, end + 1);
  const parsed = JSON.parse(jsonText);
  if (!Array.isArray(parsed)) {
    throw new Error("Parsed response is not an array.");
  }
  return parsed
    .map((item) => ({
      category: String(item.category || "").trim(),
      question: String(item.question || "").trim(),
    }))
    .filter((item) => item.category && item.question);
}

async function generateQuestionsFromVectorStore(): Promise<GeneratedQuestion[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY must be set to generate questions.");
  }

  const vectorStoreId = await getWealthVectorStoreId();
  const assistant = await openai.beta.assistants.create({
    name: "BA Question Generator",
    instructions:
      "You are a business analyst assistant. Use file_search to ground your output in the vector store content.",
    model: "gpt-4o",
    tools: [{ type: "file_search" }],
    tool_resources: {
      file_search: {
        vector_store_ids: [vectorStoreId],
      },
    },
  });

  try {
    const thread = await openai.beta.threads.create();
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: QUESTION_PROMPT,
    });

    const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistant.id,
    });

    if (run.status !== "completed") {
      throw new Error(`Assistant run failed with status: ${run.status}`);
    }

    const messages = await openai.beta.threads.messages.list(thread.id);
    const assistantMessage = messages.data.find((msg) => msg.role === "assistant");
    if (!assistantMessage || assistantMessage.content[0]?.type !== "text") {
      throw new Error("No assistant response received.");
    }

    const responseText = assistantMessage.content[0].text.value;
    const questions = extractJsonArray(responseText);
    if (questions.length < 10) {
      throw new Error("Generated question set is too small to be valid.");
    }
    return questions.slice(0, 50);
  } finally {
    await openai.beta.assistants.delete(assistant.id);
  }
}

async function ensureTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ba_knowledge_questions (
      id SERIAL PRIMARY KEY,
      category TEXT NOT NULL,
      question TEXT UNIQUE NOT NULL,
      is_active BOOLEAN DEFAULT true NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `);
}

async function seedQuestions() {
  const questions = await generateQuestionsFromVectorStore();
  await db.execute(sql`UPDATE ba_knowledge_questions SET is_active = false`);
  for (const entry of questions) {
    await db.execute(sql`
      INSERT INTO ba_knowledge_questions (category, question)
      VALUES (${entry.category}, ${entry.question})
      ON CONFLICT (question) DO UPDATE SET
        category = EXCLUDED.category,
        is_active = true
    `);
  }
}

async function run() {
  await ensureTable();
  await seedQuestions();
  console.log("Seeded BA knowledge questions from vector store.");
  await pool.end();
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  run().catch((error) => {
    console.error("BA question seeding failed:", error);
    process.exit(1);
  });
}
