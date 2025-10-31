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
import UnifiedSearchInterface from "@/components/documents/UnifiedSearchInterface";
import InvestmentRationaleModal from "@/components/rationale/InvestmentRationaleModal";
import { EnhancedDocumentCategorySelector } from "@/components/documents/EnhancedDocumentCategorySelector";
import MarkdownRenderer from "@/components/documents/MarkdownRenderer";
import { ApprovalHistoryCard } from '@/components/approval/ApprovalHistoryCard';

// Edit form schema
const editFormSchema = z.object({
  targetCompany: z.string().min(1, "Target company is required"),
  investmentType: z.enum(["equity", "debt", "real_estate", "alternative"]),
  amount: z.string().min(1, "Amount is required"),
  expectedReturn: z.string().optional(),
  expectedReturnMin: z.string().optional(),
  expectedReturnMax: z.string().optional(),
  expectedReturnType: z.enum(["absolute", "range"]).default("absolute"),
  description: z.string().optional(),
  riskLevel: z.enum(["low", "medium", "high"]),
}).refine(
  (data) => {
    if (data.expectedReturnType === "absolute") {
      return data.expectedReturn && data.expectedReturn.trim() !== "";
    } else if (data.expectedReturnType === "range") {
      return data.expectedReturnMin && data.expectedReturnMin.trim() !== "" &&
             data.expectedReturnMax && data.expectedReturnMax.trim() !== "";
    }
    return false;
  },
  {
    message: "Expected return is required",
    path: ["expectedReturn"],
  }
).refine(
  (data) => {
    if (data.expectedReturnType === "range" && data.expectedReturnMin && data.expectedReturnMax) {
      const min = parseFloat(data.expectedReturnMin);
      const max = parseFloat(data.expectedReturnMax);
      return min < max;
    }
    return true;
  },
  {
    message: "Minimum return must be less than maximum return",
    path: ["expectedReturnMax"],
  }
);

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
  const [isRationaleExpanded, setIsRationaleExpanded] = useState(false);
  const [isDocumentsExpanded, setIsDocumentsExpanded] = useState(false);
  const [isResearchExpanded, setIsResearchExpanded] = useState(false);
  const [isApprovalExpanded, setIsApprovalExpanded] = useState(true);
  const [isRationaleModalOpen, setIsRationaleModalOpen] = useState(false);
  const [editingRationaleId, setEditingRationaleId] = useState<number | null>(null);
  const [editingRationaleContent, setEditingRationaleContent] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [rationaleToDelete, setRationaleToDelete] = useState<number | null>(null);

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

  // Fetch investment rationales
  const { data: rationales } = useQuery({
    queryKey: [`/api/investments/${investment?.id}/rationales`],
    enabled: !!investment?.id && isExpanded,
  });

  // Edit form
  const editForm = useForm<z.infer<typeof editFormSchema>>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      targetCompany: "",
      investmentType: "equity",
      amount: "",
      expectedReturn: "",
      expectedReturnMin: "",
      expectedReturnMax: "",
      expectedReturnType: "absolute",
      description: "",
      riskLevel: "medium",
    },
  });

  // Initialize form when investment details are loaded using useEffect
  useEffect(() => {
    if (investmentDetails && typeof investmentDetails === 'object' && 'targetCompany' in investmentDetails && !isInlineEditing) {
      const details = investmentDetails as any;
      editForm.reset({
        targetCompany: details.targetCompany || "",
        investmentType: details.investmentType || "equity",
        amount: details.amount?.toString() || "",
        expectedReturn: details.expectedReturn?.toString() || "",
        expectedReturnMin: details.expectedReturnMin?.toString() || "",
        expectedReturnMax: details.expectedReturnMax?.toString() || "",
        expectedReturnType: details.expectedReturnType || "absolute",
        description: details.description || "",
        riskLevel: details.riskLevel || "medium",
      });
    }
  }, [investmentDetails, isInlineEditing]);

  // Mutations
  const editDraftMutation = useMutation({
    mutationFn: async (data: z.infer<typeof editFormSchema>) => {
      // Keep amounts as strings to avoid floating-point precision issues
      const payload: any = {
        ...data,
        amount: data.amount.toString(),
        expectedReturnType: data.expectedReturnType,
      };
      
      if (data.expectedReturnType === "absolute" && data.expectedReturn) {
        payload.expectedReturn = data.expectedReturn.toString();
        payload.expectedReturnMin = null;
        payload.expectedReturnMax = null;
      } else if (data.expectedReturnType === "range" && data.expectedReturnMin && data.expectedReturnMax) {
        payload.expectedReturn = null;
        payload.expectedReturnMin = data.expectedReturnMin.toString();
        payload.expectedReturnMax = data.expectedReturnMax.toString();
      }
      
      return apiRequest('PUT', `/api/investments/${investment.id}`, payload);
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

  // Update rationale mutation
  const updateRationaleMutation = useMutation({
    mutationFn: async ({ rationaleId, content }: { rationaleId: number; content: string }) => {
      console.log('Updating rationale:', { rationaleId, content, investmentId: investment.id });
      const url = `/api/investments/${investment.id}/rationales/${rationaleId}`;
      console.log('API URL:', url);
      const response = await apiRequest('PUT', url, { content });
      console.log('API Response:', response);
      return response;
    },
    onSuccess: (data) => {
      console.log('Update successful:', data);
      queryClient.invalidateQueries({ queryKey: [`/api/investments/${investment.id}/rationales`] });
      toast({ title: "Investment rationale updated successfully" });
      setEditingRationaleId(null);
      setEditingRationaleContent('');
    },
    onError: (error) => {
      console.error('Update failed:', error);
      toast({ title: "Error updating rationale", variant: "destructive" });
    },
  });

  // Delete rationale mutation
  const deleteRationaleMutation = useMutation({
    mutationFn: async (rationaleId: number) => {
      return apiRequest('DELETE', `/api/investments/${investment.id}/rationales/${rationaleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/investments/${investment.id}/rationales`] });
      toast({ title: "Investment rationale deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete investment rationale", variant: "destructive" });
    },
  });

  // Handlers
  const handleInlineEdit = () => {
    setIsInlineEditing(true);
  };

  const handleEditRationale = (rationale: any) => {
    setEditingRationaleId(rationale.id);
    setEditingRationaleContent(rationale.content);
  };

  const handleSaveRationale = () => {
    if (editingRationaleId && editingRationaleContent.trim()) {
      updateRationaleMutation.mutate({ 
        rationaleId: editingRationaleId, 
        content: editingRationaleContent.trim()
      });
    }
  };

  const handleCancelEditRationale = () => {
    setEditingRationaleId(null);
    setEditingRationaleContent('');
  };

  const handleDownloadPDF = async (rationale: any) => {
    try {
      // Dynamic import of jsPDF
      const jsPDF = (await import('jspdf')).default;
      const pdf = new jsPDF();
      
      // Set up PDF content
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;
      const maxWidth = pageWidth - 2 * margin;
      
      // Add title
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Investment Rationale Report', margin, 30);
      
      // Add investment details
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Company: ${investment?.targetCompany || 'N/A'}`, margin, 50);
      pdf.text(`Request ID: ${investment?.requestId || 'N/A'}`, margin, 60);
      pdf.text(`Generated by: ${rationale.author?.firstName} ${rationale.author?.lastName}`, margin, 70);
      pdf.text(`Created: ${new Date(rationale.createdAt).toLocaleDateString()}`, margin, 80);
      if (rationale.template?.name) {
        pdf.text(`Template: ${rationale.template.name}`, margin, 90);
      }
      
      // Add content (strip markdown formatting for PDF and fix spacing)
      let yPosition = 110;
      
      // Clean and normalize the content text
      let cleanContent = rationale.content
        .replace(/#{1,6}\s/g, '') // Remove markdown headers
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting
        .replace(/\*(.*?)\*/g, '$1') // Remove italic formatting
        .replace(/\|\s*\|\s*/g, ' | ') // Fix table separators
        .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
        .trim();
      
      // Fix letter spacing issues (like "p o s t - t a x" -> "post-tax")
      // Handle compound words with hyphens first
      cleanContent = cleanContent.replace(/(\w)\s+(\w)\s+(\w)\s+(\w)\s*-\s*(\w)\s+(\w)\s+(\w)/g, '$1$2$3$4-$5$6$7');
      // Handle regular spaced-out words
      cleanContent = cleanContent.replace(/\b(\w)\s+(\w)\s+(\w)\s+(\w)\s+(\w)\s+(\w)\b/g, '$1$2$3$4$5$6');
      cleanContent = cleanContent.replace(/\b(\w)\s+(\w)\s+(\w)\s+(\w)\s+(\w)\b/g, '$1$2$3$4$5');
      cleanContent = cleanContent.replace(/\b(\w)\s+(\w)\s+(\w)\s+(\w)\b/g, '$1$2$3$4');
      cleanContent = cleanContent.replace(/\b(\w)\s+(\w)\s+(\w)\b/g, '$1$2$3');
      
      // Final cleanup for any remaining letter spacing issues  
      cleanContent = cleanContent.replace(/(?<=\w)\s+(?=\w)/g, '');
      
      const contentLines = cleanContent.split('\n').filter(line => line.trim());
      
      pdf.setFontSize(10);
      contentLines.forEach((line: string) => {
        if (yPosition > pdf.internal.pageSize.getHeight() - 20) {
          pdf.addPage();
          yPosition = 20;
        }
        
        if (line.trim()) {
          const wrappedLines = pdf.splitTextToSize(line.trim(), maxWidth);
          wrappedLines.forEach((wrappedLine: string) => {
            pdf.text(wrappedLine, margin, yPosition);
            yPosition += 6;
          });
        } else {
          yPosition += 6;
        }
      });
      
      // Download PDF
      const fileName = `Investment_Rationale_${investment?.targetCompany?.replace(/\s+/g, '_') || 'Unknown'}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      toast({ title: "Rationale downloaded as PDF successfully" });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({ title: "Failed to generate PDF", variant: "destructive" });
    }
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
        amount: details.amount?.toString() || "",
        expectedReturn: details.expectedReturn?.toString() || "",
        expectedReturnMin: details.expectedReturnMin?.toString() || "",
        expectedReturnMax: details.expectedReturnMax?.toString() || "",
        expectedReturnType: details.expectedReturnType || "absolute",
        description: details.description || "",
        riskLevel: details.riskLevel || "medium",
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

  const handleDeleteRationale = (rationaleId: number) => {
    setRationaleToDelete(rationaleId);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (rationaleToDelete) {
      deleteRationaleMutation.mutate(rationaleToDelete);
    }
    setDeleteConfirmOpen(false);
    setRationaleToDelete(null);
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

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
            {/* I. Attached Documents */}
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
                  <div className="space-y-3">
                    {Array.isArray(documents) && documents.map((doc: any) => (
                      <DocumentAnalysisCard
                        key={doc.id}
                        document={doc}
                        requestId={investment.id}
                        requestType="investment"
                        showAnalysisLabel={false}
                        showOnlyProcessed={true}
                      />
                    ))}
                  </div>
                  </CardContent>
                )}
              </Card>
            )}

            {/* II. Research & Analysis */}
            {documents && Array.isArray(documents) && documents.length > 0 && (
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
                      documents={Array.isArray(documents) ? documents : []}
                      requestId={investment.id}
                      requestType="investment"
                      isExpanded={isResearchExpanded}
                      onExpandedChange={setIsResearchExpanded}
                    />
                  </CardContent>
                )}
              </Card>
            )}

            {/* III. Investment Details Summary */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  Investment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Request ID:</span>
                    <span className="font-medium text-blue-600">{investment?.requestId || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Target Company:</span>
                    <span className="font-medium">{investment?.targetCompany || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Risk Level:</span>
                    <Badge className={getRiskColor(investment?.riskLevel || 'medium')}>
                      {investment?.riskLevel || 'Medium'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Amount:</span>
                    <span className="font-medium">${(investment?.amount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Expected Return:</span>
                    <span className="font-medium">
                      {investment?.expectedReturnType === 'range' && 
                       investment?.expectedReturnMin && 
                       investment?.expectedReturnMax
                        ? `${investment.expectedReturnMin}% - ${investment.expectedReturnMax}%`
                        : `${investment?.expectedReturn || 0}%`
                      }
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Created:</span>
                    <span className="font-medium">{format(new Date(investment?.createdAt || new Date()), 'MMM dd, yyyy')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* IV. Analyst Notes / Description */}
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
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={editForm.control}
                          name="targetCompany"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Target Company</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter company name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={editForm.control}
                          name="riskLevel"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Risk Level</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select risk level" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={editForm.control}
                          name="amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Investment Amount</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="Enter amount" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {/* Expected Return with Toggle */}
                        <div className="md:col-span-2">
                          <FormField
                            control={editForm.control}
                            name="expectedReturnType"
                            render={({ field }) => (
                              <FormItem className="space-y-3">
                                <FormLabel>Expected Return (%)</FormLabel>
                                <FormControl>
                                  <RadioGroup
                                    onValueChange={(value: "absolute" | "range") => {
                                      field.onChange(value);
                                      // Clear other fields when switching
                                      if (value === "absolute") {
                                        editForm.setValue("expectedReturnMin", "");
                                        editForm.setValue("expectedReturnMax", "");
                                      } else {
                                        editForm.setValue("expectedReturn", "");
                                      }
                                    }}
                                    value={field.value}
                                    className="flex flex-row space-x-6"
                                  >
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="absolute" id="edit-absolute" />
                                      <label htmlFor="edit-absolute">Absolute Return</label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="range" id="edit-range" />
                                      <label htmlFor="edit-range">Return Range</label>
                                    </div>
                                  </RadioGroup>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          {/* Dynamic input fields based on selection */}
                          {editForm.watch("expectedReturnType") === "absolute" ? (
                            <FormField
                              control={editForm.control}
                              name="expectedReturn"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      placeholder="8.5"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          ) : (
                            <div className="grid grid-cols-2 gap-3">
                              <FormField
                                control={editForm.control}
                                name="expectedReturnMin"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-sm text-gray-600">Min %</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="6.0"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={editForm.control}
                                name="expectedReturnMax"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-sm text-gray-600">Max %</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="10.0"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          )}
                        </div>
                        <FormField
                          control={editForm.control}
                          name="investmentType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Investment Type</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select investment type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="equity">Equity</SelectItem>
                                  <SelectItem value="debt">Debt</SelectItem>
                                  <SelectItem value="real_estate">Real Estate</SelectItem>
                                  <SelectItem value="alternative">Alternative</SelectItem>
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
                
                {/* Draft Actions */}
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
                    
                    <Button 
                      size="sm"
                      onClick={handleSubmitDraft}
                      disabled={submitDraftMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      <Send className="h-4 w-4" />
                      {submitDraftMutation.isPending ? 'Submitting...' : 
                       (investmentDetails && typeof investmentDetails === 'object' && 'status' in investmentDetails && 
                        (investmentDetails as any).status?.toLowerCase() === 'changes_requested') ? 'Resubmit for Approval' : 'Submit for Approval'}
                    </Button>
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

            {/* Investment Rationale Section */}
            <Card>
              <CardHeader 
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors py-3"
                onClick={() => setIsRationaleExpanded(!isRationaleExpanded)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4" />
                    Investment Rationale
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {rationales && rationales.length > 0 && (
                      <Badge variant="secondary">{rationales.length}</Badge>
                    )}
                    {isRationaleExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>
              </CardHeader>
              {isRationaleExpanded && (
                <CardContent className="pt-0 pb-4">
                  <div className="space-y-4">
                    {rationales && rationales.length > 0 ? (
                      <div className="space-y-3">
                        {rationales.map((rationale: any) => (
                          <div key={rationale.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">
                                    by {rationale.author?.firstName} {rationale.author?.lastName} • {new Date(rationale.createdAt).toLocaleDateString()}
                                  </span>
                                  {rationale.template?.name && (
                                    <Badge variant="outline" className="text-xs">
                                      {rationale.template.name}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDownloadPDF(rationale)}
                                  className="h-8 w-8 p-0"
                                  title="Download as PDF"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditRationale(rationale)}
                                  className="h-8 w-8 p-0"
                                  title="Edit rationale"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteRationale(rationale.id)}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                                  title="Delete rationale"
                                  disabled={deleteRationaleMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
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
                                    onClick={handleCancelEditRationale}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={handleSaveRationale}
                                    disabled={updateRationaleMutation.isPending}
                                  >
                                    {updateRationaleMutation.isPending ? 'Saving...' : 'Save Changes'}
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
                  </div>
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
          </div>
        ) : (
          <div className="text-center p-8 text-gray-500">
            No investment details available
          </div>
        )}
      </CollapsibleContent>
      
      {/* Investment Rationale Modal */}
      <InvestmentRationaleModal
        isOpen={isRationaleModalOpen}
        onClose={() => setIsRationaleModalOpen(false)}
        investmentId={investment?.id}
        investmentType={(investmentDetails && typeof investmentDetails === 'object' && 'investmentType' in investmentDetails) 
          ? investmentDetails.investmentType : 'equity'}
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
            <AlertDialogCancel onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Collapsible>
  );
}