// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, X, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  relatedType: string;
  relatedId: number;
  previousApproverStage?: number;
  higherStageAction?: string;
  higherStageRole?: string;
  higherStageComments?: string;
  investmentSummary?: {
    requestId: string;
    targetCompany: string;
    amount: string;
    investmentType: string;
    expectedReturn?: string;
    riskLevel?: string;
  };
  createdAt: string;
}

interface NotificationSummaryProps {
  notification: Notification;
  onViewDetails: (notification: Notification) => void;
  onDismiss: (id: number) => void;
}

function NotificationSummary({ notification, onViewDetails, onDismiss }: NotificationSummaryProps) {
  const { investmentSummary, higherStageComments, higherStageRole, higherStageAction } = notification;
  
  if (!investmentSummary) {
    return (
      <div className="p-3 border rounded-lg bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium">{notification.title}</h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDismiss(notification.id)}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
          {notification.message}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onViewDetails(notification)}
          className="text-xs h-7"
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          View Details
        </Button>
      </div>
    );
  }

  const roleNames = {
    admin: 'Admin',
    manager: 'Manager',
    committee_member: 'Committee',
    finance: 'Finance'
  };

  const higherStageName = roleNames[higherStageRole as keyof typeof roleNames] || higherStageRole;
  const actionText = higherStageAction === 'changes_requested' ? 'requested changes' : higherStageAction;

  return (
    <Card className="border border-orange-200 dark:border-orange-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-orange-800 dark:text-orange-200">
            Investment {actionText} by {higherStageName}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDismiss(notification.id)}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {/* Investment Summary */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="font-medium">Request ID:</span>
            <p className="text-blue-600 dark:text-blue-400">{investmentSummary.requestId}</p>
          </div>
          <div>
            <span className="font-medium">Company:</span>
            <p>{investmentSummary.targetCompany}</p>
          </div>
          <div>
            <span className="font-medium">Amount:</span>
            <p>${parseFloat(investmentSummary.amount).toLocaleString()}</p>
          </div>
          <div>
            <span className="font-medium">Type:</span>
            <p className="capitalize">{investmentSummary.investmentType}</p>
          </div>
          {(investmentSummary.expectedReturn || (investmentSummary.expectedReturnMin && investmentSummary.expectedReturnMax)) && (
            <div>
              <span className="font-medium">Expected Return:</span>
              <p>
                {investmentSummary.expectedReturnType === 'range' && investmentSummary.expectedReturnMin && investmentSummary.expectedReturnMax
                  ? `${investmentSummary.expectedReturnMin}% - ${investmentSummary.expectedReturnMax}%`
                  : `${investmentSummary.expectedReturn}%`
                }
              </p>
            </div>
          )}
          {investmentSummary.riskLevel && (
            <div>
              <span className="font-medium">Risk Level:</span>
              <Badge variant={
                investmentSummary.riskLevel === 'low' ? 'default' :
                investmentSummary.riskLevel === 'medium' ? 'secondary' : 'destructive'
              } className="text-xs">
                {investmentSummary.riskLevel}
              </Badge>
            </div>
          )}
        </div>

        {/* Higher Stage Comments */}
        {higherStageComments && (
          <div className="mt-3 p-2 bg-gray-100 dark:bg-gray-700 rounded">
            <span className="text-xs font-medium">{higherStageName} Comments:</span>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
              {higherStageComments}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(notification)}
            className="text-xs h-7 flex-1"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: notifications = [], refetch } = useQuery({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000, // Poll every 30 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const dismissNotificationMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/notifications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const unreadCount = notifications.filter((n: Notification) => !n.isRead).length;

  const handleViewDetails = (notification: Notification) => {
    // Mark as read when viewing details
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    
    // Navigate to investment details
    if (notification.relatedType === 'investment') {
      window.location.href = '/investments';
    }
    
    setIsOpen(false);
  };

  const handleDismiss = (id: number) => {
    dismissNotificationMutation.mutate(id);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} unread
              </Badge>
            )}
          </div>
        </div>

        <ScrollArea className="h-96">
          <div className="p-3 space-y-3">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              notifications.map((notification: Notification) => (
                <div key={notification.id} className={`${!notification.isRead ? 'opacity-100' : 'opacity-70'}`}>
                  {notification.type === 'higher_stage_action' ? (
                    <NotificationSummary
                      notification={notification}
                      onViewDetails={handleViewDetails}
                      onDismiss={handleDismiss}
                    />
                  ) : (
                    <div className="p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                      <div className="flex items-start justify-between mb-1">
                        <h4 className="text-sm font-medium">{notification.title}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDismiss(notification.id)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </span>
                        {notification.relatedType && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(notification)}
                            className="text-xs h-6"
                          >
                            View
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                  {notifications.indexOf(notification) < notifications.length - 1 && (
                    <Separator className="my-2" />
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}