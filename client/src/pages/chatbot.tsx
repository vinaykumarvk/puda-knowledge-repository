import { useEffect, useRef, useState, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { apiRequest, queryClient } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Loader2,
  Send,
  Sparkles,
  User,
  RefreshCw,
  FileText,
  FileType,
  ThumbsUp,
  ThumbsDown,
  Copy,
} from "lucide-react";
import jsPDF from "jspdf";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { WorkspacePanel } from "@/components/workspace-panel";
import { landingPagePromptSuggestions } from "@/constants/conversation-starters";
import type { Thread, Message } from "@shared/schema";

type ChatMessage = Message & {
  isCached?: boolean;
  cacheId?: number;
  jobId?: string;
  isPolling?: boolean;
};


// Helper function to decode HTML entities
function decodeHTMLEntities(text: string): string {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

// Helper function to remove Knowledge Graph tags like [KG: otp]
function removeKGTags(text: string): string {
  return text.replace(/\s*\[KG:\s*[^\]]+\]/gi, '');
}

// Helper function to remove "Sources by File" section and clean up citations
function cleanupCitations(text: string): string {
  let cleaned = text;

  // Remove bold formatting from citation filenames (e.g., **[1]** → [1])
  cleaned = cleaned.replace(/\*\*\[(\d+)\]\*\*/g, '[$1]');

  // Remove bold from citation filenames (e.g., **filename.pdf** → filename.pdf)
  cleaned = cleaned.replace(/\*\*([^*]+\.(pdf|docx|doc|xlsx)[^*]*)\*\*/gi, '$1');

  return cleaned;
}

type ReferenceDisplayMode = "with" | "without";

