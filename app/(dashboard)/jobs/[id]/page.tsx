"use client"

import * as React from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Zap,
  Edit,
  CheckCircle2,
  FileText,
  Loader2,
  Plus,
  Circle,
  X,
  Download,
  Send,
  Link,
  RefreshCw,
  AlertCircle,
  Eye,
  Sun,
  Star,
  ExternalLink,
} from "lucide-react"
import { useJob, useJobTasks, useJobAppointments, useDeleteJob, useJobStages, useTransitionJobStage, useCreateTask, useCompleteTask, useUpdateJob, useJobQuotes, useSendQuote, useDownloadQuotePdf, useEmailQuote, useJobOpenSolar, useCreateOpenSolarProject, useLinkOpenSolarProject, useSyncToOpenSolar, useJobSiteIntel, useComputeJobSiteIntel, useJobSolarLayers, useCallRecordingsForJob, useInstallationPhotos, useInstallationDocuments, useCallLogs, useCreateCallLog } from "@/lib/api/hooks"
import type { Quote, CallLog, Job } from "@/lib/api/types"
import { VERTICALS, CALL_OUTCOMES } from "@/lib/api/types"
import { Textarea } from "@/components/ui/textarea"
import { buildGoogleMapsEmbedUrlFromCustomer } from "@/lib/maps/google-maps"
import { cn } from "@/lib/utils"
import { ErrorBoundary } from "@/components/error-boundary"
import { JobFormDialog } from "@/components/forms/job-form-dialog"
import { QuoteFormDialog } from "@/components/forms/quote-form-dialog"
import { SolarVisualizationModal } from "@/components/solar/solar-visualization-modal"
import { InteractiveSolarMap } from "@/components/solar/interactive-solar-map"
import { toast } from "sonner"
import { WebsiteScoreBadge } from "@/components/ui/website-score-badge"
import { TagEditor } from "@/components/jobs/tag-editor"
import { getWebsiteScore } from "@/lib/utils/website-score"
import { CallRecordingCard, CallRecordingTranscriptDialog } from "@/components/call-recordings"
import { JobEquipmentSection } from "@/components/equipment"
import { ReviewsSummaryCard } from "@/components/reviews/reviews-summary-card"
import { SendReviewInviteDialog } from "@/components/reviews/send-review-invite-dialog"
import type { CallRecording } from "@/lib/api/types"

