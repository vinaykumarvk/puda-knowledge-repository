import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileUpload } from "@/components/ui/file-upload"
import { insertCashRequestSchema } from "@shared/schema"
import { z } from "zod"

const formSchema = insertCashRequestSchema.extend({
  amount: z.string().transform(val => parseFloat(val)),
})

type FormData = z.infer<typeof formSchema>

interface CashRequestFormProps {
  onSuccess?: () => void
}

export function CashRequestForm({ onSuccess }: CashRequestFormProps) {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: approvedInvestments } = useQuery({
    queryKey: ["/api/investments", { status: "approved" }],
  })

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      investmentId: undefined,
      amount: "",
      purpose: "",
      paymentTimeline: "immediate",
    },
  })

  const createCashRequest = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/cash-requests", data)
      return response.json()
    },
    onSuccess: (cashRequest) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-requests"] })
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] })
      
      toast({
        title: "Cash request created",
        description: `Request ${cashRequest.requestId} has been submitted for approval`,
      })
      
      onSuccess?.()
      form.reset()
    },
    onError: (error: any) => {
      toast({
        title: "Error creating cash request",
        description: error.message || "Something went wrong",
        variant: "destructive",
      })
    },
  })

  const saveDraft = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/cash-requests", {
        ...data,
        status: "draft",
      })
      return response.json()
    },
    onSuccess: () => {
      toast({
        title: "Draft saved",
        description: "Your cash request has been saved as a draft",
      })
    },
  })

  const onSubmit = (data: FormData) => {
    createCashRequest.mutate(data)
  }

  const onSaveDraft = () => {
    const currentData = form.getValues()
    saveDraft.mutate(currentData)
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="investmentId">Related Investment</Label>
        <Select 
          value={form.watch("investmentId")?.toString()} 
          onValueChange={(value) => form.setValue("investmentId", parseInt(value))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select approved investment..." />
          </SelectTrigger>
          <SelectContent>
            {approvedInvestments?.map((investment: any) => (
              <SelectItem key={investment.id} value={investment.id.toString()}>
                {investment.requestId} - {investment.targetCompany}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.investmentId && (
          <p className="text-sm text-red-600">{form.formState.errors.investmentId.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Cash Amount Required ($)</Label>
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

      <div className="space-y-2">
        <Label htmlFor="purpose">Purpose of Cash Request</Label>
        <Textarea
          id="purpose"
          rows={4}
          placeholder="Describe the purpose and details of the cash request..."
          {...form.register("purpose")}
        />
        {form.formState.errors.purpose && (
          <p className="text-sm text-red-600">{form.formState.errors.purpose.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="paymentTimeline">Payment Timeline</Label>
        <Select 
          value={form.watch("paymentTimeline")} 
          onValueChange={(value) => form.setValue("paymentTimeline", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select payment timeline..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="immediate">Immediate</SelectItem>
            <SelectItem value="week">Within 1 week</SelectItem>
            <SelectItem value="month">Within 1 month</SelectItem>
            <SelectItem value="scheduled">Scheduled date</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.paymentTimeline && (
          <p className="text-sm text-red-600">{form.formState.errors.paymentTimeline.message}</p>
        )}
      </div>

      {/* Document Upload */}
      <div>
        <Label>Supporting Documents</Label>
        <div className="mt-2">
          <FileUpload
            multiple={true}
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            maxSize={50 * 1024 * 1024}
            onFilesChange={setUploadedFiles}
          />
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end space-x-4 pt-6 border-t">
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
          disabled={createCashRequest.isPending}
        >
          {createCashRequest.isPending ? "Submitting..." : "Submit Request"}
        </Button>
      </div>
    </form>
  )
}
