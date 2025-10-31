import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, TrendingUp, Shield, CheckCircle } from "lucide-react";

interface DecisionSupportData {
  urgentApprovals: number;
  overdueItems: number;
  avgProcessingTime: number;
  complianceAlerts: number;
}

interface DecisionSupportWidgetProps {
  data: DecisionSupportData;
  userRole: string;
}

export default function DecisionSupportWidget({ data, userRole }: DecisionSupportWidgetProps) {
  const formatProcessingTime = (hours: number) => {
    if (hours >= 24) {
      return `${Math.round(hours / 24)} days`;
    } else if (hours >= 1) {
      return `${Math.round(hours)} hours`;
    } else {
      return `${Math.round(hours * 60)} minutes`;
    }
  };

  const getPriorityColor = (value: number, type: 'urgent' | 'overdue' | 'compliance') => {
    switch (type) {
      case 'urgent':
        if (value === 0) return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100';
        if (value <= 2) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100';
        return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100';
      case 'overdue':
        if (value === 0) return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100';
        if (value <= 1) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100';
        return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100';
      case 'compliance':
        if (value === 0) return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100';
        if (value <= 1) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100';
        return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
    }
  };

  const getPerformanceStatus = (avgTime: number) => {
    if (avgTime <= 24) return { status: 'Excellent', color: 'text-green-600', icon: CheckCircle };
    if (avgTime <= 48) return { status: 'Good', color: 'text-yellow-600', icon: Clock };
    return { status: 'Needs Improvement', color: 'text-red-600', icon: AlertTriangle };
  };

  const performance = getPerformanceStatus(data.avgProcessingTime);
  const PerformanceIcon = performance.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Decision Support
        </CardTitle>
        <CardDescription>
          Key metrics for effective decision making
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Urgent Approvals */}
          <div className="bg-card p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">Urgent Approvals</span>
              </div>
              <Badge className={getPriorityColor(data.urgentApprovals, 'urgent')}>
                {data.urgentApprovals === 0 ? 'None' : data.urgentApprovals}
              </Badge>
            </div>
            <p className="text-2xl font-bold">{data.urgentApprovals}</p>
            <p className="text-sm text-muted-foreground">Due within 24 hours</p>
          </div>

          {/* Overdue Items */}
          <div className="bg-card p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium">Overdue Items</span>
              </div>
              <Badge className={getPriorityColor(data.overdueItems, 'overdue')}>
                {data.overdueItems === 0 ? 'None' : data.overdueItems}
              </Badge>
            </div>
            <p className="text-2xl font-bold">{data.overdueItems}</p>
            <p className="text-sm text-muted-foreground">Past due date</p>
          </div>

          {/* Average Processing Time */}
          <div className="bg-card p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <PerformanceIcon className={`h-4 w-4 ${performance.color}`} />
                <span className="text-sm font-medium">Avg Processing</span>
              </div>
              <Badge variant="outline" className={performance.color}>
                {performance.status}
              </Badge>
            </div>
            <p className="text-2xl font-bold">{formatProcessingTime(data.avgProcessingTime)}</p>
            <p className="text-sm text-muted-foreground">Per approval</p>
          </div>

          {/* Compliance Alerts */}
          <div className="bg-card p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Compliance</span>
              </div>
              <Badge className={getPriorityColor(data.complianceAlerts, 'compliance')}>
                {data.complianceAlerts === 0 ? 'Good' : data.complianceAlerts}
              </Badge>
            </div>
            <p className="text-2xl font-bold">{data.complianceAlerts}</p>
            <p className="text-sm text-muted-foreground">Alerts this week</p>
          </div>
        </div>

        {/* Action Items */}
        <div className="mt-6 pt-6 border-t">
          <h4 className="font-semibold mb-4">Action Items</h4>
          <div className="space-y-3">
            {data.urgentApprovals > 0 && (
              <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="font-medium text-orange-800 dark:text-orange-200">
                    {data.urgentApprovals} urgent approval{data.urgentApprovals > 1 ? 's' : ''} need attention
                  </p>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    Review and process within 24 hours
                  </p>
                </div>
              </div>
            )}

            {data.overdueItems > 0 && (
              <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <Clock className="h-4 w-4 text-red-500" />
                <div>
                  <p className="font-medium text-red-800 dark:text-red-200">
                    {data.overdueItems} overdue item{data.overdueItems > 1 ? 's' : ''} require immediate action
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Follow up on delayed approvals
                  </p>
                </div>
              </div>
            )}

            {data.complianceAlerts > 0 && (
              <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <Shield className="h-4 w-4 text-purple-500" />
                <div>
                  <p className="font-medium text-purple-800 dark:text-purple-200">
                    {data.complianceAlerts} compliance alert{data.complianceAlerts > 1 ? 's' : ''} this week
                  </p>
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    Review rejected proposals and SLA breaches
                  </p>
                </div>
              </div>
            )}

            {data.urgentApprovals === 0 && data.overdueItems === 0 && data.complianceAlerts === 0 && (
              <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">
                    All approvals are on track
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    No urgent actions required at this time
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}