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
import { useCreateAppointment, useUpdateAppointment, useDeleteAppointment, useCustomers, useCustomerJobs, useUsers } from "@/lib/api/hooks"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import type { Appointment } from "@/lib/api/types"

// Hard-coded appointment types for Phase 2
// NOTE: Values are aligned with the seeded appointment_types.name values
// so the API can map appointment_type → type_id reliably.
const APPOINTMENT_TYPES = [
  { value: "Discovery Call", label: "Discovery Call" },
  { value: "Demo", label: "Demo" },
  { value: "Sales Visit", label: "Sales Visit" },
  { value: "Follow-up", label: "Follow-up" },
] as const

const appointmentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  customer_id: z.string().optional(),
  job_id: z.string().optional(),
  appointment_type: z.string().optional(),
  assigned_to: z.string().optional(),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().min(1, "End time is required"),
  location: z.string().optional(),
  description: z.string().optional(),
}).refine((data) => {
  if (data.start_time && data.end_time) {
    return new Date(data.end_time) > new Date(data.start_time)
  }
  return true
}, {
  message: "End time must be after start time",
  path: ["end_time"],
})

type AppointmentFormData = z.infer<typeof appointmentSchema>

interface AppointmentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode?: "create" | "edit"
  appointment?: Appointment
}

export function AppointmentFormDialog({ open, onOpenChange, mode = "create", appointment }: AppointmentFormDialogProps) {
  const [customerSearch] = React.useState("")
  const createAppointment = useCreateAppointment()
  const updateAppointment = useUpdateAppointment()
  const deleteAppointment = useDeleteAppointment()
  const { data: customersResponse } = useCustomers({ search: customerSearch, limit: 20 })
  const { data: users = [] } = useUsers()

  const customers = customersResponse?.data || []

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      title: "",
      customer_id: "",
      job_id: "",
      appointment_type: "",
      assigned_to: "",
      start_time: "",
      end_time: "",
      location: "",
      description: "",
    },
  })

  const selectedCustomerId = watch("customer_id")
  const selectedJobId = watch("job_id")
  const selectedAppointmentType = watch("appointment_type")
  const selectedAssignedTo = watch("assigned_to")

  const { data: customerJobs = [] } = useCustomerJobs(selectedCustomerId || "")

  // Helper function to format datetime for input
  const formatDatetimeLocal = (dateString: string) => {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  // Pre-fill form when in edit mode
  React.useEffect(() => {
    if (mode === "edit" && appointment) {
      setValue("title", appointment.title)
      setValue("customer_id", appointment.customer_id || "")
      setValue("job_id", appointment.job_id || "")
      setValue("appointment_type", appointment.appointment_type || "")
      setValue("assigned_to", appointment.assigned_to || "")
      setValue("start_time", formatDatetimeLocal(appointment.start_time))
      setValue("end_time", formatDatetimeLocal(appointment.end_time))
      setValue("location", appointment.location || "")
      setValue("description", appointment.description || "")
    } else if (mode === "create") {
      reset()
    }
  }, [mode, appointment, setValue, reset])

  const onSubmit = async (data: AppointmentFormData) => {
    try {
      const payload = {
        title: data.title,
        customer_id: data.customer_id || undefined,
        job_id: data.job_id || undefined,
        appointment_type: data.appointment_type || undefined,
        assigned_to: data.assigned_to || undefined,
        start_time: new Date(data.start_time).toISOString(),
        end_time: new Date(data.end_time).toISOString(),
        location: data.location || undefined,
        notes: data.description || undefined,
        status: "scheduled",
      }

      if (mode === "edit" && appointment) {
        await updateAppointment.mutateAsync({ id: appointment.id, ...payload })
        toast.success("Appointment updated successfully")
      } else {
        await createAppointment.mutateAsync(payload)
        toast.success("Appointment created successfully")
      }

      onOpenChange(false)
      reset()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${mode} appointment`)
    }
  }

  const handleDelete = async () => {
    if (!appointment) return

    if (!confirm("Are you sure you want to delete this appointment? This action cannot be undone.")) {
      return
    }

    try {
      await deleteAppointment.mutateAsync(appointment.id)
      toast.success("Appointment deleted successfully")
      onOpenChange(false)
      reset()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete appointment")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit Appointment" : "Create New Appointment"}</DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Update the appointment details below."
              : "Schedule a new appointment. Fill in the required fields below."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Discovery Call - John Smith"
              {...register("title")}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Appointment Type */}
          <div className="space-y-2">
            <Label htmlFor="appointment_type">Appointment Type</Label>
            <Select
              value={selectedAppointmentType || "none"}
              onValueChange={(value) => setValue("appointment_type", value === "none" ? "" : value)}
            >
              <SelectTrigger id="appointment_type">
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {APPOINTMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assignee */}
          <div className="space-y-2">
            <Label htmlFor="assigned_to">Assigned To</Label>
            <Select
              value={selectedAssignedTo || "unassigned"}
              onValueChange={(value) => setValue("assigned_to", value === "unassigned" ? "" : value)}
            >
              <SelectTrigger id="assigned_to">
                <SelectValue placeholder="Select team member..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {users.filter(user => user.id && user.id !== "").map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
                {users.filter(user => user.id && user.id !== "").length === 0 && (
                  <SelectItem value="no-users" disabled>
                    No team members available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Customer Selection */}
          <div className="space-y-2">
            <Label htmlFor="customer_id">Customer</Label>
            <Select
              value={selectedCustomerId || "none"}
              onValueChange={(value) => {
                setValue("customer_id", value === "none" ? "" : value)
                setValue("job_id", "") // Reset job when customer changes
              }}
            >
              <SelectTrigger id="customer_id">
                <SelectValue placeholder="Select a customer..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {customers.filter(customer => customer.id && customer.id !== "").map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
                {customers.filter(customer => customer.id && customer.id !== "").length === 0 && (
                  <SelectItem value="no-customers" disabled>
                    No customers available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Job Selection (filtered by customer) */}
          {selectedCustomerId && selectedCustomerId !== "none" && customerJobs.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="job_id">Job</Label>
              <Select
                value={selectedJobId || "none"}
                onValueChange={(value) => setValue("job_id", value === "none" ? "" : value)}
              >
                <SelectTrigger id="job_id">
                  <SelectValue placeholder="Select a job..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {customerJobs.filter(job => job.id && job.id !== "").map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.job_number} - {job.current_stage?.name}
                    </SelectItem>
                  ))}
                  {customerJobs.filter(job => job.id && job.id !== "").length === 0 && (
                    <SelectItem value="no-jobs" disabled>
                      No jobs available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Start Time */}
          <div className="space-y-2">
            <Label htmlFor="start_time">
              Start Time <span className="text-destructive">*</span>
            </Label>
            <Input
              id="start_time"
              type="datetime-local"
              {...register("start_time")}
            />
            {errors.start_time && (
              <p className="text-sm text-destructive">{errors.start_time.message}</p>
            )}
          </div>

          {/* End Time */}
          <div className="space-y-2">
            <Label htmlFor="end_time">
              End Time <span className="text-destructive">*</span>
            </Label>
            <Input
              id="end_time"
              type="datetime-local"
              {...register("end_time")}
            />
            {errors.end_time && (
              <p className="text-sm text-destructive">{errors.end_time.message}</p>
            )}
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="123 Main Street, London"
              {...register("location")}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Add any additional details..."
              rows={3}
              {...register("description")}
            />
          </div>

          <DialogFooter>
            {mode === "edit" && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteAppointment.isPending || isSubmitting}
                className="mr-auto"
              >
                {deleteAppointment.isPending ? "Deleting..." : "Delete"}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting || deleteAppointment.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || deleteAppointment.isPending}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "edit"
                ? isSubmitting ? "Saving..." : "Save Changes"
                : isSubmitting ? "Creating..." : "Create Appointment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
