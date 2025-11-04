import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle, AlertTriangle, Clock, Eye, ChevronDown, ChevronUp, Edit, Send, FileText, Upload, X, Save, Search, Download, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DocumentAnalysisCard from "@/components/documents/DocumentAnalysisCard";
import { DocumentAIAnalysis } from "@/components/documents/DocumentAIAnalysis";
import { MarketRegulationResearch } from "@/components/research/MarketRegulationResearch";
import { EnhancedDocumentCategorySelector } from "@/components/documents/EnhancedDocumentCategorySelector";
import MarkdownRenderer from "@/components/documents/MarkdownRenderer";
import { ApprovalHistoryCard } from '@/components/approval/ApprovalHistoryCard';
import { ReportWorkChat } from "@/components/report/ReportWorkChat";

// Edit form schema
const editFormSchema = z.object({
  targetCompany: z.string().min(1, "Target company is required"),
  investmentType: z.enum(["equity", "debt", "real_estate", "alternative"]),
  description: z.string().optional(),
});

interface InvestmentDetailsInlineProps {
  investment: any;
  isExpanded: boolean;
  onToggle: () => void;
}

export function InvestmentDetailsInline({ investment, isExpanded, onToggle }: InvestmentDetailsInlineProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [filesToDelete, setFilesToDelete] = useState<number[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<any[]>([]);
  const [isWorkChatOpen, setIsWorkChatOpen] = useState(false);
  const [isDocumentsExpanded, setIsDocumentsExpanded] = useState(false);
  const [isResearchExpanded, setIsResearchExpanded] = useState(false);
  const [isApprovalExpanded, setIsApprovalExpanded] = useState(true);
  const [isRationaleExpanded, setIsRationaleExpanded] = useState(true);

  // Fetch detailed investment data when expanded
  const { data: investmentDetails, isLoading: isInvestmentLoading } = useQuery({
    queryKey: [`/api/investments/${investment?.id}`],
    enabled: !!investment?.id && isExpanded,
  });

  // Fetch approval history
  const { data: approvalHistory } = useQuery({
    queryKey: [`/api/approvals/investment/${investment?.id}`],
    enabled: !!investment?.id && isExpanded,
  });

  // Fetch documents
  const { data: documents } = useQuery({
    queryKey: [`/api/documents/investment/${investment?.id}`],
    enabled: !!investment?.id && isExpanded,
  });

  // Edit form
  const editForm = useForm<z.infer<typeof editFormSchema>>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      targetCompany: "",
      investmentType: "equity",
      description: "",
    },
  });

  // Initialize form when investment details are loaded using useEffect
  useEffect(() => {
    if (investmentDetails && typeof investmentDetails === 'object' && 'targetCompany' in investmentDetails && !isInlineEditing) {
      const details = investmentDetails as any;
      editForm.reset({
        targetCompany: details.targetCompany || "",
        investmentType: details.investmentType || "equity",
        description: details.description || "",
      });
    }
  }, [investmentDetails, isInlineEditing]);

  // Mutations
  const editDraftMutation = useMutation({
    mutationFn: async (data: z.infer<typeof editFormSchema>) => {
      return apiRequest('PUT', `/api/investments/${investment.id}`, data);
    },
    onSuccess: () => {
      // Invalidate investment-specific queries
      queryClient.invalidateQueries({ queryKey: [`/api/investments/${investment.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/investments'] });
      
      // Invalidate task and approval queries (for approvers to see changes)
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/approvals'] });
      queryClient.invalidateQueries({ queryKey: [`/api/approvals/investment/${investment.id}`] });
      
      // Invalidate document queries
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      queryClient.invalidateQueries({ queryKey: [`/api/documents/investment/${investment.id}`] });
      
      // Invalidate dashboard queries (for approver dashboards)
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/recent-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      
      // Invalidate task count for sidebar updates
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/count'] });
      
      toast({ title: "Investment updated successfully" });
      setIsInlineEditing(false);
    },
    onError: () => {
      toast({ title: "Failed to update investment", variant: "destructive" });
    },
  });

  const uploadFilesMutation = useMutation({
    mutationFn: async () => {
      if (uploadedFiles.length === 0) return;
      
      const formData = new FormData();
      uploadedFiles.forEach((file) => {
        formData.append('documents', file);
      });
      formData.append('requestType', 'investment');
      formData.append('requestId', investment.id.toString());
      
      // Add categories data
      if (selectedCategories.length > 0) {
        formData.append('categories', JSON.stringify(selectedCategories));
      }

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${errorText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate document-specific queries
      queryClient.invalidateQueries({ queryKey: [`/api/documents/investment/${investment.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      
      // Invalidate investment-specific queries
      queryClient.invalidateQueries({ queryKey: [`/api/investments/${investment.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/investments'] });
      
      // Invalidate task and approval queries (for approvers)
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/approvals'] });
      queryClient.invalidateQueries({ queryKey: [`/api/approvals/investment/${investment.id}`] });
      
      // Invalidate dashboard queries (critical for approver visibility)
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/recent-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      
      // Invalidate task count for sidebar updates
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/count'] });
      
      setUploadedFiles([]);
      toast({ title: "Files uploaded successfully" });
    },
    onError: () => {
      toast({ title: "Failed to upload files", variant: "destructive" });
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async () => {
      const deletePromises = filesToDelete.map(documentId =>
        apiRequest('DELETE', `/api/documents/${documentId}`)
      );
      return Promise.all(deletePromises);
    },
    onSuccess: () => {
      // Invalidate document-specific queries
      queryClient.invalidateQueries({ queryKey: [`/api/documents/investment/${investment.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      
      // Invalidate investment-specific queries
      queryClient.invalidateQueries({ queryKey: [`/api/investments/${investment.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/investments'] });
      
      // Invalidate task and approval queries (for approvers)
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/approvals'] });
      queryClient.invalidateQueries({ queryKey: [`/api/approvals/investment/${investment.id}`] });
      
      // Invalidate dashboard queries (critical for approver visibility)
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/recent-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      
      // Invalidate task count for sidebar updates
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/count'] });
      
      setFilesToDelete([]);
      toast({ title: "Documents deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete documents", variant: "destructive" });
    },
  });

  const submitDraftMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/investments/${investment.id}/submit`);
    },
    onSuccess: () => {
      // Invalidate investment-specific queries
      queryClient.invalidateQueries({ queryKey: [`/api/investments/${investment.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/investments'] });
      
      // Invalidate task and approval queries (critical for approvers to see resubmission)
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/approvals'] });
      queryClient.invalidateQueries({ queryKey: [`/api/approvals/investment/${investment.id}`] });
      
      // Invalidate document queries (so approvers see new documents)
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      queryClient.invalidateQueries({ queryKey: [`/api/documents/investment/${investment.id}`] });
      
      // Invalidate dashboard queries (critical for approver dashboards)
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/recent-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      
      // Invalidate task count for sidebar updates
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/count'] });
      
      toast({ title: "Investment submitted for approval successfully" });
      setIsInlineEditing(false);
    },
    onError: () => {
      toast({ title: "Failed to submit investment", variant: "destructive" });
    },
  });

  // Handlers
  const handleInlineEdit = () => {
    setIsInlineEditing(true);
  };

  const handleSaveInlineEdit = async () => {
    try {
      // Validate form
      const formData = editForm.getValues();
      const validatedData = editFormSchema.parse(formData);
      
      // Save changes
      await editDraftMutation.mutateAsync(validatedData);
      
      // Upload new files if any
      if (uploadedFiles.length > 0) {
        await uploadFilesMutation.mutateAsync();
      }
      
      // Delete files if any
      if (filesToDelete.length > 0) {
        await deleteDocumentMutation.mutateAsync();
      }
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  const handleCancelInlineEdit = () => {
    setIsInlineEditing(false);
    setUploadedFiles([]);
    setFilesToDelete([]);
    // Reset form to original values
    if (investmentDetails && typeof investmentDetails === 'object') {
      const details = investmentDetails as any;
      editForm.reset({
        targetCompany: details.targetCompany || "",
        investmentType: details.investmentType || "equity",
        description: details.description || "",
      });
    }
  };

  const handleSubmitDraft = async () => {
    try {
      // First save any pending changes
      if (isInlineEditing) {
        const formData = editForm.getValues();
        const validatedData = editFormSchema.parse(formData);
        await editDraftMutation.mutateAsync(validatedData);
        
        // Upload new files if any
        if (uploadedFiles.length > 0) {
          await uploadFilesMutation.mutateAsync();
        }
        
        // Delete files if any
        if (filesToDelete.length > 0) {
          await deleteDocumentMutation.mutateAsync();
        }
      }
      
      // Then submit for approval
      await submitDraftMutation.mutateAsync();
    } catch (error) {
      console.error('Submit failed:', error);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const handleCategoriesChange = (categories: any[]) => {
    setSelectedCategories(categories);
  };

  const handleRemoveUploadedFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteDocument = (documentId: number) => {
    setFilesToDelete(prev => [...prev, documentId]);
  };

  const handleUndoDelete = (documentId: number) => {
    setFilesToDelete(prev => prev.filter(id => id !== documentId));
  };

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'New':
      case 'Modified':
        return 'bg-blue-100 text-blue-800';
      case 'Manager approved':
      case 'Committee approved':
      case 'Finance approved':
      case 'approved':
        return 'bg-green-100 text-green-800';
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
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'opportunity':
        return <AlertTriangle className="w-4 h-4" />;
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
        return <AlertTriangle className="w-4 h-4" />;
      case 'changes_requested':
        return <AlertTriangle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };


  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-between">
          <span className="flex items-center">
            <Eye className="w-4 h-4 mr-2" />
            View Details
          </span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="mt-4">
        {isInvestmentLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : investmentDetails && typeof investmentDetails === 'object' && 'targetCompany' in investmentDetails ? (
          <div className="space-y-6">
            {/* I. Report Details Summary */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  Report Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Report Code:</span>
                    <span className="font-medium text-blue-600 dark:text-blue-400">{investment?.reportCode || investment?.requestId || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Subject/Client:</span>
                    <span className="font-medium">{investment?.targetCompany || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Type:</span>
                    <span className="font-medium capitalize">{investment?.investmentType?.replace('_', ' ') || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Created:</span>
                    <span className="font-medium">{format(new Date(investment?.createdAt || new Date()), 'MMM dd, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                    <Badge className={getStatusColor(investment?.status || 'draft')}>
                      {investment?.status || 'Draft'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* II. Analyst Notes / Description */}
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
                
                  {isInlineEditing ? (
                  <Form {...editForm}>
                    <div className="space-y-4">
                      <FormField
                        control={editForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter investment description..." 
                                rows={4}
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Additional editing fields */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={editForm.control}
                          name="targetCompany"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Subject/Client</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter subject or client name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={editForm.control}
                          name="investmentType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Report Type</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select report type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="equity">Equity</SelectItem>
                                  <SelectItem value="debt">Debt</SelectItem>
                                  <SelectItem value="real_estate">Real Estate</SelectItem>
                                  <SelectItem value="alternative">Alternative</SelectItem>
                                  <SelectItem value="base_document">Base Document</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </Form>
                ) : (
                  <div className="bg-gray-50 p-3 rounded border min-h-[60px]">
                    <MarkdownRenderer 
                      content={(investmentDetails && typeof investmentDetails === 'object' && 'description' in investmentDetails) 
                        ? (investmentDetails as any).description || 'No description provided by the analyst'
                        : 'No description provided by the analyst'}
                      className="text-gray-800"
                    />
                  </div>
                )}
                
                {/* Edit Draft Actions */}
                {(investmentDetails && typeof investmentDetails === 'object' && 'status' in investmentDetails && 
                  ((investmentDetails as any).status?.toLowerCase() === 'draft' || (investmentDetails as any).status?.toLowerCase() === 'changes_requested')) && (
                  <div className="mt-4 flex gap-2">
                    {isInlineEditing ? (
                      <>
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={handleSaveInlineEdit}
                          disabled={editDraftMutation.isPending || uploadFilesMutation.isPending || deleteDocumentMutation.isPending}
                          className="flex items-center gap-2"
                        >
                          <Save className="h-4 w-4" />
                          {editDraftMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                        <Button 
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelInlineEdit}
                          disabled={editDraftMutation.isPending || uploadFilesMutation.isPending || deleteDocumentMutation.isPending}
                          className="flex items-center gap-2"
                        >
                          <X className="h-4 w-4" />
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleInlineEdit}
                        className="flex items-center gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        Edit Draft
                      </Button>
                    )}
                  </div>
                )}
                
                {/* Document Management - shown during inline editing */}
                {isInlineEditing && (
                  <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                    <h5 className="font-medium mb-3">Document Management</h5>
                    
                    {/* Enhanced Document Upload with Categories */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-3">Upload New Documents with Categories</label>
                      <div className="space-y-4">
                        <EnhancedDocumentCategorySelector
                          onCategoriesChange={setSelectedCategories}
                          initialCategories={[]}
                          disabled={false}
                        />
                        <div className="flex items-center gap-2">
                          <Input
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                            onChange={handleFileUpload}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => document.querySelector('input[type="file"]')?.click()}
                            className="flex items-center gap-2"
                          >
                            <Upload className="h-4 w-4" />
                            Browse
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {/* New Files Preview */}
                    {uploadedFiles.length > 0 && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">New Files to Upload</label>
                        <div className="space-y-2">
                          {uploadedFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded border">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-blue-600" />
                                <span className="text-sm">{file.name}</span>
                                <span className="text-xs text-gray-500">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveUploadedFile(index)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Existing Documents */}
                    {documents && Array.isArray(documents) && documents.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium mb-2">Existing Documents</label>
                        <div className="space-y-2">
                          {Array.isArray(documents) && documents.map((doc: any) => (
                            <div key={doc.id} className={`flex items-center justify-between p-2 rounded border ${
                              filesToDelete.includes(doc.id) ? 'bg-red-50 border-red-200' : 'bg-white'
                            }`}>
                              <div className="flex items-center gap-2">
                                <FileText className={`h-4 w-4 ${filesToDelete.includes(doc.id) ? 'text-red-600' : 'text-gray-600'}`} />
                                <span className={`text-sm ${filesToDelete.includes(doc.id) ? 'line-through text-red-600' : ''}`}>
                                  {doc.fileName}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {filesToDelete.includes(doc.id) ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleUndoDelete(doc.id)}
                                    className="text-green-600 hover:text-green-800"
                                  >
                                    Undo
                                  </Button>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteDocument(doc.id)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {uploadedFiles.length > 0 && (
                      <div className="mt-3 p-3 bg-blue-50 rounded border">
                        <p className="text-sm text-blue-700">
                          <strong>Note:</strong> New documents will be automatically processed by AI for analysis and insights generation after upload.
                        </p>
                      </div>
                    )}
                  </div>
                )}
                </CardContent>
              )}
            </Card>

            {/* III. Work on Report Section */}
            {!isWorkChatOpen ? (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center space-y-4">
                    <div className="flex justify-center">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">Start Working on Your Report</h3>
                      <p className="text-sm text-gray-500">
                        Use AI to draft your report with templates, document analysis, and expert knowledge
                      </p>
                    </div>
                    <Button
                      onClick={() => setIsWorkChatOpen(true)}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      data-testid="button-work-on-report"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Work on Report
                    </Button>
                    <div className="grid grid-cols-3 gap-3 pt-3 text-xs text-gray-500">
                      <div className="flex flex-col items-center gap-1">
                        <div className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                        <span>Templates</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="h-8 w-8 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                          <Upload className="h-4 w-4 text-purple-600" />
                        </div>
                        <span>Documents</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="h-8 w-8 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                          <Search className="h-4 w-4 text-green-600" />
                        </div>
                        <span>AI Knowledge</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <ReportWorkChat
                reportId={investment.id}
                reportTitle={investment.reportTitle || investment.targetCompany}
                onClose={() => setIsWorkChatOpen(false)}
              />
            )}

            {/* IV. Attached Documents with AI Analysis */}
            {documents && Array.isArray(documents) && documents.length > 0 && (
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
                  <div className="space-y-4">
                    {Array.isArray(documents) && documents.map((doc: any) => (
                      <div key={doc.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-600" />
                            <span className="font-medium text-sm">{doc.originalName}</span>
                            <span className="text-xs text-gray-500">
                              ({(doc.fileSize / 1024 / 1024).toFixed(2)} MB)
                            </span>
                          </div>
                        </div>
                        <DocumentAIAnalysis document={doc} />
                      </div>
                    ))}
                  </div>
                  </CardContent>
                )}
              </Card>
            )}

            {/* V. Market Regulation Research */}
            <Card>
              <CardHeader 
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors py-3"
                onClick={() => setIsResearchExpanded(!isResearchExpanded)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Search className="h-4 w-4" />
                    Market Regulation Research
                  </CardTitle>
                  {isResearchExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardHeader>
              {isResearchExpanded && (
                <CardContent className="pt-0 pb-4">
                  <MarketRegulationResearch 
                    projectContext={investment?.targetCompany ? `Project: ${investment.targetCompany}` : undefined}
                  />
                </CardContent>
              )}
            </Card>

            {/* VI. Approval History */}
            <ApprovalHistoryCard
              requestType="investment"
              requestId={investment.id}
              isExpanded={isApprovalExpanded}
              onToggle={() => setIsApprovalExpanded(!isApprovalExpanded)}
            />

            {/* VII. Submit for Approval - At the bottom */}
            {(investmentDetails && typeof investmentDetails === 'object' && 'status' in investmentDetails && 
              ((investmentDetails as any).status?.toLowerCase() === 'draft' || (investmentDetails as any).status?.toLowerCase() === 'changes_requested')) && !isInlineEditing && (
              <Card className="border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
                <CardContent className="py-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg mb-1">Ready to submit?</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {(investmentDetails as any).status?.toLowerCase() === 'changes_requested' 
                          ? 'Review your changes and resubmit for approval when ready.'
                          : 'Submit this draft report for approval once you\'ve completed all sections.'}
                      </p>
                    </div>
                    <Button 
                      size="lg"
                      onClick={handleSubmitDraft}
                      disabled={submitDraftMutation.isPending}
                      className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      data-testid="button-submit-for-approval"
                    >
                      <Send className="h-4 w-4" />
                      {submitDraftMutation.isPending ? 'Submitting...' : 
                       (investmentDetails && typeof investmentDetails === 'object' && 'status' in investmentDetails && 
                        (investmentDetails as any).status?.toLowerCase() === 'changes_requested') ? 'Resubmit for Approval' : 'Submit for Approval'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="text-center p-8 text-gray-500">
            No investment details available
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}