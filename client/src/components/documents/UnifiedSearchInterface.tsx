import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  FileText, 
  Globe, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Loader2,
  Archive,
  RotateCcw,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import MarkdownRenderer from './MarkdownRenderer';

interface Document {
  id: number;
  filename: string;
  originalName: string;
  analysisStatus?: string;
}

interface QueryResult {
  id: number;
  query: string;
  response: string;
  searchType: 'document' | 'web';
  documentIds?: number[];
  createdAt: string;
}

interface UnifiedSearchInterfaceProps {
  requestId: number;
  documents: Document[];
  isExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

type SearchType = 'document' | 'web';

export default function UnifiedSearchInterface({ 
  requestId, 
  documents, 
  isExpanded = false, 
  onExpandedChange 
}: UnifiedSearchInterfaceProps) {
  const [searchType, setSearchType] = useState<SearchType>('document');
  const [query, setQuery] = useState('');
  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedQueries, setExpandedQueries] = useState<Set<string>>(new Set());
  const [showAllQueries, setShowAllQueries] = useState(false);
  
  const queryClient = useQueryClient();

  // Initialize with all documents selected by default
  useEffect(() => {
    if (documents.length > 0 && selectedDocuments.length === 0) {
      setSelectedDocuments(documents.map(doc => doc.id));
    }
  }, [documents]);

  // Fetch document search history
  const { data: documentQueries = [] } = useQuery({
    queryKey: [`/api/cross-document-queries/${requestId}`],
    enabled: isExpanded
  });

  // Fetch web search history  
  const { data: webQueries = [] } = useQuery({
    queryKey: ['/api/web-search-queries', requestId],
    queryFn: () => apiRequest('GET', `/api/web-search-queries?requestId=${requestId}`).then(res => res.json()),
    enabled: isExpanded
  });

