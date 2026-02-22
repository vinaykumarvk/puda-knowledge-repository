import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import { db, pool } from "../db";

async function prepareDatabase() {
  // pgvector is required by historical_rfps.embedding and response_cache.question_embedding
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);
}

async function run() {
  await prepareDatabase();
  console.log("Database prepared successfully (pgvector extension verified).");
  await pool.end();
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  run().catch((error) => {
    console.error("Database preparation failed:", error);
    process.exit(1);
  });
}
