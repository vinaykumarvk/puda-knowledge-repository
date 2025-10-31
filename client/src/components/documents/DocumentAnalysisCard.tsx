import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';

import { 
  FileText, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Eye,
  Download,
  Send,
  MessageCircle,
  Loader2,
  MessageSquare,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import AnalysisCard from './AnalysisCard';
import QueryCard from './QueryCard';

interface DocumentAnalysis {
  documentType: string;
  classification: string;
  confidence: number;
  keyInformation: {
    amounts?: string[];
    dates?: string[];
    parties?: string[];
    riskFactors?: string[];
    companyName?: string;
    financialMetrics?: Record<string, string>;
  };
  summary: string;
  riskAssessment: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
    score: number;
  };
  recommendations: string[];
  extractedText: string;
}

interface Document {
  id: number;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  analysisStatus: 'pending' | 'processing' | 'completed' | 'failed';
  analysisResult?: string;
  classification?: string;
  confidence?: number;
  createdAt: string;
  analyzedAt?: string;
}

interface DocumentAnalysisCardProps {
  document: Document;
  requestType: string;
  requestId: number;
  hideRiskAssessment?: boolean;
  hideKeyInfoHeader?: boolean;
  simplifiedView?: boolean;
  showAnalysisLabel?: boolean;
  showOnlyProcessed?: boolean;
}

