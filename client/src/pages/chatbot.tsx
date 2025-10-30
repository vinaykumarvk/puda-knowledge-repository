import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  ShoppingCart,
  Users,
  Package,
  ArrowRightLeft,
  Network,
  Shield,
  FileBarChart
} from "lucide-react";
import jsPDF from "jspdf";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { ThreadSidebar } from "@/components/thread-sidebar";
import { AIConfigSidebar, type AIConfig } from "@/components/ai-config-sidebar";
import { QuizMessage } from "@/components/quiz-message";
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

// Conversation starter prompts organized by category (top 6 most relevant)
const conversationStarters = [
  {
    category: "Order Journey",
    icon: ShoppingCart,
    color: "from-blue-500/10 to-blue-500/5 border-blue-500/20 hover:border-blue-500/40",
    iconColor: "text-blue-500",
    prompts: [
      "How does the order placement workflow work?",
      "What's the difference between buy and sell orders?",
      "Explain the order settlement process"
    ]
  },
  {
    category: "Customer Management",
    icon: Users,
    color: "from-purple-500/10 to-purple-500/5 border-purple-500/20 hover:border-purple-500/40",
    iconColor: "text-purple-500",
    prompts: [
      "Explain the KYC verification process",
      "How are customer accounts categorized?",
      "What is customer onboarding workflow?"
    ]
  },
  {
    category: "Products & Securities",
    icon: Package,
    color: "from-green-500/10 to-green-500/5 border-green-500/20 hover:border-green-500/40",
    iconColor: "text-green-500",
    prompts: [
      "What types of mutual funds are available?",
      "How does portfolio rebalancing work?",
      "Explain different security types"
    ]
  },
  {
    category: "Transactions",
    icon: ArrowRightLeft,
    color: "from-amber-500/10 to-amber-500/5 border-amber-500/20 hover:border-amber-500/40",
    iconColor: "text-amber-500",
    prompts: [
      "What's the difference between SIP and SWP?",
      "How do redemption transactions work?",
      "Explain systematic transfer plans"
    ]
  },
  {
    category: "Compliance",
    icon: Shield,
    color: "from-red-500/10 to-red-500/5 border-red-500/20 hover:border-red-500/40",
    iconColor: "text-red-500",
    prompts: [
      "What are SEBI regulations for wealth management?",
      "Explain AML compliance requirements",
      "What are KYC documentation standards?"
    ]
  },
  {
    category: "Reports",
    icon: FileBarChart,
    color: "from-indigo-500/10 to-indigo-500/5 border-indigo-500/20 hover:border-indigo-500/40",
    iconColor: "text-indigo-500",
    prompts: [
      "What reports are generated for clients?",
      "How to interpret portfolio statements?",
      "Explain transaction confirmation documents"
    ]
  }
];

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

  const handleSelectThread = async (thread: Thread) => {
    setCurrentThreadId(thread.id);
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

  const handleConfigChange = (config: AIConfig) => {
    setAIConfig(config);
    // Future: Send config to backend or use in API calls
  };

  return (
    <div className="flex flex-1 bg-background">
      <ThreadSidebar
        onSelectThread={handleSelectThread}
        onNewChat={handleNewChat}
        onDeleteThread={handleDeleteThread}
        selectedThreadId={currentThreadId}
      />
      
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-border bg-card/30 backdrop-blur-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground" data-testid="text-title">
                  WealthForce Knowledge Agent
                </h1>
                <p className="text-sm text-muted-foreground">
                  Conversational Wealth Management Knowledge
                </p>
              </div>
            </div>
            
            {/* Mode Selector and Actions */}
            <div className="flex items-center gap-3">
              {/* Download Thread Button */}
              {currentThreadId && hasMessages && (
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="button-download-thread"
                  onClick={() => setShowDownloadDialog(true)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Thread
                </Button>
              )}
              
              <span className="text-sm text-muted-foreground">Mode:</span>
              <Select value={mode} onValueChange={(value) => setMode(value as "concise" | "balanced" | "deep")}>
                <SelectTrigger className="w-[160px]" data-testid="select-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="concise" data-testid="option-short">
                    Short
                  </SelectItem>
                  <SelectItem value="balanced" data-testid="option-standard">
                    Standard
                  </SelectItem>
                  <SelectItem value="deep" data-testid="option-comprehensive">
                    Comprehensive
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <ScrollArea ref={scrollAreaRef} className="flex-1">
          <div className="max-w-4xl mx-auto px-6 py-8">
            {!hasMessages && !isLoading && (
              <div className="flex flex-col items-center justify-center space-y-5 py-6">
                <div className="text-center space-y-2">
                  <Sparkles className="w-12 h-12 text-primary/50 mx-auto" />
                  <h2 className="text-xl font-semibold text-foreground">
                    Start a New Conversation
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Choose a topic below or ask your own question
                  </p>
                </div>

                {/* Conversation Starter Cards */}
                <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {conversationStarters.map((starter, categoryIndex) => {
                    const Icon = starter.icon;
                    // Randomly pick one prompt from each category to display
                    const randomPrompt = starter.prompts[Math.floor(Math.random() * starter.prompts.length)];
                    
                    return (
                      <button
                        key={categoryIndex}
                        onClick={() => {
                          handleSubmit(randomPrompt);
                        }}
                        className={`group relative p-4 rounded-lg border bg-gradient-to-br transition-all hover:shadow-lg hover:scale-[1.02] text-left ${starter.color}`}
                        data-testid={`starter-card-${categoryIndex}`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={`flex-shrink-0 w-9 h-9 rounded-lg bg-background/50 flex items-center justify-center ${starter.iconColor}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-foreground mb-1.5 line-clamp-1">
                              {starter.category}
                            </h3>
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-snug">
                              {randomPrompt}
                            </p>
                          </div>
                        </div>
                        
                        {/* Hover indicator */}
                        <div className="absolute bottom-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Send className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Additional help text */}
                <p className="text-xs text-muted-foreground/70 text-center">
                  💡 Click any card to start, or type your own question below
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
                      <div className="flex gap-2 mt-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs"
                              data-testid={`button-download-message-${message.id}`}
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Download
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem 
                              onClick={() => downloadMessageMarkdown(
                                userMessage.content,
                                message.content,
                                typeof message.createdAt === 'string' ? message.createdAt : message.createdAt.toISOString()
                              )}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Download as Markdown (.md)
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => downloadMessagePDF(
                                userMessage.content,
                                message.content,
                                typeof message.createdAt === 'string' ? message.createdAt : message.createdAt.toISOString()
                              )}
                            >
                              <FileType className="w-4 h-4 mr-2" />
                              Download as PDF (.pdf)
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          data-testid={`button-refresh-message-${message.id}`}
                          onClick={() => {
                            if (userMessage) {
                              // Directly call mutation with the stored question
                              queryMutation.mutate({
                                question: userMessage.content,
                                threadId: currentThreadId,
                              });
                            }
                          }}
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Regenerate
                        </Button>
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
              <div className="mb-6 flex gap-4 justify-start" data-testid="loading-indicator">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div className="max-w-[80%] rounded-lg px-4 py-3 bg-muted">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area - Fixed at bottom */}
        <div className="border-t border-border bg-card/30 backdrop-blur-sm p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3 items-end">
              <Textarea
                data-testid="input-question"
                placeholder="Ask a follow-up question..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 min-h-[60px] max-h-[200px] resize-none"
                disabled={isLoading}
              />
              
              {/* Quiz Me Button - Shows when there's enough conversation */}
              {hasMessages && messages.length >= 2 && (
                <Button
                  data-testid="button-quiz-me"
                  onClick={handleGenerateQuiz}
                  disabled={quizMutation.isPending}
                  size="lg"
                  variant="outline"
                  className="h-[60px] px-4 gap-2"
                >
                  {quizMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="hidden sm:inline">Generating...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
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
                className="h-[60px] w-[60px] p-0"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden md:block">
        <AIConfigSidebar onConfigChange={handleConfigChange} />
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
