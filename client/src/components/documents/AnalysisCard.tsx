import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, ChevronUp, FileText, TrendingUp } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

interface AnalysisCardProps {
  title: string;
  content: string;
  icon: React.ReactNode;
  defaultExpanded?: boolean;
  type: 'summary' | 'insights';
}

const AnalysisCard: React.FC<AnalysisCardProps> = ({ 
  title, 
  content, 
  icon, 
  defaultExpanded = false,
  type 
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (!content) return null;

  return (
    <Card className="border-l-4 border-l-blue-500 bg-gray-50 dark:bg-gray-900">
      <CardHeader 
        className="pb-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
          </div>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="pt-0 pb-3">
          <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            <MarkdownRenderer content={content} />
          </div>
          
          {/* Hide Details Button */}
          <div className="flex justify-center pt-2 mt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(false);
              }}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 h-7"
            >
              <ChevronUp className="h-4 w-4 mr-1" />
              Hide Details
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default AnalysisCard;