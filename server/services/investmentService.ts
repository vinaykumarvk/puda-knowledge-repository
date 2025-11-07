// @ts-nocheck
import { storage } from "../storage";
import { workflowService } from "./workflowService";
import { InsertInvestmentRequest, InsertCashRequest } from "@shared/schema";

export class InvestmentService {
  async createInvestmentRequest(requestData: any) {
    try {
      // Generate request ID
      const requestId = await this.generateRequestId('INV');
      
      // Determine status - use provided status or default to 'draft'
      const status = requestData.status || 'draft';
      
      // Create the request with generated fields
      const request = await storage.createInvestmentRequest({
        ...requestData,
        requestId,
        status,
      });

      // Start appropriate workflow based on status
      if (status === 'opportunity') {
        // Start admin review for opportunity status
        await workflowService.startAdminReview(request.id);
      } else if (status !== 'draft' && status !== 'changes_requested') {
        // Start regular approval workflow for other non-draft statuses
        await workflowService.startApprovalWorkflow('investment', request.id);
      }

      return request;
    } catch (error) {
      console.error('Error creating investment request:', error);
      throw error;
    }
  }

  async modifyInvestmentRequest(requestId: number, requestData: any, userId: number) {
    try {
      // Check if request exists and belongs to user
      const existingRequest = await storage.getInvestmentRequest(requestId);
      if (!existingRequest) {
        throw new Error('Investment request not found');
      }
      
      if (existingRequest.requesterId !== userId) {
        throw new Error('Unauthorized to modify this request');
      }
      
      // Check if request is in a rejectable state
      const rejectedStates = ['Manager rejected', 'Committee rejected', 'Finance rejected'];
      if (!rejectedStates.includes(existingRequest.status)) {
        throw new Error('Request cannot be modified in current state');
      }
      
      // Update the request
      const updatedRequest = await storage.updateInvestmentRequest(requestId, {
        ...requestData,
        status: 'Modified',
        currentApprovalStage: 0, // Reset to first stage
      });

      // Start the approval workflow again from stage 1
      await workflowService.startApprovalWorkflow('investment', requestId);

      return updatedRequest;
    } catch (error) {
      console.error('Error modifying investment request:', error);
      throw error;
    }
  }

  async submitDraftRequest(requestId: number, userId: number) {
    try {
      // Check if request exists and belongs to user
      const existingRequest = await storage.getInvestmentRequest(requestId);
      if (!existingRequest) {
        throw new Error('Investment request not found');
      }
      
      if (existingRequest.requesterId !== userId) {
        throw new Error('Unauthorized to submit this request');
      }
      
      if (existingRequest.status.toLowerCase() !== 'draft' && existingRequest.status.toLowerCase() !== 'changes_requested') {
        throw new Error('Only draft or changes_requested requests can be submitted');
      }
      
      // Update status to opportunity (for admin review) and reset approval stage
      const updatedRequest = await storage.updateInvestmentRequest(requestId, {
        status: 'opportunity',
        currentApprovalStage: 0,
      });

      // If this was a changes_requested proposal, preserve approval history and start new cycle
      if (existingRequest.status.toLowerCase() === 'changes_requested') {
        // Increment approval cycle and mark previous approvals as inactive (preserves audit trail)
        const newCycle = await storage.incrementApprovalCycle('investment', requestId);
        
        // Complete any pending changes_requested tasks for this request
        const pendingTasks = await storage.getTasksByRequest('investment', requestId);
        for (const task of pendingTasks) {
          if (task.taskType === 'changes_requested' && task.status === 'pending') {
            await storage.updateTask(task.id, { status: 'completed' });
          }
        }
      }

      // Start the approval workflow
      await workflowService.startApprovalWorkflow('investment', requestId);

      return updatedRequest;
    } catch (error) {
      console.error('Error submitting investment request:', error);
      throw error;
    }
  }

  async createCashRequest(requestData: InsertCashRequest) {
    try {
      // Generate request ID
      const requestId = await this.generateRequestId('CASH');
      
      // Create the request
      const request = await storage.createCashRequest({
        ...requestData,
        requestId,
        status: 'New',
      });

      // Start the approval workflow
      await workflowService.startApprovalWorkflow('cash_request', request.id);

      return request;
    } catch (error) {
      console.error('Error creating cash request:', error);
      throw error;
    }
  }

  private async generateRequestId(prefix: string): Promise<string> {
    const year = new Date().getFullYear();
    const sequenceNumber = await storage.getNextSequenceValue(`${prefix}_${year}`);
    
    // Format sequence number with leading zeros (4 digits)
    const formattedNumber = sequenceNumber.toString().padStart(4, '0');
    
    return `${prefix}-${year}-${formattedNumber}`;
  }
}

export const investmentService = new InvestmentService();
