import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Send, 
  Copy, 
  Check, 
  History, 
  Download, 
  FileText, 
  FileDown, 
  Settings, 
  Key,
  Sparkles,
  TrendingUp,
  FileQuestion,
  Shield
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { HistorySidebar } from "@/components/history-sidebar";
import type { Query, QueryResponse, Conversation } from "@shared/schema";
import jsPDF from "jspdf";

// Suggested prompts for onboarding (ChatGPT-inspired)
const SUGGESTED_PROMPTS = [
  {
    icon: TrendingUp,
    text: "What are the steps in mutual funds order placement?",
    description: "Process workflow"
  },
  {
    icon: Shield,
    text: "Explain the compliance requirements for transactions",
    description: "Regulatory compliance"
  },
  {
    icon: FileQuestion,
    text: "How does the OTP verification process work?",
    description: "Security process"
  },
  {
    icon: Sparkles,
    text: "What is the risk profiling process?",
    description: "Risk assessment"
  }
];

export default function ChatbotPage() {
  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState<"balanced" | "deep" | "concise">("balanced");
  const [useCache, setUseCache] = useState(true);
  const [response, setResponse] = useState<string>("");
  const [metadata, setMetadata] = useState<string>("");
  const [citations, setCitations] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<number>();
  const [showHistory, setShowHistory] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const savedApiKey = localStorage.getItem("gradio_api_key");
    if (savedApiKey) {
      setApiKey(savedApiKey);
      setApiKeyInput(savedApiKey);
    }
  }, []);

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
        setMetadata("");
        setCitations("");
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
      } else {
        setResponse(data.data);
        setMetadata(data.metadata || "");
        setCitations(data.citations || "");
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
      setMetadata("");
      setCitations("");
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
    setMetadata(""); // Metadata not stored in history yet
    setCitations(""); // Citations not stored in history yet
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

  const handleSuggestedPrompt = (promptText: string) => {
    setQuestion(promptText);
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

  const handleExportMarkdown = () => {
    if (!question || !response) {
      toast({
        title: "No Content",
        description: "Please generate a response first",
        variant: "destructive",
      });
      return;
    }

    const timestamp = new Date().toLocaleString();
    const content = `# WealthForce Knowledge Agent Export
## Query Details
- **Timestamp**: ${timestamp}
- **Mode**: ${mode}
- **Cache**: ${useCache ? 'Enabled' : 'Disabled'}

## Question
${question}

## Response
${response}
`;

    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wealthforce-query-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: "Conversation exported as Markdown",
    });
  };

  const handleExportPDF = () => {
    if (!question || !response) {
      toast({
        title: "No Content",
        description: "Please generate a response first",
        variant: "destructive",
      });
      return;
    }

    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;
    let yPosition = 20;

    // Helper function to render text with markdown formatting
    const renderMarkdownLine = (line: string, x: number, y: number) => {
      let xPos = x;
      // Split by bold markers while preserving them
      const parts = line.split(/(\*\*.*?\*\*)/g);
      
      parts.forEach(part => {
        if (part.startsWith('**') && part.endsWith('**')) {
          // Bold text
          doc.setFont('helvetica', 'bold');
          const text = part.slice(2, -2);
          doc.text(text, xPos, y);
          xPos += doc.getTextWidth(text);
        } else if (part) {
          // Normal text
          doc.setFont('helvetica', 'normal');
          doc.text(part, xPos, y);
          xPos += doc.getTextWidth(part);
        }
      });
    };

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text("WealthForce Knowledge Agent Export", margin, yPosition);
    yPosition += 15;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Timestamp: ${timestamp}`, margin, yPosition);
    yPosition += 7;
    doc.text(`Mode: ${mode}`, margin, yPosition);
    yPosition += 7;
    doc.text(`Cache: ${useCache ? 'Enabled' : 'Disabled'}`, margin, yPosition);
    yPosition += 12;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("Question", margin, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const questionLines = doc.splitTextToSize(question, maxWidth);
    questionLines.forEach((line: string) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(line, margin, yPosition);
      yPosition += 6;
    });
    yPosition += 8;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("Response", margin, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    // Process each line of response for markdown
    const responseLines = response.split('\n');
    responseLines.forEach((line: string) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      
      // Handle bullet points
      if (line.trim().startsWith('•')) {
        const wrappedLines = doc.splitTextToSize(line, maxWidth);
        wrappedLines.forEach((wrappedLine: string, index: number) => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }
          if (index === 0) {
            renderMarkdownLine(wrappedLine, margin, yPosition);
          } else {
            renderMarkdownLine(wrappedLine, margin + 5, yPosition);
          }
          yPosition += 6;
        });
      } else {
        const wrappedLines = doc.splitTextToSize(line, maxWidth);
        wrappedLines.forEach((wrappedLine: string) => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }
          renderMarkdownLine(wrappedLine, margin, yPosition);
          yPosition += 6;
        });
      }
    });

    doc.save(`wealthforce-query-${Date.now()}.pdf`);

    toast({
      title: "Export Successful",
      description: "Conversation exported as PDF",
    });
  };

  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      localStorage.setItem("gradio_api_key", apiKeyInput.trim());
      setApiKey(apiKeyInput.trim());
      setShowSettings(false);
      toast({
        title: "API Key Saved",
        description: "Your API key has been saved securely in local storage",
      });
    } else {
      localStorage.removeItem("gradio_api_key");
      setApiKey("");
      setShowSettings(false);
      toast({
        title: "API Key Removed",
        description: "API key has been removed",
      });
    }
  };

  const charCount = question.length;
  const isLoading = queryMutation.isPending;
  const hasResponse = response || error;

  return (
    <div className="min-h-screen bg-background flex">
      {showHistory && (
        <HistorySidebar
          onSelectConversation={handleSelectConversation}
          selectedId={selectedConversationId}
        />
      )}
      
      <div className="flex-1 flex flex-col">
        {/* Professional Enterprise Header */}
        <header className="border-b border-border bg-card/30 backdrop-blur-sm">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                data-testid="button-toggle-history"
                variant="ghost"
                size="icon"
                onClick={() => setShowHistory(!showHistory)}
                className="hover-elevate active-elevate-2"
              >
                <History className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2" data-testid="text-title">
                  <Sparkles className="w-6 h-6 text-primary" />
                  WealthForce Knowledge Agent
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Query WealthForce Product Knowledge
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {apiKey && (
                <div className="text-xs text-muted-foreground px-3 py-1.5 rounded-md bg-muted/50 border border-border" data-testid="text-auth-status">
                  <Key className="w-3 h-3 inline mr-1.5" />
                  Authenticated
                </div>
              )}
              
              <Dialog open={showSettings} onOpenChange={setShowSettings}>
                <DialogTrigger asChild>
                  <Button
                    data-testid="button-settings"
                    variant="ghost"
                    size="icon"
                    className="hover-elevate active-elevate-2"
                  >
                    <Settings className="w-5 h-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>API Settings</DialogTitle>
                    <DialogDescription>
                      Configure your Gradio API authentication. This is optional and will be used for future authenticated endpoints.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="api-key" className="text-sm font-medium">
                        API Key
                      </Label>
                      <div className="relative">
                        <Key className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="api-key"
                          data-testid="input-api-key"
                          type="password"
                          placeholder="Enter your Gradio API key"
                          value={apiKeyInput}
                          onChange={(e) => setApiKeyInput(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Your API key is stored securely in your browser's local storage
                      </p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        data-testid="button-cancel-settings"
                        variant="outline"
                        onClick={() => {
                          setApiKeyInput(apiKey);
                          setShowSettings(false);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        data-testid="button-save-api-key"
                        onClick={handleSaveApiKey}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    data-testid="button-export"
                    variant="outline"
                    className="gap-2"
                    disabled={!response}
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    data-testid="menu-export-markdown"
                    onClick={handleExportMarkdown}
                    className="gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Export as Markdown
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    data-testid="menu-export-pdf"
                    onClick={handleExportPDF}
                    className="gap-2"
                  >
                    <FileDown className="w-4 h-4" />
                    Export as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Main Content Area - Claude-inspired clean layout */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto px-6 py-8">
            
            {/* Suggested Prompts - ChatGPT-inspired onboarding (shown when empty) */}
            {!hasResponse && !isLoading && !question && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-foreground mb-4">Get Started</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {SUGGESTED_PROMPTS.map((prompt, index) => {
                    const Icon = prompt.icon;
                    return (
                      <Card
                        key={index}
                        className="cursor-pointer transition-all hover-elevate active-elevate-2 border-border"
                        onClick={() => handleSuggestedPrompt(prompt.text)}
                        data-testid={`card-suggested-prompt-${index}`}
                      >
                        <CardContent className="p-4 flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground line-clamp-2">{prompt.text}</p>
                            <p className="text-xs text-muted-foreground mt-1">{prompt.description}</p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Query Input Section */}
            <Card className="mb-6 border-border shadow-sm">
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="question" className="text-sm font-semibold uppercase tracking-wider text-foreground">
                    Your Question
                  </Label>
                  <div className="relative">
                    <Textarea
                      id="question"
                      data-testid="input-question"
                      placeholder="Ask about wealth management processes..."
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="min-h-24 resize-none rounded-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      disabled={isLoading}
                    />
                    <span className="absolute bottom-2 right-2 text-xs text-muted-foreground" data-testid="text-char-count">
                      {charCount}
                    </span>
                  </div>
                </div>

                <div className="flex items-end gap-3">
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="mode" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Mode
                      </Label>
                      <Select value={mode} onValueChange={(value) => setMode(value as typeof mode)} disabled={isLoading}>
                        <SelectTrigger id="mode" data-testid="select-mode" className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="concise">Concise</SelectItem>
                          <SelectItem value="balanced">Balanced</SelectItem>
                          <SelectItem value="deep">Deep</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Cache
                      </Label>
                      <div className="flex items-center justify-between h-9 px-3 rounded-lg border border-border bg-card">
                        <div className="flex items-center gap-2">
                          <Switch
                            id="cache"
                            data-testid="switch-cache"
                            checked={useCache}
                            onCheckedChange={setUseCache}
                            disabled={isLoading}
                            className="data-[state=checked]:bg-chart-2"
                          />
                          <Label htmlFor="cache" className="text-sm font-medium cursor-pointer">
                            {useCache ? 'Enabled' : 'Disabled'}
                          </Label>
                        </div>
                        {useCache && (
                          <Check className="w-4 h-4 text-chart-2" data-testid="icon-cache-enabled" />
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    data-testid="button-submit"
                    onClick={handleSubmit}
                    disabled={!question.trim() || isLoading}
                    size="lg"
                    className="min-w-32"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Send
                        <Send className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Response Section - Card-based display (ChatGPT/Intellect style) */}
            {(isLoading || hasResponse) && (
              <div className="space-y-4">
                {/* Main Response Card */}
                <Card
                  className={`border shadow-sm ${
                    error
                      ? "border-destructive/50 bg-destructive/5"
                      : response
                      ? "border-primary/20 bg-primary/5"
                      : "border-border"
                  }`}
                  data-testid="container-response"
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">Response</h3>
                      {response && (
                        <Button
                          data-testid="button-copy"
                          variant="ghost"
                          size="sm"
                          onClick={handleCopy}
                          className="gap-2 hover-elevate active-elevate-2"
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

                    {isLoading ? (
                      <div className="space-y-3 animate-pulse">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-4 bg-muted rounded w-full"></div>
                        <div className="h-4 bg-muted rounded w-5/6"></div>
                        <div className="h-4 bg-muted rounded w-2/3"></div>
                      </div>
                    ) : error ? (
                      <div className="flex flex-col items-center justify-center py-8 space-y-3" data-testid="text-error">
                        <div className="p-3 rounded-full bg-destructive/10">
                          <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-destructive text-center text-sm font-medium">{error}</p>
                      </div>
                    ) : response ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-code:font-mono prose-code:text-sm prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-lg prose-p:text-foreground prose-li:text-foreground">
                        <ReactMarkdown data-testid="text-response">{response}</ReactMarkdown>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                {/* Metadata Card */}
                {metadata && (
                  <Card className="border-border shadow-sm">
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground">
                        <ReactMarkdown data-testid="text-metadata">{metadata}</ReactMarkdown>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Sources Card */}
                {citations && (citations.includes('→') || citations.includes('[1]')) && citations.length > 15 && (
                  <Card className="border-border shadow-sm">
                    <CardContent className="p-6">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground mb-3">Sources</h3>
                      <div className="prose prose-sm max-w-none dark:prose-invert prose-p:text-muted-foreground prose-strong:text-foreground">
                        <ReactMarkdown data-testid="text-citations">{citations}</ReactMarkdown>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