function removeDuplicateSourcesLists(text: string): string {
  // Remove legacy list-style "Sources" block when a canonical markdown "Sources" heading also exists.
  return text.replace(
    /(?:^|\n)\s*(?:[Ss]?ources(?:\s+by\s+file)?)\s*\n(?:\s*[-*]\s+.*\[\d+(?:\s*,\s*\d+)*\].*(?:\n|$))+(\n*)(?=\s*#{1,6}\s*sources\b)/im,
    "\n\n",
  );
}

function dedupeSourcesSections(text: string): string {
  const headerPattern = /(?:^|\n)\s*(?:#{1,6}\s*)?(?:\*\*)?(?:sources(?:\s+by\s+file)?|references)(?:\*\*)?\s*:?\s*$/gim;
  const matches = [...text.matchAll(headerPattern)];
  if (matches.length <= 1) {
    return removeDuplicateSourcesLists(text);
  }

  const lastMatch = matches[matches.length - 1];
  const lastSectionStart = lastMatch.index ?? 0;
  const prefix = text.slice(0, lastSectionStart);
  const suffix = text.slice(lastSectionStart).trim();
  const prefixWithoutSources = stripReferencesSection(prefix).trimEnd();

  const merged = prefixWithoutSources
    ? `${prefixWithoutSources}\n\n${suffix}`
    : suffix;

  return removeDuplicateSourcesLists(merged);
}

function stripReferencesSection(text: string): string {
  const sectionPatterns = [
    /(?:^|\n)\s*---\s*\n\s*##\s*\*\*Sources by File\*\*[\s\S]*$/im,
    /(?:^|\n)\s*#{1,6}\s*(?:sources(?:\s+by\s+file)?|references)\s*$[\s\S]*$/im,
    /(?:^|\n)\s*(?:\*\*)?(?:sources(?:\s+by\s+file)?|references)(?:\*\*)?\s*:?\s*$[\s\S]*$/im,
  ];

  let cleaned = text;
  for (const pattern of sectionPatterns) {
    cleaned = cleaned.replace(pattern, "");
  }

  return cleaned;
}

function stripInlineCitations(text: string): string {
  return text
    .replace(/\s*\[(?:\d+(?:\s*,\s*\d+)*)\](?=(?:\s|[.,;:!?)]|$))/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function applyReferenceDisplay(text: string, mode: ReferenceDisplayMode): string {
  if (mode === "with") {
    return text;
  }

  return stripInlineCitations(stripReferencesSection(text));
}

function normalizeAssistantContent(rawText: string, referenceMode: ReferenceDisplayMode): string {
  const cleaned = formatProfessionally(cleanupCitations(removeKGTags(decodeHTMLEntities(rawText))));
  const deduped = dedupeSourcesSections(cleaned);
  return applyReferenceDisplay(deduped, referenceMode);
}

const responseModeOptions = [
  {
    value: "concise" as const,
    label: "Concise",
    description: "Sharp summaries under 150 words.",
  },
  {
    value: "balanced" as const,
    label: "Balanced",
    description: "Context-rich responses with key takeaways.",
  },
  {
    value: "deep" as const,
    label: "Deep",
    description: "Exhaustive analysis with supporting detail.",
  },
];

const referenceDisplayOptions = [
  {
    value: "with" as const,
    label: "With refs",
    description: "Show inline citations and the sources section.",
  },
  {
    value: "without" as const,
    label: "No refs",
    description: "Hide inline citations and the sources section.",
  },
];

const cacheModeOptions = [
  {
    value: "on" as const,
    label: "On",
    description: "Allow response cache for faster repeated answers.",
  },
  {
    value: "off" as const,
    label: "Off",
    description: "Always bypass cache and force a fresh LLM response.",
  },
];

// Helper function to format API responses professionally
function formatProfessionally(text: string): string {
  // Try to isolate the answer section if the model returned headings
  const answerSection = extractAnswerSection(text);
  let formatted = answerSection;
  
  // Remove the KG + VectorStore header and context ID
  formatted = formatted.replace(/^#\s*\*\*KG \+ VectorStore Answer[\s\S]*?\*\*\n*/im, '');
  
  // Remove "Question:" label and keep just the question text
  formatted = formatted.replace(/Question:\s*/gi, '');
  
  // Move "Generated:" timestamp to the end - first capture it, then move it
  let generatedTimestamp = '';
  formatted = formatted.replace(/_Generated:\s*([^\n]+)_\n*/gi, (match, timestamp) => {
    generatedTimestamp = `\n\n---\n\n*Generated: ${timestamp}*`;
    return '';
  });
  
  // Remove "Direct Answer:" label and just show the content
  formatted = formatted.replace(/^##?\s*\*?\*?Direct Answer:?\*?\*?\s*/im, '');
  formatted = formatted.replace(/\n##?\s*\*?\*?Direct Answer:?\*?\*?\s*/im, '\n');
  
  // Remove "Answer:" or "Answer" heading (user already knows it's an answer)
  formatted = formatted.replace(/^##?\s*\*?\*?Answer:?\*?\*?\s*\n*/im, '');
  formatted = formatted.replace(/\n##?\s*\*?\*?Answer:?\*?\*?\s*/im, '\n');
  
  // Convert "Point 1:", "Point 2:" etc. to bullet points
  formatted = formatted.replace(/^Point\s+(\d+):\s*/gim, '- ');
  formatted = formatted.replace(/\n\s*Point\s+(\d+):\s*/gim, '\n- ');
  
  // Convert "Finding 1/", "Finding 2/" etc. to bullet points
  formatted = formatted.replace(/^Finding\s+(\d+)\/?\s*/gim, '- ');
  formatted = formatted.replace(/\n\s*Finding\s+(\d+)\/?\s*/gim, '\n- ');
  
  // Convert numbered list format "1.", "2." at start of line to bullet points (only if standalone)
  formatted = formatted.replace(/^\d+\.\s+/gm, '- ');
  
  // Clean up any "**Direct Answer**" that might still be in the text
  formatted = formatted.replace(/\*\*Direct Answer:?\*\*/gi, '');
  
  // Append the timestamp at the end if we found one
  if (generatedTimestamp) {
    formatted += generatedTimestamp;
  }
  
  return formatted;
}

// Helper to extract only the answer portion from verbose outputs
function extractAnswerSection(text: string): string {
  // First, try to parse as JSON and extract the "answer" field
  try {
    // Try to find JSON object in the text (might be partial or complete)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const jsonStr = jsonMatch[0];
      // Try to parse as complete JSON first
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed && typeof parsed === 'object' && parsed.answer) {
          return parsed.answer;
        }
      } catch (e) {
        // JSON might be incomplete, try regex extraction of answer field
        const answerMatch = jsonStr.match(/"answer"\s*:\s*"([\s\S]*?)"(?=\s*[,}])/);
        if (answerMatch && answerMatch[1]) {
          // Unescape JSON string
          return answerMatch[1]
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\'/g, "'")
            .replace(/\\t/g, '\t')
            .replace(/\\\\/g, '\\');
        }
      }
    }
  } catch (e) {
    // Not valid JSON, continue with regex extraction
  }

  // Try to extract JSON "answer" field using regex (handles multi-line and escaped strings)
  // Pattern: "answer": "..." or "answer": `...` or "answer": ... (until next field or end)
  const jsonAnswerPatterns = [
    // Multi-line JSON string: "answer": "..." (handles escaped quotes and newlines)
    /"answer"\s*:\s*"((?:[^"\\]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*)"/,
    // Template literal style: "answer": `...`
    /"answer"\s*:\s*`([\s\S]*?)`/,
    // Fallback: extract everything after "answer": " until we find a closing quote followed by comma or brace
    /"answer"\s*:\s*"([\s\S]*?)"\s*[,}]/,
    // Simple single-line: "answer": "..."
    /"answer"\s*:\s*"([^"]*)"/,
    // Last resort: if JSON is incomplete/truncated, extract everything after "answer": "
    /"answer"\s*:\s*"([\s\S]*?)(?:"\s*[,}]|$)/,
  ];

  for (const pattern of jsonAnswerPatterns) {
    const match = pattern.exec(text);
    if (match && match[1]) {
      const extracted = match[1].trim();
      if (extracted.length > 0) {
        // Unescape JSON strings
        return extracted
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .replace(/\\'/g, "'")
          .replace(/\\t/g, '\t')
          .replace(/\\\\/g, '\\');
      }
    }
  }

  // Try to find answer markers in markdown format
  const markdownMarkers = [
    /##?\s*\*?\*?Answer:?\*?\*?/im,
    /##?\s*\*?\*?Direct Answer:?\*?\*?/im,
    /\n\s*##?\s*\*?\*?Answer:?\*?\*?/im,
    /\n\s*##?\s*\*?\*?Direct Answer:?\*?\*?/im,
    /^\s*Answer:?\s*/im,
    /^\s*Direct Answer:?\s*/im,
    /\n\s*Answer:?\s*/im,
    /\n\s*Direct Answer:?\s*/im,
  ];

  for (const marker of markdownMarkers) {
    const match = marker.exec(text);
    if (match && match.index !== undefined) {
      const extracted = text.slice(match.index + match[0].length).trim();
      if (extracted.length > 0) {
        return extracted;
      }
    }
  }
  
  return text;
}

