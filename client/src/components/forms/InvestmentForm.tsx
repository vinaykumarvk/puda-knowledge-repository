import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { FileUpload } from "@/components/ui/file-upload"
import { MultiTabDocumentUpload } from "@/components/documents/MultiTabDocumentUpload"
import { Card, CardContent } from "@/components/ui/card"
import { TextEnhancementModal } from "@/components/ai/TextEnhancementModal"
import { insertInvestmentRequestSchema } from "@shared/schema"
import { z } from "zod"
import { useLocation } from "wouter"
import { Sparkles } from "lucide-react"

const formSchema = insertInvestmentRequestSchema.omit({
  requestId: true,
  requesterId: true,
  currentApprovalStage: true,
  slaDeadline: true,
  status: true,
  amount: true,
  expectedReturn: true,
  expectedReturnMin: true,
  expectedReturnMax: true,
  riskLevel: true,
}).extend({
  reportDate: z.string().min(1, "Date is required"),
  reportTitle: z.string().min(1, "Report title is required"),
  createdBy: z.string().min(1, "Creator name is required"),
  amount: z.string().optional(),
  expectedReturn: z.string().optional(),
  expectedReturnMin: z.string().optional(),
  expectedReturnMax: z.string().optional(),
  riskLevel: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface DocumentUploadTab {
  id: string;
  categoryId: number | null;
  customCategoryName: string;
  files: File[];
}

export function InvestmentForm() {
  const [, setLocation] = useLocation()
  const [documentTabs, setDocumentTabs] = useState<DocumentUploadTab[]>([])
  const [isEnhancementModalOpen, setIsEnhancementModalOpen] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      targetCompany: "",
      investmentType: "equity",
      reportDate: new Date().toISOString().split('T')[0],
      reportTitle: "",
      createdBy: "",
      description: "",
    },
  })


  const saveDraft = useMutation({
    mutationFn: async (data: FormData) => {
      // Convert form data to proper API format (same as createInvestment)
      const apiData = {
        ...data,
        amount: "0", // Default value for backward compatibility
        expectedReturn: null,
        expectedReturnMin: null,
        expectedReturnMax: null,
        riskLevel: "medium", // Default value for backward compatibility
        status: "draft",
      }
      
      const response = await apiRequest("POST", "/api/investments", apiData)
      const investment = await response.json()
      
      // Upload files from document tabs (draft) with improved error handling
      if (documentTabs.length > 0) {
        console.log(`Starting draft upload process for ${documentTabs.length} document tabs`)
        
        try {
          // Process each tab sequentially to avoid race conditions
          for (let i = 0; i < documentTabs.length; i++) {
            const tab = documentTabs[i]
            
            if (tab.files.length > 0 && tab.categoryId) {
              console.log(`Uploading draft files for tab ${i + 1}/${documentTabs.length}:`, tab.id)
              
              // Retry logic for each tab (unlimited retries for testing)
              let uploadSuccess = false
              let retryCount = 0
              const maxRetries = 10 // Increased for testing purposes
              
              while (!uploadSuccess && retryCount < maxRetries) {
                try {
                  const formData = new FormData()
                  tab.files.forEach((file) => {
                    formData.append('documents', file)
                  })
                  formData.append('requestType', 'investment')
                  formData.append('requestId', investment.id.toString())
                  
                  // Create category data for this tab
                  const categoryData = {
                    categoryId: tab.categoryId,
                    customCategoryName: tab.customCategoryName || ''
                  }
                  formData.append('categories', JSON.stringify([categoryData]))
                  
                  // Add timeout to prevent hanging requests - increase for large files
                  const controller = new AbortController()
                  const timeoutId = setTimeout(() => controller.abort(), 120000) // 2 minute timeout for large files
                  
                  const uploadResponse = await fetch('/api/documents/upload', {
                    method: 'POST',
                    body: formData,
                    credentials: 'include',
                    signal: controller.signal,
                  })
                  
                  clearTimeout(timeoutId)
                  
                  if (!uploadResponse.ok) {
                    const errorText = await uploadResponse.text()
                    throw new Error(`Draft upload failed with status ${uploadResponse.status}: ${errorText}`)
                  }
                  
                  const result = await uploadResponse.json()
                  const documentsCount = result.documents ? result.documents.length : (result.length || 0)
                  console.log(`Draft files uploaded successfully for tab ${tab.id}:`, documentsCount, 'documents')
                  
                  // Check for partial upload warnings
                  if (result.errors && result.errors.length > 0) {
                    console.warn(`Partial draft upload for tab ${tab.id}:`, result.errors)
                  }
                  uploadSuccess = true
                  
                } catch (error) {
                  retryCount++
                  console.warn(`Draft upload attempt ${retryCount} failed for tab ${tab.id}:`, error)
                  
                  if (retryCount < maxRetries) {
                    console.log(`Retrying draft upload for tab ${tab.id} in 2 seconds...`)
                    await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds before retry
                  } else {
                    console.error(`All retry attempts failed for draft tab ${tab.id}`)
                    let errorMessage = "Failed to upload documents";
                    if (error instanceof Error) {
                      if (error.name === 'AbortError') {
                        errorMessage = "Upload timeout - files may be too large or connection too slow";
                      } else if (error.message.includes('413')) {
                        errorMessage = "File too large - maximum size is 50MB per file";
                      } else if (error.message.includes('415')) {
                        errorMessage = "Unsupported file type - only PDF, DOC, XLS, TXT and images are allowed";
                      } else {
                        errorMessage = error.message;
                      }
                    }
                    throw new Error(`${errorMessage} after ${maxRetries} attempts`);
                  }
                }
              }
            } else if (tab.files.length > 0 && !tab.categoryId) {
              console.warn(`Draft tab ${tab.id} has files but no category selected - skipping upload`)
            }
          }
          
          console.log("All draft document uploads completed successfully")
        } catch (uploadError) {
          console.error("Draft document upload process failed:", uploadError)
          // Don't delete the draft if upload fails - user can manually upload later
          console.log("Draft investment created but document upload failed - user can upload documents manually")
          throw new Error(`Draft created successfully, but failed to upload documents: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`)
        }
      }
      
      return investment
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] })
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] })
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/recent-requests"] })
      
      toast({
        title: "Draft saved",
        description: "Your report has been saved as a draft",
      })
      
      // Clear document tabs and redirect to My Reports
      setDocumentTabs([])
      setLocation("/investment-portal/investments")
    },
    onError: (error: any) => {
      console.error("Draft save error:", error)
      toast({
        title: "Error saving draft",
        description: error.message || "Something went wrong",
        variant: "destructive",
      })
    },
  })

  const onSaveDraft = async () => {
    // Trigger form validation before saving
    const isValid = await form.trigger()
    if (!isValid) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields before saving",
        variant: "destructive",
      })
      return
    }
    
    const currentData = form.getValues()
    saveDraft.mutate(currentData)
  }

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="investmentType">Report Type</Label>
              <Select 
                value={form.watch("investmentType")} 
                onValueChange={(value) => form.setValue("investmentType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select report type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="base_document">Base Document</SelectItem>
                  <SelectItem value="rfp_report">RFP Report</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.investmentType && (
                <p className="text-sm text-red-600">{form.formState.errors.investmentType.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetCompany">Subject / Client Name</Label>
              <Input
                id="targetCompany"
                placeholder="Enter subject or client name"
                {...form.register("targetCompany")}
              />
              {form.formState.errors.targetCompany && (
                <p className="text-sm text-red-600">{form.formState.errors.targetCompany.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="space-y-2">
              <Label htmlFor="reportDate">Date</Label>
              <Input
                id="reportDate"
                type="date"
                {...form.register("reportDate")}
              />
              {form.formState.errors.reportDate && (
                <p className="text-sm text-red-600">{form.formState.errors.reportDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reportTitle">Title of Report</Label>
              <Input
                id="reportTitle"
                placeholder="Enter report title"
                {...form.register("reportTitle")}
              />
              {form.formState.errors.reportTitle && (
                <p className="text-sm text-red-600">{form.formState.errors.reportTitle.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="createdBy">Created By</Label>
              <Input
                id="createdBy"
                placeholder="Enter your name"
                {...form.register("createdBy")}
              />
              {form.formState.errors.createdBy && (
                <p className="text-sm text-red-600">{form.formState.errors.createdBy.message}</p>
              )}
            </div>
          </div>

          <div className="mt-6">
            <Label htmlFor="description">Report Description</Label>
            <div className="relative">
              <Textarea
                id="description"
                rows={4}
                placeholder="Describe the report objectives and scope..."
                {...form.register("description")}
                className="mt-2"
              />
              {/* AI Enhancement Button */}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="absolute bottom-2 right-2 h-8 w-8 p-0 hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => setIsEnhancementModalOpen(true)}
                title="AI Text Enhancement"
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            </div>
            {form.formState.errors.description && (
              <p className="text-sm text-red-600">{form.formState.errors.description.message}</p>
            )}
          </div>

        </CardContent>
      </Card>

      {/* Document Upload */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Document Upload</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Upload supporting documents for this report (optional)
          </p>
          <FileUpload
            onFilesChange={(files) => {
              // Update document tabs with simple structure - use default category 1
              setDocumentTabs([{
                id: 'documents',
                categoryId: 1, // Default category for general documents
                customCategoryName: 'Report Documents',
                files: files
              }]);
            }}
          />
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex items-center justify-end space-x-4 pt-6 border-t">
        <Button 
          type="button" 
          variant="outline"
          onClick={() => setLocation("/investment-portal")}
          data-testid="button-cancel"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={onSaveDraft}
          disabled={saveDraft.isPending}
          data-testid="button-save-draft"
        >
          {saveDraft.isPending ? "Saving..." : "Save as Draft"}
        </Button>
      </div>

      {/* AI Text Enhancement Modal */}
      <TextEnhancementModal
        isOpen={isEnhancementModalOpen}
        onClose={() => setIsEnhancementModalOpen(false)}
        originalText={form.watch("description") || ""}
        onApply={(enhancedText) => {
          // Replace the original description with enhanced text
          form.setValue("description", enhancedText);
          toast({
            title: "Text Enhanced",
            description: "Your investment description has been improved and replaced with AI enhancement.",
          });
        }}
      />
    </div>
  )
}