const DocumentAnalysisCard: React.FC<DocumentAnalysisCardProps> = ({ 
  document, 
  requestType, 
  requestId,
  hideRiskAssessment = false,
  hideKeyInfoHeader = false,
  simplifiedView = false,
  showAnalysisLabel = true,
  showOnlyProcessed = false
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [insights, setInsights] = useState<{summary: string; insights: string} | null>(null);
  const [customQuery, setCustomQuery] = useState('');
  const [showQueryInput, setShowQueryInput] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query to check background job status
  const { data: jobStatus } = useQuery({
    queryKey: ['job-status', document.id],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/documents/${document.id}/job-status`);
      return response.json();
    },
    refetchInterval: 5000, // Poll every 5 seconds to catch job completion
  });

  // Query for document queries history
  const { data: queryHistory } = useQuery({
    queryKey: [`/api/documents/${document.id}/queries`],
    enabled: document.analysisStatus === 'completed'
  });

  // Watch for job completion and invalidate caches
  React.useEffect(() => {
    if (jobStatus?.hasJob && jobStatus.job.status === 'completed' && document.analysisStatus !== 'completed') {
      // Job completed but document status not updated in cache - invalidate to refresh
      queryClient.invalidateQueries({ queryKey: ['all-documents'] });
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${requestType}/${requestId}`] });
      queryClient.invalidateQueries({ queryKey: ['documents', requestType, requestId] });
      queryClient.invalidateQueries({ queryKey: ['document-analysis', document.id] });
    }
  }, [jobStatus, document.analysisStatus, queryClient, requestType, requestId, document.id]);

  // Auto-fetch insights if document is completed and background job was successful
  React.useEffect(() => {
    if (document.analysisStatus === 'completed' && !insights && jobStatus && jobStatus.hasJob && jobStatus.job.status === 'completed') {
      // Automatically get insights for completed background jobs
      // Only auto-fetch if insights haven't been fetched yet
      const analysisResult = document.analysisResult ? JSON.parse(document.analysisResult) : null;
      if (!analysisResult?.summary || !analysisResult?.insights) {
        getInsightsMutation.mutate();
      }
    }
  }, [document.analysisStatus, jobStatus, insights]);

  // Manual document AI preparation mutation
  const prepareForAIMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/documents/${document.id}/prepare-ai`);
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['all-documents'] });
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${requestType}/${requestId}`] });
      queryClient.invalidateQueries({ queryKey: ['documents', requestType, requestId] });
      queryClient.invalidateQueries({ queryKey: ['document-analysis', document.id] });
      
      // Show specific success message based on the result
      if (result.message?.includes('already prepared')) {
        toast({
          title: "✅ Already Prepared",
          description: `Document "${document.originalName}" was already in the vector store and ready for AI analysis.`,
          duration: 5000,
        });
      } else {
        toast({
          title: "✅ AI Preparation Complete",
          description: `Document "${document.originalName}" has been successfully uploaded to vector store and is ready for AI analysis.`,
          duration: 5000,
        });
      }
    },
    onMutate: () => {
      toast({
        title: "Preparing for AI",
        description: "Uploading document to vector store and creating embeddings...",
      });
    },
    onError: (error) => {
      console.error('AI preparation failed:', error);
      toast({
        title: "❌ AI Preparation Failed",
        description: `Failed to prepare document "${document.originalName}" for AI. Please try again.`,
        variant: "destructive",
        duration: 5000,
      });
    }
  });

  // Get insights mutation
  const getInsightsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/documents/${document.id}/get-insights`);
      return response.json();
    },
    onSuccess: (result) => {
      setInsights({
        summary: result.summary,
        insights: result.insights
      });
      toast({
        title: "✅ Insights Generated",
        description: `AI insights generated for "${document.originalName}".`,
        duration: 5000,
      });
    },
    onMutate: () => {
      toast({
        title: "Generating Insights",
        description: "AI is analyzing the document to generate summary and insights...",
      });
    },
    onError: (error) => {
      console.error('Get insights failed:', error);
      toast({
        title: "❌ Insights Generation Failed",
        description: `Failed to generate insights for "${document.originalName}". Please try again.`,
        variant: "destructive",
        duration: 5000,
      });
    }
  });

  // Custom query mutation
  const customQueryMutation = useMutation({
    mutationFn: async (query: string) => {
      console.log('Submitting custom query:', query);
      const response = await apiRequest('POST', `/api/documents/${document.id}/custom-query`, {
        query
      });
      const result = await response.json();
      console.log('Custom query response:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('Custom query success:', data);
      toast({
        title: "Query Processed",
        description: "Your custom query has been processed successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${document.id}/queries`] });
      setCustomQuery('');
      setShowQueryInput(false);
    },
    onError: (error) => {
      console.error('Custom query error:', error);
      toast({
        title: "Error",
        description: "Failed to process your query",
        variant: "destructive",
      });
    },
  });

  // Handle custom query submission
  const handleCustomQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (customQuery.trim()) {
      customQueryMutation.mutate(customQuery.trim());
    }
  };

  // Parse analysis from document.analysisResult if available
  const analysis = React.useMemo(() => {
    if (document.analysisStatus === 'completed' && document.analysisResult) {
      try {
        const parsed = JSON.parse(document.analysisResult);
        // Check if insights are already in the stored result
        if (parsed.summary && parsed.insights) {
          setInsights({
            summary: parsed.summary,
            insights: parsed.insights
          });
        }
        return parsed;
      } catch (error) {
        console.error('Failed to parse analysis result:', error);
        return null;
      }
    }
    return null;
  }, [document.analysisResult, document.analysisStatus]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'processing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStepDisplayText = (step: string) => {
    switch (step) {
      case 'queued': return 'Queued';
      case 'preparing': return 'Preparing for AI analysis';
      case 'uploading': return 'Uploading to vector store';
      case 'analyzing': return 'Analyzing document';
      case 'generating_summary': return 'Generating summary';
      case 'generating_insights': return 'Generating insights';
      case 'completed': return 'Completed';
      default: return 'Processing';
    }
  };



  return (
    <Card className="w-full">
      <CardHeader className="cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle className="text-lg">{document.originalName}</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {formatFileSize(document.fileSize)} • {document.mimeType}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                setIsCollapsed(!isCollapsed);
              }}
            >
              {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
            <Badge className={getStatusColor(document.analysisStatus)}>
              {document.analysisStatus === 'processing' && <Clock className="h-3 w-3 mr-1" />}
              {document.analysisStatus === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
              {document.analysisStatus === 'failed' && <AlertTriangle className="h-3 w-3 mr-1" />}
              {document.analysisStatus === 'processing' && (jobStatus?.hasJob && jobStatus.job.status === 'completed') 
                ? 'Processed' 
                : document.analysisStatus.charAt(0).toUpperCase() + document.analysisStatus.slice(1)
              }
            </Badge>
            {/* Show manual trigger only if no background job exists or if background job failed */}
            {document.analysisStatus === 'pending' && (!jobStatus?.hasJob || jobStatus?.job?.status === 'failed') && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={() => prepareForAIMutation.mutate()}
                      disabled={prepareForAIMutation.isPending}
                      size="sm"
                      variant="outline"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{prepareForAIMutation.isPending ? 'Preparing for AI...' : 'Prepare for AI'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {/* Show background job status if it exists */}
            {jobStatus?.hasJob && jobStatus.job.status === 'pending' && (
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Queued
              </Badge>
            )}
            {jobStatus?.hasJob && jobStatus.job.status === 'processing' && (
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {getStepDisplayText(jobStatus.job.currentStep)}
              </Badge>
            )}
            {jobStatus?.hasJob && jobStatus.job.status === 'completed' && (
              <Badge variant="outline" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                <CheckCircle className="h-3 w-3 mr-1" />
                Processed
              </Badge>
            )}


            {/* Removed manual insights trigger - insights will be generated automatically */}

          </div>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="space-y-4">
        {/* Analysis Progress - only during processing */}
        {(document.analysisStatus === 'processing' || (jobStatus?.hasJob && jobStatus.job.status === 'processing')) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>
                {jobStatus?.hasJob && jobStatus.job.currentStep 
                  ? getStepDisplayText(jobStatus.job.currentStep)
                  : 'Analyzing document...'
                }
              </span>
              <span>
                {jobStatus?.hasJob && jobStatus.job.currentStepNumber 
                  ? `${jobStatus.job.currentStepNumber}/${jobStatus.job.totalSteps}`
                  : 'Processing'
                }
              </span>
            </div>
            <Progress 
              value={jobStatus?.hasJob && jobStatus.job.stepProgress 
                ? jobStatus.job.stepProgress
                : 60
              } 
              className="h-2" 
            />
          </div>
        )}

        {/* Analysis Error */}
        {document.analysisStatus === 'failed' && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Document analysis failed. Please try again or contact support.
            </AlertDescription>
          </Alert>
        )}

        {/* Document Action Buttons - Always Available */}
        <div className="flex items-center gap-2 pb-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    // Open preview in new tab to avoid Chrome blocking
                    window.open(`/api/documents/preview/${document.id}`, '_blank');
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Preview Document</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(`/api/documents/download/${document.id}`, '_blank')}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Download Document</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Analysis Results */}
        {document.analysisStatus === 'completed' && analysis && (
          <div className="space-y-4">
            {/* Analysis Cards Section */}
            <div className="space-y-3">
              {/* Document Summary Card (renamed from AI Insights) */}
              {insights?.insights && (
                <AnalysisCard
                  title="Document Summary"
                  content={insights.insights}
                  icon={<TrendingUp className="h-4 w-4 text-purple-600" />}
                  type="insights"
                  defaultExpanded={false}
                />
              )}

              {/* Custom Query Input Form */}
              {showQueryInput && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Ask a question about this document</span>
                  </div>
                  <form onSubmit={handleCustomQuery} className="space-y-3">
                    <Input
                      type="text"
                      placeholder="e.g., What are the key financial highlights?"
                      value={customQuery}
                      onChange={(e) => setCustomQuery(e.target.value)}
                      disabled={customQueryMutation.isPending}
                      className="w-full"
                    />
                    <div className="flex gap-2">
                      <Button 
                        type="submit"
                        disabled={customQueryMutation.isPending || !customQuery.trim()}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {customQueryMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Ask Question
                          </>
                        )}
                      </Button>
                      <Button 
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowQueryInput(false);
                          setCustomQuery('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Query Cards */}
              {queryHistory && Array.isArray(queryHistory) && queryHistory.length > 0 && (
                <div className="space-y-3">
                  {queryHistory.map((query: any, index: number) => (
                    <QueryCard key={query.id} query={query} index={index} />
                  ))}
                </div>
              )}
            </div>

            {/* Ask Question Button */}
            {document.analysisStatus === 'completed' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowQueryInput(!showQueryInput)}
                      className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/20"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Ask Question</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Detailed Analysis */}
            {showDetails && (
              <div className="space-y-4 border-t pt-4">
                {/* Risk Factors */}
                {analysis.riskAssessment?.factors?.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Risk Factors</h4>
                    <ul className="text-sm space-y-1">
                      {analysis.riskAssessment.factors.map((factor: any, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <AlertTriangle className="h-3 w-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-600 dark:text-gray-400">{String(factor)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {analysis.recommendations?.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Recommendations</h4>
                    <ul className="text-sm space-y-1">
                      {analysis.recommendations.map((rec: any, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-600 dark:text-gray-400">{String(rec)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Financial Metrics */}
                {analysis.keyInformation?.financialMetrics && 
                 Object.keys(analysis.keyInformation.financialMetrics).length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Financial Metrics</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(analysis.keyInformation.financialMetrics).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="font-medium capitalize">{key.replace('_', ' ')}:</span>
                          <span className="text-gray-600 dark:text-gray-400">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Hide Details Button */}
                <div className="flex justify-center pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDetails(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Hide Details
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Basic Info for Pending/Processing */}
        {document.analysisStatus !== 'completed' && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p>Upload time: {new Date(document.createdAt).toLocaleString()}</p>
            {document.classification && (
              <p>Classification: {document.classification}</p>
            )}
          </div>
        )}
        </CardContent>
      )}
    </Card>
  );
};

export default DocumentAnalysisCard;