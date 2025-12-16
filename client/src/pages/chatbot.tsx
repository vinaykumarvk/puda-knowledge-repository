import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { apiRequest, queryClient } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Loader2,
  Send,
  User,
  Download,
  RefreshCw,
  FileText,
  FileType,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
  AlertTriangle,
  Sparkles,
  BookOpen,
  Zap,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import jsPDF from "jspdf";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { WorkspacePanel } from "@/components/workspace-panel";
import type { Thread, Message } from "@shared/schema";


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
  // Remove the entire "Sources by File" section
  let cleaned = text.replace(/---\s*##\s*\*\*Sources by File\*\*[\s\S]*$/i, '');

  // Remove bold formatting from citation filenames (e.g., **[1]** → [1])
  cleaned = cleaned.replace(/\*\*\[(\d+)\]\*\*/g, '[$1]');

  // Remove bold from citation filenames (e.g., **filename.pdf** → filename.pdf)
  cleaned = cleaned.replace(/\*\*([^*]+\.(pdf|docx|doc|xlsx)[^*]*)\*\*/gi, '$1');

  return cleaned;
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

const processingStages = [
  "Understanding the question...",
  "Performing step-back thinking...",
  "Extracting key entities...",
  "Finding related entities from knowledge graph...",
  "Breaking down the query into sub-queries...",
  "Answering sub-queries...",
  "Synthesizing subquery responses...",
  "Finalizing the response...",
];

const generalStatusMessages = [
  "Still working on it...",
  "Getting there soon...",
  "Processing query...",
  "Nearly done...",
  "Just a moment longer...",
  "Query in progress...",
];

const GENERAL_STATUS_DURATION = 10000;

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
function downloadMessageMarkdown(userMessage: string, assistantMessage: string, timestamp: string) {
  const content = `# WealthForce Knowledge Agent - Conversation Export

**Generated:** ${new Date(timestamp).toLocaleString()}

---

## Question

${userMessage}

---

## Answer

${assistantMessage}

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
function downloadMessagePDF(userMessage: string, assistantMessage: string, timestamp: string) {
  const pdf = new jsPDF();
  const margin = 20;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const maxWidth = pageWidth - (margin * 2);
  let yPosition = margin;

  // Title
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('WealthForce Knowledge Agent', margin, yPosition);
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
  const cleanAnswer = assistantMessage
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

// Helper function to download entire thread conversation as text
function downloadThreadAsText(messages: Message[], threadTitle: string) {
  let content = `WealthForce Knowledge Agent - Full Conversation Export
Thread: ${threadTitle}
Generated: ${new Date().toLocaleString()}

========================================\n\n`;

  for (let i = 0; i < messages.length; i += 2) {
    const userMsg = messages[i];
    const assistantMsg = messages[i + 1];
    
    if (userMsg && assistantMsg) {
      content += `[${new Date(userMsg.createdAt).toLocaleString()}]\n`;
      content += `Question:\n${userMsg.content}\n\n`;
      content += `Answer:\n${assistantMsg.content}\n\n`;
      content += `========================================\n\n`;
    }
  }

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `conversation-${threadTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Helper function to download entire thread conversation as PDF
function downloadThreadAsPDF(messages: Message[], threadTitle: string) {
  const pdf = new jsPDF();
  const margin = 15;
  const maxWidth = pdf.internal.pageSize.getWidth() - 2 * margin;
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = margin;

  // Title
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('WealthForce Knowledge Agent', margin, yPosition);
  yPosition += 10;

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Thread: ${threadTitle}`, margin, yPosition);
  yPosition += 6;
  pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
  yPosition += 12;

  // Process each Q&A pair
  for (let i = 0; i < messages.length; i += 2) {
    const userMsg = messages[i];
    const assistantMsg = messages[i + 1];
    
    if (userMsg && assistantMsg) {
      // Check if we need a new page for this Q&A
      if (yPosition + 40 > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }

      // Timestamp
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'italic');
      pdf.text(`[${new Date(userMsg.createdAt).toLocaleString()}]`, margin, yPosition);
      yPosition += 8;

      // Question
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Question:', margin, yPosition);
      yPosition += 7;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const questionLines = pdf.splitTextToSize(userMsg.content, maxWidth);
      for (let j = 0; j < questionLines.length; j++) {
        if (yPosition + 5 > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
        pdf.text(questionLines[j], margin, yPosition);
        yPosition += 5;
      }
      yPosition += 5;

      // Answer
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Answer:', margin, yPosition);
      yPosition += 7;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      // Clean the assistant message for PDF
      const cleanAnswer = assistantMsg.content
        .replace(/[#*_`]/g, '')
        .replace(/\[(\d+)\]/g, '[$1]')
        .replace(/<[^>]*>/g, '');
      
      const answerLines = pdf.splitTextToSize(cleanAnswer, maxWidth);
      for (let j = 0; j < answerLines.length; j++) {
        if (yPosition + 5 > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
        pdf.text(answerLines[j], margin, yPosition);
        yPosition += 5;
      }
      
      // Separator
      yPosition += 8;
      if (yPosition + 5 > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPosition, pdf.internal.pageSize.getWidth() - margin, yPosition);
      yPosition += 10;
    }
  }

  pdf.save(`conversation-${threadTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export default function ChatbotPage() {
  const [question, setQuestion] = useState("");
  const [currentThreadId, setCurrentThreadId] = useState<number | undefined>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [mode, setMode] = useState<"concise" | "balanced" | "deep">("balanced");
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [isWorkspaceSheetOpen, setWorkspaceSheetOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"progress" | "error" | null>(null);
  const [statusHistory, setStatusHistory] = useState<
    { id: number; text: string; color: string; isGeneral?: boolean }[]
  >([]);
  const [checkingJobId, setCheckingJobId] = useState<string | null>(null);
  const [expandedPairs, setExpandedPairs] = useState<Set<number>>(new Set());
  const [inputHeight, setInputHeight] = useState<number>(40);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const lastAssistantMessageRef = useRef<HTMLDivElement>(null);
  const statusRunIdRef = useRef<number>(0);
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();

  // Store active polling intervals to allow cleanup
  const pollingIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const clearStatusTimer = useCallback(() => {
    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current);
      statusTimeoutRef.current = null;
    }
  }, []);

  const stopStatusSequence = useCallback(() => {
    statusRunIdRef.current += 1;
    clearStatusTimer();
    setStatusMessage(null);
    setStatusType(null);
    setStatusHistory([]);
  }, [clearStatusTimer]);

  const showStatusError = useCallback((message: string) => {
    statusRunIdRef.current += 1;
    clearStatusTimer();
    setStatusMessage(message);
    setStatusType("error");
  }, [clearStatusTimer]);

  const startStatusSequence = useCallback((selectedMode: "concise" | "balanced" | "deep") => {
    stopStatusSequence();
    const runId = Date.now();
    statusRunIdRef.current = runId;
    setStatusType("progress");
    const palette = [
      "bg-primary/10 text-primary",
      "bg-blue-500/10 text-blue-400",
      "bg-amber-500/10 text-amber-500",
      "bg-emerald-500/10 text-emerald-500",
      "bg-purple-500/10 text-purple-400",
      "bg-rose-500/10 text-rose-400",
      "bg-cyan-500/10 text-cyan-400",
      "bg-lime-500/10 text-lime-500",
    ];
    const appendStage = (text: string, stageIndex: number) => {
      setStatusHistory((prev) => [
        ...prev,
        { id: Date.now(), text, color: palette[stageIndex % palette.length] },
      ]);
    };
    const setGeneral = (text: string) => {
      setStatusHistory([{ id: Date.now(), text, color: "bg-card/70 text-muted-foreground", isGeneral: true }]);
    };

    const stageDuration = selectedMode === "concise" ? 8000 : 12000;
    const generalDuration = GENERAL_STATUS_DURATION;
    let previousGeneral: string | null = null;

    const runGeneralStatuses = () => {
      if (statusRunIdRef.current !== runId) return;
      const available = generalStatusMessages.filter((msg) => msg !== previousGeneral);
      const nextMessage = available[Math.floor(Math.random() * available.length)];
      previousGeneral = nextMessage;
      setStatusMessage(nextMessage);
      setGeneral(nextMessage);
      clearStatusTimer();
      statusTimeoutRef.current = setTimeout(runGeneralStatuses, generalDuration);
    };

    const runStages = (index: number) => {
      if (statusRunIdRef.current !== runId) return;
      if (index < processingStages.length) {
        setStatusMessage(processingStages[index]);
        appendStage(processingStages[index], index);
        clearStatusTimer();
        statusTimeoutRef.current = setTimeout(() => runStages(index + 1), stageDuration);
      } else {
        runGeneralStatuses();
      }
    };

    runStages(0);
  }, [clearStatusTimer, stopStatusSequence]);

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
                sources: result.sources || null,
                metadata: JSON.stringify({
                  ...(result.metadata ? JSON.parse(result.metadata) : {}),
                  status: "completed",
                }),
                isPolling: false,
              };
            }
            return msg;
          }));
          stopStatusSequence();
          
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
          setMessages((prev) => prev.map((msg) => {
            if (msg.id === messageId && msg.role === "assistant") {
              return {
                ...msg,
                metadata: JSON.stringify({
                  ...(msg.metadata ? JSON.parse(msg.metadata) : {}),
                  status: "failed",
                  error: status.error,
                }),
                isPolling: false,
              };
            }
            return msg;
          }));
          showStatusError(status.error || "An error occurred. Please try again.");
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
          showStatusError("Processing timed out. Please try again.");
          
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
          showStatusError("An error occurred. Please try again.");
          
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

    // Run a single poll (manual / on-demand)
    poll();
  }, [mode, showStatusError, stopStatusSequence, toast, queryClient]);

  // Fetch current thread details
  const { data: currentThread } = useQuery<Thread>({
    queryKey: [`/api/threads/${currentThreadId}`],
    enabled: !!currentThreadId,
  });

  // Fetch messages when thread is selected
  const { data: fetchedMessages } = useQuery<Message[]>({
    queryKey: [`/api/threads/${currentThreadId}/messages`],
    enabled: !!currentThreadId,
  });

  // Fetch thread statuses to allow resuming polling after reload
  const { data: threadStatuses } = useQuery<Record<string, { status: string; jobId?: string; messageId?: number }>>({
    queryKey: ["/api/threads/statuses"],
  });

  // Update messages when thread changes
  useEffect(() => {
    if (fetchedMessages) {
      setMessages(fetchedMessages);
      // Expand the last pair by default
      const pairIds = fetchedMessages
        .map((m, idx) => ({ m, idx }))
        .filter(({ m }) => m.role === "assistant")
        .map(({ m }) => m.id);
      if (pairIds.length > 0) {
        setExpandedPairs(new Set([pairIds[pairIds.length - 1]]));
      }
      
    // Check for any messages that are still polling and attach manual check
    // (no continuous timers)
    fetchedMessages.forEach((msg) => {
      if (msg.role === "assistant" && msg.metadata) {
        try {
          const metadata = JSON.parse(msg.metadata);
          if (metadata.jobId && metadata.status && metadata.status !== 'completed' && metadata.status !== 'failed') {
            // Single poll to refresh status
            pollJobStatus(metadata.jobId, msg.id, msg.threadId);
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    });
    } else {
      setMessages([]);
    }
  }, [fetchedMessages, pollJobStatus]);

  // Resume polling based on thread status snapshot (helps after reloads)
  useEffect(() => {
    if (!currentThreadId || !threadStatuses) return;
    const statusEntry = threadStatuses[String(currentThreadId)];
    if (!statusEntry || !statusEntry.jobId || !statusEntry.messageId) return;
    if (statusEntry.status === "completed" || statusEntry.status === "failed") return;

    // If we already have a message with terminal status, skip
    const existing = messages.find((m) => m.id === statusEntry.messageId);
    if (existing && existing.metadata) {
      try {
        const meta = JSON.parse(existing.metadata);
        if (meta.status === "completed" || meta.status === "failed") {
          return;
        }
      } catch {
        // continue to resume polling
      }
    }
    pollJobStatus(statusEntry.jobId, statusEntry.messageId, currentThreadId);
  }, [currentThreadId, messages, pollJobStatus, threadStatuses]);

  // Cleanup polling intervals on unmount to prevent orphaned timers
  useEffect(() => {
    return () => {
      pollingIntervalsRef.current.forEach(clearInterval);
      pollingIntervalsRef.current.clear();
      clearStatusTimer();
    };
  }, [clearStatusTimer]);

  // Auto-scroll to show top of new assistant messages
  useEffect(() => {
    if (lastAssistantMessageRef.current && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      // Only scroll if the last message is an assistant message (new answer)
      if (lastMessage.role === "assistant") {
        lastAssistantMessageRef.current.scrollIntoView({ 
          behavior: "smooth", 
          block: "start" 
        });
      }
    }
  }, [messages]);

  useEffect(() => {
    if (statusMessage && scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]');
      const target = viewport || scrollAreaRef.current;
      target.scrollTo({
        top: target.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [statusMessage]);

  const queryMutation = useMutation({
    mutationFn: async (payload: { question: string; threadId?: number; refreshCache?: boolean }) => {
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
      showStatusError("An error occurred. Please try again.");
      toast({
        title: "Error",
        description: data.error,
        variant: "destructive",
      });
      return;
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
          content: data.data || "Working...",
          responseId: data.responseId || null,
          sources: null,
          metadata: JSON.stringify({
            status: data.status || "working",
            jobId: data.jobId,
          }),
          createdAt: new Date(),
          jobId: data.jobId,
          isPolling: true,
          };
          
          setMessages((prev) => [...prev, userMessage, assistantMessage]);
          setQuestion("");
          stopStatusSequence();
          setStatusHistory([]);
          
          // Invalidate thread statuses query to immediately show polling status in sidebar
          queryClient.invalidateQueries({ queryKey: ["/api/threads/statuses"] });
          
          // Start polling for status updates
          pollJobStatus(data.jobId, data.messageId, data.threadId);
        } else {
          // Normal synchronous response
        const assistantMessage: Message & { isCached?: boolean; cacheId?: number } = {
          id: Date.now() + 1,
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
        setQuestion("");
        stopStatusSequence();
      }
      
      // Invalidate queries to refresh thread list
      queryClient.invalidateQueries({ queryKey: ["/api/threads"] });
    }
  },
  onError: (error: Error) => {
    showStatusError("An error occurred. Please try again.");
    toast({
      title: "Error",
      description: error.message || "Failed to send message",
      variant: "destructive",
    });
  },
});

  const triggerQuery = useCallback((payload: { question: string; threadId?: number; refreshCache?: boolean }) => {
    startStatusSequence(mode);
    queryMutation.mutate(payload);
  }, [mode, queryMutation, startStatusSequence]);

  const getMessageStatus = (message: Message) => {
    if (message.metadata) {
      try {
        const meta = JSON.parse(message.metadata);
        return meta.status as string | undefined;
      } catch {
        return undefined;
      }
    }
    return undefined;
  };

  const getMessageJobInfo = (message: Message) => {
    if (!message.metadata) return { jobId: undefined, status: undefined };
    try {
      const meta = JSON.parse(message.metadata);
      return { jobId: meta.jobId as string | undefined, status: meta.status as string | undefined };
    } catch {
      return { jobId: undefined, status: undefined };
    }
  };

  const handleCheckStatus = async (jobId: string, messageId: number, threadId: number) => {
    setCheckingJobId(jobId);
    try {
      toast({ title: "Checking status…", description: "Fetching latest progress from server." });
      const res = await apiRequest("GET", `/api/jobs/${jobId}/check?messageId=${messageId}&threadId=${threadId}`);
      const data = await res.json();

      // If server returned updated message content/metadata, sync immediately
      if (data.messageId) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === data.messageId) {
              return {
                ...m,
                content: data.messageContent ?? m.content,
                metadata: data.metadata ?? m.metadata,
                sources: data.sources ?? m.sources,
              };
            }
            return m;
          }),
        );
      }

      // Refresh messages and statuses
      queryClient.invalidateQueries({ queryKey: [`/api/threads/${threadId}/messages`] });
      queryClient.invalidateQueries({ queryKey: ["/api/threads/statuses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/threads"] });
    } catch (error: any) {
      toast({
        title: "Status check failed",
        description: error?.message || "Unable to fetch status",
        variant: "destructive",
      });
    } finally {
      setCheckingJobId(null);
    }
  };

  const messagePairs = useMemo(() => {
    const pairs: { question: Message | null; answer: Message | null }[] = [];
    let i = 0;
    while (i < messages.length) {
      const current = messages[i];
      const next = messages[i + 1];
      if (current.role === "user" && next && next.role === "assistant") {
        pairs.push({ question: current, answer: next });
        i += 2;
      } else if (current.role === "user") {
        pairs.push({ question: current, answer: null });
        i += 1;
      } else {
        pairs.push({ question: null, answer: current });
        i += 1;
      }
    }
    return pairs;
  }, [messages]);

  const togglePair = (answerId?: number) => {
    if (!answerId) return;
    setExpandedPairs((prev) => {
      const next = new Set(prev);
      if (next.has(answerId)) {
        next.delete(answerId);
      } else {
        next.add(answerId);
      }
      return next;
    });
  };

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

    triggerQuery({
      question: questionToSubmit,
      threadId: currentThreadId,
    });
    
    // Clear the input if submitting from the textarea
    if (!promptText) {
      setQuestion("");
    }
    setInputHeight(40);
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
    stopStatusSequence();
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

  const isLoading = queryMutation.isPending;
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

  return (
    <div className="flex flex-1 bg-background">
      <WorkspacePanel
        layout="desktop"
        onSelectThread={handleSelectThread}
        onNewChat={handleNewChat}
        onDeleteThread={handleDeleteThread}
        selectedThreadId={currentThreadId}
      />

      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="border-b border-border bg-card/30 backdrop-blur-sm px-3 py-3 sm:px-6 sm:py-4">
            <div className="flex flex-col gap-2 sm:gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-2 sm:gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground" data-testid="text-title">
                  WealthForce Knowledge Agent
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Conversational Wealth Management Knowledge
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

              {currentThreadId && hasMessages && (
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="button-download-thread"
                  onClick={() => setShowDownloadDialog(true)}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <ScrollArea ref={scrollAreaRef} className="flex-1">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            {!hasMessages && !isLoading && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="space-y-3 text-center">
                  <h2 className="text-2xl font-semibold text-foreground">
                    How can I help you today?
                  </h2>
                  <p className="mx-auto max-w-md text-sm text-muted-foreground">
                    Ask any question about wealth management, customer processes, or system workflows.
                  </p>
                </div>
              </div>
            )}

            {messagePairs.map((pair, idx) => {
              const answer = pair.answer;
              const questionMsg = pair.question;
              const answerId = answer?.id;
              const isExpanded = answerId ? expandedPairs.has(answerId) : true;
              const isLastAssistantMessage = answer && idx === messagePairs.length - 1;
              const meta = (() => {
                if (!answer?.metadata) return {};
                try {
                  return JSON.parse(answer.metadata);
                } catch {
                  return {};
                }
              })();
              const modeLabel = `Mode: ${meta.mode || "Unknown"}`;
              const answeredAt = meta.answeredAt
                ? new Date(meta.answeredAt)
                : answer?.createdAt
                  ? typeof answer.createdAt === "string"
                    ? new Date(answer.createdAt)
                    : answer.createdAt
                  : null;

              return (
                <div key={answerId || questionMsg?.id || idx} className="mb-4">
                  <div
                    className="flex items-start gap-2 sm:gap-3 cursor-pointer select-none"
                    onClick={() => togglePair(answerId || questionMsg?.id)}
                  >
                    <div className="flex-1">
                      <div className="rounded-lg bg-primary text-primary-foreground px-3 sm:px-4 py-3 shadow-sm border border-border/20">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold">
                            {questionMsg?.content || "Question"}
                          </p>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                            {isExpanded ? "Collapse" : "Expand"}
                          </Button>
                        </div>
                        <div className="mt-1 text-xs text-primary-foreground/80 flex items-center gap-2 flex-wrap">
                          <span>{modeLabel}</span>
                          {answeredAt && <span>• {answeredAt.toLocaleString()}</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {isExpanded && answer && (
                    <div
                      ref={isLastAssistantMessage ? lastAssistantMessageRef : null}
                      className="mt-2"
                      data-testid={`message-assistant-${answer.id}`}
                    >
                      <div className="rounded-lg bg-muted px-3 sm:px-4 py-3">
                        <div className="prose prose-sm max-w-none dark:prose-invert prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
                          <ReactMarkdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]}>
                            {formatProfessionally(cleanupCitations(removeKGTags(decodeHTMLEntities(answer.content))))}
                          </ReactMarkdown>
                        </div>
                        {(() => {
                          const { jobId, status } = getMessageJobInfo(answer);
                          if (jobId && status && status !== "completed" && status !== "failed") {
                            return (
                              <div className="mt-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-xs"
                                  onClick={() => handleCheckStatus(jobId, answer.id, answer.threadId)}
                                  disabled={checkingJobId === jobId}
                                >
                                  {checkingJobId === jobId ? (
                                    <span className="inline-flex items-center gap-2">
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                      Checking…
                                    </span>
                                  ) : (
                                    "Check status"
                                  )}
                                </Button>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>

                      {/* Action buttons for assistant messages */}
                      {questionMsg && (
                        <div className="mt-2 flex items-center gap-2">
                          {(answer as any).isCached && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-2 text-xs"
                              onClick={() => {
                                triggerQuery({
                                  question: questionMsg.content,
                                  threadId: currentThreadId,
                                  refreshCache: true,
                                });
                              }}
                              disabled={isLoading}
                            >
                              <RefreshCw className="h-3 w-3" />
                              Refresh Answer
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            data-testid={`button-feedback-positive-${answer.id}`}
                            onClick={() => handleReaction("positive")}
                          >
                            <ThumbsUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            data-testid={`button-feedback-negative-${answer.id}`}
                            onClick={() => handleReaction("negative")}
                          >
                            <ThumbsDown className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                data-testid={`button-message-actions-${answer.id}`}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-56">
                              <DropdownMenuLabel>Response actions</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() =>
                                  downloadMessageMarkdown(
                                    questionMsg.content,
                                    answer.content,
                                    typeof answer.createdAt === "string"
                                      ? answer.createdAt
                                      : answer.createdAt.toISOString(),
                                  )
                                }
                              >
                                <FileText className="mr-2 h-4 w-4" />
                                Download as Markdown (.md)
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  downloadMessagePDF(
                                    questionMsg.content,
                                    answer.content,
                                    typeof answer.createdAt === "string"
                                      ? answer.createdAt
                                      : answer.createdAt.toISOString(),
                                  )
                                }
                              >
                                <FileType className="mr-2 h-4 w-4" />
                                Download as PDF (.pdf)
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  triggerQuery({
                                    question: questionMsg.content,
                                    threadId: currentThreadId,
                                    refreshCache: true,
                                  })
                                }
                              >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Regenerate response
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {statusHistory.length > 0 && (
              <div className="mb-6" data-testid="status-indicator">
                <div className="rounded-xl border border-border/60 bg-card/60 p-3 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    {statusType === "error" ? (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    )}
                    <span className="text-sm font-medium text-foreground">Status updates</span>
                  </div>
                    <div className="flex flex-col gap-2">
                    {statusHistory.map((item, idx) => (
                      <div
                        key={item.id}
                        className={`rounded-lg px-3 py-2 text-sm transition-all ${item.color} ${idx === statusHistory.length - 1 ? "shadow-md ring-1 ring-border/60" : "opacity-90"}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-2 w-2 rounded-full bg-current" />
                          <span className="text-foreground/90">{item.text}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        </ScrollArea>

        {/* Input Area - Fixed at bottom */}
        <div className="border-t border-border bg-card/30 backdrop-blur-sm p-3 sm:p-4">
          <div className="mx-auto flex max-w-4xl flex-col gap-1 sm:gap-2">
            <Textarea
              data-testid="input-question"
              placeholder="Ask a question..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              style={{ height: `${inputHeight}px` }}
              className="min-h-[40px] max-h-[240px] flex-1 resize-none rounded-xl border border-border/60 bg-background/90"
              disabled={isLoading}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                const nextHeight = Math.min(target.scrollHeight, 240);
                target.style.height = `${nextHeight}px`;
                setInputHeight(nextHeight);
              }}
            />
            <div className="flex items-center gap-2 justify-between">
              <Select
                value={mode}
                onValueChange={(value) => value && setMode(value as "concise" | "balanced" | "deep")}
              >
                <SelectTrigger className="w-[130px] h-[36px] text-xs">
                  <SelectValue placeholder="Mode" />
                </SelectTrigger>
                <SelectContent align="start" className="text-xs">
                  {responseModeOptions.map((option) => {
                    const Icon = option.value === "concise" ? Sparkles : option.value === "balanced" ? Zap : BookOpen;
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <span className="inline-flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {option.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Button
                data-testid="button-submit"
                onClick={() => handleSubmit()}
                disabled={!question.trim() || isLoading}
                size="sm"
                className="h-[36px] w-[40px] rounded-lg p-0"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Download Format Selection Dialog */}
      <Dialog open={showDownloadDialog} onOpenChange={setShowDownloadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Download Conversation</DialogTitle>
            <DialogDescription>
              Choose your preferred format to download this conversation thread.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Button
              variant="outline"
              size="lg"
              className="w-full justify-start gap-3"
              data-testid="button-download-text"
              onClick={() => {
                downloadThreadAsText(messages, currentThread?.title || "Conversation");
                setShowDownloadDialog(false);
                toast({
                  title: "Download Started",
                  description: "Your conversation is being downloaded as a text file.",
                });
              }}
            >
              <FileText className="w-5 h-5" />
              <div className="text-left">
                <div className="font-semibold">Text File (.txt)</div>
                <div className="text-xs text-muted-foreground">Plain text format, easy to edit</div>
              </div>
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              className="w-full justify-start gap-3"
              data-testid="button-download-pdf"
              onClick={() => {
                downloadThreadAsPDF(messages, currentThread?.title || "Conversation");
                setShowDownloadDialog(false);
                toast({
                  title: "Download Started",
                  description: "Your conversation is being downloaded as a PDF file.",
                });
              }}
            >
              <FileType className="w-5 h-5" />
              <div className="text-left">
                <div className="font-semibold">PDF Document (.pdf)</div>
                <div className="text-xs text-muted-foreground">Professional format, ready to share</div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
