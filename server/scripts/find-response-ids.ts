import { db } from "../db";
import { messages } from "@shared/schema";
import { sql, desc, eq, and } from "drizzle-orm";

async function findResponseIds() {
  try {
    console.log("Searching for messages matching the queries from the screenshot...\n");

    // Search for the first query: "Write a comprehensive BRD as per the standard industry..."
    const query1 = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.role, "user"),
          sql`LOWER(${messages.content}) LIKE LOWER('%Write a comprehensive BRD as per the standard industry%')`
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(5);

    console.log("=== Query 1: 'Write a comprehensive BRD as per the standard industry...' ===");
    if (query1.length > 0) {
      for (const msg of query1) {
        const timeAgo = Math.round((Date.now() - new Date(msg.createdAt).getTime()) / 60000);
        console.log(`\nMessage ID: ${msg.id}`);
        console.log(`Content: ${msg.content.substring(0, 100)}...`);
        console.log(`Role: ${msg.role}`);
        console.log(`Created: ${msg.createdAt} (${timeAgo} minutes ago)`);
        console.log(`Thread ID: ${msg.threadId}`);
        
        // Find the corresponding assistant message with responseId
        if (msg.role === "user") {
          const assistantMsg = await db
            .select()
            .from(messages)
            .where(
              eq(messages.threadId, msg.threadId)
            )
            .orderBy(desc(messages.createdAt))
            .limit(10);
          
          // Find the assistant message that comes after this user message
          const correspondingAssistant = assistantMsg.find(
            (m) => m.role === "assistant" && new Date(m.createdAt) > new Date(msg.createdAt)
          );
          
          if (correspondingAssistant) {
            console.log(`\n✅ RESPONSE ID: ${correspondingAssistant.responseId || "NOT FOUND"}`);
            console.log(`   Assistant Message ID: ${correspondingAssistant.id}`);
          } else {
            console.log(`\n⚠️  No corresponding assistant message found yet`);
          }
        }
      }
    } else {
      console.log("No messages found matching this query.");
    }

    console.log("\n" + "=".repeat(80) + "\n");

    // Search for the second query: "How to perform risk profiling in the system?"
    const query2 = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.role, "user"),
          sql`LOWER(${messages.content}) LIKE LOWER('%How to perform risk profiling in the system%')`
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(5);

    console.log("=== Query 2: 'How to perform risk profiling in the system?' ===");
    if (query2.length > 0) {
      for (const msg of query2) {
        const timeAgo = Math.round((Date.now() - new Date(msg.createdAt).getTime()) / 60000);
        console.log(`\nMessage ID: ${msg.id}`);
        console.log(`Content: ${msg.content.substring(0, 100)}...`);
        console.log(`Role: ${msg.role}`);
        console.log(`Created: ${msg.createdAt} (${timeAgo} minutes ago)`);
        console.log(`Thread ID: ${msg.threadId}`);
        
        // Find the corresponding assistant message with responseId
        if (msg.role === "user") {
          const assistantMsg = await db
            .select()
            .from(messages)
            .where(
              eq(messages.threadId, msg.threadId)
            )
            .orderBy(desc(messages.createdAt))
            .limit(10);
          
          // Find the assistant message that comes after this user message
          const correspondingAssistant = assistantMsg.find(
            (m) => m.role === "assistant" && new Date(m.createdAt) > new Date(msg.createdAt)
          );
          
          if (correspondingAssistant) {
            console.log(`\n✅ RESPONSE ID: ${correspondingAssistant.responseId || "NOT FOUND"}`);
            console.log(`   Assistant Message ID: ${correspondingAssistant.id}`);
          } else {
            console.log(`\n⚠️  No corresponding assistant message found yet`);
          }
        }
      }
    } else {
      console.log("No messages found matching this query.");
    }

    // Also search for recent user messages to find matches
    console.log("\n" + "=".repeat(80) + "\n");
    console.log("=== Recent User Messages (last 20) ===");
    const recentMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.role, "user"))
      .orderBy(desc(messages.createdAt))
      .limit(20);

    for (const msg of recentMessages) {
      const timeAgo = Math.round((Date.now() - new Date(msg.createdAt).getTime()) / 60000);
      const content = msg.content.toLowerCase();
      
      if (
        content.includes("brd") && content.includes("comprehensive") ||
        content.includes("risk profiling")
      ) {
        console.log(`\n📌 Found potential match:`);
        console.log(`   Message ID: ${msg.id}`);
        console.log(`   Content: ${msg.content.substring(0, 150)}...`);
        console.log(`   Created: ${timeAgo} minutes ago`);
        console.log(`   Thread ID: ${msg.threadId}`);
        
        // Get the assistant response
        const threadMessages = await db
          .select()
          .from(messages)
          .where(eq(messages.threadId, msg.threadId))
          .orderBy(messages.createdAt);
        
        const assistantResponse = threadMessages.find(
          (m) => m.role === "assistant" && new Date(m.createdAt) > new Date(msg.createdAt)
        );
        
        if (assistantResponse) {
          console.log(`   ✅ RESPONSE ID: ${assistantResponse.responseId || "NOT FOUND"}`);
        }
      }
    }

  } catch (error) {
    console.error("Error querying database:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

findResponseIds();

