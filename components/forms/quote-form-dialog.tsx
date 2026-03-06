"use client"

import * as React from "react"
import { useForm, useFieldArray } from "react-hook-form"
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
import { useCreateQuote, useUpdateQuote } from "@/lib/api/hooks"
import { toast } from "sonner"
import { Loader2, Plus, X } from "lucide-react"
import type { Quote, Job } from "@/lib/api/types"

const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(0.01, "Quantity must be at least 0.01"),
  unit_price: z.number().min(0, "Unit price must be at least 0"),
})

const quoteSchema = z.object({
  line_items: z.array(lineItemSchema).min(1, "At least one line item is required"),
  valid_until: z.string().optional(),
})

type QuoteFormData = z.infer<typeof quoteSchema>

interface QuoteFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode?: "create" | "edit"
  quote?: Quote
  job: Job
}

export function QuoteFormDialog({ open, onOpenChange, mode = "create", quote, job }: QuoteFormDialogProps) {
  const createQuote = useCreateQuote()
  const updateQuote = useUpdateQuote()

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      line_items: [{ description: "", quantity: 1, unit_price: 0 }],
      valid_until: "",
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "line_items",
  })

  const lineItems = watch("line_items")

  // Calculate totals
  const subtotal = React.useMemo(() => {
    return lineItems.reduce((sum, item) => {
      const quantity = Number(item.quantity) || 0
      const unitPrice = Number(item.unit_price) || 0
      return sum + quantity * unitPrice
    }, 0)
  }, [lineItems])

  // Helper function to format datetime for input
  const formatDateLocal = (dateString: string) => {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Pre-fill form when in edit mode
  React.useEffect(() => {
    if (mode === "edit" && quote && quote.line_items) {
      reset({
        line_items: quote.line_items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
        valid_until: quote.valid_until ? formatDateLocal(quote.valid_until) : "",
      })
    } else if (mode === "create") {
      reset({
        line_items: [{ description: "", quantity: 1, unit_price: 0 }],
        valid_until: "",
      })
    }
  }, [mode, quote, reset])

  const onSubmit = async (data: QuoteFormData) => {
    try {
      const payload = {
        job_id: job.id,
        total_amount: subtotal,
        valid_until: data.valid_until || null,
        line_items: data.line_items.map(item => ({
          description: item.description,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          total_price: Number(item.quantity) * Number(item.unit_price),
        })),
      }

      if (mode === "edit" && quote) {
        await updateQuote.mutateAsync({ id: quote.id, ...payload })
        toast.success("Quote updated successfully")
      } else {
        await createQuote.mutateAsync(payload)
        toast.success("Quote created successfully")
      }

      onOpenChange(false)
      reset()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${mode} quote`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit Quote" : "Create New Quote"}</DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Update the quote details and line items below."
              : "Create a new quote for this job. Add line items and set a validity date."}
          </DialogDescription>
          <div className="text-sm text-muted-foreground mt-2">
            <div><strong>Job:</strong> {job.job_number}</div>
            <div><strong>Customer:</strong> {job.customer?.name || "Unknown"}</div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Line Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Line Items</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ description: "", quantity: 1, unit_price: 0 })}
                data-testid="add-line-item"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Line
              </Button>
            </div>

            {errors.line_items?.root && (
              <p className="text-sm text-destructive">{errors.line_items.root.message}</p>
            )}

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-start p-3 border rounded-lg">
                  <div className="col-span-5">
                    <Label htmlFor={`line_items.${index}.description`} className="text-xs">
                      Description
                    </Label>
                    <Input
                      id={`line_items.${index}.description`}
                      placeholder="Products, services, materials..."
                      {...register(`line_items.${index}.description`)}
                      data-testid={`line-item-description-${index}`}
                    />
                    {errors.line_items?.[index]?.description && (
                      <p className="text-xs text-destructive mt-1">
                        {errors.line_items[index]?.description?.message}
                      </p>
                    )}
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor={`line_items.${index}.quantity`} className="text-xs">
                      Qty
                    </Label>
                    <Input
                      id={`line_items.${index}.quantity`}
                      type="number"
                      step="0.01"
                      {...register(`line_items.${index}.quantity`, { valueAsNumber: true })}
                      data-testid={`line-item-quantity-${index}`}
                    />
                    {errors.line_items?.[index]?.quantity && (
                      <p className="text-xs text-destructive mt-1">
                        {errors.line_items[index]?.quantity?.message}
                      </p>
                    )}
                  </div>

                  <div className="col-span-3">
                    <Label htmlFor={`line_items.${index}.unit_price`} className="text-xs">
                      Unit Price (£)
                    </Label>
                    <Input
                      id={`line_items.${index}.unit_price`}
                      type="number"
                      step="0.01"
                      {...register(`line_items.${index}.unit_price`, { valueAsNumber: true })}
                      data-testid={`line-item-unit-price-${index}`}
                    />
                    {errors.line_items?.[index]?.unit_price && (
                      <p className="text-xs text-destructive mt-1">
                        {errors.line_items[index]?.unit_price?.message}
                      </p>
                    )}
                  </div>

                  <div className="col-span-2 flex items-end">
                    <div className="w-full">
                      <Label className="text-xs">Total</Label>
                      <div className="text-sm font-medium mt-2">
                        £{((lineItems[index]?.quantity || 0) * (lineItems[index]?.unit_price || 0)).toFixed(2)}
                      </div>
                    </div>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        className="ml-1"
                        data-testid={`remove-line-item-${index}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Subtotal */}
          <div className="flex justify-end space-y-1 pt-3 border-t">
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Subtotal</div>
              <div className="text-2xl font-bold" data-testid="quote-subtotal">
                £{subtotal.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Valid Until */}
          <div className="space-y-2">
            <Label htmlFor="valid_until">Valid Until</Label>
            <Input
              id="valid_until"
              type="date"
              {...register("valid_until")}
              data-testid="quote-valid-until"
            />
            {errors.valid_until && (
              <p className="text-sm text-destructive">{errors.valid_until.message}</p>
            )}
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
            <Button type="submit" disabled={isSubmitting} data-testid="submit-quote">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "edit"
                ? isSubmitting ? "Saving..." : "Save Changes"
                : isSubmitting ? "Creating..." : "Create Quote"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
