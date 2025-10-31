export interface DashboardStats {
  pendingApprovals: number;
  activeInvestments: number;
  cashRequests: number;
  slaBreaches: number;
}

export interface RecentRequest {
  id: number;
  requestId: string;
  type: 'investment' | 'cash_request';
  amount: string;
  status: string;
  createdAt: Date;
  requester: {
    firstName: string;
    lastName: string;
  };
  investmentType?: string;
  targetCompany?: string;
  expectedReturn?: string;
  riskLevel?: string;
  description?: string;
}

export interface TaskItem {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: Date | string;
  requestType: string;
  requestId: number;
  taskType?: string;
}

export interface FileUploadResponse {
  id: number;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  fileUrl: string;
}

export interface ApprovalHistoryItem {
  id: number;
  stage: number;
  approverId: number;
  status: string;
  comments: string;
  approvedAt: Date;
  approver: {
    firstName: string;
    lastName: string;
  };
}
