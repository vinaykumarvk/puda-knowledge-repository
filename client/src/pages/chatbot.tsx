import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Send, 
  Sparkles,
  User
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { ThreadSidebar } from "@/components/thread-sidebar";
import type { Thread, Message } from "@shared/schema";

export default function ChatbotPage() {
  const [question, setQuestion] = useState("");
  const [currentThreadId, setCurrentThreadId] = useState<number | undefined>();
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

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
        mode: "balanced",
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

            {messages.map((message) => (
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
                
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {message.role === "user" ? (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  ) : (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  )}
                </div>

                {message.role === "user" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <User className="w-4 h-4 text-foreground" />
                  </div>
                )}
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
                className="h-[60px] px-6"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Send
                    <Send className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
