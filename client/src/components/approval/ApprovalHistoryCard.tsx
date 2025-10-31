import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Clock, ChevronDown, ChevronUp, CheckCircle, XCircle, AlertCircle, FileText, RotateCcw } from 'lucide-react';

interface ApprovalHistoryCardProps {
  requestType: string;
  requestId: number;
  isExpanded?: boolean;
  onToggle?: () => void;
}

interface ApprovalRecord {
  id: number;
  stage: number;
  approverId: number;
  status: string;
  comments: string;
  approvedAt: string;
  createdAt: string;
  approvalCycle: number;
  isCurrentCycle: boolean;
}

export function ApprovalHistoryCard({ requestType, requestId, isExpanded = true, onToggle }: ApprovalHistoryCardProps) {
  const [showCompleteHistory, setShowCompleteHistory] = useState(false);

  // Fetch current cycle approvals (default view)
  const { data: currentApprovals, isLoading: currentLoading } = useQuery({
    queryKey: [`/api/approvals/${requestType}/${requestId}/current`],
    enabled: !showCompleteHistory,
  });

  // Fetch all cycle approvals (complete history)
  const { data: allApprovals, isLoading: allLoading } = useQuery({
    queryKey: [`/api/approvals/${requestType}/${requestId}/all`],
    enabled: showCompleteHistory,
  });

  const approvals = showCompleteHistory ? allApprovals : currentApprovals;
  const isLoading = showCompleteHistory ? allLoading : currentLoading;

  // Group approvals by cycle for complete history view
  const groupedApprovals = approvals?.reduce((groups: Record<number, ApprovalRecord[]>, approval: ApprovalRecord) => {
    const cycle = approval.approvalCycle;
    if (!groups[cycle]) {
      groups[cycle] = [];
    }
    groups[cycle].push(approval);
    return groups;
  }, {});

  const getStatusIcon = (status: string) => {
    if (status === 'approved' || status.includes('approved')) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    } else if (status === 'rejected' || status.includes('rejected')) {
      return <XCircle className="h-4 w-4 text-red-600" />;
    } else if (status === 'changes_requested') {
      return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    } else {
      return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'approved' || status.includes('approved')) {
      return 'bg-green-100 text-green-800';
    } else if (status === 'rejected' || status.includes('rejected')) {
      return 'bg-red-100 text-red-800';
    } else if (status === 'changes_requested') {
      return 'bg-yellow-100 text-yellow-800';
    } else {
      return 'bg-gray-100 text-gray-800';
    }
  };

  const renderApprovalRecord = (approval: ApprovalRecord, showCycleInfo = false) => (
    <div key={approval.id} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
      {getStatusIcon(approval.status)}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">
            Stage {approval.stage} - {approval.status}
          </p>
          <Badge className={getStatusColor(approval.status)}>
            {approval.status}
          </Badge>
          {showCycleInfo && (
            <Badge variant="outline" className="text-xs">
              Cycle {approval.approvalCycle}
            </Badge>
          )}
        </div>
        {approval.approvedAt && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {format(new Date(approval.approvedAt), 'MMM dd, yyyy HH:mm')}
          </p>
        )}
        <div className="mt-1">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Comments:</p>
          <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 p-2 rounded">
            {approval.comments || 'No comments provided'}
          </p>
        </div>
      </div>
    </div>
  );

  const renderCurrentCycleView = () => (
    <div className="space-y-3">
      {approvals && approvals.length > 0 ? (
        approvals.map((approval: ApprovalRecord) => renderApprovalRecord(approval))
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>No approval history yet</p>
          <p className="text-sm">This is the first stage of approval</p>
        </div>
      )}
    </div>
  );

  const renderCompleteHistoryView = () => {
    if (!groupedApprovals || Object.keys(groupedApprovals).length === 0) {
      return (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>No approval history available</p>
        </div>
      );
    }

    const sortedCycles = Object.keys(groupedApprovals)
      .map(Number)
      .sort((a, b) => b - a); // Show newest cycles first

    return (
      <div className="space-y-6">
        {sortedCycles.map((cycle, cycleIndex) => (
          <div key={cycle} className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-blue-600" />
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {cycle === Math.max(...sortedCycles) ? 'Current Submission' : `Submission Cycle ${cycle}`}
                </h4>
                <Badge variant={cycle === Math.max(...sortedCycles) ? "default" : "secondary"} className="text-xs">
                  Cycle {cycle}
                </Badge>
              </div>
            </div>
            
            <div className="space-y-2 pl-6 border-l-2 border-blue-200 dark:border-blue-800">
              {groupedApprovals[cycle].map((approval: ApprovalRecord) => 
                renderApprovalRecord(approval, false)
              )}
            </div>
            
            {cycleIndex < sortedCycles.length - 1 && (
              <Separator className="my-4" />
            )}
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors py-3"
          onClick={onToggle}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              Approval History
            </CardTitle>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </CardHeader>
        {isExpanded && (
          <CardContent className="pt-0 pb-4">
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              Loading approval history...
            </div>
          </CardContent>
        )}
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader 
        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors py-3"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Approval History
          </CardTitle>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0 pb-4">
          {/* Toggle button for current vs complete history */}
          <div className="flex justify-end mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCompleteHistory(!showCompleteHistory)}
              className="gap-2"
            >
              <FileText className="h-3 w-3" />
              {showCompleteHistory ? 'Current Cycle' : 'Complete History'}
            </Button>
          </div>

          {/* Render current cycle or complete history */}
          {showCompleteHistory ? renderCompleteHistoryView() : renderCurrentCycleView()}
        </CardContent>
      )}
    </Card>
  );
}