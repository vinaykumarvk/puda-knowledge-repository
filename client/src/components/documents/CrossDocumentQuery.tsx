import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  Send, 
  MessageCircle, 
  ChevronDown, 
  ChevronUp,
  FileText,
  Clock,
  User,
  Loader2,
  Brain,
  AlertCircle
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface CrossDocumentQueryProps {
  requestType: string;
  requestId: number;
  documentCount: number;
}

interface QueryHistoryItem {
  id: number;
  query: string;
  response: string;
  documentCount: number;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
    username: string;
  };
}

const CrossDocumentQuery: React.FC<CrossDocumentQueryProps> = ({ 
  requestType, 
  requestId, 
  documentCount 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [showAnswer, setShowAnswer] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get query history
  const { data: queryHistory = [] } = useQuery({
    queryKey: [`/api/documents/cross-query/${requestType}/${requestId}`],
    enabled: isExpanded,
  });

  // Submit cross-document query
  const queryMutation = useMutation({
    mutationFn: async (queryText: string) => {
      const response = await apiRequest('POST', `/api/documents/cross-query/${requestType}/${requestId}`, {
        query: queryText
      });
      return response.json();
    },
    onSuccess: (result) => {
      setShowAnswer(result.answer);
      setQuery('');
      
      // Invalidate query history to refresh
      queryClient.invalidateQueries({ 
        queryKey: [`/api/documents/cross-query/${requestType}/${requestId}`] 
      });
      
      toast({
        title: "✅ Query Processed",
        description: `AI has analyzed ${result.documentCount} documents and provided an answer.`,
        duration: 5000,
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Query Failed",
        description: error.message || "Failed to process cross-document query",
        variant: "destructive",
        duration: 5000,
      });
    }
  });

  const handleSubmit = () => {
    if (!query.trim()) return;
    queryMutation.mutate(query.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Format markdown in response
  const formatResponse = (response: string) => {
    // Convert headers (## Header) to <h3>
    let formatted = response.replace(/^## (.*?)$/gm, '<h3 style="font-size: 1.125rem; font-weight: 600; margin: 1rem 0 0.5rem 0;">$1</h3>');
    
    // Convert headers (### Header) to <h4>
    formatted = formatted.replace(/^### (.*?)$/gm, '<h4 style="font-size: 1rem; font-weight: 600; margin: 0.75rem 0 0.5rem 0;">$1</h4>');
    
    // Convert bold text **text** to <strong>text</strong>
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convert *italic* to <em>
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Convert source references 【4:0†source】 to readable format
    formatted = formatted.replace(/【(\d+):(\d+)†source】/g, '<span class="inline-block bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs font-medium ml-1">[Source: Page $1, Section $2]</span>');
    
    return formatted;
  };

  return (
    <Card className="border-2 border-dashed border-blue-200 dark:border-blue-800">
      <CardHeader 
        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span>Cross-Document Search</span>
            <Badge variant="secondary" className="ml-2">
              {documentCount} docs
            </Badge>
          </div>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </CardTitle>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Ask questions across all {documentCount} uploaded documents simultaneously
            </p>
          </div>

          {/* Query Input */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question about all the documents... (e.g., 'What are the key risks mentioned across all documents?')"
                className="flex-1 min-h-[60px] resize-none"
                disabled={queryMutation.isPending}
              />
              <Button
                onClick={handleSubmit}
                disabled={!query.trim() || queryMutation.isPending}
                className="self-end"
              >
                {queryMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Show latest answer */}
          {showAnswer && (
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-green-800 dark:text-green-200">
                  Latest Answer
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div 
                  className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: formatResponse(showAnswer) }}
                />
              </CardContent>
            </Card>
          )}

          {/* Query History */}
          {queryHistory.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Previous Q&A ({queryHistory.length})
              </h4>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {queryHistory.map((item: QueryHistoryItem, index: number) => (
                  <Card key={item.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        {/* Question */}
                        <div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
                            <User className="h-3 w-3" />
                            {item.user.firstName} {item.user.lastName}
                            <Clock className="h-3 w-3 ml-2" />
                            {new Date(item.createdAt).toLocaleString()}
                            <Badge variant="outline" className="ml-2">
                              {item.documentCount} docs
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            Q: {item.query}
                          </p>
                        </div>
                        
                        {/* Answer */}
                        <div className="pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                          <div 
                            className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap"
                            dangerouslySetInnerHTML={{ __html: formatResponse(item.response) }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* No history message */}
          {queryHistory.length === 0 && (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No questions asked yet</p>
              <p className="text-xs">Ask your first question to get started</p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default CrossDocumentQuery;