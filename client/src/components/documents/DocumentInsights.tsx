import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  BarChart3,
  PieChart,
  Eye,
  Brain
} from 'lucide-react';

interface DocumentInsights {
  totalDocuments: number;
  analyzedDocuments: number;
  documentTypes: Record<string, number>;
  overallRiskLevel: 'low' | 'medium' | 'high';
  keyFindings: string[];
  recommendations: string[];
}

interface DocumentInsightsProps {
  requestType: string;
  requestId: number;
}

const DocumentInsights: React.FC<DocumentInsightsProps> = ({ requestType, requestId }) => {
  const { data: insights, isLoading, error } = useQuery({
    queryKey: ['document-insights', requestType, requestId],
    queryFn: () => fetch(`/api/documents/insights/${requestType}/${requestId}`)
      .then(res => res.json()),
    retry: 1
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Document Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !insights) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Document Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Unable to load document insights. Please try again later.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const analysisProgress = insights.totalDocuments > 0 
    ? (insights.analyzedDocuments / insights.totalDocuments) * 100 
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-blue-600" />
          Document Analysis Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Analysis Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Analysis Progress</span>
            <span>{insights.analyzedDocuments} of {insights.totalDocuments} documents</span>
          </div>
          <Progress value={analysisProgress} className="h-2" />
        </div>

        {/* Overall Risk Assessment */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm font-medium">Overall Risk Level</span>
          </div>
          <Badge className={getRiskColor(insights.overallRiskLevel)}>
            {insights.overallRiskLevel.toUpperCase()} RISK
          </Badge>
        </div>

        {/* Document Types Distribution */}
        {Object.keys(insights.documentTypes).length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <PieChart className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Document Types</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(insights.documentTypes).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <span className="text-sm capitalize">{type.replace('_', ' ')}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Findings */}
        {insights.keyFindings.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Key Findings</span>
            </div>
            <ul className="space-y-2">
              {insights.keyFindings.slice(0, 5).map((finding, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600 dark:text-gray-400">{finding}</span>
                </li>
              ))}
            </ul>
            {insights.keyFindings.length > 5 && (
              <p className="text-sm text-gray-500">
                +{insights.keyFindings.length - 5} more findings...
              </p>
            )}
          </div>
        )}

        {/* Recommendations */}
        {insights.recommendations.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">AI Recommendations</span>
            </div>
            <ul className="space-y-2">
              {insights.recommendations.slice(0, 5).map((rec, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600 dark:text-gray-400">{rec}</span>
                </li>
              ))}
            </ul>
            {insights.recommendations.length > 5 && (
              <p className="text-sm text-gray-500">
                +{insights.recommendations.length - 5} more recommendations...
              </p>
            )}
          </div>
        )}

        {/* Empty State */}
        {insights.totalDocuments === 0 && (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No documents uploaded yet.</p>
            <p className="text-sm">Upload documents to get AI-powered insights.</p>
          </div>
        )}

        {/* Pending Analysis */}
        {insights.totalDocuments > 0 && insights.analyzedDocuments === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Brain className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Documents are being analyzed...</p>
            <p className="text-sm">AI insights will appear here once analysis is complete.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentInsights;