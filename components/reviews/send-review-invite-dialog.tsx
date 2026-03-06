/**
 * Session 107: Send Review Invite Dialog
 * Modal for sending review invitations via email or SMS
 */

"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Mail, MessageSquare, Send } from "lucide-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

interface SendReviewInviteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId: string
  jobId?: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
}

export function SendReviewInviteDialog({
  open,
  onOpenChange,
  customerId,
  jobId,
  customerName = "Customer",
  customerEmail,
  customerPhone,
}: SendReviewInviteDialogProps) {
  const [channel, setChannel] = React.useState<"email" | "sms">("email")
  const queryClient = useQueryClient()

  // Determine which channels are available
  const emailAvailable = !!customerEmail
  const smsAvailable = !!customerPhone

  // Auto-select available channel
  React.useEffect(() => {
    if (!emailAvailable && smsAvailable) {
      setChannel("sms")
    } else if (emailAvailable && !smsAvailable) {
      setChannel("email")
    }
  }, [emailAvailable, smsAvailable])

  const sendInvitation = useMutation({
    mutationFn: async (data: { customer_id: string; job_id?: string; channel: "email" | "sms" }) => {
      const res = await fetch("/api/reviews/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      })

      const body = await res.json()

      if (!res.ok) {
        throw new Error(body.error || "Failed to send review invitation")
      }

      return body
    },
    onSuccess: (data) => {
      const channelName = channel === "email" ? "email" : "SMS"
      toast.success(`Review invitation sent via ${channelName}!`)

      // Invalidate reviews queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ["reviews"] })
      queryClient.invalidateQueries({ queryKey: ["reviews-summary"] })

      // Show warning if send failed but record was created
      if (data.warning) {
        toast.warning(data.warning)
      }

      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to send review invitation")
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!emailAvailable && !smsAvailable) {
      toast.error("Customer has no email or phone number")
      return
    }

    if (channel === "email" && !emailAvailable) {
      toast.error("Customer has no email address")
      return
    }

    if (channel === "sms" && !smsAvailable) {
      toast.error("Customer has no phone number")
      return
    }

    sendInvitation.mutate({
      customer_id: customerId,
      job_id: jobId,
      channel,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Send Review Invitation</DialogTitle>
            <DialogDescription>
              Request feedback from {customerName} about their experience
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!emailAvailable && !smsAvailable ? (
              <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
                This customer has no email or phone number. Please add contact information before
                sending a review invitation.
              </div>
            ) : (
              <div className="space-y-3">
                <Label>Delivery Method</Label>
                <div className="space-y-2">
                  <label
                    className={`flex items-center space-x-3 p-3 rounded-lg border ${
                      !emailAvailable
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer hover:bg-muted/50"
                    } ${channel === "email" ? "border-primary bg-primary/5" : ""}`}
                  >
                    <input
                      type="radio"
                      name="channel"
                      value="email"
                      checked={channel === "email"}
                      onChange={() => setChannel("email")}
                      disabled={!emailAvailable}
                      className="h-4 w-4"
                    />
                    <div className="flex-1 flex items-center gap-2">
                      <Mail className="h-4 w-4 text-primary" />
                      <div>
                        <div className="font-medium text-sm">Email</div>
                        <div className="text-xs text-muted-foreground">
                          {emailAvailable ? customerEmail : "No email address"}
                        </div>
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-center space-x-3 p-3 rounded-lg border ${
                      !smsAvailable
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer hover:bg-muted/50"
                    } ${channel === "sms" ? "border-primary bg-primary/5" : ""}`}
                  >
                    <input
                      type="radio"
                      name="channel"
                      value="sms"
                      checked={channel === "sms"}
                      onChange={() => setChannel("sms")}
                      disabled={!smsAvailable}
                      className="h-4 w-4"
                    />
                    <div className="flex-1 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-secondary" />
                      <div>
                        <div className="font-medium text-sm">SMS</div>
                        <div className="text-xs text-muted-foreground">
                          {smsAvailable ? customerPhone : "No phone number"}
                        </div>
                      </div>
                    </div>
                  </label>
                </div>

                <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                  The customer will receive a friendly message asking for their feedback on the
                  installation experience{jobId ? " for this job" : ""}.
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={sendInvitation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={sendInvitation.isPending || (!emailAvailable && !smsAvailable)}
            >
              <Send className="h-4 w-4 mr-2" />
              {sendInvitation.isPending ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
