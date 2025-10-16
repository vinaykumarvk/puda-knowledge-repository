import { z } from "zod";

// Query schema for graph database chatbot
export const querySchema = z.object({
  question: z.string().min(1, "Question is required"),
  mode: z.enum(["balanced", "deep", "concise"]),
  refresh: z.boolean(),
});

export type Query = z.infer<typeof querySchema>;

// Response schema
export const responseSchema = z.object({
  data: z.string(), // Markdown formatted response
  error: z.string().optional(),
});

export type QueryResponse = z.infer<typeof responseSchema>;

// User schema (keeping existing for compatibility)
export const insertUserSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = InsertUser & { id: string };
