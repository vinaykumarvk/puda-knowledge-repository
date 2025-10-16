import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { Loader2, ArrowRight, Copy, Check, History, Download, FileText, FileDown, Settings, Key } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { HistorySidebar } from "@/components/history-sidebar";
import type { Query, QueryResponse, Conversation } from "@shared/schema";
import jsPDF from "jspdf";

export default function ChatbotPage() {
  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState<"balanced" | "deep" | "concise">("balanced");
  const [useCache, setUseCache] = useState(true);
  const [response, setResponse] = useState<string>("");
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
    const content = `# Graph Query Assistant Export
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
    a.download = `query-${Date.now()}.md`;
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

    doc.setFontSize(18);
    doc.text("Graph Query Assistant Export", margin, yPosition);
    yPosition += 15;

    doc.setFontSize(10);
    doc.text(`Timestamp: ${timestamp}`, margin, yPosition);
    yPosition += 7;
    doc.text(`Mode: ${mode}`, margin, yPosition);
    yPosition += 7;
    doc.text(`Cache: ${useCache ? 'Enabled' : 'Disabled'}`, margin, yPosition);
    yPosition += 12;

    doc.setFontSize(14);
    doc.text("Question", margin, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
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
    doc.text("Response", margin, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    const responseLines = doc.splitTextToSize(response, maxWidth);
    responseLines.forEach((line: string) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(line, margin, yPosition);
      yPosition += 6;
    });

    doc.save(`query-${Date.now()}.pdf`);

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
                WealthForce Knowledge Agent
              </h1>
              <p className="text-sm text-muted-foreground">
                Query WealthForce Product Knowledge
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Dialog open={showSettings} onOpenChange={setShowSettings}>
              <DialogTrigger asChild>
                <Button
                  data-testid="button-settings"
                  variant="ghost"
                  size="icon"
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mode" className="text-sm font-medium uppercase tracking-wide">
                      Mode
                    </Label>
                    <Select value={mode} onValueChange={(value) => setMode(value as typeof mode)} disabled={isLoading}>
                      <SelectTrigger id="mode" data-testid="select-mode" className="rounded-lg">
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
                    <Label className="text-sm font-medium uppercase tracking-wide">
                      Cache
                    </Label>
                    <div className="flex items-center justify-between space-x-4 h-9 px-4 rounded-lg border border-border bg-card">
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
                  </div>
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
