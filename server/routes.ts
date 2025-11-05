import type { Express } from "express";
import { createServer, type Server } from "http";
import { querySchema, insertConversationSchema } from "@shared/schema";
import { storage } from "./storage";
import OpenAI from "openai";
import { verifyPassword, generateSessionToken, getSessionExpiry } from "./auth";
import { z } from "zod";
import multer from "multer";
import fs from "fs/promises";

const EKG_API_URL = "https://ekg-service-47249889063.europe-west6.run.app";

// Initialize OpenAI client for quiz generation using Replit AI Integrations
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// Configure multer for audio file uploads (memory storage)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

// Configure multer for document uploads (disk storage)
const documentStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = 'uploads/documents';
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, uniqueSuffix + '-' + sanitizedName);
  }
});

const documentUpload = multer({
  storage: documentStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max per file
  },
});

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
  // TEMPORARY: Database initialization endpoint
  app.get("/api/init-db", async (req, res) => {
    try {
      const { db } = await import("./db");
      const { users, sessions } = await import("@shared/schema");
      const { sql } = await import("drizzle-orm");
      const { hashPassword } = await import("./auth");
      
      // Create users table
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
      
      // Create sessions table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS sessions (
          id VARCHAR(255) PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          expires_at TIMESTAMP NOT NULL
        )
      `);
      
      // Seed sample users
      const sampleUsers = [
        { username: "admin", password: "Admin@2025", fullName: "Admin User", team: "admin", email: "admin@wealthforce.com" },
        { username: "presales", password: "Presales@2025", fullName: "John Smith", team: "presales", email: "john.smith@wealthforce.com" },
        { username: "ba_analyst", password: "BA@2025", fullName: "Sarah Johnson", team: "ba", email: "sarah.johnson@wealthforce.com" },
        { username: "manager", password: "Manager@2025", fullName: "Michael Chen", team: "management", email: "michael.chen@wealthforce.com" },
      ];
      
      for (const userData of sampleUsers) {
        const hashedPassword = await hashPassword(userData.password);
        await db.execute(sql`
          INSERT INTO users (username, password, full_name, email, team, is_active)
          VALUES (${userData.username}, ${hashedPassword}, ${userData.fullName}, ${userData.email}, ${userData.team}, true)
          ON CONFLICT (username) DO NOTHING
        `);
      }
      
      res.json({ 
        success: true, 
        message: "Database initialized successfully! You can now login with: admin/Admin@2025, presales/Presales@2025, ba_analyst/BA@2025, or manager/Manager@2025" 
      });
    } catch (error: any) {
      console.error("Database initialization error:", error);
      res.status(500).json({ error: "Failed to initialize database", details: error.message });
    }
  });

  // Authentication middleware to check if user is logged in
  const requireAuth = async (req: any, res: any, next: any) => {
    const sessionId = req.cookies?.wf_session;
    
    if (!sessionId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const sessionWithUser = await storage.getSessionWithUser(sessionId);
    
    if (!sessionWithUser) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    
    req.user = sessionWithUser.user;
    req.sessionId = sessionId;
    next();
  };

  // Login endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const loginSchema = z.object({
        username: z.string().min(1),
        password: z.string().min(1),
      });
      
      const { username, password } = loginSchema.parse(req.body);
      
      // Get user by username
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // Verify password
      const isValid = await verifyPassword(password, user.password);
      
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // Check if user is active
      if (!user.isActive) {
        return res.status(403).json({ error: "Account is inactive" });
      }
      
      // Create session
      const sessionToken = generateSessionToken();
      const expiresAt = getSessionExpiry();
      
      await storage.createSession({
        id: sessionToken,
        userId: user.id,
        expiresAt,
      });
      
      // Update last login
      await storage.updateUserLastLogin(user.id);
      
      // Set HTTP-only cookie
      res.cookie("wf_session", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: expiresAt,
      });
      
      // Return user data (without password)
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", async (req, res) => {
    try {
      const sessionId = req.cookies?.wf_session;
      
      if (sessionId) {
        await storage.deleteSession(sessionId);
      }
      
      // Clear cookie with same security attributes as login
      res.clearCookie("wf_session", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ error: "Logout failed" });
    }
  });

  // Get current user endpoint
  app.get("/api/auth/me", requireAuth, async (req: any, res) => {
    try {
      const { password: _, ...userWithoutPassword } = req.user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  // Voice transcription endpoint using OpenAI Whisper
  app.post("/api/voice/transcribe", upload.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      console.log("Received audio file for transcription:", {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      });

      // Create a temporary file from the buffer
      const tempFilePath = `/tmp/audio-${Date.now()}.webm`;
      await fs.writeFile(tempFilePath, req.file.buffer);

      try {
        // Use OpenAI Whisper API for transcription
        // OpenAI SDK accepts ReadStream for file parameter in Node.js
        const fileStream = await import('fs').then(fs => fs.createReadStream(tempFilePath));
        
        const transcription = await openai.audio.transcriptions.create({
          file: fileStream,
          model: "whisper-1",
          language: "en",
          response_format: "json",
        });

        // Clean up temp file
        await fs.unlink(tempFilePath).catch(() => {});

        console.log("Transcription successful:", transcription.text.substring(0, 100));

        res.json({ 
          text: transcription.text,
          success: true,
        });
      } catch (whisperError) {
        // Clean up temp file on error
        await fs.unlink(tempFilePath).catch(() => {});
        throw whisperError;
      }
    } catch (error) {
      console.error("Transcription error:", error);
      res.status(500).json({ 
        error: "Failed to transcribe audio",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

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

  // Generate flash quiz from conversation using OpenAI
  app.post("/api/generate-quiz", async (req, res) => {
    try {
      const { threadId } = req.body;
      
      if (!threadId) {
        return res.status(400).json({ error: "threadId is required" });
      }

      // Get recent messages from the thread
      const messages = await storage.getRecentMessagePairs(threadId, 10); // Get up to 10 Q&A pairs
      
      if (messages.length < 2) {
        return res.status(400).json({ error: "Not enough conversation history to generate a quiz" });
      }

      // Format messages for context
      const conversationContext = [];
      for (let i = 0; i < messages.length; i += 2) {
        const userMsg = messages[i];
        const assistantMsg = messages[i + 1];
        
        if (userMsg && assistantMsg) {
          conversationContext.push({
            question: userMsg.content,
            answer: cleanAnswer(assistantMsg.content)
          });
        }
      }

      // Create quiz generation prompt for OpenAI
      const systemPrompt = `You are a quiz generation expert. Your task is to create engaging, accurate multiple-choice quiz questions based on conversation context. Generate 3-5 questions that test understanding of key concepts discussed.

Return your response as valid JSON in this EXACT format (no additional text before or after):
{
  "questions": [
    {
      "question": "Question text here?",
      "options": {
        "A": "Option A text",
        "B": "Option B text",
        "C": "Option C text",
        "D": "Option D text"
      },
      "correctAnswer": "A",
      "explanation": "Explanation why A is correct."
    }
  ]
}`;

      const userPrompt = `Based on the following conversation about wealth management, generate 3-5 multiple-choice quiz questions to test understanding of the key concepts discussed.

CONVERSATION HISTORY:
${conversationContext.map((ctx, i) => `Q${i + 1}: ${ctx.question}\nA${i + 1}: ${ctx.answer}`).join('\n\n')}

Generate quiz questions that:
- Test understanding of key concepts from the conversation
- Have 4 answer options (A, B, C, D)
- Include the correct answer
- Include a brief explanation (2-3 sentences) of why the answer is correct`;

      // Call OpenAI to generate quiz
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      const quizData = completion.choices[0].message.content;
      
      if (!quizData) {
        console.error("No quiz data in OpenAI response");
        return res.status(500).json({ error: "Failed to generate quiz - no response from AI" });
      }

      // Parse the quiz data
      let parsedQuiz;
      try {
        parsedQuiz = JSON.parse(quizData);
        
        // Validate structure
        if (!parsedQuiz.questions || !Array.isArray(parsedQuiz.questions) || parsedQuiz.questions.length === 0) {
          throw new Error("Invalid quiz structure: missing or empty questions array");
        }
      } catch (parseError) {
        console.error("Failed to parse quiz JSON:", quizData);
        console.error("Parse error:", parseError);
        return res.status(500).json({ 
          error: "Failed to parse quiz data. Please try again." 
        });
      }

      res.json(parsedQuiz);
      
    } catch (error) {
      console.error("Quiz generation error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to generate quiz",
      });
    }
  });

  // Get current mastery score
  app.get("/api/mastery", async (req, res) => {
    try {
      let mastery = await storage.getUserMastery();
      
      if (!mastery) {
        // Initialize mastery if it doesn't exist
        mastery = await storage.updateUserMastery({
          overallScore: 0,
          currentLevel: "Novice",
          quizPerformanceScore: 0,
          topicCoverageScore: 0,
          retentionScore: 0,
          topicsMastered: 0,
          totalQuizzesTaken: 0,
        });
      }
      
      res.json(mastery);
    } catch (error) {
      console.error("Error fetching mastery:", error);
      res.status(500).json({ error: "Failed to fetch mastery score" });
    }
  });

  // Helper function to calculate mastery score
  async function calculateMasteryScore() {
    // Get recent quiz attempts (last 20 for performance calculation)
    const recentQuizzes = await storage.getRecentQuizzes(20);
    
    if (recentQuizzes.length === 0) {
      return await storage.updateUserMastery({
        overallScore: 0,
        currentLevel: "Novice",
        quizPerformanceScore: 0,
        topicCoverageScore: 0,
        retentionScore: 0,
        topicsMastered: 0,
        totalQuizzesTaken: 0,
      });
    }

    // 1. Quiz Performance Score (50 points max)
    // Weight: Recent 20 quizzes at 70%, older at 30%
    const avgScore = recentQuizzes.reduce((sum, q) => sum + q.scorePercentage, 0) / recentQuizzes.length;
    const quizPerformanceScore = Math.round((avgScore / 100) * 50);

    // 2. Topic Coverage Score (30 points max)
    // For Phase 1, give partial credit based on number of quizzes taken
    const totalQuizzes = recentQuizzes.length;
    const topicCoverageScore = Math.min(30, Math.round((totalQuizzes / 10) * 30));

    // 3. Retention & Consistency Score (20 points max)
    // For Phase 1, give credit based on consistency
    const retentionScore = Math.min(20, Math.round((totalQuizzes / 15) * 20));

    // Calculate overall mastery score
    const overallScore = quizPerformanceScore + topicCoverageScore + retentionScore;

    // Determine level based on score
    let currentLevel = "Novice";
    if (overallScore >= 91) currentLevel = "Expert";
    else if (overallScore >= 76) currentLevel = "Advanced";
    else if (overallScore >= 51) currentLevel = "Intermediate";
    else if (overallScore >= 26) currentLevel = "Learning";

    return await storage.updateUserMastery({
      overallScore,
      currentLevel,
      quizPerformanceScore,
      topicCoverageScore,
      retentionScore,
      topicsMastered: 0, // Will implement in Phase 2
      totalQuizzesTaken: totalQuizzes,
    });
  }

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

  // Get quiz question bank summary - grouped by topic
  app.get("/api/quiz/categories", async (req, res) => {
    try {
      const categories = await storage.getQuizCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching quiz categories:", error);
      res.status(500).json({ error: "Failed to fetch quiz categories" });
    }
  });

  // Get quiz questions for a specific topic
  app.get("/api/quiz/questions/:topic", async (req, res) => {
    try {
      const topic = decodeURIComponent(req.params.topic);
      const questions = await storage.getQuizQuestions(topic);
      res.json(questions);
    } catch (error) {
      console.error("Error fetching quiz questions:", error);
      res.status(500).json({ error: "Failed to fetch quiz questions" });
    }
  });

  // Get quiz stats for all topics
  app.get("/api/quiz/stats", async (req, res) => {
    try {
      const stats = await storage.getAllQuizStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching quiz stats:", error);
      res.status(500).json({ error: "Failed to fetch quiz stats" });
    }
  });

  // Get quiz history with best scores and attempts per topic
  app.get("/api/quiz/history", async (req, res) => {
    try {
      const history = await storage.getQuizHistory();
      res.json(history);
    } catch (error) {
      console.error("Error fetching quiz history:", error);
      res.status(500).json({ error: "Failed to fetch quiz history" });
    }
  });

  // Submit quiz results and update mastery score
  app.post("/api/quiz/submit", async (req, res) => {
    try {
      console.log("📝 QUIZ SUBMIT received:", req.body);
      const { topic, category, score, totalQuestions, correctAnswers } = req.body;
      
      if (!topic || !category || typeof score !== 'number' || !totalQuestions || typeof correctAnswers !== 'number') {
        console.log("❌ Missing required fields:", { topic, category, score, totalQuestions, correctAnswers });
        return res.status(400).json({ error: "Missing required fields" });
      }

      console.log("✅ Saving quiz attempt...");
      const result = await storage.saveQuizAttemptAndUpdateMastery(
        topic,
        category,
        score,
        totalQuestions,
        correctAnswers
      );

      console.log("✅ Quiz saved successfully:", result);
      res.json(result);
    } catch (error) {
      console.error("❌ Error submitting quiz:", error);
      res.status(500).json({ error: "Failed to submit quiz" });
    }
  });

  // ===== RFP Response Generator Routes =====

  // Get all RFP requirement responses
  app.get("/api/rfp/responses", async (req, res) => {
    try {
      const responses = await storage.getAllRfpResponses();
      res.json(responses);
    } catch (error) {
      console.error("Error fetching RFP responses:", error);
      res.status(500).json({ error: "Failed to fetch RFP responses" });
    }
  });

  // Get a single RFP requirement response by ID
  app.get("/api/rfp/responses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const response = await storage.getRfpResponseById(id);
      if (!response) {
        return res.status(404).json({ error: "Response not found" });
      }
      res.json(response);
    } catch (error) {
      console.error("Error fetching RFP response:", error);
      res.status(500).json({ error: "Failed to fetch RFP response" });
    }
  });

  // Store a new RFP requirement response
  app.post("/api/rfp/responses", async (req, res) => {
    try {
      const response = await storage.createRfpResponse(req.body);
      res.status(201).json(response);
    } catch (error) {
      console.error("Error creating RFP response:", error);
      res.status(500).json({ error: "Failed to create RFP response" });
    }
  });

  // Update an existing RFP response
  app.patch("/api/rfp/responses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const response = await storage.updateRfpResponse(id, req.body);
      res.json(response);
    } catch (error) {
      console.error("Error updating RFP response:", error);
      res.status(500).json({ error: "Failed to update RFP response" });
    }
  });

  // Delete an RFP response
  app.delete("/api/rfp/responses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteRfpResponse(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting RFP response:", error);
      res.status(500).json({ error: "Failed to delete RFP response" });
    }
  });

  // Get references for a specific RFP response (for ReferencePanel component)
  app.get("/api/excel-requirements/:id/references", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const references = await storage.getReferencesForResponse(id);
      res.json(references);
    } catch (error) {
      console.error("Error fetching references:", error);
      res.status(500).json({ error: "Failed to fetch references" });
    }
  });

  // Process Excel file upload and store requirements
  app.post("/api/analyze-excel", async (req, res) => {
    try {
      const { data, replaceExisting } = req.body;
      
      if (!data || !Array.isArray(data)) {
        return res.status(400).json({ error: "Invalid data format" });
      }

      // If replaceExisting is true, delete all existing records first
      if (replaceExisting) {
        // Get all existing responses and delete them
        const existingResponses = await storage.getAllRfpResponses();
        for (const response of existingResponses) {
          await storage.deleteRfpResponse(response.id);
        }
      }

      // Insert new records
      let recordsAdded = 0;
      for (const row of data) {
        await storage.createRfpResponse({
          rfpName: row.rfpName,
          requirementId: row.requirementId,
          category: row.category,
          requirement: row.requirement,
          finalResponse: row.finalResponse || "",
          uploadedBy: row.uploadedBy,
          rating: row.rating || null
        });
        recordsAdded++;
      }

      res.json({ 
        success: true, 
        recordsAdded,
        message: `Successfully ${replaceExisting ? 'replaced' : 'added'} ${recordsAdded} records`
      });
    } catch (error) {
      console.error("Error processing Excel data:", error);
      res.status(500).json({ error: "Failed to process Excel data" });
    }
  });

  // Get all Excel requirements (alias for getAllRfpResponses)
  app.get("/api/excel-requirements", async (req, res) => {
    try {
      const responses = await storage.getAllRfpResponses();
      res.json(responses);
    } catch (error) {
      console.error("Error fetching Excel requirements:", error);
      res.status(500).json({ error: "Failed to fetch Excel requirements" });
    }
  });

  // Generate AI response for a requirement using OpenAI
  app.post("/api/generate-response", async (req, res) => {
    try {
      const { requirement_id, model } = req.body;
      
      console.log(`Generate response request for requirement ${requirement_id} with model ${model}`);
      
      // Get the requirement from the database
      const requirement = await storage.getRfpResponseById(parseInt(requirement_id));
      
      if (!requirement) {
        return res.status(404).json({ error: "Requirement not found" });
      }
      
      // Import OpenAI SDK dynamically
      const { default: OpenAI } = await import("openai");
      
      // Initialize OpenAI client using Replit AI Integrations
      const openai = new OpenAI({
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
      });
      
      // Create prompt for RFP response generation
      const prompt = `You are an expert RFP (Request for Proposal) response writer for a wealth management and financial services company.

Category: ${requirement.category}
Requirement: ${requirement.requirement}

Please write a comprehensive, professional RFP response that:
1. Directly addresses the requirement
2. Demonstrates expertise and capability
3. Uses specific examples where appropriate
4. Maintains a professional, confident tone
5. Is concise but thorough (200-400 words)

Write the response now:`;
      
      // Call OpenAI API
      const response = await openai.chat.completions.create({
        model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: 8192,
        temperature: 1,
      });
      
      const generatedResponse = response.choices[0]?.message?.content || "";
      
      // Update the requirement with the generated response
      await storage.updateRfpResponse(parseInt(requirement_id), {
        finalResponse: generatedResponse,
        modelProvider: "openai"
      });
      
      res.json({ 
        success: true,
        requirement_id,
        model,
        response: generatedResponse,
        message: "Response generated successfully"
      });
    } catch (error) {
      console.error("Error in generate-response:", error);
      res.status(500).json({ 
        error: "Failed to generate response", 
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ===== Investment Portal API Routes =====
  
  // Investment routes
  app.get("/api/investments", requireAuth, async (req: any, res) => {
    try {
      // Only show investments created by the logged-in user
      const userId = req.user.id;
      const status = req.query.status as string;
      const investments = await storage.getInvestmentRequests({ userId, status });
      res.json(investments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch investments" });
    }
  });

  app.get("/api/investments/:id", requireAuth, async (req: any, res) => {
    try {
      const investmentId = parseInt(req.params.id);
      const userId = req.user.id;
      
      const investment = await storage.getInvestmentRequest(investmentId);
      if (!investment) return res.status(404).json({ error: "Investment not found" });
      
      // Allow access if user created it OR if user is the assigned approver
      const approvals = await storage.getApprovalsByRequest('investment', investmentId);
      const isApprover = approvals.some(approval => approval.approverId === userId);
      
      if (investment.createdBy !== userId && !isApprover) {
        return res.status(403).json({ error: "Unauthorized: You don't have access to this investment" });
      }
      
      res.json(investment);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch investment" });
    }
  });

  app.post("/api/investments", requireAuth, async (req: any, res) => {
    try {
      // Override createdBy with the authenticated user's ID
      const investmentData = {
        ...req.body,
        createdBy: req.user.id
      };
      console.log("Creating investment with data:", investmentData);
      const investment = await storage.createInvestmentRequest(investmentData);
      res.json(investment);
    } catch (error) {
      console.error("Failed to create investment:", error);
      res.status(500).json({ 
        error: "Failed to create investment",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.put("/api/investments/:id", requireAuth, async (req: any, res) => {
    try {
      const investmentId = parseInt(req.params.id);
      const userId = req.user.id;
      
      // Verify the user owns this investment
      const existingInvestment = await storage.getInvestmentRequest(investmentId);
      if (!existingInvestment) {
        return res.status(404).json({ error: "Investment not found" });
      }
      
      if (existingInvestment.createdBy !== userId) {
        return res.status(403).json({ error: "Unauthorized: You can only edit your own investments" });
      }
      
      const investment = await storage.updateInvestmentRequest(investmentId, req.body);
      res.json(investment);
    } catch (error) {
      res.status(500).json({ error: "Failed to update investment" });
    }
  });

  app.post("/api/investments/:id/submit", requireAuth, async (req: any, res) => {
    try {
      const investmentId = parseInt(req.params.id);
      const userId = req.user.id;

      // Get the user's manager
      const manager = await storage.getUserManager(userId);
      if (!manager) {
        return res.status(400).json({ error: "No manager assigned. Cannot submit for approval." });
      }

      // Update investment status to submitted
      await storage.updateInvestmentRequest(investmentId, { status: 'submitted' });

      // Create approval record for the manager
      const approval = await storage.createApproval({
        requestType: 'investment',
        requestId: investmentId,
        approverId: manager.id,
        status: 'pending',
        stage: 1,
      });

      res.json({ success: true, approval });
    } catch (error) {
      console.error("Failed to submit investment:", error);
      res.status(500).json({ error: "Failed to submit investment" });
    }
  });

  app.delete("/api/investments/:id", async (req, res) => {
    try {
      await storage.softDeleteInvestmentRequest(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete investment" });
    }
  });

  // Document upload route
  app.post("/api/documents/upload", documentUpload.array('documents'), async (req, res) => {
    try {
      const { requestType, requestId, categories, categoryId, subcategoryId } = req.body;
      const files = req.files as Express.Multer.File[];
      
      console.log(`Document upload request: requestType: ${requestType}, requestId: ${requestId}, files: ${files?.length || 0}`);
      
      if (!files || files.length === 0) {
        console.warn('No files provided in upload request');
        return res.status(400).json({ message: 'No files uploaded' });
      }

      if (!requestType || !requestId) {
        console.warn('Missing required parameters: requestType or requestId');
        return res.status(400).json({ message: 'Missing required parameters: requestType and requestId are required' });
      }
      
      const documents = [];
      const errors = [];
      
      // Process files individually to handle partial failures
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          console.log(`Processing file ${i + 1}/${files.length}: ${file.originalname} (${file.size} bytes)`);
          
          // Validate file
          if (!file.originalname || file.size === 0) {
            throw new Error(`Invalid file: ${file.originalname || 'unknown'}`);
          }
          
          const documentData: any = {
            fileName: file.filename,
            originalName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype,
            fileUrl: file.path,
            uploaderId: null, // Nullable since auth is bypassed
            requestType,
            requestId: parseInt(requestId),
          };
          
          // Add single category information if provided
          if (categoryId) {
            documentData.categoryId = parseInt(categoryId);
          }
          if (subcategoryId) {
            documentData.subcategoryId = parseInt(subcategoryId);
          }
          
          const document = await storage.createDocument(documentData);
          console.log(`Document record created: ${document.id} for file ${file.originalname}`);
          
          documents.push(document);
        } catch (fileError) {
          console.error(`Failed to process file ${file.originalname}:`, fileError);
          errors.push({
            fileName: file.originalname,
            error: fileError instanceof Error ? fileError.message : String(fileError)
          });
        }
      }
      
      // If no documents were successfully processed, return error
      if (documents.length === 0) {
        console.error('No documents were successfully processed');
        return res.status(500).json({ 
          message: 'Failed to upload any documents',
          errors 
        });
      }
      
      // Return success response with documents
      const response: any = { 
        documents,
        successful: documents.length,
        total: files.length
      };
      
      if (errors.length > 0) {
        response.errors = errors;
        response.message = `${documents.length}/${files.length} documents uploaded successfully`;
        console.warn(`Partial upload success: ${documents.length}/${files.length} files processed`);
      } else {
        console.log(`All ${documents.length} documents uploaded successfully`);
      }
      
      res.json(response);
    } catch (error) {
      console.error("Failed to upload documents:", error);
      res.status(500).json({ 
        error: "Failed to upload documents",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Task routes
  app.get("/api/tasks", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const tasks = await storage.getTasksByUser(userId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.get("/api/tasks/:id", async (req, res) => {
    try {
      const task = await storage.getTaskById(parseInt(req.params.id));
      if (!task) return res.status(404).json({ error: "Task not found" });
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch task" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const task = await storage.createTask(req.body);
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.put("/api/tasks/:id", async (req, res) => {
    try {
      const task = await storage.updateTask(parseInt(req.params.id), req.body);
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  // Approval routes
  app.get("/api/approvals/my-tasks", requireAuth, async (req: any, res) => {
    try {
      // Only show approvals where the logged-in user is the approver (manager)
      const approverId = req.user.id;
      const status = req.query.status as string;
      const approvals = await storage.getApprovalsByApproverId(approverId, status);
      res.json(approvals);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch approvals" });
    }
  });

  app.get("/api/approvals/:requestType/:requestId", async (req, res) => {
    try {
      const approvals = await storage.getApprovalsByRequest(req.params.requestType, parseInt(req.params.requestId));
      res.json(approvals);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch approvals" });
    }
  });

  app.post("/api/approvals", async (req, res) => {
    try {
      const approval = await storage.createApproval(req.body);
      res.json(approval);
    } catch (error) {
      res.status(500).json({ error: "Failed to create approval" });
    }
  });

  app.put("/api/approvals/:id", requireAuth, async (req: any, res) => {
    try {
      const approvalId = parseInt(req.params.id);
      const userId = req.user.id;
      
      // First, fetch the approval to verify authorization
      const existingApproval = await storage.getApprovalById(approvalId);
      if (!existingApproval) {
        return res.status(404).json({ error: "Approval not found" });
      }
      
      // Verify that the logged-in user is the assigned approver
      if (existingApproval.approverId !== userId) {
        return res.status(403).json({ error: "Unauthorized: You are not the assigned approver for this request" });
      }
      
      const { status, rejectionReason, editHistory, comments } = req.body;
      
      // Update approval with status, rejection reason, and comments
      const approval = await storage.updateApprovalStatus(
        approvalId,
        status,
        rejectionReason,
        editHistory,
        comments
      );
      
      res.json(approval);
    } catch (error) {
      res.status(500).json({ error: "Failed to update approval" });
    }
  });

  // Document routes
  app.get("/api/documents/:requestType/:requestId", async (req, res) => {
    try {
      const documents = await storage.getDocumentsByRequest(req.params.requestType, parseInt(req.params.requestId));
      res.json(documents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  app.get("/api/documents/download/:id", async (req, res) => {
    try {
      const doc = await storage.getDocument(parseInt(req.params.id));
      if (!doc) return res.status(404).json({ error: "Document not found" });
      res.json(doc);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch document" });
    }
  });

  app.post("/api/documents", async (req, res) => {
    try {
      const document = await storage.createDocument(req.body);
      res.json(document);
    } catch (error) {
      res.status(500).json({ error: "Failed to create document" });
    }
  });

  app.delete("/api/documents/:id", async (req, res) => {
    try {
      await storage.deleteDocument(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  // AI Document Analysis route
  app.post("/api/documents/:id/analyze", async (req, res) => {
    try {
      const documentId = parseInt(req.params.id);
      const { question } = req.body;

      // Get document details
      const document = await storage.getDocument(documentId);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      // Read document content (simplified - in production you'd extract text from PDF, DOCX, etc.)
      let documentContent = '';
      try {
        const fileContent = await fs.readFile(document.fileUrl, 'utf-8');
        documentContent = fileContent.substring(0, 15000); // Limit to ~15K chars
      } catch (error) {
        documentContent = `Document: ${document.originalName} (${document.mimeType})`;
      }

      // Use OpenAI to analyze the document
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert document analyst. Analyze the provided document and answer questions about it with detailed, accurate information. Focus on key insights, important data, and actionable information."
          },
          {
            role: "user",
            content: `Document Name: ${document.originalName}\n\nDocument Content:\n${documentContent}\n\nQuestion: ${question || 'Please provide a comprehensive summary of this document, highlighting key points, important data, and main takeaways.'}`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      const analysis = completion.choices[0].message.content;

      res.json({ 
        documentName: document.originalName,
        question: question || 'Document summary',
        analysis: analysis,
        success: true 
      });
    } catch (error) {
      console.error("Document analysis error:", error);
      res.status(500).json({ 
        error: "Failed to analyze document",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Market Regulation Research route
  app.post("/api/research/regulation", async (req, res) => {
    try {
      const { question, projectContext } = req.body;

      if (!question) {
        return res.status(400).json({ error: "Question is required" });
      }

      // Use OpenAI to research market regulations
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert in market regulations, compliance, and financial industry standards. Provide detailed, accurate answers about regulations, compliance requirements, and industry best practices. Focus on:
- Specific regulatory requirements
- Compliance obligations
- Recent regulatory changes
- Industry standards and guidelines
- Practical implementation advice

Always cite relevant regulations and provide actionable guidance.`
          },
          {
            role: "user",
            content: projectContext 
              ? `Project Context: ${projectContext}\n\nRegulation Question: ${question}`
              : `Regulation Question: ${question}`
          }
        ],
        temperature: 0.3, // Lower temperature for more factual responses
        max_tokens: 2500
      });

      const answer = completion.choices[0].message.content;

      res.json({ 
        question,
        answer,
        projectContext: projectContext || null,
        timestamp: new Date().toISOString(),
        success: true 
      });
    } catch (error) {
      console.error("Market regulation research error:", error);
      res.status(500).json({ 
        error: "Failed to research regulation",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Document category routes
  app.get("/api/document-categories", async (req, res) => {
    try {
      const categories = await storage.getDocumentCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.post("/api/document-categories", async (req, res) => {
    try {
      const category = await storage.createDocumentCategory(req.body);
      res.json(category);
    } catch (error) {
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  // Template routes
  app.get("/api/templates/investment", async (req, res) => {
    try {
      const templates = await storage.getTemplatesByType("investment");
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  app.get("/api/templates/:id", async (req, res) => {
    try {
      const template = await storage.getTemplate(parseInt(req.params.id));
      if (!template) return res.status(404).json({ error: "Template not found" });
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch template" });
    }
  });

  app.post("/api/templates", async (req, res) => {
    try {
      const template = await storage.createTemplate(req.body);
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to create template" });
    }
  });

  app.put("/api/templates/:id", async (req, res) => {
    try {
      const template = await storage.updateTemplate(parseInt(req.params.id), req.body);
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to update template" });
    }
  });

  app.delete("/api/templates/:id", async (req, res) => {
    try {
      await storage.deleteTemplate(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete template" });
    }
  });

  // Investment rationale routes
  app.get("/api/investments/:id/rationales", async (req, res) => {
    try {
      const rationales = await storage.getInvestmentRationales(parseInt(req.params.id));
      res.json(rationales);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch rationales" });
    }
  });

  app.post("/api/investments/:id/rationales", async (req, res) => {
    try {
      const rationale = await storage.createInvestmentRationale(req.body);
      res.json(rationale);
    } catch (error) {
      res.status(500).json({ error: "Failed to create rationale" });
    }
  });

  app.put("/api/investments/:investmentId/rationales/:id", async (req, res) => {
    try {
      const rationale = await storage.updateInvestmentRationale(parseInt(req.params.id), req.body);
      res.json(rationale);
    } catch (error) {
      res.status(500).json({ error: "Failed to update rationale" });
    }
  });

  app.delete("/api/investments/:investmentId/rationales/:id", async (req, res) => {
    try {
      await storage.deleteInvestmentRationale(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete rationale" });
    }
  });

  // Report Work Chat - AI-powered collaborative report drafting
  app.post("/api/reports/:id/chat", async (req, res) => {
    try {
      const reportId = parseInt(req.params.id);
      const { question, templateId, sectionName, conversationHistory } = req.body;

      // 1. Fetch report details
      const report = await storage.getInvestmentRequest(reportId);
      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }

      // 2. Fetch attached documents
      const documents = await storage.getDocumentsByRequest('investment', reportId);

      // 3. Build comprehensive context
      let contextParts: string[] = [];

      // Add report description
      if (report.description) {
        contextParts.push(`Report Description: ${report.description}`);
      }

      // Add report metadata
      contextParts.push(`Subject/Client: ${report.targetCompany}`);
      contextParts.push(`Report Type: ${report.investmentType}`);
      if (report.reportTitle) {
        contextParts.push(`Report Title: ${report.reportTitle}`);
      }

      // Add template context if selected
      if (templateId) {
        const template = await storage.getTemplate(templateId);
        if (template) {
          contextParts.push(`\nSelected Template: ${template.name}`);
          
          // Parse template data to get sections and structure
          try {
            // Handle both string and pre-parsed object formats
            const templateData = typeof template.templateData === 'string'
              ? JSON.parse(template.templateData)
              : template.templateData;
            if (templateData.sections && Array.isArray(templateData.sections)) {
              const sectionNames = templateData.sections.map((s: any) => 
                s.name || s.title || s
              );
              contextParts.push(`Template Sections: ${sectionNames.join(', ')}`);
              
              // If a specific section is selected, add its details
              if (sectionName) {
                const selectedSectionData = templateData.sections.find((s: any) => 
                  (s.name || s.title || s) === sectionName
                );
                if (selectedSectionData) {
                  if (selectedSectionData.wordLimit) {
                    contextParts.push(`Section Word Limit: ${selectedSectionData.wordLimit} words`);
                  }
                  if (selectedSectionData.description) {
                    contextParts.push(`Section Description: ${selectedSectionData.description}`);
                  }
                }
              }
            }
          } catch (e) {
            console.error("Failed to parse template data:", e);
          }
        }
      }

      // Add section focus if selected
      if (sectionName) {
        contextParts.push(`\nCurrent Section: ${sectionName}`);
      }

      // Add document information
      if (documents && documents.length > 0) {
        contextParts.push(`\nAttached Documents (${documents.length}):`);
        documents.forEach((doc: any, idx: number) => {
          contextParts.push(`${idx + 1}. ${doc.fileName} (${doc.categoryName || 'Uncategorized'})`);
        });
      }

      const reportContext = contextParts.join('\n');

      // 4. Query EKG for additional context
      let ekgContext = "";
      try {
        const ekgResponse = await fetch(`${EKG_API_URL}/v1/answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question }),
        });

        if (ekgResponse.ok) {
          const ekgData = await ekgResponse.json();
          if (ekgData.answer) {
            ekgContext = `\n\nKnowledge Base Context:\n${cleanAnswer(ekgData.answer)}`;
          }
        }
      } catch (error) {
        console.log("EKG service unavailable, continuing without it");
      }

      // 5. Build AI prompt
      const systemPrompt = `You are an expert business analyst and report writing assistant. You help users draft comprehensive, professional reports using templates.

You have access to:
- The report's description and metadata
- All attached documents for analysis and reference
- External knowledge from the EKG service
- Historical best practices from the vector store
${templateId ? '- The selected template structure and section requirements' : ''}

Your role is to:
- Help users draft content for specific template sections
- Analyze and incorporate insights from attached documents
- Provide context-aware suggestions based on template requirements
- Respect word limits and section descriptions when provided
- Suggest improvements and best practices
- Generate professional, well-structured content

Report Context:
${reportContext}${ekgContext}

When drafting content:
1. If a template section is selected, tailor your response to that section's requirements
2. Reference the attached documents when relevant to provide evidence-based content
3. Follow professional business writing standards
4. Respect any word limits specified in the template
5. Provide actionable, clear, and comprehensive responses`;

      // 6. Build conversation messages
      const messages = [
        { role: "system", content: systemPrompt },
        ...(conversationHistory || []).slice(-6), // Keep last 6 messages for context
        { role: "user", content: question }
      ];

      // 7. Call OpenAI
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: messages as any,
        temperature: 0.7,
        max_tokens: 2000,
      });

      const answer = completion.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.";

      res.json({ 
        answer,
        context: {
          reportTitle: report.reportTitle,
          documentCount: documents?.length || 0,
          hasEkgContext: ekgContext.length > 0
        }
      });

    } catch (error: any) {
      console.error("Error in report chat:", error);
      res.status(500).json({ 
        error: "Failed to process chat request",
        details: error.message 
      });
    }
  });

  // Notification routes
  app.get("/api/notifications", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const notifications = await storage.getUserNotifications(userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      await storage.markNotificationAsRead(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  app.delete("/api/notifications/:id", async (req, res) => {
    try {
      await storage.deleteNotification(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete notification" });
    }
  });

  // Solution Template routes
  app.post("/api/solution-templates/init", async (req, res) => {
    try {
      // Create default template
      const template = await storage.createSolutionTemplate({
        title: "Standard Solution Document",
        description: "Business Analyst standard format for system change documentation",
        isDefault: true
      });

      // Create sections in order
      const sectionsData = [
        { type: "heading", title: "Document Header", orderIndex: 0 },
        { type: "revisionHistory", title: "Revision History", orderIndex: 1 },
        { type: "tableOfContents", title: "Table of Contents", orderIndex: 2 },
        { type: "changeRequirement", title: "1. Change Requirement", orderIndex: 3 },
        { type: "pdaReference", title: "2. PDA Reference Number", orderIndex: 4 },
        { type: "pfasReference", title: "3. PFAS Document Reference", orderIndex: 5 },
        { type: "businessImpact", title: "4. Business Impact", orderIndex: 6 },
        { type: "affectedSystems", title: "5. Affected Systems", orderIndex: 7 },
        { type: "solution", title: "6. Solution", orderIndex: 8 },
        { type: "testScenarios", title: "7. Test Scenarios", orderIndex: 9 }
      ];

      const sections = [];
      for (const sectionData of sectionsData) {
        const section = await storage.createTemplateSection({
          templateId: template.id,
          sectionType: sectionData.type,
          title: sectionData.title,
          content: null,
          orderIndex: sectionData.orderIndex,
          isEditable: true
        });
        sections.push(section);
      }

      // Add default work items to Solution section
      const solutionSection = sections.find(s => s.sectionType === "solution");
      if (solutionSection) {
        const workItemsData = [
          { title: "Description of Change", orderIndex: 0 },
          { title: "Logic and Validations", orderIndex: 1 },
          { title: "UI Changes", orderIndex: 2 },
          { title: "Batch Processing", orderIndex: 3 },
          { title: "API Changes", orderIndex: 4 },
          { title: "Field-Level Changes", orderIndex: 5 }
        ];

        for (const workItemData of workItemsData) {
          await storage.createTemplateWorkItem({
            sectionId: solutionSection.id,
            title: workItemData.title,
            content: null,
            orderIndex: workItemData.orderIndex,
            isIncluded: true
          });
        }
      }

      // Add pre-populated content for Affected Systems
      const affectedSystemsSection = sections.find(s => s.sectionType === "affectedSystems");
      if (affectedSystemsSection) {
        await storage.updateTemplateSection(affectedSystemsSection.id, {
          content: `- RM Office
- Operations Office
- Client Portal
- Revenue Desk
- Sigma (Reports Module)
- APIs`
        });
      }

      res.json(template);
    } catch (error) {
      console.error("Failed to initialize template:", error);
      res.status(500).json({ error: "Failed to initialize template" });
    }
  });

  app.get("/api/solution-templates", async (req, res) => {
    try {
      const templates = await storage.getAllSolutionTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch solution templates" });
    }
  });

  app.get("/api/solution-templates/default", async (req, res) => {
    try {
      const template = await storage.getDefaultSolutionTemplate();
      if (!template) {
        res.status(404).json({ error: "No default template found" });
        return;
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch default template" });
    }
  });

  app.get("/api/solution-templates/:id", async (req, res) => {
    try {
      const template = await storage.getSolutionTemplate(parseInt(req.params.id));
      if (!template) {
        res.status(404).json({ error: "Template not found" });
        return;
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch solution template" });
    }
  });

  app.get("/api/solution-templates/:id/complete", async (req, res) => {
    try {
      const completeTemplate = await storage.getCompleteTemplate(parseInt(req.params.id));
      if (!completeTemplate) {
        res.status(404).json({ error: "Template not found" });
        return;
      }
      res.json(completeTemplate);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch complete template" });
    }
  });

  app.post("/api/solution-templates", async (req, res) => {
    try {
      const template = await storage.createSolutionTemplate(req.body);
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to create solution template" });
    }
  });

  app.put("/api/solution-templates/:id", async (req, res) => {
    try {
      const template = await storage.updateSolutionTemplate(parseInt(req.params.id), req.body);
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to update solution template" });
    }
  });

  app.delete("/api/solution-templates/:id", async (req, res) => {
    try {
      await storage.deleteSolutionTemplate(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete solution template" });
    }
  });

  app.get("/api/template-sections/:templateId", async (req, res) => {
    try {
      const sections = await storage.getTemplateSections(parseInt(req.params.templateId));
      res.json(sections);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch template sections" });
    }
  });

  app.post("/api/template-sections", async (req, res) => {
    try {
      const section = await storage.createTemplateSection(req.body);
      res.json(section);
    } catch (error) {
      res.status(500).json({ error: "Failed to create template section" });
    }
  });

  app.put("/api/template-sections/:id", async (req, res) => {
    try {
      const section = await storage.updateTemplateSection(parseInt(req.params.id), req.body);
      res.json(section);
    } catch (error) {
      res.status(500).json({ error: "Failed to update template section" });
    }
  });

  app.delete("/api/template-sections/:id", async (req, res) => {
    try {
      await storage.deleteTemplateSection(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete template section" });
    }
  });

  app.get("/api/template-work-items/:sectionId", async (req, res) => {
    try {
      const workItems = await storage.getTemplateWorkItems(parseInt(req.params.sectionId));
      res.json(workItems);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch template work items" });
    }
  });

  app.post("/api/template-work-items", async (req, res) => {
    try {
      const workItem = await storage.createTemplateWorkItem(req.body);
      res.json(workItem);
    } catch (error) {
      res.status(500).json({ error: "Failed to create template work item" });
    }
  });

  app.put("/api/template-work-items/:id", async (req, res) => {
    try {
      const workItem = await storage.updateTemplateWorkItem(parseInt(req.params.id), req.body);
      res.json(workItem);
    } catch (error) {
      res.status(500).json({ error: "Failed to update template work item" });
    }
  });

  app.delete("/api/template-work-items/:id", async (req, res) => {
    try {
      await storage.deleteTemplateWorkItem(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete template work item" });
    }
  });

  app.get("/api/template-revisions/:templateId", async (req, res) => {
    try {
      const revisions = await storage.getTemplateRevisions(parseInt(req.params.templateId));
      res.json(revisions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch template revisions" });
    }
  });

  app.post("/api/template-revisions", async (req, res) => {
    try {
      const revision = await storage.createTemplateRevision(req.body);
      res.json(revision);
    } catch (error) {
      res.status(500).json({ error: "Failed to create template revision" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
