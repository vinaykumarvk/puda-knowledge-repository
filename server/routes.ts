import type { Express } from "express";
import { createServer, type Server } from "http";
import { querySchema, insertConversationSchema } from "@shared/schema";
import { storage } from "./storage";

const EKG_API_URL = "https://ekg-service-47249889063.europe-west6.run.app";

// Helper function to clean answer text by removing formatting noise
function cleanAnswer(markdown: string): string {
  return markdown
    .replace(/^#.*KG \+ VectorStore Answer.*$/gm, '')  // Remove KG answer headers
    .replace(/^_Generated:.*$/gm, '')                   // Remove timestamp lines
    .replace(/^##\s*\*\*Answer\*\*\s*$/gm, '')         // Remove "## **Answer**" subheader
    .replace(/<sup>.*?<\/sup>/g, '')                    // Remove citation superscripts (includes links)
    .replace(/<a\s+id="cite-\d+">\s*<\/a>/g, '')       // Remove citation anchor definitions
    .replace(/<a[^>]*>(.*?)<\/a>/g, '$1')              // Extract text from remaining anchor tags
    .replace(/<[^>]*>/g, '')                            // Remove remaining HTML tags
    .replace(/\*\*([^*]+)\*\*/g, '$1')                  // Remove bold (**text** -> text)
    .replace(/\[[\d,\s]+\]/g, '')                       // Remove inline citations [1], [2]
    .replace(/\[KG:.*?\]/gi, '')                        // Remove Knowledge Graph tags
    .replace(/---\s*##\s*\*\*Sources by File\*\*[\s\S]*$/, '') // Remove citations section
    .replace(/\n{3,}/g, '\n\n')                         // Collapse multiple newlines
    .trim();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Main query endpoint - handles both new threads and follow-up questions
  app.post("/api/query", async (req, res) => {
    try {
      const validatedData = querySchema.parse(req.body);
      let threadId = validatedData.threadId;
      let previousResponseId: string | undefined;
      let existingConversationId: string | undefined;
      
      // If threadId provided, get conversation context
      let chatHistory: Array<{question: string; answer: string}> = [];
      
      if (threadId) {
        const thread = await storage.getThread(threadId);
        if (thread && thread.conversationId) {
          existingConversationId = thread.conversationId;
        }
        
        const lastMessage = await storage.getLastAssistantMessage(threadId);
        if (lastMessage && lastMessage.responseId) {
          previousResponseId = lastMessage.responseId;
        }
        
        // Get last 3 Q&A pairs for focused context window
        const recentMessages = await storage.getRecentMessagePairs(threadId, 3);
        console.log(`Retrieved ${recentMessages.length} messages for context (expecting ${3 * 2} for ${3} pairs)`);
        
        // Format as Q&A pairs with cleaned answers
        for (let i = 0; i < recentMessages.length; i += 2) {
          const userMsg = recentMessages[i];
          const assistantMsg = recentMessages[i + 1];
          
          if (userMsg && assistantMsg && userMsg.role === "user" && assistantMsg.role === "assistant") {
            const cleanedAnswer = cleanAnswer(assistantMsg.content);
            chatHistory.push({
              question: userMsg.content,
              answer: cleanedAnswer
            });
            console.log(`Added Q&A pair ${Math.floor(i/2) + 1}: Q="${userMsg.content.substring(0, 50)}..." A="${cleanedAnswer.substring(0, 50)}..."`);
          } else {
            console.warn(`Skipping invalid message pair at index ${i}: user=${userMsg?.role}, assistant=${assistantMsg?.role}`);
          }
        }
        console.log(`Final chatHistory has ${chatHistory.length} pairs`);
      } else {
        // Create a new thread with title from question (truncated)
        const title = validatedData.question.length > 60 
          ? validatedData.question.substring(0, 60) + "..."
          : validatedData.question;
        const thread = await storage.createThread({ title });
        threadId = thread.id;
      }
      
      // Prepare the question with meta-instructions for focused responses
      let questionToSend = validatedData.question;
      
      if (chatHistory.length > 0) {
        // Add meta-instructions for context understanding and focused responses
        questionToSend = `[Context-Aware Follow-up Question with Focus Directives]

Previous conversation history is provided for context. Please follow these instructions:

STEP 1 - Context Understanding:
• Evaluate if this question contains pronouns or unclear references (e.g., "this", "it", "that", "these", "the above")
• If such references exist, identify what they refer to based on the conversation history
• Internally clarify the question to make it self-contained and explicit

STEP 2 - Focused Response Generation:
• Answer ONLY the specific question asked - be precise and direct
• Include ONLY information that is immediately relevant to this specific question
• Exclude tangential details, background context, or loosely related information
• Be concise while remaining comprehensive on the core topic
• Prioritize clarity and relevance over exhaustive coverage

User's Question: ${validatedData.question}`;
      } else {
        // Add focus directives for initial questions
        questionToSend = `[Focused Response Directive]

Please follow these instructions when answering:
• Answer ONLY the specific question asked - be precise and direct
• Include ONLY information that is immediately relevant to this specific question
• Exclude tangential details, background context, or loosely related information
• Be concise while remaining comprehensive on the core topic
• Prioritize clarity and relevance over exhaustive coverage

User's Question: ${validatedData.question}`;
      }
      
      // Prepare API request payload with correct structure
      const apiPayload: any = {
        question: questionToSend,
        domain: "wealth_management",
        params: {
          _mode: validatedData.mode || "balanced"  // Send mode in params object
        }
      };
      
      // Add conversation_id for long-running context (prioritize this over response_id)
      if (existingConversationId) {
        apiPayload.conversation_id = existingConversationId;
      } else if (previousResponseId) {
        // Add response_id if this is a follow-up question without conversation_id
        apiPayload.response_id = previousResponseId;
      }
      
      // Add chat history (last 3 Q&A pairs) for better context
      if (chatHistory.length > 0) {
        apiPayload.chat_history = chatHistory;
        console.log(`Including ${chatHistory.length} previous Q&A pairs with meta-instructions`);
      }
      
      console.log("EKG API request payload:", JSON.stringify(apiPayload, null, 2));
      
      // Call the EKG API
      const response = await fetch(`${EKG_API_URL}/v1/answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "WealthForce-Knowledge-Agent/1.0"
        },
        body: JSON.stringify(apiPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("EKG API error:", response.status, errorText);
        throw new Error(`EKG API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log("EKG API response:", JSON.stringify(result, null, 2));

      // Handle both 'answer' and 'markdown' fields (API documentation shows 'markdown', but actual API returns 'answer')
      const responseText = result.markdown || result.answer;
      
      if (result && responseText) {
        
        // Format sources if available
        let sources = "";
        if (result.sources && Array.isArray(result.sources) && result.sources.length > 0) {
          sources = JSON.stringify(result.sources);
        }
        
        // Format metadata
        let metadata = "";
        if (result.meta) {
          metadata = JSON.stringify(result.meta);
        }
        
        // Save user message
        await storage.createMessage({
          threadId: threadId!,
          role: "user",
          content: validatedData.question,
          responseId: null,
          sources: null,
          metadata: null,
        });
        
        // Save assistant message with response_id
        await storage.createMessage({
          threadId: threadId!,
          role: "assistant",
          content: responseText,
          responseId: result.response_id || null,
          sources: sources || null,
          metadata: metadata || null,
        });
        
        // Capture and store conversation_id from API response for long-running context
        const apiConversationId = result.meta?.conversation_id || result.conversation_id;
        if (apiConversationId && !existingConversationId) {
          await storage.updateThreadConversationId(threadId!, apiConversationId);
        }
        
        // Update thread timestamp
        await storage.updateThreadTimestamp(threadId!);
        
        res.json({
          threadId: threadId,
          data: responseText,
          metadata: metadata || undefined,
          citations: sources || undefined,
          responseId: result.response_id,
          isConversational: result.meta?.is_conversational || false,
        });
      } else {
        res.status(500).json({
          data: "",
          error: "No answer in response from the service",
        });
      }
    } catch (error) {
      console.error("Query error:", error);
      res.status(500).json({
        data: "",
        error: error instanceof Error ? error.message : "Failed to process query",
      });
    }
  });

  // Thread endpoints
  
  // Get all threads
  app.get("/api/threads", async (req, res) => {
    try {
      const threads = await storage.getThreads();
      res.json(threads);
    } catch (error) {
      console.error("Error fetching threads:", error);
      res.status(500).json({ error: "Failed to fetch threads" });
    }
  });

  // Get single thread
  app.get("/api/threads/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const thread = await storage.getThread(id);
      if (thread) {
        res.json(thread);
      } else {
        res.status(404).json({ error: "Thread not found" });
      }
    } catch (error) {
      console.error("Error fetching thread:", error);
      res.status(500).json({ error: "Failed to fetch thread" });
    }
  });

  // Get messages for a thread
  app.get("/api/threads/:id/messages", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const messages = await storage.getMessages(id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Delete thread
  app.delete("/api/threads/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteThread(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting thread:", error);
      res.status(500).json({ error: "Failed to delete thread" });
    }
  });

  // Legacy conversation endpoints (kept for backward compatibility)
  app.get("/api/conversations", async (req, res) => {
    try {
      const conversations = await storage.getConversations();
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const conversation = await storage.getConversation(id);
      if (conversation) {
        res.json(conversation);
      } else {
        res.status(404).json({ error: "Conversation not found" });
      }
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.delete("/api/conversations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteConversation(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
