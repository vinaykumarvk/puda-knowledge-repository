import { useEffect, useRef, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Loader2,
  Send,
  Sparkles,
  User,
  Download,
  RefreshCw,
  FileText,
  FileType,
  Zap,
  Star,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
} from "lucide-react";
import jsPDF from "jspdf";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { WorkspacePanel } from "@/components/workspace-panel";
import { type AIConfig } from "@/components/ai-config-sidebar";
import { QuizMessage } from "@/components/quiz-message";
import { VoiceInputButton } from "@/components/voice-input-button";
import { conversationStarterCategories } from "@/constants/conversation-starters";
import type { Thread, Message } from "@shared/schema";
import type { QuizData } from "@/types/quiz";

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

const responseProgressSteps = [
  { id: "retrieving", label: "Retrieving context" },
  { id: "reasoning", label: "Synthesizing answer" },
  { id: "drafting", label: "Polishing response" },
] as const;

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

const quickPromptTemplates = [
  "Summarize this conversation",
  "Compare the last two responses",
  "Explain this for a first-time investor",
] as const;

// Helper function to format API responses professionally
function formatProfessionally(text: string): string {
  let formatted = text;
  
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
  const [quizzes, setQuizzes] = useState<QuizData[]>([]);
  const [mode, setMode] = useState<"concise" | "balanced" | "deep">("concise"); // Short is default
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [aiConfig, setAIConfig] = useState<AIConfig>({
    model: "GPT-4o",
    temperature: 0.7,
    hops: 3,
    tokenLimit: 2048,
    systemPrompt: "You are a helpful wealth management AI assistant.",
  });
  const [pinnedPrompts, setPinnedPrompts] = useState<string[]>([]);
  const [activeStarterCategory, setActiveStarterCategory] = useState(
    conversationStarterCategories[0]?.category ?? "",
  );
  const [isWorkspaceSheetOpen, setWorkspaceSheetOpen] = useState(false);
  const [activeProgressStep, setActiveProgressStep] = useState(responseProgressSteps.length - 1);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const lastAssistantMessageRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fetch current thread details
  const { data: currentThread } = useQuery<Thread>({
    queryKey: [`/api/threads/${currentThreadId}`],
    enabled: !!currentThreadId,
  });

  // Fetch messages when thread is selected
  const { data: fetchedMessages, refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: [`/api/threads/${currentThreadId}/messages`],
    enabled: !!currentThreadId,
  });

  // Update messages when thread changes
  useEffect(() => {
    if (fetchedMessages) {
      setMessages(fetchedMessages);
    } else {
      setMessages([]);
    }
    // Clear quizzes when thread changes
    setQuizzes([]);
  }, [fetchedMessages]);

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

  const queryMutation = useMutation({
    mutationFn: async (payload: { question: string; threadId?: number }) => {
      const response = await apiRequest("POST", "/api/query", {
        question: payload.question,
        mode: mode,
        refresh: false,
        threadId: payload.threadId,
      });
      const result = await response.json();
      return result;
    },
    onSuccess: (data, variables) => {
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
        
        // Add assistant message
        const assistantMessage: Message = {
          id: Date.now() + 1,
          threadId: data.threadId,
          role: "assistant",
          content: data.data,
          responseId: data.responseId || null,
          sources: data.citations || null,
          metadata: data.metadata || null,
          createdAt: new Date(),
        };
        
        setMessages((prev) => [...prev, userMessage, assistantMessage]);
        setQuestion("");
        
        // Invalidate queries to refresh thread list
        queryClient.invalidateQueries({ queryKey: ["/api/threads"] });
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

    queryMutation.mutate({
      question: questionToSubmit,
      threadId: currentThreadId,
    });
    
    // Clear the input if submitting from the textarea
    if (!promptText) {
      setQuestion("");
    }
  };

  const quizMutation = useMutation({
    mutationFn: async (threadId: number) => {
      const response = await apiRequest("POST", "/api/generate-quiz", {
        threadId,
      });
      const result = await response.json();
      return result;
    },
    onSuccess: (data) => {
      if (data.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
      } else if (data.questions && data.questions.length > 0) {
        // Add quiz to the list
        const newQuiz: QuizData = {
          id: Date.now(),
          questions: data.questions,
        };
        setQuizzes(prev => [...prev, newQuiz]);
        
        toast({
          title: "Quiz Generated!",
          description: `${data.questions.length} questions ready to test your knowledge.`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate quiz",
        variant: "destructive",
      });
    },
  });

  const handleGenerateQuiz = () => {
    if (!currentThreadId) {
      toast({
        title: "No Conversation",
        description: "Start a conversation before generating a quiz",
        variant: "destructive",
      });
      return;
    }

    if (messages.length < 4) {
      toast({
        title: "Not Enough Content",
        description: "Have at least 2 Q&A exchanges before generating a quiz",
        variant: "destructive",
      });
      return;
    }

    quizMutation.mutate(currentThreadId);
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

  const isLoading = queryMutation.isPending;
  const hasMessages = messages.length > 0;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const timers: number[] = [];

    if (isLoading) {
      setActiveProgressStep(0);
      responseProgressSteps.slice(1).forEach((_, index) => {
        const timer = window.setTimeout(() => setActiveProgressStep(index + 1), (index + 1) * 1100);
        timers.push(timer);
      });
    } else {
      setActiveProgressStep(responseProgressSteps.length - 1);
    }

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [isLoading]);

  const handleConfigChange = (config: AIConfig) => {
    setAIConfig(config);
    // Future: Send config to backend or use in API calls
  };

  const handlePromptSelection = (prompt: string) => {
    setQuestion(prompt);
    handleSubmit(prompt);
  };

  const togglePinnedPrompt = (prompt: string) => {
    setPinnedPrompts((prev) =>
      prev.includes(prompt) ? prev.filter((item) => item !== prompt) : [...prev, prompt],
    );
  };

  const handleReaction = (type: "positive" | "negative") => {
    toast({
      title: type === "positive" ? "Glad that helped!" : "Thanks for the feedback",
      description:
        type === "positive"
          ? "We'll keep responses focused on what resonated."
          : "We're refining future answers based on your signal.",
    });
  };

  const selectedStarterCategory =
    conversationStarterCategories.find((category) => category.category === activeStarterCategory) ??
    conversationStarterCategories[0];

  return (
    <div className="flex flex-1 bg-background">
      <WorkspacePanel
        layout="desktop"
        onSelectThread={handleSelectThread}
        onNewChat={handleNewChat}
        onDeleteThread={handleDeleteThread}
        selectedThreadId={currentThreadId}
        onConfigChange={handleConfigChange}
      />

      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="border-b border-border bg-card/30 backdrop-blur-sm px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-1 h-6 w-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground" data-testid="text-title">
                  WealthForce Knowledge Agent
                </h1>
                <p className="text-sm text-muted-foreground">
                  Conversational Wealth Management Knowledge
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <Sheet open={isWorkspaceSheetOpen} onOpenChange={setWorkspaceSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="md:hidden">
                    Workspace
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-full sm:max-w-sm p-0">
                  <WorkspacePanel
                    layout="mobile"
                    onSelectThread={handleSelectThread}
                    onNewChat={handleNewChat}
                    onDeleteThread={handleDeleteThread}
                    selectedThreadId={currentThreadId}
                    onConfigChange={handleConfigChange}
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
                  Download Thread
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <ScrollArea ref={scrollAreaRef} className="flex-1">
          <div className="max-w-4xl mx-auto px-6 py-8">
            {!hasMessages && !isLoading && (
              <div className="flex flex-col items-center justify-center gap-6 py-6">
                <div className="space-y-2 text-center">
                  <Sparkles className="mx-auto h-12 w-12 text-primary/50" />
                  <h2 className="text-xl font-semibold text-foreground">
                    Start a New Conversation
                  </h2>
                  <p className="mx-auto max-w-md text-sm text-muted-foreground">
                    Choose a curated prompt, pin your favorites, or ask your own question.
                  </p>
                </div>

                {pinnedPrompts.length > 0 && (
                  <div className="w-full max-w-3xl text-left">
                    <h3 className="text-sm font-semibold text-foreground">Pinned prompts</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {pinnedPrompts.map((prompt) => (
                        <Button
                          key={`pinned-${prompt}`}
                          variant="secondary"
                          size="sm"
                          className="gap-2 rounded-full"
                          onClick={() => handlePromptSelection(prompt)}
                        >
                          <Sparkles className="h-4 w-4 text-primary" />
                          {prompt}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <Tabs value={activeStarterCategory} onValueChange={setActiveStarterCategory} className="w-full">
                  <TabsList className="grid w-full grid-cols-1 gap-2 bg-transparent p-0 sm:grid-cols-2 lg:grid-cols-3">
                    {conversationStarterCategories.map((starter) => {
                      const Icon = starter.icon;
                      return (
                        <TabsTrigger
                          key={starter.category}
                          value={starter.category}
                          className="flex items-center justify-start gap-3 rounded-lg border border-border/60 bg-background/80 px-4 py-3 text-left text-sm font-medium shadow-sm transition data-[state=active]:border-primary/50 data-[state=active]:text-foreground"
                        >
                          <Icon className={`h-4 w-4 ${starter.iconColor}`} />
                          {starter.category}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>

                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    Showing curated prompts for {selectedStarterCategory?.category}.
                  </p>

                  {conversationStarterCategories.map((starter) => (
                    <TabsContent key={starter.category} value={starter.category} forceMount className="mt-4">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {starter.prompts.map((prompt) => {
                          const isPinned = pinnedPrompts.includes(prompt);
                          return (
                            <button
                              key={prompt}
                              onClick={() => handlePromptSelection(prompt)}
                              className={`group relative flex w-full items-start justify-between gap-3 rounded-xl border bg-gradient-to-br p-4 text-left transition-all hover:shadow-lg ${starter.color}`}
                              data-testid={`starter-card-${starter.category}-${prompt}`}
                            >
                              <div className="flex flex-1 flex-col gap-1.5">
                                <span className="text-sm font-semibold text-foreground">{prompt}</span>
                                <span className="text-xs text-muted-foreground">Click to ask instantly</span>
                              </div>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className={`h-8 w-8 rounded-full border border-transparent bg-background/80 transition ${
                                      isPinned
                                        ? "border-yellow-500/50 text-yellow-500"
                                        : "text-muted-foreground hover:text-foreground"
                                    }`}
                                    onClick={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      togglePinnedPrompt(prompt);
                                    }}
                                  >
                                    <Star
                                      className={`h-4 w-4 ${
                                        isPinned ? "fill-yellow-400 text-yellow-500" : ""
                                      }`}
                                    />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  {isPinned ? "Remove from favorites" : "Pin for quick access"}
                                </TooltipContent>
                              </Tooltip>
                              <div className="absolute bottom-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
                                <Send className="h-3.5 w-3.5 text-muted-foreground" />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>

                <p className="text-center text-xs text-muted-foreground/70">
                  💡 Click any prompt to jump-start the conversation or craft your own below.
                </p>
              </div>
            )}

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
                        <div className="prose prose-sm max-w-none dark:prose-invert prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
                          <ReactMarkdown 
                            rehypePlugins={[rehypeRaw]}
                            remarkPlugins={[remarkGfm]}
                          >
                            {formatProfessionally(cleanupCitations(removeKGTags(decodeHTMLEntities(message.content))))}
                          </ReactMarkdown>
                        </div>
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              data-testid={`button-message-actions-${message.id}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-56">
                            <DropdownMenuLabel>Response actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() =>
                                downloadMessageMarkdown(
                                  userMessage.content,
                                  message.content,
                                  typeof message.createdAt === "string"
                                    ? message.createdAt
                                    : message.createdAt.toISOString(),
                                )
                              }
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              Download as Markdown (.md)
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                downloadMessagePDF(
                                  userMessage.content,
                                  message.content,
                                  typeof message.createdAt === "string"
                                    ? message.createdAt
                                    : message.createdAt.toISOString(),
                                )
                              }
                            >
                              <FileType className="mr-2 h-4 w-4" />
                              Download as PDF (.pdf)
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                queryMutation.mutate({
                                  question: userMessage.content,
                                  threadId: currentThreadId,
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

                  {message.role === "user" && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="w-4 h-4 text-foreground" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Render quizzes inline */}
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="mb-6" data-testid={`quiz-${quiz.id}`}>
                <QuizMessage questions={quiz.questions} threadId={currentThreadId!} shouldSaveResults={false} />
              </div>
            ))}

            {isLoading && (
              <div className="mb-6 space-y-3" data-testid="loading-indicator">
                <div className="flex gap-4">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 rounded-lg bg-muted px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Crafting your answer…</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-dashed border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
                  <div className="flex flex-col gap-2">
                    {responseProgressSteps.map((step, index) => (
                      <div key={step.id} className="flex items-center gap-2">
                        <div
                          className={`h-2 w-2 rounded-full ${
                            index <= activeProgressStep ? "bg-primary" : "bg-muted-foreground/40"
                          }`}
                        />
                        <span
                          className={`${
                            index <= activeProgressStep ? "text-foreground font-medium" : "text-muted-foreground"
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area - Fixed at bottom */}
        <div className="border-t border-border bg-card/30 backdrop-blur-sm p-4">
          <div className="mx-auto flex max-w-4xl flex-col gap-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
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
                        <ToggleGroupItem
                          value={option.value}
                          className="rounded-full px-3 py-1.5 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                        >
                          {option.label}
                        </ToggleGroupItem>
                      </TooltipTrigger>
                      <TooltipContent side="top">{option.description}</TooltipContent>
                    </Tooltip>
                  ))}
                </ToggleGroup>
              </div>

              <Textarea
                data-testid="input-question"
                placeholder="Ask a follow-up question or use voice input..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[80px] max-h-[220px] resize-none rounded-xl border border-border/60 bg-background/90"
                disabled={isLoading}
              />

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Quick templates:</span>
                {quickPromptTemplates.map((template) => (
                  <Button
                    key={template}
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-full border border-dashed border-border/60"
                    onClick={() => handlePromptSelection(template)}
                  >
                    {template}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-center gap-3">
                <VoiceInputButton
                  onTranscriptionComplete={(text) => {
                    setQuestion(text);
                  }}
                  disabled={isLoading}
                />
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  Hold to talk or tap once for quick dictation.
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                {hasMessages && messages.length >= 2 && (
                  <Button
                    data-testid="button-quiz-me"
                    onClick={handleGenerateQuiz}
                    disabled={quizMutation.isPending}
                    size="lg"
                    variant="outline"
                    className="h-11 gap-2 sm:h-12"
                  >
                    {quizMutation.isPending ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="hidden sm:inline">Generating...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="h-5 w-5" />
                        <span className="hidden sm:inline">Quiz Me</span>
                      </>
                    )}
                  </Button>
                )}

                <Button
                  data-testid="button-submit"
                  onClick={() => handleSubmit()}
                  disabled={!question.trim() || isLoading}
                  size="lg"
                  className="h-11 w-11 rounded-full p-0 sm:h-12 sm:w-12"
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
