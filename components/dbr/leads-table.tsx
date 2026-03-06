"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useDBRLeads } from "@/lib/api/hooks"
import type { DBRCampaign, DBRLead, DBRMessageStage, DBRContactStatus } from "@/lib/api/types"
import { ChevronLeft, ChevronRight, Filter, X, Upload, Loader2, CheckCircle2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { format } from "date-fns"

interface LeadsTableProps {
  campaign: DBRCampaign | null
  onLeadClick: (lead: DBRLead) => void
}

const messageStageOptions: { value: DBRMessageStage; label: string }[] = [
  { value: "Ready", label: "Ready" },
  { value: "M1_sent", label: "M1 Sent" },
  { value: "M2_sent", label: "M2 Sent" },
  { value: "M3_sent", label: "M3 Sent" },
  { value: "In_conversation", label: "In Conversation" },
  { value: "Ended", label: "Ended" },
]

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

const messageStageColors: Record<DBRMessageStage, string> = {
  Ready: "bg-blue-500/20 text-blue-400",
  M1_sent: "bg-purple-500/20 text-purple-400",
  M2_sent: "bg-purple-500/20 text-purple-400",
  M3_sent: "bg-purple-500/20 text-purple-400",
  In_conversation: "bg-green-500/20 text-green-400",
  Ended: "bg-white/[0.04] text-white/40",
}

export function LeadsTable({ campaign, onLeadClick }: LeadsTableProps) {
  const [messageStageFilter, setMessageStageFilter] = React.useState<string>("all")
  const [contactStatusFilter, setContactStatusFilter] = React.useState<string>("all")
  const limit = 999 // Load all records — no pagination

  const { data: leadsResponse, isLoading, error } = useDBRLeads(
    campaign?.id || "",
    {
      message_stage: messageStageFilter !== "all" ? messageStageFilter : undefined,
      contact_status: contactStatusFilter !== "all" ? contactStatusFilter : undefined,
      page: 1,
      limit,
    }
  )

  const leads = leadsResponse?.data || []
  const total = leadsResponse?.meta?.pagination?.total || 0

  const hasFilters = messageStageFilter !== "all" || contactStatusFilter !== "all"

  // Import state
  const [importOpen, setImportOpen] = React.useState(false)
  const [importData, setImportData] = React.useState("")
  const [importing, setImporting] = React.useState(false)
  const [importResult, setImportResult] = React.useState<{ created: number; skipped: number; errors: Array<{ row: number; phone: string; error: string }> } | null>(null)

  const handleImport = async () => {
    if (!campaign || !importData.trim()) return
    setImporting(true)
    setImportResult(null)
    try {
      const isJSON = importData.trim().startsWith("[") || importData.trim().startsWith("{")
      const res = await fetch(`/api/dbr/campaigns/${campaign.id}/import`, {
        method: "POST",
        headers: { "Content-Type": isJSON ? "application/json" : "text/csv" },
        body: importData,
      })
      const json = await res.json()
      if (res.ok) {
        setImportResult({ created: json.created, skipped: json.skipped, errors: json.errors || [] })
        toast.success(`Imported ${json.created} contacts`)
      } else {
        toast.error(json.error || "Import failed")
      }
    } catch {
      toast.error("Import failed")
    } finally {
      setImporting(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImportData(reader.result as string)
    reader.readAsText(file)
  }

  const clearFilters = () => {
    setMessageStageFilter("all")
    setContactStatusFilter("all")
  }

  const getContactStatusColor = (status: DBRContactStatus) => {
    return contactStatusOptions.find((opt) => opt.value === status)?.color || "bg-white/[0.06] text-white/50"
  }

  if (!campaign) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground">
          <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Select a campaign to view leads</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with filters */}
      <div className="p-3 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Leads</h2>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => { setImportOpen(true); setImportResult(null); setImportData("") }}>
              <Upload className="h-3 w-3" /> Import
            </Button>
          </div>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-7 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear filters
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Select value={messageStageFilter} onValueChange={setMessageStageFilter}>
            <SelectTrigger className="h-8 text-xs w-[140px]" data-testid="message-stage-filter">
              <SelectValue placeholder="Message stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {messageStageOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={contactStatusFilter} onValueChange={setContactStatusFilter}>
            <SelectTrigger className="h-8 text-xs w-[140px]" data-testid="contact-status-filter">
              <SelectValue placeholder="Contact status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {contactStatusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-2">
            <LoadingSkeleton className="h-12" count={5} />
          </div>
        ) : error ? (
          <div className="p-4 text-sm text-muted-foreground text-center">
            Failed to load leads
          </div>
        ) : leads.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground text-center">
            {hasFilters ? "No leads match the selected filters" : "No leads in this campaign yet"}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0 z-10">
              <tr className="border-b border-border">
                <th className="text-left p-2 font-medium text-xs">Customer</th>
                <th className="text-left p-2 font-medium text-xs">Phone</th>
                <th className="text-left p-2 font-medium text-xs">Stage</th>
                <th className="text-left p-2 font-medium text-xs">Status</th>
                <th className="text-left p-2 font-medium text-xs">Last Reply</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => onLeadClick(lead)}
                  data-testid={`lead-row-${lead.id}`}
                >
                  <td className="p-2">
                    <div className="font-medium">{lead.customer_name || "Unknown"}</div>
                    {lead.email && (
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {lead.email}
                      </div>
                    )}
                  </td>
                  <td className="p-2 text-muted-foreground">{lead.phone}</td>
                  <td className="p-2">
                    <Badge
                      variant="outline"
                      className={cn("text-xs", messageStageColors[lead.message_stage])}
                    >
                      {lead.message_stage.replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="p-2">
                    <Badge
                      variant="outline"
                      className={cn("text-xs", getContactStatusColor(lead.contact_status))}
                    >
                      {contactStatusOptions.find((opt) => opt.value === lead.contact_status)?.label || lead.contact_status}
                    </Badge>
                  </td>
                  <td className="p-2 text-muted-foreground text-xs">
                    {lead.latest_reply_at
                      ? format(new Date(lead.latest_reply_at), "MMM d, h:mm a")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination removed — show all results */
      false && (
        <div />
      )}
      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Import Contacts</DialogTitle>
            <DialogDescription>Upload a CSV file or paste CSV/JSON data to add contacts to this campaign.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <input type="file" accept=".csv,.txt,.json" onChange={handleFileUpload} className="text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer" />
            </div>
            <Textarea
              placeholder={"name,phone,email,postcode\nJohn Smith,07912345678,john@example.com,SW1A 1AA\nJane Doe,07987654321,,EC1A 1BB"}
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              rows={10}
              className="font-mono text-xs"
            />
            {importResult && (
              <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
                <div className="flex items-center gap-2 text-green-400"><CheckCircle2 className="h-4 w-4" /> {importResult.created} contacts added</div>
                {importResult.skipped > 0 && <div className="text-muted-foreground">{importResult.skipped} duplicates skipped</div>}
                {importResult.errors.length > 0 && (
                  <div className="text-red-400 text-xs mt-2">
                    {importResult.errors.slice(0, 5).map((e, i) => <div key={i}>Row {e.row}: {e.error}</div>)}
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
              <Button onClick={handleImport} disabled={importing || !importData.trim()} className="gap-1.5">
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {importing ? "Importing..." : "Import Contacts"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
