import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRight, Copy, Check, History } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { HistorySidebar } from "@/components/history-sidebar";
import type { Query, QueryResponse, Conversation } from "@shared/schema";

export default function ChatbotPage() {
  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState<"balanced" | "deep" | "concise">("balanced");
  const [useCache, setUseCache] = useState(true);
  const [response, setResponse] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<number>();
  const [showHistory, setShowHistory] = useState(true);
  const { toast } = useToast();

  const queryMutation = useMutation({
    mutationFn: async (payload: Query) => {
      const response = await apiRequest("POST", "/api/query", payload);
      const result = await response.json() as QueryResponse;
      return result;
    },
    onSuccess: (data) => {
      if (data.error) {
        setError(data.error);
        setResponse("");
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
      } else {
        setResponse(data.data);
        setError("");
        queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
        toast({
          title: "Success",
          description: "Query executed successfully",
        });
      }
    },
    onError: (error: Error) => {
      const errorMessage = error.message || "Failed to execute query";
      setError(errorMessage);
      setResponse("");
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleSelectConversation = (conversation: Conversation) => {
    setQuestion(conversation.question);
    setMode(conversation.mode as "balanced" | "deep" | "concise");
    setUseCache(conversation.useCache);
    setResponse(conversation.response);
    setError("");
    setSelectedConversationId(conversation.id);
  };

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
      mode,
      refresh: !useCache,
    });
  };

  const handleCopy = async () => {
    if (response) {
      await navigator.clipboard.writeText(response);
      setCopied(true);
      toast({
        title: "Copied",
        description: "Response copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const charCount = question.length;
  const isLoading = queryMutation.isPending;

  return (
    <div className="min-h-screen bg-background flex">
      {showHistory && (
        <HistorySidebar
          onSelectConversation={handleSelectConversation}
          selectedId={selectedConversationId}
        />
      )}
      
      <div className="flex-1 flex flex-col">
        <header className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              data-testid="button-toggle-history"
              variant="ghost"
              size="icon"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground" data-testid="text-title">
                Graph Query Assistant
              </h1>
              <p className="text-sm text-muted-foreground">
                Query your graph database with AI-powered insights
              </p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-5xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Input Section */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="question" className="text-sm font-medium uppercase tracking-wide">
                    Question
                  </Label>
                  <div className="relative">
                    <Textarea
                      id="question"
                      data-testid="input-question"
                      placeholder="Ask a question about your graph database..."
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="min-h-32 resize-none rounded-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      disabled={isLoading}
                    />
                    <span className="absolute bottom-2 right-2 text-xs text-muted-foreground" data-testid="text-char-count">
                      {charCount}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mode" className="text-sm font-medium uppercase tracking-wide">
                    Mode
                  </Label>
                  <Select value={mode} onValueChange={(value) => setMode(value as typeof mode)} disabled={isLoading}>
                    <SelectTrigger id="mode" data-testid="select-mode" className="rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="balanced">Balanced</SelectItem>
                      <SelectItem value="deep">Deep</SelectItem>
                      <SelectItem value="concise">Customer-Selected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between space-x-4 p-4 rounded-lg border border-border bg-card">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="cache"
                      data-testid="switch-cache"
                      checked={useCache}
                      onCheckedChange={setUseCache}
                      disabled={isLoading}
                      className="data-[state=checked]:bg-chart-2"
                    />
                    <Label htmlFor="cache" className="text-sm font-medium cursor-pointer">
                      Use Cache
                    </Label>
                  </div>
                  {useCache && (
                    <Check className="w-4 h-4 text-chart-2" data-testid="icon-cache-enabled" />
                  )}
                </div>

                <Button
                  data-testid="button-submit"
                  onClick={handleSubmit}
                  disabled={!question.trim() || isLoading}
                  className="w-full lg:w-auto lg:min-w-32"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Send Query
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>

              {/* Response Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium uppercase tracking-wide">Response</Label>
                  {response && (
                    <Button
                      data-testid="button-copy"
                      variant="ghost"
                      size="sm"
                      onClick={handleCopy}
                      className="gap-2"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy
                        </>
                      )}
                    </Button>
                  )}
                </div>

                <div
                  className={`min-h-96 max-h-[600px] overflow-y-auto rounded-lg border p-6 bg-card ${
                    error
                      ? "border-destructive"
                      : response
                      ? "border-chart-2/30"
                      : "border-card-border"
                  }`}
                  data-testid="container-response"
                >
                  {isLoading ? (
                    <div className="space-y-4 animate-pulse">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-4 bg-muted rounded w-full"></div>
                      <div className="h-4 bg-muted rounded w-5/6"></div>
                      <div className="h-4 bg-muted rounded w-2/3"></div>
                    </div>
                  ) : error ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-4" data-testid="text-error">
                      <svg className="w-12 h-12 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-destructive text-center">{error}</p>
                    </div>
                  ) : response ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-code:font-mono prose-code:text-sm prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-lg">
                      <ReactMarkdown data-testid="text-response">{response}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm" data-testid="text-empty-state">
                      Response will appear here
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
