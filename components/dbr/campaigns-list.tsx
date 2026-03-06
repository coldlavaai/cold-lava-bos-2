"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import { cn } from "@/lib/utils"
import { useDBRCampaigns, useUpdateDBRCampaign } from "@/lib/api/hooks"
import type { DBRCampaign } from "@/lib/api/types"
import { Mail, MessageSquare, Phone, Play, Pause, Zap } from "lucide-react"
import { toast } from "sonner"

interface CampaignsListProps {
  selectedCampaign: DBRCampaign | null
  onSelectCampaign: (campaign: DBRCampaign) => void
}

const channelIcons = {
  sms: MessageSquare,
  email: Mail,
  whatsapp: Phone,
}

const statusColors = {
  draft: "bg-white/[0.06] text-white/50 border-white/[0.08]",
  running: "bg-green-500/20 text-green-400 border-green-500/30",
  paused: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  completed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  archived: "bg-white/[0.04] text-white/40 border-white/[0.08]",
}

export function CampaignsList({ selectedCampaign, onSelectCampaign }: CampaignsListProps) {
  const { data: campaignsResponse, isLoading, error } = useDBRCampaigns()
  const updateCampaign = useUpdateDBRCampaign()

  const campaigns = campaignsResponse?.data || []

  const handleStartAutomation = (e: React.MouseEvent, campaign: DBRCampaign) => {
    e.stopPropagation()
    updateCampaign.mutate(
      {
        campaignId: campaign.id,
        data: { status: 'running' },
      },
      {
        onSuccess: () => {
          toast.success(`Automation started for "${campaign.name}"`)
        },
        onError: (error) => {
          toast.error(
            error instanceof Error ? error.message : 'Failed to start automation'
          )
        },
      }
    )
  }

  const handlePauseAutomation = (e: React.MouseEvent, campaign: DBRCampaign) => {
    e.stopPropagation()
    updateCampaign.mutate(
      {
        campaignId: campaign.id,
        data: { status: 'paused' },
      },
      {
        onSuccess: () => {
          toast.success(`Automation paused for "${campaign.name}"`)
        },
        onError: (error) => {
          toast.error(
            error instanceof Error ? error.message : 'Failed to pause automation'
          )
        },
      }
    )
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <LoadingSkeleton className="h-16" count={3} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-muted-foreground text-center">
        Failed to load campaigns
      </div>
    )
  }

  if (campaigns.length === 0) {
    return (
      <div className="p-6 text-sm text-muted-foreground text-center">
        <p>No campaigns yet.</p>
        <p className="mt-1">Create your first campaign to get started.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <h2 className="text-sm font-semibold">Campaigns</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {campaigns.map((campaign) => {
          const Icon = channelIcons[campaign.channel]
          const replyRate = campaign.reply_rate !== null
            ? Math.round(campaign.reply_rate * 100)
            : 0

          return (
            <div
              key={campaign.id}
              className={cn(
                "p-3 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors",
                selectedCampaign?.id === campaign.id && "bg-muted"
              )}
              onClick={() => onSelectCampaign(campaign)}
              data-testid={`campaign-row-${campaign.id}`}
            >
              {/* Campaign Name + Channel + Controls */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium truncate">{campaign.name}</h3>
                  {campaign.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {campaign.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs px-1.5 py-0",
                      statusColors[campaign.status]
                    )}
                  >
                    {campaign.status}
                  </Badge>

                  {/* Automation Controls */}
                  {campaign.status === 'running' ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={(e) => handlePauseAutomation(e, campaign)}
                      data-testid={`pause-automation-${campaign.id}`}
                    >
                      <Pause className="h-3 w-3 mr-1" />
                      Pause
                    </Button>
                  ) : campaign.status === 'draft' || campaign.status === 'paused' ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={(e) => handleStartAutomation(e, campaign)}
                      data-testid={`start-automation-${campaign.id}`}
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Start
                    </Button>
                  ) : null}
                </div>
              </div>

              {/* Metrics + Automation Indicator */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>
                  <span className="font-medium text-foreground">
                    {campaign.total_contacts}
                  </span>{" "}
                  contacts
                </span>
                <span>•</span>
                <span>
                  <span className="font-medium text-foreground">
                    {campaign.replied_contacts}
                  </span>{" "}
                  replied
                </span>
                <span>•</span>
                <span className="font-medium text-foreground">{replyRate}%</span>

                {/* Automation Status Indicator */}
                {campaign.status === 'running' && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-green-400">
                      <Zap className="h-3 w-3" />
                      <span className="font-medium">Auto: On</span>
                    </span>
                  </>
                )}
                {campaign.status === 'paused' && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-yellow-400">
                      <Pause className="h-3 w-3" />
                      <span className="font-medium">Auto: Paused</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