  // Document search mutation
  const documentSearchMutation = useMutation({
    mutationFn: async ({ query, documentIds }: { query: string; documentIds: number[] }) => {
      const response = await apiRequest('POST', '/api/cross-document-queries', {
        requestType: 'investment_request',
        requestId,
        query,
        documentIds
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cross-document-queries/${requestId}`] });
      setQuery('');
    }
  });

  // Web search mutation - Updated to use POST /search/web endpoint
  const webSearchMutation = useMutation({
    mutationFn: async ({ query }: { query: string }) => {
      const response = await apiRequest('POST', '/api/search/web', {
        requestId,
        query
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/web-search-queries', requestId] });
      setQuery('');
    }
  });

  // Delete query mutations
  const deleteDocumentQueryMutation = useMutation({
    mutationFn: async (queryId: number) => {
      const response = await apiRequest('DELETE', `/api/cross-document-queries/${queryId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cross-document-queries/${requestId}`] });
    }
  });

  const deleteWebQueryMutation = useMutation({
    mutationFn: async (queryId: number) => {
      const response = await apiRequest('DELETE', `/api/web-search-queries/${queryId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/web-search-queries', requestId] });
    }
  });

  const handleSearch = () => {
    if (!query.trim()) return;

    if (searchType === 'document') {
      if (selectedDocuments.length === 0) {
        alert('Please select at least one document to search');
        return;
      }
      documentSearchMutation.mutate({ query, documentIds: selectedDocuments });
    } else {
      webSearchMutation.mutate({ query });
    }
  };

  const handleSelectAll = () => {
    setSelectedDocuments(documents.map(doc => doc.id));
  };

  const handleDeselectAll = () => {
    setSelectedDocuments([]);
  };

  const handleDocumentToggle = (documentId: number) => {
    setSelectedDocuments(prev => 
      prev.includes(documentId)
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  };

  const handleDeleteQuery = (searchType: 'document' | 'web', queryId: number) => {
    if (confirm('Are you sure you want to delete this query and its response?')) {
      if (searchType === 'document') {
        deleteDocumentQueryMutation.mutate(queryId);
      } else {
        deleteWebQueryMutation.mutate(queryId);
      }
    }
  };

  const toggleQueryExpansion = (queryKey: string) => {
    const newExpanded = new Set(expandedQueries);
    if (newExpanded.has(queryKey)) {
      newExpanded.delete(queryKey);
    } else {
      newExpanded.add(queryKey);
    }
    setExpandedQueries(newExpanded);
  };

  const getSearchIcon = (type: SearchType) => {
    return type === 'document' ? <FileText className="h-4 w-4" /> : <Globe className="h-4 w-4" />;
  };

  const getDocumentName = (id: number) => {
    return documents.find(doc => doc.id === id)?.originalName || `Document ${id}`;
  };



  const combinedQueries = [
    ...(Array.isArray(documentQueries) ? documentQueries : []).map((q: any) => ({ ...q, searchType: 'document' as const })),
    ...(Array.isArray(webQueries) ? webQueries : []).map((q: any) => ({ ...q, searchType: 'web' as const }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const displayedQueries = showAllQueries ? combinedQueries : combinedQueries.slice(0, 3);
  const hasMoreQueries = combinedQueries.length > 3;

  const isLoading = documentSearchMutation.isPending || webSearchMutation.isPending;

  if (!isExpanded) {
    return null;
  }

  return (
    <div className="space-y-4">
            {/* Search Type Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Type</label>
              <Select value={searchType} onValueChange={(value: SearchType) => setSearchType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="document">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Document Search
                    </div>
                  </SelectItem>
                  <SelectItem value="web">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Web Search
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Document Selection (only for document search) */}
            {searchType === 'document' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Select Documents</label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                      disabled={selectedDocuments.length === documents.length}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeselectAll}
                      disabled={selectedDocuments.length === 0}
                    >
                      Deselect All
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`doc-${doc.id}`}
                        checked={selectedDocuments.includes(doc.id)}
                        onCheckedChange={() => handleDocumentToggle(doc.id)}
                      />
                      <label
                        htmlFor={`doc-${doc.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                      >
                        {doc.originalName}
                      </label>
                      {doc.analysisStatus === 'processed' && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  ))}
                </div>
                
                {selectedDocuments.length > 0 && (
                  <div className="text-sm text-gray-600">
                    {selectedDocuments.length} of {documents.length} documents selected
                  </div>
                )}
              </div>
            )}

            {/* Query Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Question</label>
              <Textarea
                placeholder={
                  searchType === 'document'
                    ? "Ask questions about the selected documents..."
                    : "Search for external information..."
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            {/* Search Button */}
            <Button
              onClick={handleSearch}
              disabled={isLoading || !query.trim() || (searchType === 'document' && selectedDocuments.length === 0)}
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                getSearchIcon(searchType)
              )}
              {isLoading ? 'Searching...' : `Search ${searchType === 'document' ? 'Documents' : 'Web'}`}
            </Button>

            {/* Query History Toggle */}
            {combinedQueries.length > 0 && (
              <>
                <Separator />
                <Button
                  variant="ghost"
                  onClick={() => setShowHistory(!showHistory)}
                  className="w-full justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Archive className="h-4 w-4" />
                    Query History ({combinedQueries.length})
                  </div>
                  {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </>
            )}

            {/* Query History */}
            {showHistory && (
              <div className="space-y-3">
                <ScrollArea className="max-h-96 w-full">
                  <div className="space-y-3 p-2">
                    {displayedQueries.map((queryResult) => {
                      const queryKey = `${queryResult.searchType}-${queryResult.id}`;
                      const isExpanded = expandedQueries.has(queryKey);
                      const truncatedQuery = queryResult.query.length > 60 
                        ? queryResult.query.substring(0, 60) + '...' 
                        : queryResult.query;

                      return (
                        <Card key={queryKey} className="border border-gray-200 dark:border-gray-700">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-2 flex-1 min-w-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleQueryExpansion(queryKey)}
                                  className="p-1 h-auto mt-0.5"
                                >
                                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </Button>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2">
                                    {getSearchIcon(queryResult.searchType)}
                                    <Badge variant={queryResult.searchType === 'document' ? 'default' : 'secondary'} className="shrink-0">
                                      {queryResult.searchType === 'document' ? 'Doc' : 'Web'}
                                    </Badge>
                                    
                                    <span className="text-xs text-gray-500 flex items-center gap-1 shrink-0">
                                      <Clock className="h-3 w-3" />
                                      {format(new Date(queryResult.createdAt), 'MMM dd, HH:mm')}
                                    </span>
                                  </div>
                                  
                                  <p className="text-sm text-gray-900 dark:text-gray-100 break-words">
                                    {isExpanded ? queryResult.query : truncatedQuery}
                                  </p>
                                </div>
                              </div>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteQuery(queryResult.searchType, queryResult.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 shrink-0 ml-2 mt-0.5"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardHeader>
                          
                          {isExpanded && (
                            <CardContent className="pt-0 space-y-3">
                              {queryResult.searchType === 'document' && queryResult.documentIds && (
                                <div>
                                  <span className="text-sm font-medium text-gray-600">Documents:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {queryResult.documentIds.map((docId: number) => (
                                      <Badge key={docId} variant="outline" className="text-xs">
                                        {getDocumentName(docId)}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              <div>
                                <span className="text-sm font-medium text-gray-600">Answer:</span>
                                <div className="mt-1 rounded border max-h-64 overflow-y-auto">
                                  <div className="p-3">
                                    <MarkdownRenderer 
                                      content={queryResult.response} 
                                      className="text-sm" 
                                    />
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
                
                {hasMoreQueries && (
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAllQueries(!showAllQueries)}
                      className="text-sm"
                    >
                      {showAllQueries ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-2" />
                          Show Less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-2" />
                          Show More ({combinedQueries.length - 3} more)
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
    </div>
  );
}