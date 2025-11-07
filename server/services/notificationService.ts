// @ts-nocheck
import { storage } from "../storage";

export class NotificationService {
  async notifyRequestApproved(requestType: string, requestId: number) {
    // Get request details to find requester
    let request;
    if (requestType === 'investment') {
      request = await storage.getInvestmentRequest(requestId);
    } else {
      request = await storage.getCashRequest(requestId);
    }

    if (!request) return;

    await storage.createNotification({
      userId: request.requesterId!,
      title: 'Request Approved',
      message: `Your ${requestType.replace('_', ' ')} request has been approved`,
      type: 'status_update',
      relatedType: requestType,
      relatedId: requestId,
    });
  }

  async notifyRequestRejected(requestType: string, requestId: number) {
    // Get request details to find requester
    let request;
    if (requestType === 'investment') {
      request = await storage.getInvestmentRequest(requestId);
    } else {
      request = await storage.getCashRequest(requestId);
    }

    if (!request) return;

    await storage.createNotification({
      userId: request.requesterId!,
      title: 'Request Rejected',
      message: `Your ${requestType.replace('_', ' ')} request has been rejected`,
      type: 'status_update',
      relatedType: requestType,
      relatedId: requestId,
    });
  }

  async notifyChangesRequested(requestType: string, requestId: number) {
    // Get request details to find requester
    let request;
    if (requestType === 'investment') {
      request = await storage.getInvestmentRequest(requestId);
    } else {
      request = await storage.getCashRequest(requestId);
    }

    if (!request) return;

    await storage.createNotification({
      userId: request.requesterId!,
      title: 'Changes Requested',
      message: `Changes have been requested for your ${requestType.replace('_', ' ')} request`,
      type: 'status_update',
      relatedType: requestType,
      relatedId: requestId,
    });
  }

  async notifyTaskAssigned(userId: number, taskId: number) {
    await storage.createNotification({
      userId,
      title: 'New Task Assigned',
      message: 'A new task has been assigned to you',
      type: 'task_assigned',
      relatedType: 'task',
      relatedId: taskId,
    });
  }

  async notifyPreviousApprovers(
    requestType: string, 
    requestId: number, 
    higherStageAction: 'rejected' | 'changes_requested' | 'cancelled',
    higherStageRole: string,
    higherStageComments?: string
  ) {
    try {
      // Get investment/cash request details for summary
      let request;
      if (requestType === 'investment') {
        request = await storage.getInvestmentRequest(requestId);
      } else {
        request = await storage.getCashRequest(requestId);
      }

      if (!request) return;

      // Get current cycle approvals to find previous approvers
      const currentApprovals = await storage.getCurrentCycleApprovalsByRequest(requestType, requestId);
      const approvedApprovals = currentApprovals.filter(approval => 
        approval.status.includes('approved') && approval.approverId
      );

      // Create investment summary for popup display
      const investmentSummary = {
        requestId: request.requestId,
        targetCompany: requestType === 'investment' ? (request as any).targetCompany : 'N/A',
        amount: request.amount,
        investmentType: requestType === 'investment' ? (request as any).investmentType : 'cash_request',
        expectedReturn: requestType === 'investment' ? (request as any).expectedReturn : null,
        riskLevel: requestType === 'investment' ? (request as any).riskLevel : null,
      };

      // Role name mapping for user-friendly display
      const roleNames = {
        admin: 'Admin',
        manager: 'Manager', 
        committee_member: 'Committee',
        finance: 'Finance'
      };

      const higherStageName = roleNames[higherStageRole as keyof typeof roleNames] || higherStageRole;
      const actionText = higherStageAction === 'changes_requested' ? 'requested changes' : higherStageAction;

      // Notify each previous approver
      for (const approval of approvedApprovals) {
        if (approval.approverId) {
          const approverRole = await storage.getUser(approval.approverId);
          const approverRoleName = roleNames[approverRole?.role as keyof typeof roleNames] || approverRole?.role;

          await storage.createNotification({
            userId: approval.approverId,
            title: `Investment ${actionText} by ${higherStageName}`,
            message: `${request.requestId} (${investmentSummary.targetCompany}) that you approved as ${approverRoleName} has been ${actionText} by ${higherStageName}`,
            type: 'higher_stage_action',
            relatedType: requestType,
            relatedId: requestId,
            previousApproverStage: approval.stage,
            higherStageAction,
            higherStageRole,
            higherStageComments: higherStageComments || null,
            investmentSummary,
          });
        }
      }
    } catch (error) {
      console.error('Error notifying previous approvers:', error);
    }
  }

  async notifySLABreach(userId: number, requestType: string, requestId: number) {
    await storage.createNotification({
      userId,
      title: 'SLA Breach Warning',
      message: `${requestType.replace('_', ' ')} request is approaching SLA deadline`,
      type: 'sla_warning',
      relatedType: requestType,
      relatedId: requestId,
    });
  }
}

export const notificationService = new NotificationService();
