"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { WebsiteScoreBadge } from "@/components/ui/website-score-badge"
import { getWebsiteScore } from "@/lib/utils/website-score"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { X, Phone, Mail, MapPin, Calendar, CheckSquare, FileText, Eye, MessageSquare, Tag, Flame, PhoneCall, User, Clock, ExternalLink, Save, Zap, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { TagEditor } from "@/components/jobs/tag-editor"
import {
  useJob,
  useJobTasks,
  useJobAppointments,
  useJobQuotes,
  useUpdateJob,
  useUsers,
  useJobStages,
  useTransitionJobStage,
  useCustomerTimeline,
  useJobOpenSolar,
  useJobSiteIntel,
} from "@/lib/api/hooks"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { buildGoogleMapsEmbedUrlFromCustomer } from "@/lib/maps/google-maps"

// Type for job metadata structure (Session 72)
interface JobMetadata {
  opensolar?: {
    project_id?: string | null
    project_url?: string | null
  }
}

interface JobQuickPreviewPanelProps {
  jobId: string | null
  onClose: () => void
}

export function JobQuickPreviewPanel({ jobId, onClose }: JobQuickPreviewPanelProps) {
  const router = useRouter()
  const updateJob = useUpdateJob()
  const transitionStage = useTransitionJobStage()

  // Notes editing state
  const [isEditingNotes, setIsEditingNotes] = React.useState(false)
  const [notesValue, setNotesValue] = React.useState("")
  const [showCommunications, setShowCommunications] = React.useState(false)
  const [showQuotes, setShowQuotes] = React.useState(false)

  // Fetch data only when jobId is set (hooks have enabled: !!id built-in)
  const { data: job, isLoading: jobLoading } = useJob(jobId || '')
  const { data: tasks } = useJobTasks(jobId || '')
  const { data: appointments } = useJobAppointments(jobId || '')
  const { data: quotes } = useJobQuotes(jobId || '')
  const { data: users } = useUsers()
  const { data: stages } = useJobStages()
  const { data: timeline } = useCustomerTimeline(job?.customer_id || '')
  const { data: opensolarSummary } = useJobOpenSolar(jobId || '')
  const { data: siteIntel } = useJobSiteIntel(jobId || '')

  const usersList = users || []
  const stagesList = stages || []
  const timelineItems = timeline || []

  // Provide defaults for array data
  const tasksList = tasks || []
  const appointmentsList = appointments || []
  const quotesList = quotes || []

  // Calculate open tasks count
  const openTasksCount = tasksList.filter(task => task.status !== 'completed').length

  // Find next upcoming appointment
  const now = new Date()
  const upcomingAppointment = appointmentsList
    .filter(apt => new Date(apt.start_time) > now)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0]

  // Calculate days in stage
  const daysInStage = job ? Math.floor((now.getTime() - new Date(job.stage_changed_at).getTime()) / (1000 * 60 * 60 * 24)) : 0

  const hasHotTag = job?.tags?.includes("HOT")
  const hasCallbackTag = job?.tags?.includes("CALLBACK_REQUIRED")

  // Calculate last contact from timeline (message threads or calls)
  const lastContact = timelineItems
    .filter(item => item.type === 'message_thread' || item.type === 'call_recording')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]

  // Get recent timeline items (last 5)
  const recentActivity = timelineItems
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5)

  // Get recent communications (messages and calls)
  const recentCommunications = timelineItems
    .filter(item => item.type === 'message_thread' || item.type === 'call_recording')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10)

  // Initialize notes value when job loads
  React.useEffect(() => {
    if (job?.notes) {
      setNotesValue(job.notes)
    }
  }, [job?.notes])

  // Tag toggle handlers
  const toggleTag = async (tag: string) => {
    if (!job || !jobId) return

    const currentTags = job.tags || []
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag]

    try {
      await updateJob.mutateAsync({
        id: jobId,
        tags: newTags
      })
      toast.success(`${tag} tag ${currentTags.includes(tag) ? 'removed from' : 'added to'} job`)
    } catch (_error) {
      toast.error('Failed to update job tags')
    }
  }

  // Owner change handler
  const handleOwnerChange = async (newOwnerUserId: string) => {
    if (!jobId) return

    try {
      await updateJob.mutateAsync({
        id: jobId,
        // jobs.assigned_to references users.id (auth user), not tenant_users.id
        assigned_to: newOwnerUserId
      })
      toast.success('Job owner updated')
    } catch (_error) {
      toast.error('Failed to update job owner')
    }
  }

  // Stage change handler
  const handleStageChange = async (newStageId: string) => {
    if (!jobId) return

    try {
      await transitionStage.mutateAsync({
        jobId,
        toStageId: newStageId
      })
      toast.success('Job stage updated')
    } catch (_error) {
      toast.error('Failed to update job stage')
    }
  }

  // Notes save handler
  const handleSaveNotes = async () => {
    if (!jobId) return

    try {
      await updateJob.mutateAsync({
        id: jobId,
        notes: notesValue
      })
      toast.success('Notes saved')
      setIsEditingNotes(false)
    } catch (_error) {
      toast.error('Failed to save notes')
    }
  }

  // Close on Escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (jobId) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [jobId, onClose])

  if (!jobId) {
    return null
  }

  return (
    <>
      {/* Backdrop overlay for small screens */}
      <div
        className="fixed inset-0 bg-black/20 md:hidden z-40"
        onClick={onClose}
      />

      {/* Preview Panel */}
      <div
        role="dialog"
        aria-label="Job quick preview"
        aria-modal="true"
        className={cn(
          "fixed right-0 top-0 h-full w-[380px] bg-card border-l border-border shadow-2xl z-50 flex flex-col",
          "transform transition-transform duration-300 ease-in-out",
          jobId ? "translate-x-0" : "translate-x-full"
        )}
        data-testid="job-quick-preview-panel"
      >
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-border">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              {jobLoading ? (
                <div className="space-y-2">
                  <div className="h-5 bg-muted animate-pulse rounded w-3/4" />
                  <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
                </div>
              ) : (
                <>
                  <h2 className="text-lg font-semibold leading-tight truncate">
                    {job?.customer?.name || "Unknown Customer"}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="font-mono text-xs">
                      {job?.job_number}
                    </Badge>
                    {hasHotTag && (
                      <Badge variant="glow" className="text-xs">🔥 HOT</Badge>
                    )}
                    {hasCallbackTag && (
                      <Badge variant="warning" className="text-xs">📞 CALLBACK</Badge>
                    )}
                  </div>
                </>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              onClick={onClose}
              data-testid="close-preview-button"
              aria-label="Close preview panel"
              title="Close (Esc)"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Owner & Stage Management */}
          {!jobLoading && job && (
            <div className="space-y-2">
              {/* Owner */}
              <div className="flex items-center gap-2">
                <User className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground min-w-[50px]">Owner:</span>
                <Select
                  // job.assigned_to stores the underlying users.id
                  value={job.assigned_to || ''}
                  onValueChange={handleOwnerChange}
                >
                  <SelectTrigger
                    className="h-7 text-xs flex-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent onClick={(e) => e.stopPropagation()}>
                    {usersList.map(user => (
                      <SelectItem
                        key={user.id}
                        // Use the underlying auth user id as the value so it matches
                        // the jobs.assigned_to foreign key
                        value={user.user_id}
                        className="text-xs"
                      >
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Stage */}
              <div className="flex items-center gap-2">
                <Tag className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground min-w-[50px]">Stage:</span>
                <Select
                  value={job.current_stage_id}
                  onValueChange={handleStageChange}
                >
                  <SelectTrigger
                    className="h-7 text-xs flex-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent onClick={(e) => e.stopPropagation()}>
                    {stagesList.map(stage => (
                      <SelectItem key={stage.id} value={stage.id} className="text-xs">
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-muted-foreground text-xs whitespace-nowrap">
                  {daysInStage}d
                </span>
              </div>

              {/* Lead Source */}
              {job.source && (
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground min-w-[50px]">Source:</span>
                  <span className="text-xs flex-1">{job.source}</span>
                </div>
              )}

              {/* Last Modified */}
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground min-w-[50px]">Updated:</span>
                <span className="text-xs flex-1">
                  {new Date(job.updated_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {jobLoading ? (
            <>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded w-1/3" />
                  <div className="h-8 bg-muted animate-pulse rounded" />
                </div>
              ))}
            </>
          ) : job ? (
            <>
              {/* Value */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">Value</h3>
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-2xl font-bold text-primary">
                      £{job.estimated_value ? (job.estimated_value / 1000).toFixed(1) : 0}k
                    </div>
                    <div className="text-xs text-muted-foreground">Estimated value</div>
                  </div>
                </div>
              </div>

              {/* Website Score */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">Website Score</h3>
                <div>
                  <WebsiteScoreBadge score={getWebsiteScore(job)} size="lg" showLabel showIcon />
                </div>
              </div>

              {/* OpenSolar Integration — hidden per Jacob's review Feb 2026 */}

              {/* Location & Contact */}
              {(job.customer?.postcode || job.customer?.email || job.customer?.phone) && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">Contact & Location</h3>
                  <div className="space-y-2">
                    {job.customer.postcode && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span>{job.customer.postcode}</span>
                      </div>
                    )}
                    {job.customer.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <a
                          href={`mailto:${job.customer.email}`}
                          className="text-primary hover:underline truncate"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {job.customer.email}
                        </a>
                      </div>
                    )}
                    {job.customer.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <a
                          href={`tel:${job.customer.phone}`}
                          className="text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {job.customer.phone}
                        </a>
                      </div>
                    )}
                    {/* Session 74 - Property map */}
                    {(() => {
                      const mapsEmbedUrl = buildGoogleMapsEmbedUrlFromCustomer(job.customer)
                      if (!mapsEmbedUrl) return null
                      return (
                        <div className="mt-2 rounded-md border border-border overflow-hidden bg-muted/20">
                          <div className="flex items-center gap-1 px-2 py-1 border-b border-border">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="text-[0.7rem] text-muted-foreground font-medium">Property map</span>
                          </div>
                          {/* SOLAR-SPECIFIC: hidden for Cold Lava */}
                          <div className="aspect-video w-full bg-muted">
                            <iframe
                              src={mapsEmbedUrl}
                              className="h-full w-full border-0"
                              loading="lazy"
                              referrerPolicy="no-referrer-when-downgrade"
                              onClick={(e) => e.stopPropagation()}
                              title="Property location map"
                            />
                          </div>
                          {/* SOLAR-SPECIFIC: hidden for Cold Lava */}
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )}

              {/* Activity Summary */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">Activity</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckSquare className="h-4 w-4 text-muted-foreground" />
                    <span>
                      <span className="font-semibold">{openTasksCount}</span> open task{openTasksCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {upcomingAppointment && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">Next appointment:</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(upcomingAppointment.start_time).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>
                        <span className="font-semibold">{quotesList.length}</span> quote{quotesList.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {quotesList.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => setShowQuotes(true)}
                      >
                        View all
                      </Button>
                    )}
                  </div>
                  {lastContact && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">Last contact:</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(lastContact.timestamp).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                      {recentCommunications.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => setShowCommunications(true)}
                        >
                          View all
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-foreground">Notes</h3>
                  {!isEditingNotes ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => setIsEditingNotes(true)}
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      {job.notes ? 'Edit' : 'Add'}
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={handleSaveNotes}
                      disabled={updateJob.isPending}
                    >
                      <Save className="h-3 w-3 mr-1" />
                      Save
                    </Button>
                  )}
                </div>
                {isEditingNotes ? (
                  <Textarea
                    value={notesValue}
                    onChange={(e) => setNotesValue(e.target.value)}
                    placeholder="Add notes about this job..."
                    className="text-xs min-h-[100px]"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div className="text-sm bg-muted/50 rounded-md p-2 border border-border min-h-[60px]">
                    {job.notes ? (
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {job.notes}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        No notes yet. Click &quot;Add&quot; to add notes.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Recent Activity */}
              {recentActivity.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">Recent Activity</h3>
                  <div className="space-y-1">
                    {recentActivity.map((item) => (
                      <div key={item.id} className="text-xs border-l-2 border-border pl-2 py-1">
                        <div className="font-medium">{item.title}</div>
                        <div className="text-muted-foreground flex items-center gap-1">
                          <span className="capitalize">{item.type.replace(/_/g, ' ')}</span>
                          <span>•</span>
                          <span>
                            {new Date(item.timestamp).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Job not found
            </div>
          )}
        </div>

        {/* Footer - Quick Actions */}
        {!jobLoading && job && (
          <div className="flex-shrink-0 border-t border-border">
            {/* Quick action buttons */}
            <div className="grid grid-cols-3 gap-2 p-3 border-b border-border">
              <Button
                variant="outline"
                size="sm"
                className="flex-col h-auto py-2 gap-1"
                onClick={(e) => {
                  e.stopPropagation()
                  if (job.customer?.email) {
                    window.location.href = `mailto:${job.customer.email}`
                  } else {
                    toast.error('This customer has no email address')
                  }
                }}
                aria-label="Email customer"
                title="Send email to customer"
              >
                <Mail className="h-4 w-4" />
                <span className="text-[0.6rem]">Email</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-col h-auto py-2 gap-1"
                onClick={(e) => {
                  e.stopPropagation()
                  if (job.customer?.phone) {
                    window.location.href = `tel:${job.customer.phone}`
                  } else {
                    toast.error('This customer has no phone number')
                  }
                }}
                aria-label="Call customer"
                title="Call customer"
              >
                <PhoneCall className="h-4 w-4" />
                <span className="text-[0.6rem]">Call</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-col h-auto py-2 gap-1"
                onClick={(e) => {
                  e.stopPropagation()
                  router.push(`/jobs/${jobId}#notes`)
                  onClose()
                }}
                aria-label="Add note to job"
                title="Go to notes section"
              >
                <MessageSquare className="h-4 w-4" />
                <span className="text-[0.6rem]">Note</span>
              </Button>
            </div>

            {/* Tag Management */}
            <div className="p-3 border-b border-border space-y-2">
              <span className="text-xs font-semibold text-muted-foreground">Tags</span>
              <TagEditor jobId={jobId} tags={job.tags} compact />
            </div>

            {/* Primary CTA */}
            <div className="p-3 space-y-2">
              <Button
                className="w-full gap-2"
                onClick={() => {
                  router.push(`/jobs/${jobId}`)
                  onClose()
                }}
                data-testid="view-full-job-button"
              >
                <Eye className="h-4 w-4" />
                View full job
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => {
                  router.push(`/customers/${job.customer_id}`)
                  onClose()
                }}
                data-testid="view-customer-button"
              >
                <User className="h-4 w-4" />
                View customer
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Communications Dialog */}
      <Dialog open={showCommunications} onOpenChange={setShowCommunications}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Recent Communications</DialogTitle>
            <DialogDescription>
              Messages and calls with {job?.customer?.name || 'this customer'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {recentCommunications.length > 0 ? (
              recentCommunications.map((item) => (
                <div
                  key={item.id}
                  className="border border-border rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {item.type === 'message_thread' ? (
                        <MessageSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <PhoneCall className="h-4 w-4 text-primary" />
                      )}
                      <h4 className="font-medium text-sm">{item.title}</h4>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.timestamp).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  )}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="capitalize">
                      {item.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No communications found
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Quotes Dialog */}
      <Dialog open={showQuotes} onOpenChange={setShowQuotes}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quotes</DialogTitle>
            <DialogDescription>
              All quotes for this job
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {quotesList.length > 0 ? (
              quotesList.map((quote) => (
                <div
                  key={quote.id}
                  className="border border-border rounded-lg p-3 space-y-2 hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => {
                    // Deep-link into the job detail page with the Quotes tab active
                    // and this specific quote opened in edit mode.
                    router.push(`/jobs/${jobId}?tab=quotes&quoteId=${quote.id}`)
                    setShowQuotes(false)
                    onClose()
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Quote #{quote.quote_number || quote.id.slice(0, 8)}
                    </span>
                    {quote.status && (
                      <Badge variant={quote.status === 'accepted' ? 'default' : 'outline'} className="text-xs">
                        {quote.status}
                      </Badge>
                    )}
                  </div>
                  {quote.total_amount && (
                    <div className="text-sm font-semibold text-primary">
                      £{(quote.total_amount / 100).toFixed(2)}
                    </div>
                  )}
                  {quote.created_at && (
                    <div className="text-xs text-muted-foreground">
                      Created {new Date(quote.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No quotes found
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