// Type for job metadata structure (Session 64 - OpenSolar)
interface JobMetadata {
  opensolar?: {
    project_id?: string | null
    project_url?: string | null
  }
}

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const jobId = params.id as string

  // Support deep-links like /jobs/[id]?tab=quotes&quoteId=...
  const initialTabParam = (searchParams.get('tab') || 'overview') as 'overview' | 'equipment' | 'tasks' | 'quotes' | 'activity' | 'files' | 'compliance'
  const initialQuoteIdParam = searchParams.get('quoteId')

  const [activeTab, setActiveTab] = React.useState<typeof initialTabParam | 'sales-intel' | 'call-log'>(initialTabParam)
  const [jobEditDialogOpen, setJobEditDialogOpen] = React.useState(false)
  const [quoteDialogOpen, setQuoteDialogOpen] = React.useState(false)
  const [editingQuote, setEditingQuote] = React.useState<Quote | null>(null)
  const [reviewInviteDialogOpen, setReviewInviteDialogOpen] = React.useState(false)
  const deleteJob = useDeleteJob()

  const { data: job, isLoading: jobLoading, error: jobError } = useJob(jobId)
  const { data: installPhotos = [] } = useInstallationPhotos(jobId)
  const { data: installDocs = [] } = useInstallationDocuments(jobId)
  const { data: tasks = [], isLoading: tasksLoading } = useJobTasks(jobId)
  const { data: appointments = [], isLoading: appointmentsLoading } = useJobAppointments(jobId)
  const { data: quotes = [], isLoading: quotesLoading } = useJobQuotes(jobId)
  const { data: stages = [] } = useJobStages()
  const { data: opensolarSummary } = useJobOpenSolar(jobId)
  const { data: siteIntel } = useJobSiteIntel(jobId)
  // Only load call recordings when Activity tab is active (performance optimization)
  const { data: callRecordings = [] } = useCallRecordingsForJob(jobId, { enabled: activeTab === "activity" })
  // Call logs for sales pipeline
  const { data: callLogs = [], isLoading: callLogsLoading } = useCallLogs(jobId, { enabled: activeTab === "call-log" })
  const createCallLog = useCreateCallLog()
  const transitionMutation = useTransitionJobStage()
  const createTask = useCreateTask()
  const completeTask = useCompleteTask()
  const updateJob = useUpdateJob()
  const sendQuote = useSendQuote()
  const downloadQuotePdf = useDownloadQuotePdf()
  const emailQuote = useEmailQuote()

  // OpenSolar mutations (Session 72)
  const createOpenSolarProject = useCreateOpenSolarProject()
  const linkOpenSolarProject = useLinkOpenSolarProject()
  const syncToOpenSolar = useSyncToOpenSolar()

  // Site Intelligence mutations (Session 76)
  const computeIntel = useComputeJobSiteIntel()

  // Task creation state
  const [newTaskTitle, setNewTaskTitle] = React.useState("")
  const [newTaskDueDate, setNewTaskDueDate] = React.useState("")
  const [showTaskForm, setShowTaskForm] = React.useState(false)

  // Inline editing state
  const [editingField, setEditingField] = React.useState<string | null>(null)
  const [editValue, setEditValue] = React.useState("")
  const [newTag, setNewTag] = React.useState("")

  // OpenSolar link dialog state (Session 72)
  const [linkDialogOpen, setLinkDialogOpen] = React.useState(false)
  const [linkProjectInput, setLinkProjectInput] = React.useState("")

  // Solar debug panel state (Session 79)
  const [showSolarDebug, setShowSolarDebug] = React.useState(false)

  // Solar visualization modal state (Session 80)
  const [solarVizModalOpen, setSolarVizModalOpen] = React.useState(false)
  // Only fetch solar data when modal is opened (lazy load for performance)
  const { data: solarVisualizationData, isLoading: solarVizLoading, error: solarVizError } = useJobSolarLayers(jobId, { enabled: solarVizModalOpen })

  // Call recording transcript dialog state (Session 98)
  const [selectedRecording, setSelectedRecording] = React.useState<CallRecording | null>(null)
  const [transcriptDialogOpen, setTranscriptDialogOpen] = React.useState(false)

  // Compliance removed — replaced by website score

  // When we land on the page with ?quoteId=... and quotes have loaded, open that
  // quote in edit mode and switch to the Quotes tab. This only runs once per
  // initial load while a quoteId param is present.
  React.useEffect(() => {
    if (!initialQuoteIdParam || quotesLoading || !quotes.length) return

    const target = quotes.find((q) => q.id === initialQuoteIdParam)
    if (!target) return

    setActiveTab('quotes')
    setEditingQuote(target)
    setQuoteDialogOpen(true)

    // Optionally, we could strip the query params here so a manual refresh
    // doesn't keep reopening the dialog.
    // const url = new URL(window.location.href)
    // url.searchParams.delete('tab')
    // url.searchParams.delete('quoteId')
    // window.history.replaceState(null, '', url.toString())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuoteIdParam, quotesLoading, quotes.length])

  // Compliance form initialization removed

  const handleStageChange = async (newStageId: string) => {
    if (!job || newStageId === job.current_stage_id) return

    try {
      await transitionMutation.mutateAsync({
        jobId: job.id,
        toStageId: newStageId,
      })
      toast.success('Stage updated successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update stage')
    }
  }

  const handleDeleteJob = async () => {
    if (!confirm("Are you sure you want to delete this job? This action cannot be undone.")) {
      return
    }

    try {
      await deleteJob.mutateAsync(jobId)
      toast.success("Job deleted successfully")
      router.push("/jobs")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete job")
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

    try {
      await createTask.mutateAsync({
        title: newTaskTitle,
        due_date: newTaskDueDate || undefined,
        linked_entity_type: 'job',
        linked_entity_id: jobId,
      })
      toast.success("Task created successfully")
      setNewTaskTitle("")
      setNewTaskDueDate("")
      setShowTaskForm(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create task")
    }
  }

  const handleToggleTaskComplete = async (taskId: string, isCompleted: boolean) => {
    if (isCompleted) {
      toast.info("Task is already completed")
      return
    }

    try {
      await completeTask.mutateAsync(taskId)
      toast.success("Task marked as complete")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to complete task")
    }
  }

  // Inline edit handlers
  const startEdit = (field: string, currentValue: string | number | null) => {
    setEditingField(field)
    setEditValue(currentValue?.toString() || "")
  }

  const cancelEdit = () => {
    setEditingField(null)
    setEditValue("")
  }

  const saveField = async (field: string) => {
    if (!job) return

    try {
      const updates: Record<string, unknown> = {}

      if (field === "estimated_value") {
        const value = parseFloat(editValue)
        if (isNaN(value) || value < 0) {
          toast.error("Please enter a valid positive number")
          return
        }
        updates.estimated_value = value
      } else if (field === "system_size_kwp") {
        const value = parseFloat(editValue)
        if (isNaN(value) || value <= 0 || value > 1000) {
          toast.error("Please enter a valid system size (0-1000 kWp)")
          return
        }
        updates.system_size_kwp = value
      }

      await updateJob.mutateAsync({ id: jobId, ...updates })
      toast.success("Updated successfully")
      setEditingField(null)
      setEditValue("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update")
    }
  }

  const addTag = async () => {
    if (!job || !newTag.trim()) return

    const updatedTags = [...(job.tags || []), newTag.trim()]

    try {
      await updateJob.mutateAsync({ id: jobId, tags: updatedTags })
      toast.success("Tag added")
      setNewTag("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add tag")
    }
  }

  const removeTag = async (tagToRemove: string) => {
    if (!job) return

    const updatedTags = (job.tags || []).filter((tag) => tag !== tagToRemove)

    try {
      await updateJob.mutateAsync({ id: jobId, tags: updatedTags })
      toast.success("Tag removed")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove tag")
    }
  }

  // OpenSolar action handlers (Session 72)
  const parseOpenSolarProjectId = (input: string): string | null => {
    if (!input.trim()) return null

    // If it looks like a URL, try to extract the project ID
    if (input.includes('opensolar.com') || input.includes('http')) {
      // Match patterns like: https://app.opensolar.com/projects/<id>
      const urlMatch = input.match(/\/projects\/([a-zA-Z0-9_-]+)/)
      if (urlMatch && urlMatch[1]) {
        return urlMatch[1]
      }
      return null
    }

    // Otherwise, assume it's a raw project ID
    return input.trim()
  }

  const handleCreateOpenSolarProject = async () => {
    try {
      await createOpenSolarProject.mutateAsync(jobId)
      toast.success("OpenSolar project created successfully")
    } catch (error) {
      toast.error("Failed to create OpenSolar project. Please try again later.")
      console.error("Create OpenSolar project error:", error)
    }
  }

  const handleLinkOpenSolarProject = async () => {
    const projectId = parseOpenSolarProjectId(linkProjectInput)

    if (!projectId) {
      toast.error("Please enter a valid OpenSolar project ID or URL")
      return
    }

    try {
      await linkOpenSolarProject.mutateAsync({
        jobId,
        project_id: projectId,
      })
      toast.success("OpenSolar project linked successfully")
      setLinkDialogOpen(false)
      setLinkProjectInput("")
    } catch (error) {
      toast.error("Failed to link OpenSolar project. Please check the ID and try again.")
      console.error("Link OpenSolar project error:", error)
    }
  }

  const handleSyncToOpenSolar = async () => {
    try {
      await syncToOpenSolar.mutateAsync(jobId)
      toast.success("Job details synced to OpenSolar successfully")
    } catch (error) {
      toast.error("Failed to sync to OpenSolar. Please try again later.")
      console.error("Sync to OpenSolar error:", error)
    }
  }

  // Compliance validation + handlers removed — replaced by website score

  if (jobError) {
    return (
      
        <ErrorBoundary>
          <div>Error loading job</div>
        </ErrorBoundary>
      
    )
  }

  if (jobLoading) {
    return (
      
        <div className="space-y-6">
          <div className="h-32 bg-muted animate-pulse rounded-lg" />
          <div className="h-96 bg-muted animate-pulse rounded-lg" />
        </div>
      
    )
  }

  if (!job) {
    return (
      
        <div className="text-center py-12">
          <p className="text-muted-foreground">Job not found</p>
          <Button onClick={() => router.push("/jobs")} className="mt-4">
            Back to Jobs
          </Button>
        </div>
      
    )
  }

  const daysInStage = Math.floor(
    (new Date().getTime() - new Date(job.stage_changed_at).getTime()) / (1000 * 60 * 60 * 24)
  )

  return (
    <>
      <ErrorBoundary>
        <div className="space-y-6">
          {/* Header - Mobile optimized */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/jobs")}
                className="gap-2 h-9 -ml-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Jobs</span>
              </Button>
              {job.tags?.includes("HOT") && (
                <Badge variant="destructive" className="animate-glow">
                  🔥 HOT
                </Badge>
              )}
            </div>
            <div className="space-y-2">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h1 className="text-xl md:text-3xl font-display font-bold">
                    {job.customer?.name || "Unknown Customer"}
                  </h1>
                  <Badge variant="outline" className="text-xs font-mono">
                    {job.job_number}
                  </Badge>
                  {/* Sales pipeline badges */}
                  {job.region && (
                    <Badge variant={job.region === 'US' ? 'warning' : 'secondary'} className="text-xs">
                      {job.region}
                    </Badge>
                  )}
                  {job.lead_type && (
                    <Badge className={cn("text-xs",
                      job.lead_type === 'BOS' ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                      job.lead_type === 'Website' ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                      "bg-purple-500/20 text-purple-400 border-purple-500/30"
                    )}>
                      {job.lead_type}
                    </Badge>
                  )}
                  {job.vertical && (
                    <Badge className="text-xs bg-cyan-500/15 text-cyan-400 border-cyan-500/25">
                      {job.vertical}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-muted-foreground">
                  <div className="flex items-center gap-2 text-sm" data-testid="job-stage-section">
                    <span>Stage:</span>
                    {stages && stages.length > 0 ? (
                      <Select
                        value={job.current_stage_id || ''}
                        onValueChange={handleStageChange}
                        disabled={transitionMutation.isPending}
                      >
                        <SelectTrigger className="w-[140px] md:w-[180px] h-8 text-sm" data-testid="stage-select-trigger">
                          <SelectValue placeholder={job.current_stage?.name} />
                        </SelectTrigger>
                        <SelectContent>
                          {stages.map((stage) => (
                            <SelectItem key={stage.id} value={stage.id}>
                              {stage.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="font-medium" data-testid="stage-fallback">
                        {job.current_stage?.name || 'Loading...'}
                      </span>
                    )}
                    {transitionMutation.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                  </div>
                  <span className="hidden sm:inline text-sm">•</span>
                  <span className="text-sm">{daysInStage}d in stage</span>
                  {job.customer?.postcode && (
                    <>
                      <span className="hidden sm:inline text-sm">•</span>
                      <span className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3" />
                        {job.customer.postcode}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            {/* Action buttons - scrollable on mobile */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-3 px-3 md:mx-0 md:px-0 md:pb-0">
              <Button variant="outline" size="sm" className="gap-2 h-9 shrink-0">
                <Phone className="h-4 w-4" />
                <span className="hidden sm:inline">Call</span>
              </Button>
              <Button variant="outline" size="sm" className="gap-2 h-9 shrink-0">
                <Mail className="h-4 w-4" />
                <span className="hidden sm:inline">Email</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 h-9 shrink-0"
                onClick={() => setReviewInviteDialogOpen(true)}
                data-testid="job-send-review-button"
              >
                <Star className="h-4 w-4" />
                <span className="hidden sm:inline">Review</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 h-9 shrink-0"
                onClick={() => setJobEditDialogOpen(true)}
              >
                <Edit className="h-4 w-4" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="h-9 shrink-0"
                onClick={handleDeleteJob}
                disabled={deleteJob.isPending}
              >
                {deleteJob.isPending ? "..." : "Delete"}
              </Button>
            </div>
          </div>

          {/* Job Edit Dialog */}
          <JobFormDialog
            open={jobEditDialogOpen}
            onOpenChange={setJobEditDialogOpen}
            mode="edit"
            job={job}
          />

          {/* Quote Form Dialog */}
          <QuoteFormDialog
            open={quoteDialogOpen}
            onOpenChange={setQuoteDialogOpen}
            mode={editingQuote ? "edit" : "create"}
            quote={editingQuote || undefined}
            job={job}
          />

          {/* Link OpenSolar Project Dialog — hidden per Jacob's review Feb 2026 */}

          {/* Main Content */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="space-y-4">
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="sales-intel">Sales Intel</TabsTrigger>
              <TabsTrigger value="call-log">Call Log</TabsTrigger>
              <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
              <TabsTrigger value="quotes" data-testid="job-quotes-tab">Quotes ({quotes.length})</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="files">Files</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Key Details */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Job Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div data-testid="estimated-value-section">
                        <div className="text-sm text-muted-foreground mb-1">Estimated Value</div>
                        {editingField === "estimated_value" ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="h-9 text-sm"
                              placeholder="Enter value"
                              data-testid="estimated-value-input"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              onClick={() => saveField("estimated_value")}
                              disabled={updateJob.isPending}
                              data-testid="estimated-value-save"
                            >
                              {updateJob.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={cancelEdit}
                              disabled={updateJob.isPending}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div
                            className="text-2xl font-display font-bold text-primary cursor-pointer hover:opacity-70 flex items-center gap-2 group"
                            onClick={() => startEdit("estimated_value", job.estimated_value)}
                            data-testid="estimated-value-display"
                          >
                            £{job.estimated_value ? (job.estimated_value / 1000).toFixed(1) : 0}k
                            <Edit className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </div>
                      {/* Website Score */}
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Website Score</div>
                        <div className="flex items-center gap-2">
                          <WebsiteScoreBadge score={getWebsiteScore(job)} size="lg" showLabel showIcon />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Current Stage</span>
                        <Badge variant="secondary">{job.current_stage?.name}</Badge>
                      </div>
                      {job.source && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Source</span>
                          <span className="text-sm font-medium">{job.source}</span>
                        </div>
                      )}
                      <div className="flex flex-col gap-2" data-testid="tags-section">
                        <span className="text-sm text-muted-foreground">Tags</span>
                        <TagEditor jobId={jobId} tags={job.tags} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Created</span>
                        <span className="text-sm font-medium">
                          {new Date(job.created_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>

                    {/* OpenSolar Integration — hidden per Jacob's review Feb 2026 */}

                    {/* SOLAR-SPECIFIC: View Solar Analysis button hidden for Cold Lava */}

                    {/* SOLAR-SPECIFIC: Solar intel debug panel hidden for Cold Lava */}

                    {job.notes && (
                      <div className="pt-4 border-t">
                        <div className="text-sm text-muted-foreground mb-2">Notes</div>
                        <p className="text-sm whitespace-pre-wrap">{job.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Customer Info */}
                <Card>
                  <CardHeader>
                    <CardTitle>Customer</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {job.customer && (
                      <>
                        <div>
                          <div className="font-semibold">{job.customer.name}</div>
                        </div>
                        {job.customer.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <a
                              href={`mailto:${job.customer.email}`}
                              className="text-primary hover:underline"
                            >
                              {job.customer.email}
                            </a>
                          </div>
                        )}
                        {job.customer.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <a
                              href={`tel:${job.customer.phone}`}
                              className="text-primary hover:underline"
                            >
                              {job.customer.phone}
                            </a>
                          </div>
                        )}
                        {job.customer.address_line_1 && (
                          <div className="flex items-start gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <div>{job.customer.address_line_1}</div>
                              {job.customer.address_line_2 && <div>{job.customer.address_line_2}</div>}
                              {job.customer.city && <div>{job.customer.city}</div>}
                              {job.customer.postcode && <div>{job.customer.postcode}</div>}
                            </div>
                          </div>
                        )}

                        {/* SOLAR-SPECIFIC: Entire solar visualization stats block removed for Cold Lava */}

                        {/* Session 74 - Property map */}
                        {/* Session 80 - Updated to use accurate coordinates from Solar API */}
                        {(() => {
                          const mapsEmbedUrl = buildGoogleMapsEmbedUrlFromCustomer(
                            job.customer,
                            solarVisualizationData?.center || null
                          )
                          if (!mapsEmbedUrl) return null
                          return (
                            <div className="mt-4 rounded-lg border border-border overflow-hidden bg-muted/20">
                              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  <span>Property map</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    className="text-[0.7rem] text-primary underline-offset-2 hover:underline"
                                    onClick={() => {
                                      const coords = solarVisualizationData?.center
                                      const address = [
                                        job.customer?.address_line_1,
                                        job.customer?.city,
                                        job.customer?.postcode
                                      ].filter(Boolean).join(', ')

                                      let streetViewUrl
                                      if (coords?.latitude && coords?.longitude) {
                                        // Use coordinates for more accurate Street View
                                        streetViewUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${coords.latitude},${coords.longitude}`
                                      } else if (address) {
                                        // Fallback to address search
                                        streetViewUrl = `https://www.google.com/maps/search/${encodeURIComponent(address)}/@?map_action=pano`
                                      }

                                      if (streetViewUrl) {
                                        window.open(streetViewUrl, '_blank')
                                      }
                                    }}
                                  >
                                    View Street View
                                  </button>
                                  <button
                                    type="button"
                                    className="text-[0.7rem] text-primary underline-offset-2 hover:underline"
                                    onClick={() => window.open(mapsEmbedUrl.replace('&output=embed', ''), '_blank')}
                                  >
                                    Open in Google Maps
                                  </button>
                                </div>
                              </div>
                              {/* SOLAR-SPECIFIC: Solar potential chip hidden */}
                              <div className="aspect-video w-full bg-muted relative">
                                <iframe
                                  src={mapsEmbedUrl}
                                  className="h-full w-full border-0"
                                  loading="lazy"
                                  referrerPolicy="no-referrer-when-downgrade"
                                  title="Property location map"
                                />
                              </div>
                              {/* SOLAR-SPECIFIC: Solar metrics and estimate CTA hidden */}
                            </div>
                          )
                        })()}
                        <Button variant="outline" size="sm" className="w-full mt-4">
                          View Customer
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Installation Files Summary */}
              {(installPhotos.length > 0 || installDocs.length > 0) && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <FileText className="h-4 w-4 text-teal-400" />
                          <span className="font-medium text-foreground">{installPhotos.length}</span>
                          <span>photo{installPhotos.length !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <FileText className="h-4 w-4 text-teal-400" />
                          <span className="font-medium text-foreground">{installDocs.length}</span>
                          <span>doc{installDocs.length !== 1 ? "s" : ""}</span>
                        </div>
                      </div>
                      <Link href={`/installations/${jobId}`} className="text-xs text-teal-400 hover:text-teal-300 transition-colors flex items-center gap-1">
                        View installation
                        <Star className="h-3 w-3" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )}
              {installPhotos.length === 0 && installDocs.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">No installation files yet</p>
                      <Link href={`/installations/${jobId}`} className="text-xs text-teal-400 hover:text-teal-300 transition-colors">
                        Add photos &amp; docs →
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Next Steps */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tasks */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Tasks</CardTitle>
                      <Badge variant="outline">{tasks.length}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {tasksLoading ? (
                      <div className="space-y-2">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                        ))}
                      </div>
                    ) : tasks.length > 0 ? (
                      <div className="space-y-2">
                        {tasks.slice(0, 5).map((task) => (
                          <div
                            key={task.id}
                            className="flex items-start gap-2 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                          >
                            {task.status === "completed" ? (
                              <CheckCircle2 className="h-4 w-4 text-success mt-0.5" />
                            ) : (
                              <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{task.title}</div>
                              {task.due_date && (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  Due:{" "}
                                  {new Date(task.due_date).toLocaleDateString("en-GB", {
                                    day: "numeric",
                                    month: "short",
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        No tasks yet
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Appointments */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle>Appointments</CardTitle>
                        <Badge variant="outline">{appointments.length}</Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => router.push(`/calendar?job_id=${jobId}`)}
                        data-testid="view-in-calendar-button"
                      >
                        View in calendar
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {appointmentsLoading ? (
                      <div className="space-y-2">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                        ))}
                      </div>
                    ) : appointments.length > 0 ? (
                      <div className="space-y-2">
                        {appointments.slice(0, 5).map((apt) => (
                          <div
                            key={apt.id}
                            className="flex items-start gap-2 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                          >
                            <Calendar className="h-4 w-4 text-primary mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{apt.title}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {new Date(apt.start_time).toLocaleDateString("en-GB", {
                                  day: "numeric",
                                  month: "short",
                                })}{" "}
                                at{" "}
                                {new Date(apt.start_time).toLocaleTimeString("en-GB", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        No appointments yet
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Session 107: Reviews Summary */}
              <ReviewsSummaryCard jobId={jobId} />
            </TabsContent>

            {/* ========== SALES INTELLIGENCE TAB ========== */}
            <TabsContent value="sales-intel" className="space-y-6">
              <SalesIntelligenceTab job={job} jobId={jobId} />
            </TabsContent>

            {/* ========== CALL LOG TAB ========== */}
            <TabsContent value="call-log" className="space-y-6">
              <CallLogTab jobId={jobId} callLogs={callLogs} isLoading={callLogsLoading} createCallLog={createCallLog} />
            </TabsContent>

            <TabsContent value="equipment" data-testid="job-equipment-content">
              <JobEquipmentSection jobId={jobId} isEditable={true} />
            </TabsContent>

            <TabsContent value="tasks">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Tasks</CardTitle>
                      <CardDescription>Track milestones and to-dos for this job</CardDescription>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setShowTaskForm(!showTaskForm)}
                      data-testid="add-task-button"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Task
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Task Creation Form */}
                  {showTaskForm && (
                    <form onSubmit={handleCreateTask} className="p-4 border border-border rounded-lg space-y-3" data-testid="task-form">
                      <div className="space-y-2">
                        <label htmlFor="task-title" className="text-sm font-medium">
                          Task Title *
                        </label>
                        <Input
                          id="task-title"
                          data-testid="task-title-input"
                          placeholder="Enter task title..."
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="task-due-date" className="text-sm font-medium">
                          Due Date (optional)
                        </label>
                        <Input
                          id="task-due-date"
                          data-testid="task-due-date-input"
                          type="date"
                          value={newTaskDueDate}
                          onChange={(e) => setNewTaskDueDate(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="submit"
                          size="sm"
                          disabled={createTask.isPending}
                          data-testid="task-submit-button"
                        >
                          {createTask.isPending ? "Creating..." : "Create Task"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setShowTaskForm(false)
                            setNewTaskTitle("")
                            setNewTaskDueDate("")
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* Task List */}
                  {tasksLoading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                      ))}
                    </div>
                  ) : tasks.length > 0 ? (
                    <div className="space-y-2" data-testid="tasks-list">
                      {tasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                          data-testid={`task-item-${task.id}`}
                        >
                          <button
                            onClick={() => handleToggleTaskComplete(task.id, !!task.completed_at)}
                            disabled={completeTask.isPending}
                            className="focus:outline-none focus:ring-2 focus:ring-primary rounded"
                            data-testid={`task-complete-button-${task.id}`}
                          >
                            {task.completed_at ? (
                              <CheckCircle2 className="h-5 w-5 text-success" />
                            ) : (
                              <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                            )}
                          </button>
                          <div className="flex-1">
                            <div
                              className={task.completed_at ? "line-through text-muted-foreground" : ""}
                              data-testid={`task-title-${task.id}`}
                            >
                              {task.title}
                            </div>
                            {task.due_date && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Due: {new Date(task.due_date).toLocaleDateString("en-GB")}
                              </div>
                            )}
                          </div>
                          {task.assigned_to && (
                            <Badge variant="outline" className="text-xs">
                              {task.assigned_to}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No tasks yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="quotes">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Quotes</CardTitle>
                      <CardDescription>Create and manage quotes for this job</CardDescription>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingQuote(null)
                        setQuoteDialogOpen(true)
                      }}
                      data-testid="new-quote-button"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      New Quote
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* OpenSolar Integration — hidden per Jacob's review Feb 2026 */}

                  {/* BOS Quotes List */}
                  {quotesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : quotes.length > 0 ? (
                    <div className="space-y-3">
                      {quotes.map((quote) => (
                        <div
                          key={quote.id}
                          className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors gap-3"
                          data-testid={`quote-${quote.id}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                              <span className="font-medium">{quote.quote_number}</span>
                              <Badge
                                variant={
                                  quote.status === 'draft' ? 'secondary' :
                                  quote.status === 'sent' ? 'default' :
                                  quote.status === 'accepted' ? 'success' :
                                  quote.status === 'rejected' ? 'destructive' :
                                  'outline'
                                }
                                data-testid={`quote-status-${quote.id}`}
                              >
                                {quote.status}
                              </Badge>
                              <span className="text-xl font-bold ml-auto md:hidden">
                                £{quote.total_amount?.toFixed(2) || '0.00'}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {quote.line_items && quote.line_items.length > 0 && (
                                <div>{quote.line_items.length} line item{quote.line_items.length !== 1 ? 's' : ''}</div>
                              )}
                              {quote.valid_until && (
                                <div>Valid until: {new Date(quote.valid_until).toLocaleDateString()}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 overflow-x-auto">
                            <div className="text-right mr-4 hidden md:block">
                              <div className="text-xl font-bold">
                                £{quote.total_amount?.toFixed(2) || '0.00'}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingQuote(quote)
                                setQuoteDialogOpen(true)
                              }}
                              data-testid={`edit-quote-${quote.id}`}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  await downloadQuotePdf.mutateAsync(quote.id)
                                  toast.success("Quote PDF downloaded")
                                } catch (error) {
                                  toast.error(error instanceof Error ? error.message : "Failed to download PDF")
                                }
                              }}
                              disabled={downloadQuotePdf.isPending}
                              data-testid={`download-pdf-${quote.id}`}
                            >
                              {downloadQuotePdf.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Download className="h-4 w-4 mr-1" />
                                  PDF
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  await emailQuote.mutateAsync({ quoteId: quote.id })
                                  toast.success("Quote emailed successfully")
                                } catch (error) {
                                  toast.error(error instanceof Error ? error.message : "Failed to email quote")
                                }
                              }}
                              disabled={emailQuote.isPending}
                              data-testid={`email-quote-${quote.id}`}
                            >
                              {emailQuote.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Send className="h-4 w-4 mr-1" />
                                  Email
                                </>
                              )}
                            </Button>
                            {quote.status === 'draft' && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    await sendQuote.mutateAsync(quote.id)
                                    toast.success("Quote marked as sent")
                                  } catch (error) {
                                    toast.error(error instanceof Error ? error.message : "Failed to send quote")
                                  }
                                }}
                                disabled={sendQuote.isPending}
                                data-testid={`send-quote-${quote.id}`}
                              >
                                {sendQuote.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>Mark as Sent</>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No quotes yet</p>
                      <p className="text-sm mt-2">Create your first quote to get started</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>Activity Log</CardTitle>
                  <CardDescription>Recent updates and changes</CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    // Merge activity from stage transitions, tasks, and appointments
                    type StageTransition = NonNullable<typeof job.stage_transitions>[number]
                    type ActivityItem =
                      | { timestamp: string; type: "stage_transition"; data: StageTransition }
                      | { timestamp: string; type: "task"; data: typeof tasks[number] }
                      | { timestamp: string; type: "appointment"; data: typeof appointments[number] }
                      | { timestamp: string; type: "call_recording"; data: typeof callRecordings[number] }
                    const activityItems: ActivityItem[] = []

                    // Add stage transitions
                    if (job.stage_transitions) {
                      job.stage_transitions.forEach((transition) => {
                        activityItems.push({
                          timestamp: transition.transitioned_at,
                          type: "stage_transition",
                          data: transition,
                        })
                      })
                    }

                    // Add tasks
                    tasks.forEach((task) => {
                      activityItems.push({
                        timestamp: task.due_date || task.created_at,
                        type: "task",
                        data: task,
                      })
                    })

                    // Add appointments
                    appointments.forEach((appointment) => {
                      activityItems.push({
                        timestamp: appointment.start_time,
                        type: "appointment",
                        data: appointment,
                      })
                    })

                    // Add call recordings
                    callRecordings.forEach((recording) => {
                      activityItems.push({
                        timestamp: recording.started_at || recording.created_at,
                        type: "call_recording",
                        data: recording,
                      })
                    })

                    // Sort by timestamp descending
                    activityItems.sort((a, b) =>
                      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                    )

                    const formatDate = (dateString: string) => {
                      return new Date(dateString).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    }

                    if (activityItems.length === 0) {
                      return (
                        <div className="text-center py-12 text-muted-foreground">
                          <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No activity yet</p>
                        </div>
                      )
                    }

                    return (
                      <div className="space-y-4">
                        {activityItems.map((item, index) => (
                          <div key={index} className="flex gap-4 p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                            <div className="flex-shrink-0 mt-1">
                              {item.type === "stage_transition" && (
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <Zap className="h-4 w-4 text-primary" />
                                </div>
                              )}
                              {item.type === "task" && (
                                <div className="h-8 w-8 rounded-full bg-secondary/10 flex items-center justify-center">
                                  <CheckCircle2 className="h-4 w-4 text-secondary" />
                                </div>
                              )}
                              {item.type === "appointment" && (
                                <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center">
                                  <Calendar className="h-4 w-4 text-success" />
                                </div>
                              )}
                              {item.type === "call_recording" && (
                                <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                                  <Phone className="h-4 w-4 text-blue-500" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              {item.type === "stage_transition" && (
                                <>
                                  <div className="font-medium text-sm mb-1">
                                    Stage changed from <span className="text-muted-foreground">{item.data.from_stage?.name || "unknown"}</span> to <span className="text-primary">{item.data.to_stage?.name || "unknown"}</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatDate(item.timestamp)}
                                  </div>
                                </>
                              )}
                              {item.type === "task" && (
                                <>
                                  <div className="font-medium text-sm mb-1">
                                    Task: {item.data.title}
                                    <Badge variant="outline" className="ml-2 text-xs">{item.data.status}</Badge>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Due: {formatDate(item.timestamp)}
                                  </div>
                                </>
                              )}
                              {item.type === "appointment" && (
                                <>
                                  <div className="font-medium text-sm mb-1">
                                    Appointment: {item.data.title}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatDate(item.timestamp)}
                                    {item.data.location && ` • ${item.data.location}`}
                                  </div>
                                </>
                              )}
                              {item.type === "call_recording" && (
                                <CallRecordingCard
                                  recording={item.data}
                                  onViewTranscript={() => {
                                    setSelectedRecording(item.data)
                                    setTranscriptDialogOpen(true)
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="files">
              <Card>
                <CardHeader>
                  <CardTitle>Files & Documents</CardTitle>
                  <CardDescription>Quotes, contracts, and other files</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>File management coming soon</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Compliance tab removed — replaced by website score in overview */}
          </Tabs>
        </div>
      </ErrorBoundary>

      {/* Session 80 - Solar Visualization Modal */}
      <SolarVisualizationModal
        open={solarVizModalOpen}
        onOpenChange={setSolarVizModalOpen}
        data={solarVisualizationData}
        isLoading={solarVizLoading}
        error={solarVizError}
        address={job?.customer?.address_line_1 || job?.customer?.postcode || undefined}
      />

      {/* Session 98 - Call Recording Transcript Dialog */}
      <CallRecordingTranscriptDialog
        recording={selectedRecording}
        open={transcriptDialogOpen}
        onOpenChange={setTranscriptDialogOpen}
      />

      {/* Session 107 - Send Review Invite Dialog */}
      <SendReviewInviteDialog
        open={reviewInviteDialogOpen}
        onOpenChange={setReviewInviteDialogOpen}
        customerId={job?.customer_id || ""}
        jobId={jobId}
        customerName={job?.customer?.name}
        customerEmail={job?.customer?.email || undefined}
        customerPhone={job?.customer?.phone || undefined}
      />
    </>
  )
}

// ============================================
// Sales Intelligence Tab Component
// ============================================

function SalesIntelligenceTab({ job, jobId }: { job: Job; jobId: string }) {
  const updateJob = useUpdateJob()
  const [editingSection, setEditingSection] = React.useState<string | null>(null)
  
  // Local state for editable fields
  const [decisionMaker, setDecisionMaker] = React.useState({
    name: job.decision_maker_name || '',
    title: job.decision_maker_title || '',
    linkedin: job.decision_maker_linkedin || '',
    phone: job.decision_maker_phone || '',
    email: job.decision_maker_email || '',
  })
  const [companyIntel, setCompanyIntel] = React.useState({
    employee_count: job.company_employee_count || '',
    revenue: job.company_revenue || '',
    locations: job.company_locations?.toString() || '',
  })
  const [painPoints, setPainPoints] = React.useState<string[]>(job.pain_points || [])
  const [newPainPoint, setNewPainPoint] = React.useState('')
  const [callBrief, setCallBrief] = React.useState(job.call_brief || '')
  const [estimatedDealValue, setEstimatedDealValue] = React.useState(job.estimated_deal_value?.toString() || '')
  const [salesApproach, setSalesApproach] = React.useState(job.sales_approach || '')
  const [region, setRegion] = React.useState(job.region || 'UK')
  const [leadType, setLeadType] = React.useState(job.lead_type || 'Website')
  const [vertical, setVertical] = React.useState(job.vertical || '')

  const saveField = async (field: string, value: unknown) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await updateJob.mutateAsync({ id: jobId, [field]: value } as { id: string } & Partial<Job>)
      toast.success('Updated successfully')
    } catch (_err) {
      toast.error('Failed to update')
    }
  }

  const saveDecisionMaker = async () => {
    try {
      await updateJob.mutateAsync({
        id: jobId,
        decision_maker_name: decisionMaker.name || null,
        decision_maker_title: decisionMaker.title || null,
        decision_maker_linkedin: decisionMaker.linkedin || null,
        decision_maker_phone: decisionMaker.phone || null,
        decision_maker_email: decisionMaker.email || null,
      } as { id: string } & Partial<Job>)
      toast.success('Decision maker updated')
      setEditingSection(null)
    } catch (_err) {
      toast.error('Failed to update')
    }
  }

  const saveCompanyIntel = async () => {
    try {
      await updateJob.mutateAsync({
        id: jobId,
        company_employee_count: companyIntel.employee_count || null,
        company_revenue: companyIntel.revenue || null,
        company_locations: companyIntel.locations ? parseInt(companyIntel.locations) : null,
      } as { id: string } & Partial<Job>)
      toast.success('Company intel updated')
      setEditingSection(null)
    } catch (_err) {
      toast.error('Failed to update')
    }
  }

  const addPainPoint = () => {
    if (!newPainPoint.trim()) return
    const updated = [...painPoints, newPainPoint.trim()]
    setPainPoints(updated)
    setNewPainPoint('')
    saveField('pain_points', updated)
  }

  const removePainPoint = (index: number) => {
    const updated = painPoints.filter((_, i) => i !== index)
    setPainPoints(updated)
    saveField('pain_points', updated)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column */}
      <div className="space-y-6">
        {/* Region & Lead Type & Vertical */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lead Classification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Region</Label>
                <Select value={region} onValueChange={(v) => { setRegion(v); saveField('region', v) }}>
                  <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UK">🇬🇧 UK</SelectItem>
                    <SelectItem value="US">🇺🇸 US</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Lead Type</Label>
                <Select value={leadType} onValueChange={(v) => { setLeadType(v); saveField('lead_type', v) }}>
                  <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BOS">BOS</SelectItem>
                    <SelectItem value="Website">Website</SelectItem>
                    <SelectItem value="Both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Service Vertical</Label>
              <Select value={vertical || "none"} onValueChange={(v) => { const val = v === 'none' ? '' : v; setVertical(val); saveField('vertical', val || null) }}>
                <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="Select vertical..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {VERTICALS.map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Estimated Deal Value</Label>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground">£</span>
                <Input 
                  type="number" 
                  value={estimatedDealValue}
                  onChange={(e) => setEstimatedDealValue(e.target.value)}
                  onBlur={() => saveField('estimated_deal_value', estimatedDealValue ? parseInt(estimatedDealValue) : null)}
                  placeholder="0"
                  className="h-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Decision Maker */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Decision Maker</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setEditingSection(editingSection === 'dm' ? null : 'dm')}>
                <Edit className="h-3.5 w-3.5 mr-1" />
                {editingSection === 'dm' ? 'Cancel' : 'Edit'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {editingSection === 'dm' ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Name</Label>
                    <Input className="h-8 mt-1" value={decisionMaker.name} onChange={(e) => setDecisionMaker(p => ({...p, name: e.target.value}))} placeholder="John Smith" />
                  </div>
                  <div>
                    <Label className="text-xs">Title</Label>
                    <Input className="h-8 mt-1" value={decisionMaker.title} onChange={(e) => setDecisionMaker(p => ({...p, title: e.target.value}))} placeholder="CEO" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">LinkedIn URL</Label>
                  <Input className="h-8 mt-1" value={decisionMaker.linkedin} onChange={(e) => setDecisionMaker(p => ({...p, linkedin: e.target.value}))} placeholder="https://linkedin.com/in/..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Direct Phone</Label>
                    <Input className="h-8 mt-1" value={decisionMaker.phone} onChange={(e) => setDecisionMaker(p => ({...p, phone: e.target.value}))} placeholder="+44..." />
                  </div>
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input className="h-8 mt-1" value={decisionMaker.email} onChange={(e) => setDecisionMaker(p => ({...p, email: e.target.value}))} placeholder="john@company.com" />
                  </div>
                </div>
                <Button size="sm" onClick={saveDecisionMaker} disabled={updateJob.isPending}>
                  {updateJob.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                </Button>
              </>
            ) : (
              <div className="space-y-2 text-sm">
                {decisionMaker.name ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{decisionMaker.name}</span>
                      {decisionMaker.title && <span className="text-muted-foreground">— {decisionMaker.title}</span>}
                    </div>
                    {decisionMaker.linkedin && (
                      <a href={decisionMaker.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-xs flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" /> LinkedIn Profile
                      </a>
                    )}
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      {decisionMaker.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{decisionMaker.phone}</span>}
                      {decisionMaker.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{decisionMaker.email}</span>}
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground text-xs">No decision maker info. Click Edit to add.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Company Intel */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Company Intel</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setEditingSection(editingSection === 'ci' ? null : 'ci')}>
                <Edit className="h-3.5 w-3.5 mr-1" />
                {editingSection === 'ci' ? 'Cancel' : 'Edit'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {editingSection === 'ci' ? (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Employees</Label>
                    <Input className="h-8 mt-1" value={companyIntel.employee_count} onChange={(e) => setCompanyIntel(p => ({...p, employee_count: e.target.value}))} placeholder="50-100" />
                  </div>
                  <div>
                    <Label className="text-xs">Revenue</Label>
                    <Input className="h-8 mt-1" value={companyIntel.revenue} onChange={(e) => setCompanyIntel(p => ({...p, revenue: e.target.value}))} placeholder="£1M-5M" />
                  </div>
                  <div>
                    <Label className="text-xs">Locations</Label>
                    <Input className="h-8 mt-1" type="number" value={companyIntel.locations} onChange={(e) => setCompanyIntel(p => ({...p, locations: e.target.value}))} placeholder="3" />
                  </div>
                </div>
                <Button size="sm" onClick={saveCompanyIntel} disabled={updateJob.isPending}>
                  {updateJob.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                </Button>
              </>
            ) : (
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Employees</div>
                  <div className="font-medium">{companyIntel.employee_count || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Revenue</div>
                  <div className="font-medium">{companyIntel.revenue || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Locations</div>
                  <div className="font-medium">{companyIntel.locations || '—'}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column */}
      <div className="space-y-6">
        {/* Pain Points */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pain Points</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {painPoints.length > 0 ? (
              <ul className="space-y-1.5">
                {painPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-cyan-400 mt-0.5">•</span>
                    <span className="flex-1">{point}</span>
                    <button onClick={() => removePainPoint(i)} className="text-red-400 hover:text-red-300 text-xs shrink-0">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">No pain points added yet.</p>
            )}
            <div className="flex gap-2">
              <Input 
                className="h-8 text-sm" 
                value={newPainPoint} 
                onChange={(e) => setNewPainPoint(e.target.value)}
                placeholder="Add a pain point..."
                onKeyDown={(e) => e.key === 'Enter' && addPainPoint()}
              />
              <Button size="sm" variant="outline" onClick={addPainPoint} className="shrink-0 h-8">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Call Brief */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Call Brief</CardTitle>
            <CardDescription>Quick reference for your next call</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea 
              value={callBrief}
              onChange={(e) => setCallBrief(e.target.value)}
              onBlur={() => saveField('call_brief', callBrief || null)}
              placeholder="Opening line, what to sell, key talking points..."
              className="min-h-[80px] text-sm"
            />
          </CardContent>
        </Card>

        {/* Sales Approach Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sales Approach</CardTitle>
            <CardDescription>Strategy notes for this lead</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea 
              value={salesApproach}
              onChange={(e) => setSalesApproach(e.target.value)}
              onBlur={() => saveField('sales_approach', salesApproach || null)}
              placeholder="Strategy, objection handling, next steps..."
              className="min-h-[100px] text-sm"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ============================================
// Call Log Tab Component
// ============================================

function CallLogTab({ jobId, callLogs, isLoading, createCallLog }: { 
  jobId: string; 
  callLogs: CallLog[]; 
  isLoading: boolean; 
  createCallLog: ReturnType<typeof useCreateCallLog> 
}) {
  const [showForm, setShowForm] = React.useState(false)
  const [newLog, setNewLog] = React.useState({
    duration_minutes: '',
    outcome: '',
    notes: '',
    next_action_date: '',
    next_action_description: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createCallLog.mutateAsync({
        job_id: jobId,
        duration_minutes: newLog.duration_minutes ? parseInt(newLog.duration_minutes) : undefined,
        outcome: newLog.outcome || undefined,
        notes: newLog.notes || undefined,
        next_action_date: newLog.next_action_date || undefined,
        next_action_description: newLog.next_action_description || undefined,
      })
      toast.success('Call logged')
      setNewLog({ duration_minutes: '', outcome: '', notes: '', next_action_date: '', next_action_description: '' })
      setShowForm(false)
    } catch (_err) {
      toast.error('Failed to log call')
    }
  }

  // Find next action from latest call log
  const nextAction = callLogs.find(l => l.next_action_date)

  return (
    <div className="space-y-6">
      {/* Next Action Banner */}
      {nextAction && (
        <Card className="border-cyan-500/30 bg-cyan-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-cyan-500/10 flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5 text-cyan-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-cyan-400">Next Action</div>
                <div className="text-sm">{nextAction.next_action_description || 'Follow up'}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {nextAction.next_action_date && new Date(nextAction.next_action_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Log Call Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Call Log</CardTitle>
              <CardDescription>Track your sales calls</CardDescription>
            </div>
            <Button size="sm" onClick={() => setShowForm(!showForm)}>
              <Plus className="h-4 w-4 mr-1" />
              Log Call
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showForm && (
            <form onSubmit={handleSubmit} className="p-4 border border-border rounded-lg space-y-3 bg-muted/20">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Duration (mins)</Label>
                  <Input type="number" className="h-8 mt-1" value={newLog.duration_minutes} onChange={(e) => setNewLog(p => ({...p, duration_minutes: e.target.value}))} placeholder="5" />
                </div>
                <div>
                  <Label className="text-xs">Outcome</Label>
                  <Select value={newLog.outcome} onValueChange={(v) => setNewLog(p => ({...p, outcome: v}))}>
                    <SelectTrigger className="h-8 mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {CALL_OUTCOMES.map((o) => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Notes</Label>
                <Textarea className="mt-1 min-h-[60px] text-sm" value={newLog.notes} onChange={(e) => setNewLog(p => ({...p, notes: e.target.value}))} placeholder="Call notes..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Next Action Date</Label>
                  <Input type="date" className="h-8 mt-1" value={newLog.next_action_date} onChange={(e) => setNewLog(p => ({...p, next_action_date: e.target.value}))} />
                </div>
                <div>
                  <Label className="text-xs">Next Action</Label>
                  <Input className="h-8 mt-1" value={newLog.next_action_description} onChange={(e) => setNewLog(p => ({...p, next_action_description: e.target.value}))} placeholder="Follow up call..." />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={createCallLog.isPending}>
                  {createCallLog.isPending ? 'Saving...' : 'Save Call'}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          )}

          {/* Call History */}
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : callLogs.length > 0 ? (
            <div className="space-y-2">
              {callLogs.map((log) => (
                <div key={log.id} className="flex gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Phone className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">
                        {new Date(log.call_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      {log.duration_minutes && (
                        <span className="text-xs text-muted-foreground">{log.duration_minutes} min</span>
                      )}
                      {log.outcome && (
                        <Badge variant={
                          log.outcome === 'Interested' || log.outcome === 'Meeting Booked' ? 'success' :
                          log.outcome === 'Not Interested' ? 'destructive' :
                          'secondary'
                        } className="text-xs">
                          {log.outcome}
                        </Badge>
                      )}
                    </div>
                    {log.notes && <p className="text-sm text-muted-foreground">{log.notes}</p>}
                    {log.next_action_date && (
                      <div className="text-xs text-cyan-400 mt-1 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Next: {log.next_action_description || 'Follow up'} — {new Date(log.next_action_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Phone className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No calls logged yet</p>
              <p className="text-xs mt-1">Click &quot;Log Call&quot; to record your first call</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
