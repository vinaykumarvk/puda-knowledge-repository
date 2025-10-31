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
}).extend({
  expectedReturn: z.string().optional(),
  expectedReturnMin: z.string().optional(),
  expectedReturnMax: z.string().optional(),
  expectedReturnType: z.enum(["absolute", "range"]).default("absolute"),
  amount: z.string().min(1, "Amount is required"),
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
  (data) => ({
    message: data.expectedReturnType === "absolute" 
      ? "Expected return is required" 
      : "Both minimum and maximum returns are required",
    path: data.expectedReturnType === "absolute" ? ["expectedReturn"] : ["expectedReturnMin"],
  })
).refine(
  (data) => {
    if (data.expectedReturnType === "range" && data.expectedReturnMin && data.expectedReturnMax) {
      const min = parseFloat(data.expectedReturnMin);
      const max = parseFloat(data.expectedReturnMax);
      return !isNaN(min) && !isNaN(max) && min < max;
    }
    return true;
  },
  {
    message: "Minimum return must be less than maximum return",
    path: ["expectedReturnMax"],
  }
)

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
      amount: "",
      expectedReturn: "",
      expectedReturnMin: "",
      expectedReturnMax: "",
      expectedReturnType: "absolute",
      description: "",
      riskLevel: "medium",
    },
  })

  const createInvestment = useMutation({
    mutationFn: async (data: FormData) => {
      try {
        console.log("=== INVESTMENT CREATION STARTED ===")
        console.log("Original form data:", data)
        
        // Keep amounts as strings for decimal validation and handle expected return type
        const apiData = {
          ...data,
          amount: data.amount.toString(),
          expectedReturn: data.expectedReturnType === "absolute" ? data.expectedReturn?.toString() : null,
          expectedReturnMin: data.expectedReturnType === "range" ? data.expectedReturnMin?.toString() : null,
          expectedReturnMax: data.expectedReturnType === "range" ? data.expectedReturnMax?.toString() : null,
          status: "opportunity", // Set status to "opportunity" for admin review workflow
        }
        console.log("Converted API data:", apiData)
        
        console.log("Making API request to /api/investments...")
        const response = await apiRequest("POST", "/api/investments", apiData)
        console.log("API response received:", response.status)
        
        const investment = await response.json()
        console.log("Investment created:", investment)
        
        // Upload files from document tabs with improved error handling
        if (documentTabs.length > 0) {
          console.log(`Starting upload process for ${documentTabs.length} document tabs`)
          
          try {
            // Process each tab sequentially to avoid race conditions
            for (let i = 0; i < documentTabs.length; i++) {
              const tab = documentTabs[i]
              
              if (tab.files.length > 0 && tab.categoryId) {
                console.log(`Uploading files for tab ${i + 1}/${documentTabs.length}:`, tab.id)
                
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
                    
                    // Add timeout to prevent hanging requests
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
                      throw new Error(`Upload failed with status ${uploadResponse.status}: ${errorText}`)
                    }
                    
                    const result = await uploadResponse.json()
                    const documentsCount = result.documents ? result.documents.length : (result.length || 0)
                    console.log(`Files uploaded successfully for tab ${tab.id}:`, documentsCount, 'documents')
                    
                    // Check for partial upload warnings
                    if (result.errors && result.errors.length > 0) {
                      console.warn(`Partial upload for tab ${tab.id}:`, result.errors)
                    }
                    uploadSuccess = true
                    
                  } catch (error) {
                    retryCount++
                    console.warn(`Upload attempt ${retryCount} failed for tab ${tab.id}:`, error)
                    
                    if (retryCount < maxRetries) {
                      console.log(`Retrying upload for tab ${tab.id} in 2 seconds...`)
                      await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds before retry
                    } else {
                      console.error(`All retry attempts failed for tab ${tab.id}`)
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
                console.warn(`Tab ${tab.id} has files but no category selected - skipping upload`)
              }
            }
            
            console.log("All document uploads completed successfully")
          } catch (uploadError) {
            console.error("Document upload process failed:", uploadError)
            // Don't delete the investment if upload fails - user can manually upload later
            console.log("Investment created but document upload failed - user can upload documents manually")
            throw new Error(`Investment created successfully, but failed to upload documents: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`)
          }
        } else {
          console.log("No documents to upload, skipping upload process")
        }
        
        console.log("=== INVESTMENT CREATION COMPLETED ===")
        return investment
      } catch (error) {
        console.error("=== INVESTMENT CREATION FAILED ===", error)
        throw error
      }
    },
    onSuccess: (investment) => {
      console.log("Investment created successfully:", investment)
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] })
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] })
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/recent-requests"] })
      
      toast({
        title: "Investment request created",
        description: `Request ${investment.requestId} has been submitted for approval`,
      })
      
      setLocation("/")
    },
    onError: (error: any) => {
      console.error("Investment creation error:", error)
      toast({
        title: "Error creating investment request",
        description: error.message || "Something went wrong",
        variant: "destructive",
      })
    },
  })

  const saveDraft = useMutation({
    mutationFn: async (data: FormData) => {
      // Convert form data to proper API format (same as createInvestment)
      const apiData = {
        ...data,
        amount: data.amount.toString(),
        expectedReturn: data.expectedReturnType === "absolute" ? data.expectedReturn?.toString() : null,
        expectedReturnMin: data.expectedReturnType === "range" ? data.expectedReturnMin?.toString() : null,
        expectedReturnMax: data.expectedReturnType === "range" ? data.expectedReturnMax?.toString() : null,
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
        description: "Your investment request has been saved as a draft",
      })
      
      // Clear document tabs after successful save
      setDocumentTabs([])
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

  const onSubmit = (data: FormData) => {
    console.log("Form submission started...")
    console.log("Form submission data:", data)
    console.log("Form errors:", form.formState.errors)
    console.log("Form is valid:", form.formState.isValid)
    console.log("Document tabs:", documentTabs)
    
    // Validate expected return fields manually for debugging
    if (data.expectedReturnType === "absolute" && (!data.expectedReturn || data.expectedReturn.trim() === "")) {
      console.error("Validation error: Expected return is required for absolute type");
      form.setError("expectedReturn", { message: "Expected return is required" });
      return;
    }
    
    if (data.expectedReturnType === "range") {
      if (!data.expectedReturnMin || data.expectedReturnMin.trim() === "") {
        console.error("Validation error: Minimum return is required for range type");
        form.setError("expectedReturnMin", { message: "Minimum return is required" });
        return;
      }
      if (!data.expectedReturnMax || data.expectedReturnMax.trim() === "") {
        console.error("Validation error: Maximum return is required for range type");
        form.setError("expectedReturnMax", { message: "Maximum return is required" });
        return;
      }
      const min = parseFloat(data.expectedReturnMin);
      const max = parseFloat(data.expectedReturnMax);
      if (isNaN(min) || isNaN(max) || min >= max) {
        console.error("Validation error: Invalid range values");
        form.setError("expectedReturnMax", { message: "Minimum return must be less than maximum return" });
        return;
      }
    }
    
    console.log("Validation passed, calling mutation...");
    createInvestment.mutate(data)
  }

  const onSaveDraft = () => {
    const currentData = form.getValues()
    saveDraft.mutate(currentData)
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="investmentType">Investment Type</Label>
              <Select 
                value={form.watch("investmentType")} 
                onValueChange={(value) => form.setValue("investmentType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select investment type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equity">Equity Investment</SelectItem>
                  <SelectItem value="debt">Debt Investment</SelectItem>
                  <SelectItem value="real_estate">Real Estate</SelectItem>
                  <SelectItem value="alternative">Alternative Investment</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.investmentType && (
                <p className="text-sm text-red-600">{form.formState.errors.investmentType.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetCompany">Target Company</Label>
              <Input
                id="targetCompany"
                placeholder="Enter company name"
                {...form.register("targetCompany")}
              />
              {form.formState.errors.targetCompany && (
                <p className="text-sm text-red-600">{form.formState.errors.targetCompany.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="space-y-2">
              <Label htmlFor="amount">Investment Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...form.register("amount")}
              />
              {form.formState.errors.amount && (
                <p className="text-sm text-red-600">{form.formState.errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-3">
              <Label>Expected Return (%)</Label>
              
              {/* Toggle between Absolute and Range */}
              <RadioGroup
                value={form.watch("expectedReturnType")}
                onValueChange={(value: "absolute" | "range") => {
                  form.setValue("expectedReturnType", value);
                  // Clear other fields when switching
                  if (value === "absolute") {
                    form.setValue("expectedReturnMin", "");
                    form.setValue("expectedReturnMax", "");
                  } else {
                    form.setValue("expectedReturn", "");
                  }
                }}
                className="flex flex-row space-x-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="absolute" id="absolute" />
                  <Label htmlFor="absolute">Absolute Return</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="range" id="range" />
                  <Label htmlFor="range">Return Range</Label>
                </div>
              </RadioGroup>

              {/* Dynamic input fields based on selection */}
              {form.watch("expectedReturnType") === "absolute" ? (
                <Input
                  type="number"
                  step="0.01"
                  placeholder="8.5"
                  {...form.register("expectedReturn")}
                />
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm text-gray-600">Min %</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="6.0"
                      {...form.register("expectedReturnMin")}
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Max %</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="10.0"
                      {...form.register("expectedReturnMax")}
                    />
                  </div>
                </div>
              )}
              
              {(form.formState.errors.expectedReturn || form.formState.errors.expectedReturnMin || form.formState.errors.expectedReturnMax) && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.expectedReturn?.message || 
                   form.formState.errors.expectedReturnMin?.message || 
                   form.formState.errors.expectedReturnMax?.message}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6">
            <Label htmlFor="description">Investment Description</Label>
            <div className="relative">
              <Textarea
                id="description"
                rows={4}
                placeholder="Describe the investment opportunity..."
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

          <div className="mt-6">
            <Label>Risk Assessment</Label>
            <RadioGroup
              value={form.watch("riskLevel")}
              onValueChange={(value) => form.setValue("riskLevel", value)}
              className="flex flex-row space-x-6 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="low" id="low" />
                <Label htmlFor="low">Low Risk</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="medium" />
                <Label htmlFor="medium">Medium Risk</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="high" id="high" />
                <Label htmlFor="high">High Risk</Label>
              </div>
            </RadioGroup>
            {form.formState.errors.riskLevel && (
              <p className="text-sm text-red-600">{form.formState.errors.riskLevel.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Document Upload */}
      <Card>
        <CardContent className="pt-6">
          <MultiTabDocumentUpload
            onDocumentTabsChange={setDocumentTabs}
            initialTabs={documentTabs}
          />
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex items-center justify-end space-x-4 pt-6 border-t">
        <Button 
          type="button" 
          variant="outline"
          onClick={() => setLocation("/")}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onSaveDraft}
          disabled={saveDraft.isPending}
        >
          {saveDraft.isPending ? "Saving..." : "Save as Draft"}
        </Button>
        <Button 
          type="submit" 
          disabled={createInvestment.isPending}
          onClick={(e) => {
            console.log("Submit button clicked!");
            console.log("Form state:", form.formState);
            console.log("Form values:", form.getValues());
          }}
        >
          {createInvestment.isPending ? "Submitting..." : "Submit for Approval"}
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
    </form>
  )
}
