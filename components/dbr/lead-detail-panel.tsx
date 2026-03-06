"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useUpdateDBRLead, useSendDBRLeadMessage } from "@/lib/api/hooks"
import { toast } from "sonner"
import { Loader2, Save, Send, Mail, Phone, MessageSquare } from "lucide-react"
import type { DBRLead, DBRContactStatus } from "@/lib/api/types"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface LeadDetailPanelProps {
  lead: DBRLead
  open: boolean
  onClose: () => void
}

const contactStatusOptions: { value: DBRContactStatus; label: string; color: string }[] = [
  { value: "NEUTRAL", label: "Neutral", color: "bg-white/[0.06] text-white/50" },
  { value: "HOT", label: "Hot", color: "bg-red-500/20 text-red-400" },
  { value: "WARM", label: "Warm", color: "bg-orange-500/20 text-orange-400" },
  { value: "COLD", label: "Cold", color: "bg-blue-500/20 text-blue-400" },
  { value: "CALL_BOOKED", label: "Call Booked", color: "bg-green-500/20 text-green-400" },
  { value: "INSTALLED", label: "Installed", color: "bg-purple-500/20 text-purple-400" },
  { value: "DEAD", label: "Dead", color: "bg-white/[0.04] text-white/40" },
  { value: "REMOVED", label: "Removed", color: "bg-white/[0.04] text-white/40" },
  { value: "BAD_NUMBER", label: "Bad Number", color: "bg-yellow-500/20 text-yellow-400" },
]

