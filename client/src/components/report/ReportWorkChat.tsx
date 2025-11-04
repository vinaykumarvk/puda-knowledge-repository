import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, FileText, X, ChevronRight, Bot, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MarkdownRenderer from "@/components/documents/MarkdownRenderer";

interface ReportWorkChatProps {
  reportId: number;
  reportTitle: string;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function ReportWorkChat({ reportId, reportTitle, onClose }: ReportWorkChatProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch available investment templates
  const { data: templates } = useQuery({
    queryKey: ['/api/templates/investment'],
  });

  // Parse template data to get sections when template is selected
  const templateSections = selectedTemplateId && templates 
    ? (() => {
        const template = (templates as any[]).find((t: any) => t.id === selectedTemplateId);
        if (template && template.templateData) {
          try {
            const data = JSON.parse(template.templateData);
            return data.sections || [];
          } catch (e) {
            console.error('Failed to parse template data:', e);
            return [];
          }
        }
        return [];
      })()
    : [];

  // Fetch report details for context
  const { data: reportDetails } = useQuery({
    queryKey: [`/api/investments/${reportId}`],
  });

  // Fetch documents for context
  const { data: documents } = useQuery({
    queryKey: [`/api/documents/investment/${reportId}`],
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Add welcome message when documents load (only if messages array is empty)
  useEffect(() => {
    if (documents !== undefined && messages.length === 0) {
      setMessages([{
        id: '0',
        role: 'assistant',
        content: `Welcome! I'm here to help you work on "${reportTitle}". 
      
I have access to:
- Your report description and context
- ${documents.length > 0 ? `All ${documents.length} attached document(s)` : 'Your report metadata (you can upload documents to enhance my context)'}
- External knowledge from EKG service
- Historical insights from our vector store

Please select a template and section to get started, or ask me any questions about your report.`,
        timestamp: new Date()
      }]);
    }
  }, [documents, reportTitle, messages.length]); // Only set if messages is empty

  const chatMutation = useMutation({
    mutationFn: async (data: { question: string; templateId?: number; sectionName?: string }) => {
      const response = await apiRequest("POST", `/api/reports/${reportId}/chat`, {
        question: data.question,
        templateId: data.templateId,
        sectionName: data.sectionName,
        conversationHistory: messages.map(m => ({ role: m.role, content: m.content }))
      });
      return response;
    },
    onSuccess: (data) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.answer,
        timestamp: new Date()
      }]);
      setQuestion("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to get AI response",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = () => {
    if (!question.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Send to AI
    chatMutation.mutate({
      question: question.trim(),
      templateId: selectedTemplateId || undefined,
      sectionName: selectedSection || undefined
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Card className="w-full h-[700px] flex flex-col">
      <CardHeader className="border-b space-y-4 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Work on Report: {reportTitle}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-chat">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Template and Section Selection */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Template</label>
            <Select
              value={selectedTemplateId?.toString() || ""}
              onValueChange={(val) => {
                setSelectedTemplateId(parseInt(val));
                setSelectedSection(null);
              }}
            >
              <SelectTrigger data-testid="select-template">
                <SelectValue placeholder="Select template..." />
              </SelectTrigger>
              <SelectContent>
                {templates?.map((template: any) => (
                  <SelectItem key={template.id} value={template.id.toString()}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Section</label>
            <Select
              value={selectedSection || ""}
              onValueChange={setSelectedSection}
              disabled={!selectedTemplateId}
            >
              <SelectTrigger data-testid="select-section">
                <SelectValue placeholder="Select section..." />
              </SelectTrigger>
              <SelectContent>
                {templateSections?.map((section: any, idx: number) => (
                  <SelectItem key={idx} value={section.name || section.title || section}>
                    {section.name || section.title || section}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Context Info */}
        <div className="flex gap-2 flex-wrap">
          {reportDetails?.description && (
            <Badge variant="outline" className="text-xs">
              Has Description
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            {documents?.length || 0} Document(s)
          </Badge>
          {selectedTemplateId && (
            <Badge variant="secondary" className="text-xs">
              {templates?.find((t: any) => t.id === selectedTemplateId)?.name}
            </Badge>
          )}
          {selectedSection && (
            <Badge variant="secondary" className="text-xs">
              Section: {selectedSection}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages Area */}
        <ScrollArea className="flex-1 p-6" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                  }`}
                  data-testid={`message-${message.role}-${message.id}`}
                >
                  {message.role === 'assistant' ? (
                    <MarkdownRenderer content={message.content} />
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            ))}
            {chatMutation.isPending && (
              <div className="flex gap-3 justify-start">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={
                selectedTemplateId && selectedSection
                  ? `Ask about ${selectedSection} or request help drafting it...`
                  : "Ask me anything about your report..."
              }
              className="min-h-[80px] resize-none"
              disabled={chatMutation.isPending}
              data-testid="input-chat-question"
            />
            <Button
              onClick={handleSubmit}
              disabled={!question.trim() || chatMutation.isPending}
              className="h-[80px]"
              data-testid="button-send-message"
            >
              {chatMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
