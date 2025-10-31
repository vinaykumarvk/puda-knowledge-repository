import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Users, DollarSign } from "lucide-react";

interface ProposalSummaryData {
  investment: {
    draft: { count: number; value: number };
    pendingManager: { count: number; value: number };
    pendingCommittee: { count: number; value: number };
    pendingFinance: { count: number; value: number };
    approved: { count: number; value: number };
    rejected: { count: number; value: number };
    total: { count: number; value: number };
  };
  cash: {
    draft: { count: number; value: number };
    pendingManager: { count: number; value: number };
    pendingCommittee: { count: number; value: number };
    pendingFinance: { count: number; value: number };
    approved: { count: number; value: number };
    rejected: { count: number; value: number };
    total: { count: number; value: number };
  };
}

interface ProposalSummaryCardProps {
  data: ProposalSummaryData;
  userRole: string;
}

export default function ProposalSummaryCard({ data, userRole }: ProposalSummaryCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100';
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100';
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100';
    }
  };

  const StatusCard = ({ 
    title, 
    count, 
    value, 
    status, 
    showForRole 
  }: { 
    title: string; 
    count: number; 
    value: number; 
    status: string; 
    showForRole: boolean;
  }) => {
    if (!showForRole) return null;

    return (
      <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{count}</p>
          <p className="text-sm text-muted-foreground">{formatCurrency(value)}</p>
        </div>
        <Badge variant="secondary" className={getStatusColor(status)}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Proposal Summary
        </CardTitle>
        <CardDescription>
          Overview of investment and cash request proposals by status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Investment Proposals */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <h3 className="font-semibold">Investment Proposals</h3>
            </div>
            <div className="space-y-3">
              <StatusCard 
                title="Draft"
                count={data.investment.draft.count}
                value={data.investment.draft.value}
                status="draft"
                showForRole={['analyst', 'admin'].includes(userRole)}
              />
              <StatusCard 
                title="Pending Approver"
                count={data.investment.pendingManager.count + data.investment.pendingCommittee.count + data.investment.pendingFinance.count}
                value={data.investment.pendingManager.value + data.investment.pendingCommittee.value + data.investment.pendingFinance.value}
                status="pending"
                showForRole={['manager', 'committee_member', 'finance', 'admin'].includes(userRole)}
              />
              <StatusCard 
                title="Approved"
                count={data.investment.approved.count}
                value={data.investment.approved.value}
                status="approved"
                showForRole={true}
              />
              <StatusCard 
                title="Rejected"
                count={data.investment.rejected.count}
                value={data.investment.rejected.value}
                status="rejected"
                showForRole={true}
              />
            </div>
          </div>

          {/* Cash Requests */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-4 w-4 text-green-600" />
              <h3 className="font-semibold">Cash Requests</h3>
            </div>
            <div className="space-y-3">
              <StatusCard 
                title="Draft"
                count={data.cash.draft.count}
                value={data.cash.draft.value}
                status="draft"
                showForRole={['analyst', 'admin'].includes(userRole)}
              />
              <StatusCard 
                title="Pending Approver"
                count={data.cash.pendingManager.count + data.cash.pendingCommittee.count + data.cash.pendingFinance.count}
                value={data.cash.pendingManager.value + data.cash.pendingCommittee.value + data.cash.pendingFinance.value}
                status="pending"
                showForRole={['manager', 'committee_member', 'finance', 'admin'].includes(userRole)}
              />
              <StatusCard 
                title="Approved"
                count={data.cash.approved.count}
                value={data.cash.approved.value}
                status="approved"
                showForRole={true}
              />
              <StatusCard 
                title="Rejected"
                count={data.cash.rejected.count}
                value={data.cash.rejected.value}
                status="rejected"
                showForRole={true}
              />
            </div>
          </div>
        </div>

        {/* Total Summary */}
        <div className="mt-6 pt-6 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Total Investments</h4>
              <div className="flex justify-between">
                <span className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {data.investment.total.count}
                </span>
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  {formatCurrency(data.investment.total.value)}
                </span>
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">Total Cash Requests</h4>
              <div className="flex justify-between">
                <span className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {data.cash.total.count}
                </span>
                <span className="text-sm text-green-700 dark:text-green-300">
                  {formatCurrency(data.cash.total.value)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}