import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { hashPassword } from "../auth";

const SAMPLE_USERS = [
  { username: "admin", password: "Admin@2025", fullName: "Admin User", team: "admin", email: "admin@wealthforce.com" },
  { username: "presales", password: "Presales@2025", fullName: "John Smith", team: "presales", email: "john.smith@wealthforce.com" },
  { username: "ba_analyst", password: "BA@2025", fullName: "Sarah Johnson", team: "ba", email: "sarah.johnson@wealthforce.com" },
  { username: "manager", password: "Manager@2025", fullName: "Michael Chen", team: "management", email: "michael.chen@wealthforce.com" },
] as const;

async function ensureTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      team VARCHAR(50) NOT NULL,
      is_active BOOLEAN DEFAULT true NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      last_login TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id VARCHAR(255) PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      expires_at TIMESTAMP NOT NULL
    )
  `);
}

async function seedSampleUsers() {
  for (const userData of SAMPLE_USERS) {
    const hashedPassword = await hashPassword(userData.password);
    await db.execute(sql`
      INSERT INTO users (username, password, full_name, email, team, is_active)
      VALUES (${userData.username}, ${hashedPassword}, ${userData.fullName}, ${userData.email}, ${userData.team}, true)
      ON CONFLICT (username) DO NOTHING
    `);
  }
}

export async function initDatabase() {
  await ensureTables();
  await seedSampleUsers();
}

async function run() {
  await initDatabase();
  console.log("Database initialized successfully with default users.");
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  run().catch((error) => {
    console.error("Database initialization failed:", error);
    process.exit(1);
  });
}
