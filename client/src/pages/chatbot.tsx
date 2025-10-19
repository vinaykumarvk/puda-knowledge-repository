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
  Loader2, 
  Send, 
  Sparkles,
  User,
  Download,
  RefreshCw
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { ThreadSidebar } from "@/components/thread-sidebar";
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

// Helper function to format API responses professionally
function formatProfessionally(text: string): string {
  let formatted = text;
  
  // Remove "Direct Answer:" label and just show the content
  formatted = formatted.replace(/^##?\s*\*?\*?Direct Answer:?\*?\*?\s*/im, '');
  formatted = formatted.replace(/\n##?\s*\*?\*?Direct Answer:?\*?\*?\s*/im, '\n');
  
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
  
  return formatted;
}

// Helper function to download a single message exchange
function downloadMessage(userMessage: string, assistantMessage: string, timestamp: string) {
  const content = `WealthForce Knowledge Agent - Conversation Export
Generated: ${new Date(timestamp).toLocaleString()}

========================================
Question:
${userMessage}

========================================
Answer:
${assistantMessage}

========================================
`;

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `answer-${new Date(timestamp).toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Helper function to download entire thread conversation
function downloadThread(messages: Message[], threadTitle: string) {
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

export default function ChatbotPage() {
  const [question, setQuestion] = useState("");
  const [currentThreadId, setCurrentThreadId] = useState<number | undefined>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [mode, setMode] = useState<"concise" | "balanced" | "deep">("concise"); // Short is default
  const scrollAreaRef = useRef<HTMLDivElement>(null);
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
  }, [fetchedMessages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
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
    onSuccess: (data) => {
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
        
        // Add user message
        const userMessage: Message = {
          id: Date.now(),
          threadId: data.threadId,
          role: "user",
          content: question,
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

  const handleSubmit = () => {
    if (!question.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a question",
        variant: "destructive",
      });
      return;
    }

    queryMutation.mutate({
      question,
      threadId: currentThreadId,
    });
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

  return (
    <div className="flex h-screen bg-background">
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
                  onClick={() => downloadThread(messages, currentThread?.title || "Conversation")}
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
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <Sparkles className="w-16 h-16 text-primary/50" />
                <h2 className="text-2xl font-semibold text-foreground">
                  Start a New Conversation
                </h2>
                <p className="text-muted-foreground max-w-md">
                  Ask me anything about wealth management, financial products, or processes.
                  I'll remember our conversation and build context as we chat.
                </p>
              </div>
            )}

            {messages.map((message, index) => {
              // Find the corresponding user message for this assistant message
              const userMessage = message.role === "assistant" && index > 0 ? messages[index - 1] : null;
              
              return (
                <div
                  key={message.id}
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
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          data-testid={`button-download-message-${message.id}`}
                          onClick={() => downloadMessage(
                            userMessage.content,
                            message.content,
                            typeof message.createdAt === 'string' ? message.createdAt : message.createdAt.toISOString()
                          )}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Download
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          data-testid={`button-refresh-message-${message.id}`}
                          onClick={() => {
                            toast({
                              title: "Regenerate Answer",
                              description: "This feature will regenerate the answer with the same question.",
                            });
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
              <div className="flex-1">
                <Textarea
                  data-testid="input-question"
                  placeholder="Ask a follow-up question..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="min-h-[60px] max-h-[200px] resize-none"
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Press Enter to send, Shift + Enter for new line
                </p>
              </div>
              <Button
                data-testid="button-submit"
                onClick={handleSubmit}
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
    </div>
  );
}
