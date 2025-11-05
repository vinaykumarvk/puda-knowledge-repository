import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { Clock, CheckSquare, AlertTriangle, Calendar, User, Download, FileText, File, ChevronDown, ChevronUp, CheckCircle, XCircle, Eye, Search, DollarSign, TrendingUp, Edit, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DocumentAnalysisCard from '@/components/documents/DocumentAnalysisCard';
import UnifiedSearchInterface from '@/components/documents/UnifiedSearchInterface';
import InvestmentRationaleModal from '@/components/rationale/InvestmentRationaleModal';
import MarkdownRenderer from '@/components/documents/MarkdownRenderer';
import { ApprovalHistoryCard } from '@/components/approval/ApprovalHistoryCard';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function MyTasks() {
  const [expandedTask, setExpandedTask] = useState<number | null>(null);
  const [comments, setComments] = useState("");
  const [isDocumentsExpanded, setIsDocumentsExpanded] = useState(false);
  const [isResearchExpanded, setIsResearchExpanded] = useState(false);
  const [isRationaleExpanded, setIsRationaleExpanded] = useState(false);
  const [isRationaleModalOpen, setIsRationaleModalOpen] = useState(false);
  const [editingRationaleId, setEditingRationaleId] = useState<number | null>(null);
  const [editingRationaleContent, setEditingRationaleContent] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [rationaleToDelete, setRationaleToDelete] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch approval tasks for the logged-in manager
  const { data: approvals = [], isLoading } = useQuery({
    queryKey: ["/api/approvals/my-tasks"],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTaskIcon = (taskType: string) => {
    switch (taskType) {
      case 'approval':
        return CheckSquare;
      case 'review':
        return Clock;
      case 'changes_requested':
        return AlertTriangle;
      default:
        return CheckSquare;
    }
  };

  const handleTaskAction = (task: any) => {
    setExpandedTask(expandedTask === task.id ? null : task.id);
    setComments("");
  };

  const processApproval = useMutation({
    mutationFn: async ({ taskId, action }: { taskId: number; action: 'approve' | 'reject' | 'changes_requested' }) => {
      const task = tasks?.find((t: any) => t.id === taskId);
      if (!task) throw new Error('Task not found');
      
      const response = await apiRequest("POST", "/api/approvals", {
        requestType: task.requestType,
        requestId: task.requestId,
        action,
        comments,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/count"] }); // Add this for sidebar task count
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/recent-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      
      toast({
        title: "Approval processed",
        description: "The request has been processed successfully",
      });
      
      setExpandedTask(null);
      setComments("");
    },
    onError: (error: any) => {
      toast({
        title: "Error processing approval",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });



  if (isLoading) {
    return (
      <div className="w-full h-full pl-6 py-6">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const pendingTasks = tasks?.filter((task: any) => task.status === 'pending') || [];
  const completedTasks = tasks?.filter((task: any) => task.status === 'completed') || [];
  const overdueTasks = tasks?.filter((task: any) => task.status === 'overdue') || [];
  
  // Combine pending and overdue tasks for the "Active" tab
  const activeTasks = [...overdueTasks, ...pendingTasks];

  return (
    <div className="w-full h-full pl-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">My Tasks</h1>
        <div className="flex gap-4 text-sm text-gray-600">
          <span>{activeTasks.length} active</span>
          <span>{completedTasks.length} completed</span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "active" | "completed")} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active" className="flex items-center gap-2">
            Active Tasks
            {activeTasks.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activeTasks.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            Completed Tasks
            {completedTasks.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {completedTasks.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          <div className="space-y-6">
            {/* Overdue Tasks Section (within Active tab) */}
            {overdueTasks.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 text-red-600">Overdue Tasks</h2>
                <div className="space-y-4">
                  {overdueTasks.map((task: any) => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      onAction={handleTaskAction}
                      isExpanded={expandedTask === task.id}
                      onProcessApproval={processApproval}
                      comments={comments}
                      setComments={setComments}
                      onPreview={() => {}}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Pending Tasks Section (within Active tab) */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Pending Tasks</h2>
              <div className="space-y-4">
                {pendingTasks.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No pending tasks</p>
                      <p className="text-sm text-gray-500 mt-2">
                        You're all caught up! Check back later for new tasks.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  pendingTasks.map((task: any) => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      onAction={handleTaskAction}
                      isExpanded={expandedTask === task.id}
                      onProcessApproval={processApproval}
                      comments={comments}
                      setComments={setComments}
                      onPreview={() => {}}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <div className="space-y-4">
            {completedTasks.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No completed tasks</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Completed tasks will appear here after you finish them.
                  </p>
                </CardContent>
              </Card>
            ) : (
              completedTasks.map((task: any) => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onAction={handleTaskAction}
                  isExpanded={expandedTask === task.id}
                  onProcessApproval={processApproval}
                  comments={comments}
                  setComments={setComments}
                  onPreview={() => {}}
                />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Preview now opens in new tab, no dialog needed */}
    </div>
  );
}

function TaskCard({ 
  task, 
  onAction, 
  isExpanded, 
  onProcessApproval,
  comments,
  setComments,
  onPreview
}: { 
  task: any; 
  onAction: (task: any) => void;
  isExpanded: boolean;
  onProcessApproval: any;
  comments: string;
  setComments: (comments: string) => void;
  onPreview: (document: any) => void;
}) {
  const Icon = getTaskIcon(task.taskType);
  const [analyzingDocument, setAnalyzingDocument] = useState<number | null>(null);
  
  // State for section expand/collapse functionality
  const [isDocumentsExpanded, setIsDocumentsExpanded] = useState(false);
  const [isResearchExpanded, setIsResearchExpanded] = useState(false);
  const [isRationaleExpanded, setIsRationaleExpanded] = useState(false);
  const [isApprovalExpanded, setIsApprovalExpanded] = useState(true); // Keep approval history expanded by default
  const [isRationaleModalOpen, setIsRationaleModalOpen] = useState(false);
  const [editingRationaleId, setEditingRationaleId] = useState<number | null>(null);
  const [editingRationaleContent, setEditingRationaleContent] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [rationaleToDelete, setRationaleToDelete] = useState<number | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: requestData } = useQuery({
    queryKey: [`/api/${task.requestType.replace('_', '-')}s/${task.requestId}`],
    enabled: isExpanded,
  });

  const { data: approvalHistory } = useQuery({
    queryKey: [`/api/approvals/${task.requestType}/${task.requestId}`],
    enabled: isExpanded,
  });

  const { data: documents } = useQuery({
    queryKey: [`/api/documents/${task.requestType}/${task.requestId}`],
    enabled: isExpanded,
  });

  // Fetch rationales for investment tasks
  const { data: rationales } = useQuery({
    queryKey: [`/api/investments/${task.requestId}/rationales`],
    enabled: isExpanded && task.requestType === 'investment',
  });

  // Auto-expand rationale section when rationales exist
  useEffect(() => {
    if (rationales && rationales.length > 0 && !isRationaleExpanded) {
      setIsRationaleExpanded(true);
    }
  }, [rationales]);

  // DocumentAnalysisCard component now handles the analysis results directly

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    return <File className="h-5 w-5 text-gray-500" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
      case 'approve':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <User className="h-5 w-5 text-gray-600" />;
    }
  };

  const handleDownload = async (document: any) => {
    try {
      console.log('Starting download for document:', document);
      // Use direct link approach for better browser compatibility
      const link = window.document.createElement('a');
      link.href = `/api/documents/download/${document.id}`;
      link.download = document.originalName;
      link.target = '_blank';
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      console.log('Download initiated successfully');
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please try again or contact support.');
    }
  };

  // Rationale mutation functions
  const saveRationaleEdit = useMutation({
    mutationFn: async ({ rationaleId, content }: { rationaleId: number; content: string }) => {
      const response = await apiRequest('PUT', `/api/investments/${task.requestId}/rationales/${rationaleId}`, { content });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/investments/${task.requestId}/rationales`] });
      setEditingRationaleId(null);
      setEditingRationaleContent('');
      toast({ title: "Rationale updated successfully" });
    },
    onError: () => {
      toast({ 
        title: "Error updating rationale", 
        variant: "destructive" 
      });
    }
  });

  const deleteRationale = useMutation({
    mutationFn: async (rationaleId: number) => {
      const response = await apiRequest('DELETE', `/api/investments/${task.requestId}/rationales/${rationaleId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/investments/${task.requestId}/rationales`] });
      setDeleteConfirmOpen(false);
      setRationaleToDelete(null);
      toast({ title: "Rationale deleted successfully" });
    },
    onError: () => {
      toast({ 
        title: "Error deleting rationale", 
        variant: "destructive" 
      });
    }
  });

  const downloadRationale = async (rationale: any) => {
    try {
      // Import jsPDF dynamically
      const jsPDF = (await import('jspdf')).default;
      const doc = new jsPDF();
      
      // Set up the document
      doc.setFontSize(16);
      doc.text('Investment Rationale', 20, 20);
      
      doc.setFontSize(12);
      doc.text(`Investment: ${requestData?.targetCompany || 'N/A'}`, 20, 35);
      doc.text(`Author: ${rationale.authorName}`, 20, 45);
      doc.text(`Created: ${format(new Date(rationale.createdAt), 'MMM dd, yyyy HH:mm')}`, 20, 55);
      doc.text(`Type: ${rationale.type === 'manual' ? 'Manual Entry' : 'AI Generated'}`, 20, 65);
      
      // Process the content to handle spacing issues
      let processedContent = rationale.content
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/(\w)\s+(\w)/g, '$1$2') // Remove spaces between letters within words
        .replace(/([a-z])\s*-\s*([a-z])/gi, '$1-$2') // Fix hyphenated words
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove markdown bold
        .replace(/##\s*(.*?)[\r\n]/g, '$1\n') // Clean headers
        .trim();
      
      // Add content with proper text wrapping
      const lines = doc.splitTextToSize(processedContent, 170); // 170mm width for A4
      doc.text(lines, 20, 80);
      
      // Save the PDF
      doc.save(`investment-rationale-${rationale.id}.pdf`);
      
      toast({ title: "Rationale downloaded successfully" });
    } catch (error) {
      console.error('PDF download failed:', error);
      toast({ 
        title: "Error downloading rationale", 
        variant: "destructive" 
      });
    }
  };



  
  return (
    <>
    <Card className={`hover:shadow-md transition-shadow ${
      task.status === 'overdue' ? 'border-l-4 border-red-500' : ''
    }`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              task.status === 'overdue' ? 'bg-red-100' : 
              task.status === 'completed' ? 'bg-green-100' : 'bg-blue-100'
            }`}>
              <Icon className={`h-5 w-5 ${
                task.status === 'overdue' ? 'text-red-600' : 
                task.status === 'completed' ? 'text-green-600' : 'text-blue-600'
              }`} />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-semibold">{task.title}</h3>
                <Badge className={getStatusColor(task.status)}>
                  {task.status}
                </Badge>
                <Badge className={getPriorityColor(task.priority)}>
                  {task.priority}
                </Badge>
              </div>
              
              <p className="text-gray-600 mb-3">{task.description}</p>
              
              {/* Show Request ID and Investment Type on main card */}
              <div className="flex items-center gap-4 text-sm mb-3">
                <div className="flex items-center gap-1 font-semibold text-blue-600">
                  <span>Request ID:</span>
                  <span>{task.requestId}</span>
                </div>
                <div className="flex items-center gap-1 font-semibold text-purple-600">
                  <span>Type:</span>
                  <span className="capitalize">{task.investmentType || task.requestType.replace('_', ' ')}</span>
                </div>
              </div>
              
              {/* Add 3-column grid for proposal details */}
              {requestData && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-600">Amount:</span>
                    <span className="font-semibold">${requestData.amount}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-600">Expected Return:</span>
                    <span className="font-semibold">
                      {requestData.expectedReturnType === 'range' && requestData.expectedReturnMin && requestData.expectedReturnMax
                        ? `${requestData.expectedReturnMin}% - ${requestData.expectedReturnMax}%`
                        : `${requestData.expectedReturn}%`
                      }
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-600">Created:</span>
                    <span className="font-semibold">{format(new Date(requestData.createdAt), 'MMM dd, yyyy')}</span>
                  </div>
                </div>
              )}
              
              {/* Show description if available */}
              {requestData?.description && (
                <p className="text-sm text-gray-600 mb-4">{requestData.description}</p>
              )}
              
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {task.dueDate ? format(new Date(task.dueDate), 'MMM dd, yyyy') : 'No due date'}
                </div>
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {task.requestType.replace('_', ' ')}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onAction(task)}>
              {isExpanded ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
              {isExpanded ? 'Hide Details' : 'View Details'}
            </Button>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && requestData && (
          <div className="mt-6 space-y-6 pt-6 border-t">
            {/* I. Attached Documents */}
            {documents && documents.length > 0 && (
              <Card>
                <CardHeader 
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors py-3"
                  onClick={() => setIsDocumentsExpanded(!isDocumentsExpanded)}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="h-4 w-4" />
                      Attached Documents
                    </CardTitle>
                    {isDocumentsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </CardHeader>
                {isDocumentsExpanded && (
                  <CardContent className="pt-0 pb-4">
                    <div className="space-y-3">
                      {documents.map((document: any) => (
                        <DocumentAnalysisCard
                          key={document.id}
                          document={document}
                          requestType={task.requestType}
                          requestId={task.requestId}
                          hideRiskAssessment={true}
                          hideKeyInfoHeader={true}
                          simplifiedView={true}
                        />
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )}

            {/* II. Research & Analysis */}
            {documents && documents.length > 0 && (
              <Card>
                <CardHeader 
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors py-3"
                  onClick={() => setIsResearchExpanded(!isResearchExpanded)}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Search className="h-4 w-4" />
                      Research & Analysis
                    </CardTitle>
                    {isResearchExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </CardHeader>
                {isResearchExpanded && (
                  <CardContent className="pt-0 pb-4">
                    <UnifiedSearchInterface 
                      documents={documents}
                      requestId={task.requestId}
                      requestType={task.requestType}
                      isExpanded={isResearchExpanded}
                      onExpandedChange={setIsResearchExpanded}
                    />
                  </CardContent>
                )}
              </Card>
            )}

            {/* III. Analyst Notes */}
            <Card>
              <CardHeader 
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors py-3"
                onClick={() => setIsRationaleExpanded(!isRationaleExpanded)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4" />
                    Analyst Notes
                  </CardTitle>
                  {isRationaleExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardHeader>
              {isRationaleExpanded && (
                <CardContent className="pt-0 pb-4">
                  {/* Show Analyst's Original Notes */}
                  <div className="bg-gray-50 p-3 rounded border min-h-[60px] mb-4">
                    <MarkdownRenderer 
                      content={requestData?.description || 'No description provided by the analyst'}
                      className="text-gray-800"
                    />
                  </div>
                </CardContent>
              )}
            </Card>

            {/* IV. Investment Rationale (Formal Analysis) */}
            <Card>
              <CardHeader 
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors py-3"
                onClick={() => setIsRationaleExpanded(!isRationaleExpanded)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4" />
                    Investment Rationale
                    {rationales && rationales.length > 0 && (
                      <Badge variant="secondary">{rationales.length}</Badge>
                    )}
                  </CardTitle>
                  {isRationaleExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardHeader>
              {isRationaleExpanded && (
                <CardContent className="pt-0 pb-4">
                  {/* Investment Rationales */}
                  {rationales && rationales.length > 0 ? (
                    <div className="space-y-4">
                      {rationales.map((rationale: any) => (
                        <Card key={rationale.id} className="bg-gray-50 border-l-4 border-blue-500">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-xs text-gray-500">
                                    by {rationale.author?.firstName} {rationale.author?.lastName} • {format(new Date(rationale.createdAt), 'MMM dd, yyyy HH:mm')}
                                  </span>
                                </div>
                                
                                {editingRationaleId === rationale.id ? (
                                  <div className="space-y-3">
                                    <Textarea
                                      value={editingRationaleContent}
                                      onChange={(e) => setEditingRationaleContent(e.target.value)}
                                      rows={10}
                                      className="w-full"
                                    />
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setEditingRationaleId(null);
                                          setEditingRationaleContent('');
                                        }}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={() => saveRationaleEdit.mutate({
                                          rationaleId: rationale.id,
                                          content: editingRationaleContent
                                        })}
                                        disabled={saveRationaleEdit.isPending}
                                      >
                                        {saveRationaleEdit.isPending ? 'Saving...' : 'Save Changes'}
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="prose prose-sm max-w-none">
                                    <div className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded border">
                                      <MarkdownRenderer content={rationale.content} />
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              {editingRationaleId !== rationale.id && (
                                <div className="flex gap-1 ml-4">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => downloadRationale(rationale)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Download className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingRationaleId(rationale.id);
                                      setEditingRationaleContent(rationale.content);
                                    }}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setRationaleToDelete(rationale.id);
                                      setDeleteConfirmOpen(true);
                                    }}
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">No investment rationale added yet.</p>
                    </div>
                  )}
                  
                  {/* Add Rationale Button */}
                  <div className="pt-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsRationaleModalOpen(true)}
                      className="flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Add Investment Rationale
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* IV. Approval History */}
            <ApprovalHistoryCard
              requestType={task.requestType}
              requestId={task.requestId}
              isExpanded={isApprovalExpanded}
              onToggle={() => setIsApprovalExpanded(!isApprovalExpanded)}
            />



            {/* Comments and Actions */}
            {task.status === 'pending' && (
              <div className="bg-gray-50 p-4 rounded-lg">
                {task.taskType === 'changes_requested' ? (
                  // Actions for changes requested tasks
                  <div className="space-y-4">
                    <div className="text-center">
                      <h4 className="font-semibold mb-2 text-orange-800">Changes Requested</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Please review the requested changes and update your proposal accordingly.
                      </p>
                      <Button
                        onClick={() => window.location.href = '/investments'}
                        className="flex items-center gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        Go to My Investments
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Actions for approval tasks
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="comments">Comments (Required)</Label>
                      <Textarea
                        id="comments"
                        rows={3}
                        placeholder="Please provide your comments or feedback..."
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        className="mt-2"
                        required
                      />
                      {comments.trim() === '' && (
                        <p className="text-sm text-red-500 mt-1">
                          Comments are required before approving or rejecting
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-end space-x-4">
                      <Button
                        variant="destructive"
                        onClick={() => onProcessApproval.mutate({ taskId: task.id, action: 'reject' })}
                        disabled={onProcessApproval.isPending || comments.trim() === ''}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => onProcessApproval.mutate({ taskId: task.id, action: 'changes_requested' })}
                        disabled={onProcessApproval.isPending || comments.trim() === ''}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Request Changes
                      </Button>
                      <Button
                        onClick={() => onProcessApproval.mutate({ taskId: task.id, action: 'approve' })}
                        disabled={onProcessApproval.isPending || comments.trim() === ''}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
    
    {/* Investment Rationale Modal */}
    <InvestmentRationaleModal
      isOpen={isRationaleModalOpen}
      onClose={() => setIsRationaleModalOpen(false)}
      investmentId={task.requestId}
      investmentType={requestData?.investmentType}
    />
    
    {/* Delete Confirmation Dialog */}
    <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Investment Rationale</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this investment rationale? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => {
            setDeleteConfirmOpen(false);
            setRationaleToDelete(null);
          }}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (rationaleToDelete) {
                deleteRationale.mutate(rationaleToDelete);
              }
            }}
            className="bg-red-600 hover:bg-red-700"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}

function getTaskIcon(taskType: string) {
  switch (taskType) {
    case 'approval':
      return CheckSquare;
    case 'review':
      return Clock;
    case 'changes_requested':
      return AlertTriangle;
    default:
      return CheckSquare;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'completed':
    case 'approved':
    case 'approve':
    case 'Admin approved':
    case 'Manager approved':
    case 'Committee approved':
    case 'Finance approved':
      return 'bg-green-100 text-green-800';
    case 'overdue':
    case 'rejected':
    case 'admin_rejected':
    case 'Manager rejected':
    case 'Committee rejected':
    case 'Finance rejected':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getStatusColorForBadge(status: string) {
  switch (status) {
    case 'opportunity':
      return 'bg-purple-100 text-purple-800';
    case 'Admin approved':
    case 'Manager approved':
    case 'Committee approved':
    case 'Finance approved':
    case 'approved':
      return 'bg-green-100 text-green-800';
    case 'admin_rejected':
    case 'Manager rejected':
    case 'Committee rejected':
    case 'Finance rejected':
    case 'rejected':
      return 'bg-red-100 text-red-800';
    case 'changes_requested':
      return 'bg-orange-100 text-orange-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'Admin approved':
    case 'Manager approved':
    case 'Committee approved':
    case 'Finance approved':
    case 'approved':
      return <CheckCircle className="w-4 h-4" />;
    case 'admin_rejected':
    case 'Manager rejected':
    case 'Committee rejected':
    case 'Finance rejected':
    case 'rejected':
      return <XCircle className="w-4 h-4" />;
    case 'changes_requested':
      return <AlertTriangle className="w-4 h-4" />;
    case 'pending':
      return <Clock className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'low':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