export function LeadDetailPanel({ lead, open, onClose }: LeadDetailPanelProps) {
  // Editable field state
  const [contactStatus, setContactStatus] = React.useState(lead.contact_status)
  const [priorityScore, setPriorityScore] = React.useState(lead.priority_score?.toString() || "0")
  const [callPrepNotes, setCallPrepNotes] = React.useState(lead.call_prep_notes || "")
  const [hasChanges, setHasChanges] = React.useState(false)

  // SMS state
  const [smsBody, setSmsBody] = React.useState("")

  const updateMutation = useUpdateDBRLead()
  const sendSmsMutation = useSendDBRLeadMessage()

  // Reset state when lead changes
  React.useEffect(() => {
    setContactStatus(lead.contact_status)
    setPriorityScore(lead.priority_score?.toString() || "0")
    setCallPrepNotes(lead.call_prep_notes || "")
    setHasChanges(false)
  }, [lead.id, lead.contact_status, lead.priority_score, lead.call_prep_notes])

  // Track changes
  React.useEffect(() => {
    const changed =
      contactStatus !== lead.contact_status ||
      priorityScore !== (lead.priority_score?.toString() || "0") ||
      callPrepNotes !== (lead.call_prep_notes || "")
    setHasChanges(changed)
  }, [contactStatus, priorityScore, callPrepNotes, lead])

  const handleSave = () => {
    const priority = parseInt(priorityScore, 10)
    if (isNaN(priority) || priority < 0 || priority > 100) {
      toast.error("Priority score must be between 0 and 100")
      return
    }

    updateMutation.mutate(
      {
        leadId: lead.id,
        data: {
          version: lead.version,
          contact_status: contactStatus,
          priority_score: priority,
          call_prep_notes: callPrepNotes || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success("Lead updated successfully")
          setHasChanges(false)
        },
        onError: (error: unknown) => {
          if (error && typeof error === 'object' && 'response' in error) {
            const err = error as { response?: { status?: number } }
            if (err.response?.status === 409) {
              toast.error("This lead was updated elsewhere. Please refresh and try again.")
              return
            }
          }
          toast.error(
            error instanceof Error ? error.message : "Failed to update lead"
          )
        },
      }
    )
  }

  const handleSendSms = () => {
    if (!smsBody.trim()) {
      toast.error("Please enter a message")
      return
    }

    sendSmsMutation.mutate(
      {
        leadId: lead.id,
        data: {
          body: smsBody.trim(),
        },
      },
      {
        onSuccess: () => {
          toast.success("SMS sent successfully")
          setSmsBody("")
        },
        onError: (error) => {
          toast.error(
            error instanceof Error ? error.message : "Failed to send SMS"
          )
        },
      }
    )
  }

  const statusColor = contactStatusOptions.find((opt) => opt.value === contactStatus)?.color || "bg-white/[0.06] text-white/50"

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" data-testid="lead-detail-panel">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2">
            <span>{lead.customer_name || "Unknown Customer"}</span>
            <Badge variant="outline" className={cn("text-xs", statusColor)}>
              {contactStatusOptions.find((opt) => opt.value === lead.contact_status)?.label || lead.contact_status}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Lead from {lead.campaign_id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Contact Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Contact Information</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{lead.phone}</span>
              </div>
              {lead.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{lead.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Timeline</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Message Stage:</span>
                <Badge variant="outline" className="text-xs">
                  {lead.message_stage.replace("_", " ")}
                </Badge>
              </div>
              {lead.first_reply_at && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">First Reply:</span>
                  <span className="text-xs">
                    {format(new Date(lead.first_reply_at), "MMM d, yyyy h:mm a")}
                  </span>
                </div>
              )}
              {lead.latest_reply_at && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Latest Reply:</span>
                  <span className="text-xs">
                    {format(new Date(lead.latest_reply_at), "MMM d, yyyy h:mm a")}
                  </span>
                </div>
              )}
              {lead.call_booked_at && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Call Booked:</span>
                  <span className="text-xs">
                    {format(new Date(lead.call_booked_at), "MMM d, yyyy h:mm a")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Editable Fields */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold">Lead Details</h3>

            {/* Contact Status */}
            <div className="space-y-2">
              <Label htmlFor="contact-status">Contact Status</Label>
              <Select
                value={contactStatus}
                onValueChange={(value) => setContactStatus(value as DBRContactStatus)}
                disabled={updateMutation.isPending}
              >
                <SelectTrigger id="contact-status" data-testid="contact-status-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contactStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority Score */}
            <div className="space-y-2">
              <Label htmlFor="priority-score">Priority Score (0-100)</Label>
              <Input
                id="priority-score"
                type="number"
                min="0"
                max="100"
                value={priorityScore}
                onChange={(e) => setPriorityScore(e.target.value)}
                disabled={updateMutation.isPending}
                data-testid="priority-score-input"
              />
            </div>

            {/* Call Prep Notes */}
            <div className="space-y-2">
              <Label htmlFor="call-prep-notes">Call Prep Notes</Label>
              <Textarea
                id="call-prep-notes"
                value={callPrepNotes}
                onChange={(e) => setCallPrepNotes(e.target.value)}
                disabled={updateMutation.isPending}
                rows={3}
                placeholder="Notes to help prepare for a call with this lead..."
                data-testid="call-prep-notes-input"
              />
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={!hasChanges || updateMutation.isPending}
              className="w-full"
              data-testid="save-lead-button"
            >
              {updateMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>

          {/* Manual SMS Send */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Send Manual SMS
            </h3>
            <div className="space-y-2">
              <Textarea
                value={smsBody}
                onChange={(e) => setSmsBody(e.target.value)}
                disabled={sendSmsMutation.isPending}
                rows={4}
                placeholder="Type your SMS message here..."
                data-testid="sms-body-input"
              />
              <Button
                onClick={handleSendSms}
                disabled={!smsBody.trim() || sendSmsMutation.isPending}
                className="w-full"
                data-testid="send-sms-button"
              >
                {sendSmsMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                <Send className="h-4 w-4 mr-2" />
                Send SMS
              </Button>
              <p className="text-xs text-muted-foreground">
                Message will be sent to {lead.phone} and tracked in this campaign.
              </p>
            </div>
          </div>

          {/* Conversation History (Read-only) */}
          {lead.conversation_history && (
            <div className="space-y-2 border-t pt-4">
              <h3 className="text-sm font-semibold">Conversation History</h3>
              <div className="text-sm text-muted-foreground bg-muted/30 rounded p-3 max-h-40 overflow-y-auto">
                {lead.conversation_history}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
