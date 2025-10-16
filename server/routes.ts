import type { Express } from "express";
import { createServer, type Server } from "http";
import { Client } from "@gradio/client";
import { querySchema } from "@shared/schema";

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
        const responseData = Array.isArray(result.data) ? result.data[0] : result.data;
        res.json({
          data: typeof responseData === 'string' ? responseData : JSON.stringify(responseData),
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

  const httpServer = createServer(app);

  return httpServer;
}