// Helper function to download a single message exchange as Markdown
function downloadMessageMarkdown(
  userMessage: string,
  assistantMessage: string,
  timestamp: string,
  referenceMode: ReferenceDisplayMode,
) {
  const normalizedAssistant = normalizeAssistantContent(assistantMessage, referenceMode);
  const content = `# Puda Knowledge Agent - Conversation Export

**Generated:** ${new Date(timestamp).toLocaleString()}

---

## Question

${userMessage}

---

## Answer

${normalizedAssistant}

---
`;

  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `answer-${new Date(timestamp).toISOString().slice(0, 10)}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Helper function to download a single message exchange as PDF
function downloadMessagePDF(
  userMessage: string,
  assistantMessage: string,
  timestamp: string,
  referenceMode: ReferenceDisplayMode,
) {
  const normalizedAssistant = normalizeAssistantContent(assistantMessage, referenceMode);
  const pdf = new jsPDF();
  const margin = 20;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const maxWidth = pageWidth - (margin * 2);
  let yPosition = margin;

  // Title
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Puda Knowledge Agent', margin, yPosition);
  yPosition += 10;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Generated: ${new Date(timestamp).toLocaleString()}`, margin, yPosition);
  yPosition += 15;

  // Question
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Question:', margin, yPosition);
  yPosition += 7;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  const questionLines = pdf.splitTextToSize(userMessage, maxWidth);
  pdf.text(questionLines, margin, yPosition);
  yPosition += (questionLines.length * 5) + 10;

  // Answer
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Answer:', margin, yPosition);
  yPosition += 7;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  
  // Clean the assistant message for PDF (remove markdown)
  const cleanAnswer = normalizedAssistant
    .replace(/[#*_`]/g, '')
    .replace(/\[(\d+)\]/g, '[$1]')
    .replace(/<[^>]*>/g, '');
  
  const answerLines = pdf.splitTextToSize(cleanAnswer, maxWidth);
  const lineHeight = 5;
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  // Write answer with pagination
  for (let i = 0; i < answerLines.length; i++) {
    // Check if we need a new page
    if (yPosition + lineHeight > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
    }
    
    pdf.text(answerLines[i], margin, yPosition);
    yPosition += lineHeight;
  }

  pdf.save(`answer-${new Date(timestamp).toISOString().slice(0, 10)}.pdf`);
}

export default function ChatbotPage() {
  const [question, setQuestion] = useState("");
  const [currentThreadId, setCurrentThreadId] = useState<number | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mode, setMode] = useState<"concise" | "balanced" | "deep">("balanced");
  const [referenceDisplayMode, setReferenceDisplayMode] = useState<ReferenceDisplayMode>("without");
  const [cacheMode, setCacheMode] = useState<"on" | "off">("on");
  const [isWorkspaceSheetOpen, setWorkspaceSheetOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const lastAssistantMessageRef = useRef<HTMLDivElement>(null);
  const questionInputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Store active polling intervals to allow cleanup
  const pollingIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const streamAbortRef = useRef<AbortController | null>(null);

  // Poll job status for async deep mode responses
  const pollJobStatus = useCallback(async (jobId: string, messageId: number, threadId: number) => {
    const maxAttempts = 15; // ~30 minutes at 2 minute intervals (matching backend timeout)
    const startTime = Date.now();
    let attempts = 0;

    // Clear any existing polling for this job
    const existingInterval = pollingIntervalsRef.current.get(jobId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    const poll = async () => {
      attempts++;
      const elapsed = Date.now() - startTime;
      
      // Log progress every attempt (every 2 minutes) for debugging
      if (attempts % 1 === 0) {
        console.log(`[Polling] Job ${jobId}: attempt ${attempts}/${maxAttempts}, elapsed: ${Math.round(elapsed / 1000)}s`);
      }
      
      try {
        const statusResponse = await apiRequest("GET", `/api/jobs/${jobId}/status?messageId=${messageId}&threadId=${threadId}`);
        const status = await statusResponse.json();
        
        // Update the message content with current status
        setMessages((prev) => prev.map((msg) => {
          if (msg.id === messageId && msg.role === "assistant") {
            return {
              ...msg,
              content: status.currentContent || msg.content,
              metadata: JSON.stringify({
                ...(msg.metadata ? JSON.parse(msg.metadata) : {}),
                status: status.status,
                jobId,
              }),
            };
          }
          return msg;
        }));
        
        if (status.completed) {
          // Clear polling interval
          const interval = pollingIntervalsRef.current.get(jobId);
          if (interval) {
            clearInterval(interval);
            pollingIntervalsRef.current.delete(jobId);
          }
          
          // Fetch the final result
          const resultResponse = await apiRequest("GET", `/api/jobs/${jobId}/result`);
          const result = await resultResponse.json();
          
          // Update message with final answer
          setMessages((prev) => prev.map((msg) => {
            if (msg.id === messageId && msg.role === "assistant") {
              return {
                ...msg,
                content: result.data,
                responseId: result.responseId || null,
                sources: null,
                metadata: result.metadata || null,
                isPolling: false,
              };
            }
            return msg;
          }));
          
          // Invalidate queries to refresh thread list and statuses
          queryClient.invalidateQueries({ queryKey: ["/api/threads"] });
          queryClient.invalidateQueries({ queryKey: ["/api/threads/statuses"] });
        } else if (status.failed) {
          const interval = pollingIntervalsRef.current.get(jobId);
          if (interval) {
            clearInterval(interval);
            pollingIntervalsRef.current.delete(jobId);
          }
          // Invalidate statuses query to remove polling indicator
          queryClient.invalidateQueries({ queryKey: ["/api/threads/statuses"] });
          toast({
            title: "Processing Failed",
            description: status.error || "Deep mode processing failed",
            variant: "destructive",
          });
        } else if (attempts >= maxAttempts) {
          const interval = pollingIntervalsRef.current.get(jobId);
          if (interval) {
            clearInterval(interval);
            pollingIntervalsRef.current.delete(jobId);
          }
          
          // Update message to show timeout
          setMessages((prev) => prev.map((msg) => {
            if (msg.id === messageId && msg.role === "assistant") {
              return {
                ...msg,
                content: "⏱️ Processing timeout: The query is taking longer than expected. The server may still be processing your request. Please check back later or try refreshing.",
                isPolling: false,
                metadata: JSON.stringify({
                  ...(msg.metadata ? JSON.parse(msg.metadata) : {}),
                  status: 'timeout',
                  error: 'Frontend polling timeout',
                }),
              };
            }
            return msg;
          }));
          
          // Invalidate statuses query to remove polling indicator
          queryClient.invalidateQueries({ queryKey: ["/api/threads/statuses"] });
          toast({
            title: "Timeout",
            description: `Deep mode processing timed out after ${Math.round(elapsed / 1000)} seconds. The server may still be processing your request.`,
            variant: "destructive",
          });
        }
      } catch (error: any) {
        console.error("Polling error:", error);
        const errorMessage = error?.message || String(error);
        
        // If it's a 404, the job might not exist (server restart) - check message directly
        if (errorMessage.includes('404')) {
          // Try to get status from message metadata instead
          setMessages((prev) => {
            const msg = prev.find(m => m.id === messageId && m.role === "assistant");
            if (msg && msg.metadata) {
              try {
                const metadata = JSON.parse(msg.metadata);
                if (metadata.status === 'completed' || metadata.status === 'failed') {
                  // Job is done, stop polling
                  const interval = pollingIntervalsRef.current.get(jobId);
                  if (interval) {
                    clearInterval(interval);
                    pollingIntervalsRef.current.delete(jobId);
                  }
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
            return prev;
          });
          
          // Don't show error for 404s - might just be server restart
          // Stop polling after a few 404 attempts
          if (attempts >= 3) {
            const interval = pollingIntervalsRef.current.get(jobId);
            if (interval) {
              clearInterval(interval);
              pollingIntervalsRef.current.delete(jobId);
            }
          }
          return;
        }
        
        // For network errors (server down), stop polling and show error
        if (errorMessage.includes('Failed to fetch') || 
            errorMessage.includes('NetworkError') ||
            errorMessage.includes('network') ||
            error instanceof TypeError) {
          const interval = pollingIntervalsRef.current.get(jobId);
          if (interval) {
            clearInterval(interval);
            pollingIntervalsRef.current.delete(jobId);
          }
          
          // Only show error toast once
          if (attempts === 1) {
            toast({
              title: "Connection Error",
              description: "Unable to connect to server. Please refresh the page.",
              variant: "destructive",
            });
          }
          return;
        }
        
        // For other errors, log but continue polling (might be temporary)
        // Only stop after many failures
        if (attempts >= 10) {
          const interval = pollingIntervalsRef.current.get(jobId);
          if (interval) {
            clearInterval(interval);
            pollingIntervalsRef.current.delete(jobId);
          }
        }
      }
    };

    // Start polling immediately, then every 2 minutes
    poll();
    const interval = setInterval(poll, 2 * 60 * 1000);
    pollingIntervalsRef.current.set(jobId, interval);
  }, [toast, setMessages, queryClient]);

  // Streaming handler for concise mode (SSE-style over fetch)
  const streamConciseAnswer = useCallback(async (promptText: string) => {
    if (isStreaming) return;
    setIsStreaming(true);

    // Optimistic user message
    const userMessage: Message = {
      id: Date.now(),
      threadId: currentThreadId || -1,
      role: "user",
      content: promptText,
      responseId: null,
      sources: null,
      metadata: null,
      createdAt: new Date(),
    };

    // Keep a stable local assistant ID for UI updates during streaming.
    const localAssistantId = Date.now() + 1;
    let statusMessage = "";
    const assistantMessage: Message & { isStreaming?: boolean; statusMessage?: string } = {
      id: localAssistantId,
      threadId: currentThreadId || -1,
      role: "assistant",
      content: "",
      responseId: null,
      sources: null,
      metadata: JSON.stringify({ status: "streaming" }),
      createdAt: new Date(),
      isStreaming: true,
      statusMessage: "",
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setQuestion("");

    const controller = new AbortController();
    streamAbortRef.current = controller;

    try {
      const response = await fetch("/api/query/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: promptText, mode: "concise", threadId: currentThreadId }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Streaming request failed (${response.status})`);
      }
      if (!response.body) throw new Error("No response stream");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let resolvedThreadId = currentThreadId;
      let accumulatedText = "";
      let resolvedResponseId: string | undefined;
      let hasFinalized = false;

      const finalize = (finalContent?: string, responseId?: string) => {
        if (hasFinalized) return;
        hasFinalized = true;

        const contentToSet = finalContent ?? accumulatedText;
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === localAssistantId) {
              return {
                ...msg,
                content: contentToSet,
                responseId: responseId || msg.responseId || null,
                metadata: JSON.stringify({ status: "completed" }),
                isStreaming: false,
                threadId: resolvedThreadId || msg.threadId,
                statusMessage: undefined,
              };
            }
            if (msg.id === userMessage.id) {
              return { ...msg, threadId: resolvedThreadId || msg.threadId };
            }
            return msg;
          })
        );
      };

      const updateStatus = (statusText: string) => {
        statusMessage = statusText;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === localAssistantId
              ? { ...msg, statusMessage: statusText }
              : msg
          )
        );
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          if (!part.trim()) continue;
          const lines = part.split("\n").filter(Boolean);
          const eventLine = lines.find((l) => l.startsWith("event:"));
          const dataLine = lines.find((l) => l.startsWith("data:"));
          if (!eventLine || !dataLine) continue;

          const event = eventLine.replace("event:", "").trim();
          let data: any = {};
          try {
            data = JSON.parse(dataLine.replace("data:", "").trim());
          } catch {
            continue;
          }

          if (event === "init") {
            resolvedThreadId = data.threadId;
            if (!currentThreadId && resolvedThreadId) {
              setCurrentThreadId(resolvedThreadId);
            }
            setMessages((prev) =>
              prev.map((msg) => {
                if (msg.id === localAssistantId || msg.id === userMessage.id) {
                  return { ...msg, threadId: resolvedThreadId || msg.threadId };
                }
                return msg;
              })
            );
          } else if (event === "status") {
            // Update status message
            const statusText = data.extendedWaitMessage || data.message || "";
            if (statusText) {
              updateStatus(statusText);
            }
          } else if (event === "delta") {
            const deltaText = data.text || "";
            if (!deltaText) continue;

            accumulatedText += deltaText;
            // Clear status message when content starts streaming
            if (statusMessage) {
              updateStatus("");
            }
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === localAssistantId
                  ? { ...msg, content: accumulatedText, statusMessage: "" }
                  : msg
              )
            );
          } else if (event === "done") {
            resolvedResponseId = data.responseId || resolvedResponseId;
            if (typeof data.content === "string" && data.content.length > 0) {
              accumulatedText = data.content;
            }
            finalize(accumulatedText, resolvedResponseId);
          } else if (event === "error") {
            const errorText = data.error || "Streaming failed. Please try again.";
            finalize(accumulatedText || `⚠️ ${errorText}`);
          }
        }
      }

      if (!hasFinalized) {
        finalize(accumulatedText, resolvedResponseId);
      }

      // Invalidate both threads and messages queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/threads"] });
      if (resolvedThreadId) {
        queryClient.invalidateQueries({ queryKey: [`/api/threads/${resolvedThreadId}/messages`] });
      }
    } catch (error: any) {
      console.error("Streaming failed:", error);
      toast({
        title: "Streaming failed",
        description: error?.message || "Unable to stream response.",
        variant: "destructive",
      });
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === localAssistantId
            ? {
                ...msg,
                metadata: JSON.stringify({ status: "failed" }),
                isStreaming: false,
                content: msg.content || "⚠️ Streaming failed.",
              }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
      streamAbortRef.current = null;
    }
  }, [currentThreadId, isStreaming, queryClient, setMessages, toast]);

  // Fetch messages when thread is selected
  const { data: fetchedMessages } = useQuery<Message[]>({
    queryKey: [`/api/threads/${currentThreadId}/messages`],
    enabled: !!currentThreadId,
  });

  // Update messages when thread changes
  useEffect(() => {
    // Don't replace messages while streaming; keep optimistic updates visible.
    if (isStreaming) {
      if (currentThreadId) {
        console.log('[Chatbot] Skipping message update - currently streaming for thread:', currentThreadId);
      }
      return;
    }

    if (fetchedMessages) {
      console.log('[Chatbot] Loading messages from database:', { threadId: currentThreadId, count: fetchedMessages.length });
      setMessages(fetchedMessages);
      
      // Check for any messages that are still polling and resume polling
      fetchedMessages.forEach((msg) => {
        if (msg.role === "assistant" && msg.metadata) {
          try {
            const metadata = JSON.parse(msg.metadata);
            if (metadata.jobId && metadata.status && metadata.status !== 'completed' && metadata.status !== 'failed') {
              // Resume polling for this job
              pollJobStatus(metadata.jobId, msg.id, msg.threadId);
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      });
    } else if (currentThreadId) {
      setMessages([]);
    }
  }, [fetchedMessages, pollJobStatus, isStreaming, currentThreadId]);

  // Cleanup polling intervals on unmount to prevent orphaned timers
  useEffect(() => {
    return () => {
      pollingIntervalsRef.current.forEach(clearInterval);
      pollingIntervalsRef.current.clear();
      if (streamAbortRef.current) {
        streamAbortRef.current.abort();
      }
    };
  }, []);

  // Track if user has manually scrolled up
  const userScrolledUpRef = useRef(false);
  const lastScrollTopRef = useRef(0);

  // Monitor scroll position to detect manual scrolling
  useEffect(() => {
    const scrollArea = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollArea) return;

    const handleScroll = () => {
      const currentScrollTop = scrollArea.scrollTop;
      const scrollHeight = scrollArea.scrollHeight;
      const clientHeight = scrollArea.clientHeight;
      
      // If user scrolled up (scrollTop decreased), mark as manually scrolled
      if (currentScrollTop < lastScrollTopRef.current) {
        userScrolledUpRef.current = true;
      }
      
      // If user is near bottom (within 100px), reset the flag
      if (scrollHeight - currentScrollTop - clientHeight < 100) {
        userScrolledUpRef.current = false;
      }
      
      lastScrollTopRef.current = currentScrollTop;
    };

    scrollArea.addEventListener('scroll', handleScroll);
    return () => scrollArea.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-scroll to show top of new assistant messages (only if user hasn't scrolled up)
  useEffect(() => {
    if (lastAssistantMessageRef.current && messages.length > 0 && !userScrolledUpRef.current) {
      const lastMessage = messages[messages.length - 1];
      
      // Only scroll if the last message is an assistant message (new answer)
      if (lastMessage.role === "assistant") {
        // Use setTimeout to ensure DOM is updated
        setTimeout(() => {
          if (!userScrolledUpRef.current && lastAssistantMessageRef.current) {
            lastAssistantMessageRef.current.scrollIntoView({ 
              behavior: "smooth", 
              block: "start" 
            });
          }
        }, 100);
      }
    }
  }, [messages]);

  const queryMutation = useMutation({
    mutationFn: async (payload: { question: string; threadId?: number; refreshCache?: boolean; isRegenerate?: boolean }) => {
      const response = await apiRequest("POST", "/api/query", {
        question: payload.question,
        mode: mode,
        refresh: false,
        refreshCache: payload.refreshCache || false,
        threadId: payload.threadId,
      });
      const result = await response.json();
      return result;
    },
    onSuccess: async (data, variables) => {
      if (data.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
      } else {
        // Set the thread ID if this was a new conversation
        if (!currentThreadId && data.threadId) {
          setCurrentThreadId(data.threadId);
        }
        
        // Add user message - use the question from variables instead of state
        const userMessage: Message = {
          id: Date.now(),
          threadId: data.threadId,
          role: "user",
          content: variables.question,
          responseId: null,
          sources: null,
          metadata: null,
          createdAt: new Date(),
        };
        
        // Check if this is an async deep mode response
        if (data.isAsync && data.jobId && data.messageId) {
          // Add assistant message with initial status
          const assistantMessage: Message & { isCached?: boolean; cacheId?: number; jobId?: string; isPolling?: boolean } = {
            id: data.messageId,
            threadId: data.threadId,
            role: "assistant",
            content: data.data || "🔄 Deep analysis in progress...",
            responseId: data.responseId || null,
            sources: null,
            metadata: JSON.stringify({
              status: data.status || 'polling',
              jobId: data.jobId,
            }),
            createdAt: new Date(),
            jobId: data.jobId,
            isPolling: true,
          };
          
          setMessages((prev) => [...prev, userMessage, assistantMessage]);
          setQuestion("");
          
          // Invalidate thread statuses query to immediately show polling status in sidebar
          queryClient.invalidateQueries({ queryKey: ["/api/threads/statuses"] });
          
          // Start polling for status updates
          pollJobStatus(data.jobId, data.messageId, data.threadId);
        } else {
          // Normal synchronous response
          // For regenerate (refreshCache), we should replace the old assistant message
          // For new queries, we add new messages
          const isRegenerate = Boolean(variables.isRegenerate);
          
          if (isRegenerate && currentThreadId) {
            // Regenerate: Replace the last assistant message with the new one
            // First, invalidate to get the real message IDs from database
            queryClient.invalidateQueries({ queryKey: [`/api/threads/${currentThreadId}/messages`] });
            
            // Also update optimistically, but the real data will come from the query
            setMessages((prev) => {
              // Find the last assistant message and replace it
              const newMessages = [...prev];
              let lastAssistantIndex = -1;
              for (let i = newMessages.length - 1; i >= 0; i--) {
                if (newMessages[i].role === "assistant") {
                  lastAssistantIndex = i;
                  break;
                }
              }
              
              if (lastAssistantIndex >= 0) {
                // Replace the last assistant message
                newMessages[lastAssistantIndex] = {
                  ...newMessages[lastAssistantIndex],
                  content: data.data,
                  responseId: data.responseId || null,
                  metadata: data.metadata || null,
                  isCached: data.isCached || false,
                  cacheId: data.cacheId,
                };
              } else {
                // No assistant message found, add new one
                const assistantMessage: Message & { isCached?: boolean; cacheId?: number } = {
                  id: data.messageId || Date.now() + 1,
                  threadId: data.threadId,
                  role: "assistant",
                  content: data.data,
                  responseId: data.responseId || null,
                  sources: data.citations || null,
                  metadata: data.metadata || null,
                  createdAt: new Date(),
                  isCached: data.isCached || false,
                  cacheId: data.cacheId,
                };
                newMessages.push(userMessage, assistantMessage);
              }
              
              return newMessages;
            });
          } else {
            // New query: Add new messages
            const assistantMessage: Message & { isCached?: boolean; cacheId?: number } = {
              id: data.messageId || Date.now() + 1,
              threadId: data.threadId,
              role: "assistant",
              content: data.data,
              responseId: data.responseId || null,
              sources: data.citations || null,
              metadata: data.metadata || null,
              createdAt: new Date(),
              isCached: data.isCached || false,
              cacheId: data.cacheId,
            };
            
            setMessages((prev) => [...prev, userMessage, assistantMessage]);
          }
          
          setQuestion("");
        }
        
        // Invalidate queries to refresh thread list and messages
        queryClient.invalidateQueries({ queryKey: ["/api/threads"] });
        if (data.threadId) {
          queryClient.invalidateQueries({ queryKey: [`/api/threads/${data.threadId}/messages`] });
        }
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const autoResizeQuestionInput = useCallback(() => {
    const input = questionInputRef.current;
    if (!input) {
      return;
    }

    const minHeight = 60;
    const maxHeight = 220;
    input.style.height = `${minHeight}px`;
    const nextHeight = Math.min(input.scrollHeight, maxHeight);
    input.style.height = `${Math.max(nextHeight, minHeight)}px`;
    input.style.overflowY = input.scrollHeight > maxHeight ? "auto" : "hidden";
  }, []);

  useEffect(() => {
    autoResizeQuestionInput();
  }, [question, autoResizeQuestionInput]);

  const handleSubmit = (promptText?: string) => {
    const questionToSubmit = promptText || question;
    
    if (!questionToSubmit.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a question",
        variant: "destructive",
      });
      return;
    }

    // Use the repository-grounded /api/query path for all modes.
    queryMutation.mutate({
      question: questionToSubmit,
      threadId: currentThreadId,
      refreshCache: cacheMode === "off",
      isRegenerate: false,
    });
    
    // Clear the input if submitting from the textarea
    if (!promptText) {
      setQuestion("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSelectThread = (thread: Thread) => {
    setCurrentThreadId(thread.id);
    setWorkspaceSheetOpen(false);
  };

  const handleNewChat = () => {
    setCurrentThreadId(undefined);
    setMessages([]);
    setQuestion("");
  };

  const handleDeleteThread = async (id: number) => {
    try {
      await apiRequest("DELETE", `/api/threads/${id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/threads"] });
      
      if (currentThreadId === id) {
        handleNewChat();
      }
      
      toast({
        title: "Thread Deleted",
        description: "Conversation has been deleted",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete thread",
        variant: "destructive",
      });
    }
  };

  const isLoading = queryMutation.isPending || isStreaming;
  const hasMessages = messages.length > 0;

  const handleReaction = (type: "positive" | "negative") => {
    toast({
      title: type === "positive" ? "Glad that helped!" : "Thanks for the feedback",
      description:
        type === "positive"
          ? "We'll keep responses focused on what resonated."
          : "We're refining future answers based on your signal.",
    });
  };

  const handleRegenerate = (userQuestion: string) => {
    queryMutation.mutate({
      question: userQuestion,
      threadId: currentThreadId,
      refreshCache: true,
      isRegenerate: true,
    });
  };

  const handleCopyMessage = async (messageId: number, messageContent: string) => {
    const answerNode = document.querySelector(`[data-testid="assistant-content-${messageId}"]`);
    const visibleText =
      (answerNode?.textContent || "").trim() ||
      normalizeAssistantContent(messageContent, referenceDisplayMode);

    if (!visibleText) {
      toast({
        title: "Nothing to copy",
        description: "No visible answer content was found.",
        variant: "destructive",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(visibleText);
      toast({
        title: "Copied",
        description: "Response copied to clipboard.",
      });
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = visibleText;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      toast({
        title: "Copied",
        description: "Response copied to clipboard.",
      });
    }
  };

  return (
    <div className="flex flex-1 h-full min-h-0 bg-background">
      <WorkspacePanel
        layout="desktop"
        onSelectThread={handleSelectThread}
        onNewChat={handleNewChat}
        onDeleteThread={handleDeleteThread}
        selectedThreadId={currentThreadId}
      />

      <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
        {/* Header */}
        <header className="border-b border-border bg-card/30 backdrop-blur-sm px-4 py-4 sm:px-6 flex-shrink-0">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-1 h-6 w-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground" data-testid="text-title">
                  Puda Knowledge Agent
                </h1>
                <p className="text-sm text-muted-foreground">
                  Conversational PUDA Knowledge Repository
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <Sheet open={isWorkspaceSheetOpen} onOpenChange={setWorkspaceSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="md:hidden">
                    Threads
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-full sm:max-w-sm p-0">
                  <WorkspacePanel
                    layout="mobile"
                    onSelectThread={handleSelectThread}
                    onNewChat={handleNewChat}
                    onDeleteThread={handleDeleteThread}
                    selectedThreadId={currentThreadId}
                  />
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 min-h-0">
          <div className="max-w-4xl mx-auto px-6 min-h-full flex flex-col">
            {!hasMessages && !isLoading && (
              <div className="flex flex-col items-center justify-center flex-1 py-8 pb-32">
                <div className="space-y-6 text-center max-w-2xl mx-auto w-full">
                  <Sparkles className="mx-auto h-16 w-16 text-primary/40" />
                  <div className="space-y-3">
                    <h2 className="text-2xl font-semibold text-foreground">
                      How can I help you today?
                    </h2>
                    <p className="mx-auto max-w-md text-sm text-muted-foreground">
                      Ask any question about PUDA policies, allotment workflows, dues, payments, and certificates.
                    </p>
                  </div>
                  
                  {/* Suggested Questions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-8 px-4">
                    {landingPagePromptSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setQuestion(suggestion);
                          handleSubmit(suggestion);
                        }}
                        className="text-left p-4 rounded-lg border border-border/60 bg-card/50 hover:bg-card hover:border-primary/50 transition-all duration-200 group"
                      >
                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                          {suggestion}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.length > 0 && (
              <div className="py-8">
            {messages.map((message, index) => {
              // Find the corresponding user message for this assistant message
              const userMessage = message.role === "assistant" && index > 0 ? messages[index - 1] : null;
              
              // Check if this is the last assistant message
              const isLastAssistantMessage = message.role === "assistant" && index === messages.length - 1;
              
              return (
                <div
                  key={message.id}
                  ref={isLastAssistantMessage ? lastAssistantMessageRef : null}
                  className={`mb-6 flex gap-4 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                  data-testid={`message-${message.role}-${message.id}`}
                >
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  
                  <div className="flex-1 max-w-[80%]">
                    <div
                      className={`rounded-lg px-4 py-3 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {message.role === "user" ? (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      ) : (
                        <>
                          {/* Status message (shown while waiting for response) */}
                          {(message as any).statusMessage && !message.content && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>{(message as any).statusMessage}</span>
                            </div>
                          )}
                          {/* Actual content */}
                          {message.content ? (
                            <div
                              className="prose prose-sm max-w-none dark:prose-invert prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
                              data-testid={`assistant-content-${message.id}`}
                            >
                              <ReactMarkdown 
                                rehypePlugins={[rehypeRaw]}
                                remarkPlugins={[remarkGfm]}
                              >
                                {normalizeAssistantContent(message.content, referenceDisplayMode)}
                              </ReactMarkdown>
                            </div>
                          ) : (message as any).isStreaming && !(message as any).statusMessage ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Thinking...</span>
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                    
                    {/* Action buttons for assistant messages */}
                    {message.role === "assistant" && userMessage && (
                      <div className="mt-2 flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          data-testid={`button-feedback-positive-${message.id}`}
                          onClick={() => handleReaction("positive")}
                        >
                          <ThumbsUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          data-testid={`button-feedback-negative-${message.id}`}
                          onClick={() => handleReaction("negative")}
                        >
                          <ThumbsDown className="h-4 w-4" />
                        </Button>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              data-testid={`button-download-md-${message.id}`}
                              onClick={() =>
                                downloadMessageMarkdown(
                                  userMessage.content,
                                  message.content,
                                  typeof message.createdAt === "string"
                                    ? message.createdAt
                                    : message.createdAt.toISOString(),
                                  referenceDisplayMode,
                                )
                              }
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Download .md</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              data-testid={`button-download-pdf-${message.id}`}
                              onClick={() =>
                                downloadMessagePDF(
                                  userMessage.content,
                                  message.content,
                                  typeof message.createdAt === "string"
                                    ? message.createdAt
                                    : message.createdAt.toISOString(),
                                  referenceDisplayMode,
                                )
                              }
                            >
                              <FileType className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Download .pdf</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              data-testid={`button-copy-response-${message.id}`}
                              onClick={() => handleCopyMessage(message.id, message.content)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Copy response</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              data-testid={`button-regenerate-${message.id}`}
                              onClick={() => handleRegenerate(userMessage.content)}
                              disabled={isLoading}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Regenerate</TooltipContent>
                        </Tooltip>
                      </div>
                    )}
                  </div>

                  {message.role === "user" && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="w-4 h-4 text-foreground" />
                    </div>
                  )}
                </div>
              );
            })}
              </div>
            )}

            {isLoading && (
              <div className="mb-6" data-testid="loading-indicator">
                <div className="flex gap-4">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 rounded-lg bg-muted px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">
                          {mode === "deep" ? "Deep analysis in progress…" : "Thinking…"}
                        </span>
                      </div>
                      {mode === "deep" && (
                        <span className="text-xs text-muted-foreground/70">
                          Deep mode provides comprehensive analysis and may take a few minutes.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area - Fixed at bottom */}
        <div className="border-t border-border bg-card/30 backdrop-blur-sm p-4 flex-shrink-0">
          <div className="mx-auto flex max-w-4xl flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Response style
                </Label>
                <ToggleGroup
                  type="single"
                  value={mode}
                  onValueChange={(value) => value && setMode(value as "concise" | "balanced" | "deep")}
                  className="flex gap-1"
                >
                  {responseModeOptions.map((option) => (
                    <Tooltip key={option.value}>
                      <TooltipTrigger asChild>
                        <span>
                          <ToggleGroupItem
                            value={option.value}
                            className="rounded-full px-3 py-1.5 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                          >
                            {option.label}
                          </ToggleGroupItem>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top">{option.description}</TooltipContent>
                    </Tooltip>
                  ))}
                </ToggleGroup>
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Cache
                </Label>
                <ToggleGroup
                  type="single"
                  value={cacheMode}
                  onValueChange={(value) => value && setCacheMode(value as "on" | "off")}
                  className="flex gap-1"
                  data-testid="toggle-cache-mode"
                >
                  {cacheModeOptions.map((option) => (
                    <Tooltip key={option.value}>
                      <TooltipTrigger asChild>
                        <span>
                          <ToggleGroupItem
                            value={option.value}
                            className="rounded-full px-3 py-1.5 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                          >
                            {option.label}
                          </ToggleGroupItem>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top">{option.description}</TooltipContent>
                    </Tooltip>
                  ))}
                </ToggleGroup>
              </div>

              <div className="flex items-center gap-3">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  References
                </Label>
                <ToggleGroup
                  type="single"
                  value={referenceDisplayMode}
                  onValueChange={(value) => value && setReferenceDisplayMode(value as ReferenceDisplayMode)}
                  className="flex gap-1"
                  data-testid="toggle-reference-display"
                >
                  {referenceDisplayOptions.map((option) => (
                    <Tooltip key={option.value}>
                      <TooltipTrigger asChild>
                        <span>
                          <ToggleGroupItem
                            value={option.value}
                            className="rounded-full px-3 py-1.5 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                          >
                            {option.label}
                          </ToggleGroupItem>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top">{option.description}</TooltipContent>
                    </Tooltip>
                  ))}
                </ToggleGroup>
              </div>
            </div>

            <div className="flex gap-3">
              <Textarea
                ref={questionInputRef}
                data-testid="input-question"
                placeholder="Ask a question..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-[60px] flex-1 resize-none rounded-xl border border-border/60 bg-background/90"
                disabled={isLoading}
              />
              <Button
                data-testid="button-submit"
                onClick={() => handleSubmit()}
                disabled={!question.trim() || isLoading}
                size="lg"
                className="h-[60px] w-[60px] rounded-xl p-0 self-end"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
