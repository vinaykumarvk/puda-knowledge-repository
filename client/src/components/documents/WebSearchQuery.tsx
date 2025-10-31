import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Search, Globe, Send, User, Calendar } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';

interface WebSearchQueryProps {
  requestType: string;
  requestId: number;
}

interface WebSearchQueryItem {
  id: number;
  query: string;
  response: string;
  searchType: string;
  createdAt: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    username: string;
  };
}

// Helper function to parse markdown formatting and OpenAI source references
const parseMarkdown = (text: string): string => {
  // Convert headers (## Header) to <h3>
  let converted = text.replace(/^## (.*?)$/gm, '<h3 style="font-size: 1.125rem; font-weight: 600; margin: 1rem 0 0.5rem 0;">$1</h3>');
  
  // Convert headers (### Header) to <h4>
  converted = converted.replace(/^### (.*?)$/gm, '<h4 style="font-size: 1rem; font-weight: 600; margin: 0.75rem 0 0.5rem 0;">$1</h4>');
  
  // Convert **bold** to <strong>
  converted = converted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Convert *italic* to <em>
  converted = converted.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Convert OpenAI source references like 【4:0†source】 to readable format
  converted = converted.replace(/【(\d+):(\d+)†([^】]+)】/g, (match, page, section, source) => {
    return `<span style="color: #3b82f6; font-weight: 500;">[Source: Page ${page}, Section ${section}]</span>`;
  });

  // Convert web source references like ([domain.com](url)) to readable format
  converted = converted.replace(/\(\[([^\]]+)\]\([^)]+\)\)/g, '<span style="color: #3b82f6; font-weight: 500;">[Source: $1]</span>');

  return converted;
};

export default function WebSearchQuery({ requestType, requestId }: WebSearchQueryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  // Fetch web search query history
  const { data: queryHistory = [], refetch } = useQuery({
    queryKey: [`/api/documents/web-search/${requestType}/${requestId}`],
    enabled: isExpanded,
  });

  // Submit new web search query
  const submitQuery = useMutation({
    mutationFn: async (queryText: string) => {
      return apiRequest('POST', `/api/documents/web-search/${requestType}/${requestId}`, { query: queryText });
    },
    onSuccess: () => {
      setQuery('');
      refetch();
      queryClient.invalidateQueries({
        queryKey: [`/api/documents/web-search/${requestType}/${requestId}`],
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setIsSubmitting(true);
    try {
      await submitQuery.mutateAsync(query.trim());
    } catch (error) {
      console.error('Error submitting web search query:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasQueries = queryHistory.length > 0;

  return (
    <Card className="w-full">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-600" />
                Web Search
                {hasQueries && (
                  <Badge variant="secondary" className="ml-2">
                    {queryHistory.length} queries
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Search className="h-3 w-3" />
                  External Information
                </Badge>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-6">
              {/* Query Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Search the web for current information about this investment..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="flex-1"
                    disabled={isSubmitting}
                  />
                  <Button 
                    type="submit" 
                    disabled={!query.trim() || isSubmitting}
                    className="px-4"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isSubmitting ? 'Searching...' : 'Search'}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Ask questions about market conditions, company news, industry trends, or any other web-searchable information related to this investment.
                </p>
              </form>

              {/* Query History */}
              {hasQueries && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      Search History
                    </h4>
                    {queryHistory.map((item: WebSearchQueryItem) => (
                      <div key={item.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span>{item.user.firstName} {item.user.lastName}</span>
                            <Calendar className="h-4 w-4 ml-2" />
                            <span>{format(new Date(item.createdAt), 'MMM d, yyyy HH:mm')}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {item.searchType}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="font-medium text-sm">
                            <strong>Question:</strong> {item.query}
                          </div>
                          <div className="text-sm text-muted-foreground bg-gray-50 dark:bg-gray-800 p-3 rounded">
                            <strong>Answer:</strong>
                            <div 
                              className="mt-1 whitespace-pre-wrap"
                              dangerouslySetInnerHTML={{ 
                                __html: parseMarkdown(item.response)
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Empty State */}
              {!hasQueries && (
                <div className="text-center py-8 text-muted-foreground">
                  <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">No web searches yet</p>
                  <p className="text-xs">Search the web for current information about this investment</p>
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}