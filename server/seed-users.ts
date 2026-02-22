import { db } from "./db";
import { users } from "@shared/schema";
import { hashPassword } from "./auth";
import { eq } from "drizzle-orm";

const SAMPLE_USERS = [
  {
    username: "user123",
    password: "password123",
    fullName: "User 123",
    team: "admin",
    email: "user123@wealthforce.com",
  },
];

export async function seedUsers() {
  console.log("🌱 Seeding sample users...");
  
  for (const userData of SAMPLE_USERS) {
    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, userData.username));
    
    if (existingUser) {
      console.log(`  ⏭️  User "${userData.username}" already exists, skipping...`);
      continue;
    }
    
    // Hash password and create user
    const hashedPassword = await hashPassword(userData.password);
    await db.insert(users).values({
      username: userData.username,
      password: hashedPassword,
      fullName: userData.fullName,
      team: userData.team,
      email: userData.email,
      isActive: true,
    });
    
    console.log(`  ✅ Created user: ${userData.username} (${userData.fullName}) - Team: ${userData.team}`);
  }
  
  console.log("✅ User seeding complete!\n");
  console.log("📋 Sample Accounts:");
  console.log("┌─────────────┬─────────────────┬─────────────┐");
  console.log("│ Username    │ Password        │ Team        │");
  console.log("├─────────────┼─────────────────┼─────────────┤");
  SAMPLE_USERS.forEach(user => {
    console.log(`│ ${user.username.padEnd(11)} │ ${user.password.padEnd(15)} │ ${user.team.padEnd(11)} │`);
  });
  console.log("└─────────────┴─────────────────┴─────────────┘\n");
}
