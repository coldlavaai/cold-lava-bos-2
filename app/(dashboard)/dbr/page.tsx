"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Plus } from "lucide-react"
import { CampaignsList } from "@/components/dbr/campaigns-list"
import { LeadsTable } from "@/components/dbr/leads-table"
import { CreateCampaignDialog } from "@/components/dbr/create-campaign-dialog"
import { CampaignSettingsDialog } from "@/components/dbr/campaign-settings-dialog"
import { LeadDetailPanel } from "@/components/dbr/lead-detail-panel"
import type { DBRCampaign, DBRLead } from "@/lib/api/types"

export default function DBRPage() {
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [selectedCampaign, setSelectedCampaign] = React.useState<DBRCampaign | null>(null)
  const [selectedLead, setSelectedLead] = React.useState<DBRLead | null>(null)
  const [detailPanelOpen, setDetailPanelOpen] = React.useState(false)
  const [settingsOpen, setSettingsOpen] = React.useState(false)

  const handleCampaignCreated = (campaign: DBRCampaign) => {
    setSelectedCampaign(campaign)
    setCreateDialogOpen(false)
  }

  const handleLeadClick = (lead: DBRLead) => {
    setSelectedLead(lead)
    setDetailPanelOpen(true)
  }

  const handleDetailPanelClose = () => {
    setDetailPanelOpen(false)
    // Small delay before clearing to avoid visual flicker
    setTimeout(() => setSelectedLead(null), 200)
  }

  return (
    
      <div className="space-y-4">
        {/* Page Header - Mobile optimized */}
        <div className="flex flex-col gap-2 pb-2 border-b border-border">
          <div className="flex items-center justify-between">
            <h1 className="text-lg md:text-xl font-display font-bold gradient-text-solar">
              DBR Campaigns
            </h1>
            <div className="flex gap-2">
              {selectedCampaign && (
                <Button
                  variant="outline"
                  className="gap-1.5 h-9 md:h-8 shrink-0"
                  onClick={() => setSettingsOpen(true)}
                >
                  <span className="hidden sm:inline">Campaign Settings</span>
                </Button>
              )}
              <Button
                className="gap-1.5 h-9 md:h-8 shrink-0"
                onClick={() => setCreateDialogOpen(true)}
                data-testid="new-campaign-button"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New Campaign</span>
              </Button>
            </div>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground hidden md:block">
            Database Reactivation campaigns over existing customers
          </p>
        </div>

        {/* Create Campaign Dialog */}
        <CreateCampaignDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          onCreated={handleCampaignCreated}
        />

        {/* Two-Panel Layout: Campaigns + Leads */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-12rem)]">
          {/* Left Panel: Campaigns List */}
          <Card
            className="lg:col-span-1 overflow-hidden flex flex-col bg-white/[0.04] backdrop-blur-xl border-white/[0.08] shadow-sm shadow-black/20"
            data-testid="campaigns-panel"
          >
            <CampaignsList
              selectedCampaign={selectedCampaign}
              onSelectCampaign={setSelectedCampaign}
            />
          </Card>

          {/* Right Panel: Leads Table */}
          <Card
            className="lg:col-span-2 overflow-hidden flex flex-col bg-white/[0.04] backdrop-blur-xl border-white/[0.08] shadow-sm shadow-black/20"
            data-testid="leads-panel"
          >
            <LeadsTable
              campaign={selectedCampaign}
              onLeadClick={handleLeadClick}
            />
          </Card>
        </div>

        {/* Campaign Settings */}
        <CampaignSettingsDialog
          campaign={selectedCampaign}
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        />

        {/* Lead Detail Panel (Drawer) */}
        {selectedLead && (
          <LeadDetailPanel
            lead={selectedLead}
            open={detailPanelOpen}
            onClose={handleDetailPanelClose}
          />
        )}
      </div>
    
  )
}
