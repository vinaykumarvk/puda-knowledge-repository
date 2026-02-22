import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import { db, pool } from "../db";
import { users } from "@shared/schema";
import { hashPassword } from "../auth";

const SAMPLE_USERS = [
  { username: "user123", password: "password123", fullName: "User 123", team: "admin", email: "user123@wealthforce.com" },
] as const;

async function resetDatabaseData() {
  const tableResult = await db.execute<{ tablename: string }>(sql`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '__drizzle_migrations'
  `);

  const tableNames = tableResult.rows
    .map((row) => row.tablename)
    .filter((name): name is string => Boolean(name));

  if (tableNames.length === 0) {
    return;
  }

  const quotedTableNames = tableNames
    .map((name) => `"${name.replace(/"/g, "\"\"")}"`)
    .join(", ");

  await db.execute(
    sql.raw(`TRUNCATE TABLE ${quotedTableNames} RESTART IDENTITY CASCADE`)
  );
}

async function seedSampleUsers() {
  for (const userData of SAMPLE_USERS) {
    const hashedPassword = await hashPassword(userData.password);

    await db.insert(users).values({
      username: userData.username,
      password: hashedPassword,
      fullName: userData.fullName,
      team: userData.team,
      email: userData.email,
      isActive: true,
    });
  }
}

export async function initDatabase() {
  await resetDatabaseData();
  await seedSampleUsers();
}

async function run() {
  await initDatabase();
  console.log("Database initialized successfully with default users.");
  await pool.end();
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  run().catch((error) => {
    console.error("Database initialization failed:", error);
    process.exit(1);
  });
}
