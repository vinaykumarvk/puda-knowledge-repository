import type { Express } from "express";
import { createServer, type Server } from "http";
import { querySchema, insertConversationSchema } from "@shared/schema";
import { storage } from "./storage";

const EKG_API_URL = "https://ekg-service-47249889063.europe-west6.run.app";

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/query", async (req, res) => {
    try {
      const validatedData = querySchema.parse(req.body);
      
      // Call the new REST API endpoint
      const response = await fetch(`${EKG_API_URL}/v1/answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: validatedData.question,
          mode: validatedData.mode,
          use_cache: !validatedData.refresh, // Invert the refresh logic
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("EKG API error:", response.status, errorText);
        throw new Error(`EKG API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log("EKG API response:", JSON.stringify(result, null, 2));

      if (result && result.answer) {
        const responseText = result.answer;
        
        // Format metadata from the response
        let metadata = "";
        if (result.meta) {
          metadata = `**Mode**: ${result.mode}\n**Timestamp**: ${result.timestamp}`;
          if (result.meta.model) {
            metadata += `\n**Model**: ${result.meta.model}`;
          }
        }
        
        // Format entities/sources if available
        let sources = "";
        if (result.entities && Array.isArray(result.entities) && result.entities.length > 0) {
          sources = "**Sources:**\n\n" + result.entities.map((entity: any, index: number) => {
            if (typeof entity === 'string') {
              return `[${index + 1}] ${entity}`;
            } else if (entity && typeof entity === 'object') {
              return `[${index + 1}] ${JSON.stringify(entity)}`;
            }
            return '';
          }).filter(Boolean).join('\n\n');
        }
        
        // Save to conversation history
        await storage.createConversation({
          question: validatedData.question,
          mode: validatedData.mode,
          useCache: !validatedData.refresh,
          response: responseText,
        });
        
        res.json({
          data: responseText,
          metadata: metadata || undefined,
          citations: sources || undefined,
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

  // Get all conversations
  app.get("/api/conversations", async (req, res) => {
    try {
      const conversations = await storage.getConversations();
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Get single conversation
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

  // Delete conversation
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
