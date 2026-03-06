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
import { useCreateCustomer, useUpdateCustomer } from "@/lib/api/hooks"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import type { Customer } from "@/lib/api/types"
import { PostcodeLookup, type ParsedAddress } from "./postcode-lookup"

const customerSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address"),
  phone: z.string().optional(),
  address_line_1: z.string().optional(),
  address_line_2: z.string().optional(),
  city: z.string().optional(),
  postcode: z.string().optional(),
  notes: z.string().optional(),
})

type CustomerFormData = z.infer<typeof customerSchema>

interface CustomerFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode?: "create" | "edit"
  customer?: Customer
  onSuccess?: (customerId: string) => void
}

export function CustomerFormDialog({ open, onOpenChange, mode = "create", customer, onSuccess }: CustomerFormDialogProps) {
  const createCustomer = useCreateCustomer()
  const updateCustomer = useUpdateCustomer()
  const [showManualAddress, setShowManualAddress] = React.useState(mode === "edit")

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      address_line_1: "",
      address_line_2: "",
      city: "",
      postcode: "",
      notes: "",
    },
  })

  // Pre-fill form when in edit mode
  React.useEffect(() => {
    if (mode === "edit" && customer) {
      // Split name into first and last (assume last word is last name)
      const nameParts = customer.name.trim().split(/\s+/)
      const firstName = nameParts.slice(0, -1).join(" ") || nameParts[0] || ""
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : ""

      setValue("first_name", firstName)
      setValue("last_name", lastName)
      setValue("email", customer.email || "")
      setValue("phone", customer.phone || "")
      setValue("address_line_1", customer.address_line_1 || "")
      setValue("address_line_2", customer.address_line_2 || "")
      setValue("city", customer.city || "")
      setValue("postcode", customer.postcode || "")
      setValue("notes", customer.notes || "")
      setShowManualAddress(true)
    } else if (mode === "create") {
      reset()
      setShowManualAddress(false)
    }
  }, [mode, customer, setValue, reset])

  const handleAddressSelect = (address: ParsedAddress) => {
    setValue("address_line_1", address.address_line_1)
    setValue("address_line_2", address.address_line_2)
    setValue("city", address.city)
    setValue("postcode", address.postcode)
    setShowManualAddress(true)
  }

  const handleManualEntry = () => {
    setShowManualAddress(true)
  }

  const onSubmit = async (data: CustomerFormData) => {
    try {
      // Combine first and last name into single name field for API
      const fullName = `${data.first_name} ${data.last_name}`.trim()

      const payload = {
        name: fullName,
        email: data.email,
        phone: data.phone || undefined,
        address_line_1: data.address_line_1 || undefined,
        address_line_2: data.address_line_2 || undefined,
        city: data.city || undefined,
        postcode: data.postcode || undefined,
        notes: data.notes || undefined,
      }

      if (mode === "edit" && customer) {
        await updateCustomer.mutateAsync({ id: customer.id, ...payload })
        toast.success("Customer updated successfully")
      } else {
        const createdCustomer = await createCustomer.mutateAsync(payload)
        toast.success("Customer created successfully")

        // Session 79: Fire-and-forget property & solar enrichment for new customers
        if (createdCustomer?.id && (payload.postcode || payload.address_line_1)) {
          fetch(`/api/customers/${createdCustomer.id}/site-intel`, {
            method: "POST",
            credentials: "include",
          }).catch((error) => {
            console.error("[CustomerFormDialog] Failed to trigger customer site-intel enrichment", error)
          })
        }

        // Notify parent component of the newly created customer
        if (createdCustomer?.id && onSuccess) {
          onSuccess(createdCustomer.id)
        }
      }

      onOpenChange(false)
      reset()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${mode} customer`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit Customer" : "Create New Customer"}</DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Update the customer details below."
              : "Add a new customer to your database. Fill in at least the name and email fields."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* First Name */}
          <div className="space-y-2">
            <Label htmlFor="first_name">
              First Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="first_name"
              placeholder="John"
              {...register("first_name")}
            />
            {errors.first_name && (
              <p className="text-sm text-destructive">{errors.first_name.message}</p>
            )}
          </div>

          {/* Last Name */}
          <div className="space-y-2">
            <Label htmlFor="last_name">
              Last Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="last_name"
              placeholder="Smith"
              {...register("last_name")}
            />
            {errors.last_name && (
              <p className="text-sm text-destructive">{errors.last_name.message}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="john.smith@example.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+44 7700 900000"
              {...register("phone")}
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone.message}</p>
            )}
          </div>

          {/* Address Section - Postcode Lookup or Manual Entry */}
          {!showManualAddress ? (
            <PostcodeLookup
              onAddressSelect={handleAddressSelect}
              onManualEntry={handleManualEntry}
            />
          ) : (
            <>
              {/* Address Line 1 */}
              <div className="space-y-2">
                <Label htmlFor="address_line_1">Address Line 1</Label>
                <Input
                  id="address_line_1"
                  placeholder="123 Main Street"
                  {...register("address_line_1")}
                />
              </div>

              {/* Address Line 2 */}
              <div className="space-y-2">
                <Label htmlFor="address_line_2">Address Line 2</Label>
                <Input
                  id="address_line_2"
                  placeholder="Apartment 4B"
                  {...register("address_line_2")}
                />
              </div>

              {/* City */}
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="London"
                  {...register("city")}
                />
              </div>

              {/* Postcode */}
              <div className="space-y-2">
                <Label htmlFor="postcode">Postcode</Label>
                <Input
                  id="postcode"
                  placeholder="SW1A 1AA"
                  {...register("postcode")}
                />
              </div>
            </>
          )}

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
                : isSubmitting ? "Creating..." : "Create Customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
