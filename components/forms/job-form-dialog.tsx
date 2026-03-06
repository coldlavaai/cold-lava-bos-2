"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCreateJob, useUpdateJob, useCustomers, useJobStages } from "@/lib/api/hooks"
import { toast } from "sonner"
import { Loader2, Plus } from "lucide-react"
import type { Job } from "@/lib/api/types"
import { CustomerFormDialog } from "./customer-form-dialog"

const jobSchema = z.object({
  customer_id: z.string().min(1, "Customer is required"),
  current_stage_id: z.string().min(1, "Stage is required"),
  estimated_value: z.coerce.number().positive("Must be a positive number").optional().or(z.literal("")),
  // SOLAR-SPECIFIC: hidden for Cold Lava
  // system_size_kwp: z.coerce.number().positive("Must be a positive number").optional().or(z.literal("")),
  source: z.string().optional(),
  notes: z.string().optional(),
})

type JobFormData = z.infer<typeof jobSchema>

interface JobFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode?: "create" | "edit"
  job?: Job
  defaultCustomerId?: string
}

export function JobFormDialog({ open, onOpenChange, mode = "create", job, defaultCustomerId }: JobFormDialogProps) {
  const [customerSearch] = React.useState("")
  const [showCustomerForm, setShowCustomerForm] = React.useState(false)
  const [justCreatedCustomerId, setJustCreatedCustomerId] = React.useState<string | null>(null)
  const createJob = useCreateJob()
  const updateJob = useUpdateJob()
  const { data: customersResponse } = useCustomers({ search: customerSearch, limit: 20 })
  const { data: stages = [] } = useJobStages()

  const customers = React.useMemo(
    () => customersResponse?.data || [],
    [customersResponse]
  )

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      customer_id: "",
      current_stage_id: "",
      estimated_value: "",
      source: "",
      notes: "",
    },
  })

  const selectedCustomerId = watch("customer_id")
  const selectedStageId = watch("current_stage_id")

  // Pre-fill form when in edit mode or with default customer
  React.useEffect(() => {
    if (mode === "edit" && job) {
      setValue("customer_id", job.customer_id)
      setValue("current_stage_id", job.current_stage_id || "")
      setValue("estimated_value", job.estimated_value ?? "")
      setValue("source", job.source || "")
      setValue("notes", job.notes || "")
    } else if (mode === "create") {
      reset()
      if (defaultCustomerId) {
        setValue("customer_id", defaultCustomerId)
      }
    }
  }, [mode, job, defaultCustomerId, setValue, reset])

  // Auto-select newly created customer
  React.useEffect(() => {
    if (justCreatedCustomerId && customers.some(c => c.id === justCreatedCustomerId)) {
      setValue("customer_id", justCreatedCustomerId, { shouldValidate: true })
      setJustCreatedCustomerId(null)
    }
  }, [justCreatedCustomerId, customers, setValue])

  const handleCustomerCreated = (customerId: string) => {
    setJustCreatedCustomerId(customerId)
    setShowCustomerForm(false)
  }

  const onSubmit = async (data: JobFormData) => {
    try {
      const payload = {
        customer_id: data.customer_id,
        current_stage_id: data.current_stage_id,
        estimated_value: data.estimated_value ? Number(data.estimated_value) : undefined,
        source: data.source || undefined,
        notes: data.notes || undefined,
      }

      if (mode === "edit" && job) {
        await updateJob.mutateAsync({ id: job.id, ...payload })
        toast.success("Job updated successfully")
      } else {
        await createJob.mutateAsync(payload)
        toast.success("Job created successfully")
      }

      onOpenChange(false)
      reset()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${mode} job`)
    }
  }

  return (
    <>
      <CustomerFormDialog
        open={showCustomerForm}
        onOpenChange={setShowCustomerForm}
        onSuccess={handleCustomerCreated}
      />

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit Job" : "Create New Job"}</DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Update the job details below."
              : "Add a new job to your pipeline. Fill in the required fields below."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Customer Selection */}
          <div className="space-y-2">
            <Label htmlFor="customer_id">
              Customer <span className="text-destructive">*</span>
            </Label>
            <Select
              value={selectedCustomerId}
              onValueChange={(value) => setValue("customer_id", value, { shouldValidate: true })}
            >
              <SelectTrigger id="customer_id">
                <SelectValue placeholder="Select a customer..." />
              </SelectTrigger>
              <SelectContent>
                <div className="p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2"
                    onClick={(e) => {
                      e.preventDefault()
                      setShowCustomerForm(true)
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Create New Customer
                  </Button>
                </div>
                {customers.length > 0 ? (
                  <>
                    <div className="h-px bg-border my-1" />
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </>
                ) : (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    No customers yet
                  </div>
                )}
              </SelectContent>
            </Select>
            {errors.customer_id && (
              <p className="text-sm text-destructive">{errors.customer_id.message}</p>
            )}
          </div>

          {/* Stage Selection */}
          <div className="space-y-2">
            <Label htmlFor="current_stage_id">
              Current Stage <span className="text-destructive">*</span>
            </Label>
            <Select
              value={selectedStageId}
              onValueChange={(value) => setValue("current_stage_id", value, { shouldValidate: true })}
            >
              <SelectTrigger id="current_stage_id">
                <SelectValue placeholder="Select a stage..." />
              </SelectTrigger>
              <SelectContent>
                {stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.current_stage_id && (
              <p className="text-sm text-destructive">{errors.current_stage_id.message}</p>
            )}
          </div>

          {/* Estimated Value */}
          <div className="space-y-2">
            <Label htmlFor="estimated_value">Estimated Value (£)</Label>
            <Input
              id="estimated_value"
              type="number"
              step="0.01"
              placeholder="e.g., 15000"
              {...register("estimated_value")}
            />
            {errors.estimated_value && (
              <p className="text-sm text-destructive">{errors.estimated_value.message}</p>
            )}
          </div>

          {/* Source */}
          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Select
              value={watch("source") || ""}
              onValueChange={(value) => setValue("source", value)}
            >
              <SelectTrigger id="source">
                <SelectValue placeholder="Select a source..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Referral">Referral</SelectItem>
                <SelectItem value="Website">Website</SelectItem>
                <SelectItem value="Direct">Direct</SelectItem>
                <SelectItem value="Partner">Partner</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes..."
              rows={3}
              {...register("notes")}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "edit"
                ? isSubmitting ? "Saving..." : "Save Changes"
                : isSubmitting ? "Creating..." : "Create Job"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  )
}
