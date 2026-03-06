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
import { useCreateDBRCampaign } from "@/lib/api/hooks"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import type { DBRCampaign } from "@/lib/api/types"

interface CreateCampaignDialogProps {
  open: boolean
  onClose: () => void
  onCreated?: (campaign: DBRCampaign) => void
}

export function CreateCampaignDialog({ open, onClose, onCreated }: CreateCampaignDialogProps) {
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [channel, setChannel] = React.useState<"sms" | "email" | "whatsapp">("sms")

  const createMutation = useCreateDBRCampaign()

  const handleClose = () => {
    setName("")
    setDescription("")
    setChannel("sms")
    onClose()
  }

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error("Campaign name is required")
      return
    }

    if (channel !== "sms") {
      toast.error("Only SMS campaigns are supported in this release")
      return
    }

    createMutation.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        channel,
        // Default rate limiting
        rate_limit_per_interval: 10,
        rate_limit_interval_seconds: 600,
      },
      {
        onSuccess: (campaign) => {
          toast.success("Campaign created successfully")
          onCreated?.(campaign)
          handleClose()
        },
        onError: (error) => {
          toast.error(
            error instanceof Error ? error.message : "Failed to create campaign"
          )
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[500px]" data-testid="create-campaign-dialog">
        <DialogHeader>
          <DialogTitle>Create DBR Campaign</DialogTitle>
          <DialogDescription>
            Create a new database reactivation campaign to re-engage existing customers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Campaign Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Q1 2026 Reactivation"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={createMutation.isPending}
              data-testid="campaign-name-input"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Target dormant leads from 2025"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={createMutation.isPending}
              rows={3}
              data-testid="campaign-description-input"
            />
          </div>

          {/* Channel */}
          <div className="space-y-2">
            <Label htmlFor="channel">Channel</Label>
            <Select
              value={channel}
              onValueChange={(value) => setChannel(value as "sms" | "email" | "whatsapp")}
              disabled={createMutation.isPending}
            >
              <SelectTrigger id="channel" data-testid="campaign-channel-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="email" disabled>
                  Email (Coming Soon)
                </SelectItem>
                <SelectItem value="whatsapp" disabled>
                  WhatsApp (Coming Soon)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Email and WhatsApp support coming in a future release.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={createMutation.isPending}
            data-testid="create-campaign-submit"
          >
            {createMutation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Create Campaign
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
