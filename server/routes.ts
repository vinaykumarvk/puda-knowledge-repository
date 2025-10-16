import type { Express } from "express";
import { createServer, type Server } from "http";
import { Client } from "@gradio/client";
import { querySchema, insertConversationSchema } from "@shared/schema";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/query", async (req, res) => {
    try {
      const validatedData = querySchema.parse(req.body);
      
      const client = await Client.connect("vinaykumarvk/WealthEKG");
      const result = await client.predict("/process_question", {
        question: validatedData.question,
        mode: validatedData.mode,
        refresh: validatedData.refresh,
      });

      if (result && result.data) {
        // Log the full response to understand the structure
        console.log("Full Gradio API response:", JSON.stringify(result.data, null, 2));
        
        let responseText = "";
        let citations = "";
        
        if (Array.isArray(result.data)) {
          // First element is the answer, second might be citations
          responseText = typeof result.data[0] === 'string' ? result.data[0] : JSON.stringify(result.data[0]);
          if (result.data.length > 1 && result.data[1]) {
            citations = typeof result.data[1] === 'string' ? result.data[1] : JSON.stringify(result.data[1]);
          }
        } else {
          responseText = typeof result.data === 'string' ? result.data : JSON.stringify(result.data);
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
          citations: citations || undefined,
        });
      } else {
        res.status(500).json({
          data: "",
          error: "No response from the service",
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
