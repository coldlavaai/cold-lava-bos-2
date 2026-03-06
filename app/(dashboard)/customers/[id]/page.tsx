"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Edit,
  Plus,
  Briefcase,
  Calendar,
  FileText,
  MessageSquare,
  Clock,
  Loader2,
  Eye,
  Star,
} from "lucide-react"
import { useCustomer, useCustomerJobs, useCustomerAppointments, useCustomerTimeline, useDeleteCustomer, useCreateCustomerNote, useCustomerSolarLayers, useCallRecordingsForCustomer } from "@/lib/api/hooks"
import { useQueryClient } from "@tanstack/react-query"
import { ErrorBoundary } from "@/components/error-boundary"
import { CustomerFormDialog } from "@/components/forms/customer-form-dialog"
import { JobFormDialog } from "@/components/forms/job-form-dialog"
import { SolarVisualizationModal } from "@/components/solar/solar-visualization-modal"
import { InteractiveSolarMap } from "@/components/solar/interactive-solar-map"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { buildGoogleMapsEmbedUrlFromCustomer } from "@/lib/maps/google-maps"
import { type CustomerSiteIntel } from "@/lib/site-intel/types"
import { CallRecordingCard, CallRecordingTranscriptDialog } from "@/components/call-recordings"
import { ReviewsSummaryCard } from "@/components/reviews/reviews-summary-card"
import { SendReviewInviteDialog } from "@/components/reviews/send-review-invite-dialog"
import type { CallRecording } from "@/lib/api/types"
import { CustomerCommunicationsTab } from "@/components/customers/tabs/CustomerCommunicationsTab"
import { useCall } from "@/lib/contexts/call-context"

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const customerId = params.id as string
  const queryClient = useQueryClient()
  const [customerEditDialogOpen, setCustomerEditDialogOpen] = React.useState(false)
  const [jobCreateDialogOpen, setJobCreateDialogOpen] = React.useState(false)
  const [logCallDialogOpen, setLogCallDialogOpen] = React.useState(false)
  const [reviewInviteDialogOpen, setReviewInviteDialogOpen] = React.useState(false)
  const [noteText, setNoteText] = React.useState("")
  const [activeTab, setActiveTab] = React.useState("overview")
  const deleteCustomer = useDeleteCustomer()
  const createNote = useCreateCustomerNote(customerId)
  const { deviceState, callState, startOutboundCall } = useCall()

  const { data: customer, isLoading: customerLoading, error: customerError } = useCustomer(customerId)
  const { data: jobs = [], isLoading: jobsLoading } = useCustomerJobs(customerId)
  const { data: appointments = [] } = useCustomerAppointments(customerId)
  // Only load timeline and call recordings when Activity tab is active (performance optimization)
  const { data: timeline = [], isLoading: timelineLoading } = useCustomerTimeline(customerId, { enabled: activeTab === "activity" })
  const { data: callRecordings = [] } = useCallRecordingsForCustomer(customerId, { enabled: activeTab === "activity" })

  const [estimatingSolar, setEstimatingSolar] = React.useState(false)

  // Solar visualization modal state (Session 80)
  const [solarVizModalOpen, setSolarVizModalOpen] = React.useState(false)
  // Only fetch solar data when modal is opened (lazy load for performance)
  const { data: solarVisualizationData, isLoading: solarVizLoading, error: solarVizError } = useCustomerSolarLayers(customerId, { enabled: solarVizModalOpen })

  // Call recording transcript dialog state (Session 98)
  const [selectedRecording, setSelectedRecording] = React.useState<CallRecording | null>(null)
  const [transcriptDialogOpen, setTranscriptDialogOpen] = React.useState(false)

  const handleDeleteCustomer = async () => {
    if (!confirm("Are you sure you want to delete this customer? This action cannot be undone.")) {
      return
    }

    try {
      await deleteCustomer.mutateAsync(customerId)
      toast.success("Customer deleted successfully")
      router.push("/customers")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete customer")
    }
  }

  const handleLogCall = async () => {
    if (!noteText.trim()) {
      toast.error("Please enter a note")
      return
    }

    try {
      await createNote.mutateAsync({ note: noteText.trim() })
      toast.success("Call logged successfully")
      setLogCallDialogOpen(false)
      setNoteText("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to log call")
    }
  }

  if (customerError) {
    return (
      
        <ErrorBoundary>
          <div>Error loading customer</div>
        </ErrorBoundary>
      
    )
  }

  if (customerLoading) {
    return (
      
        <div className="space-y-6">
          <div className="h-32 bg-muted animate-pulse rounded-lg" />
          <div className="h-96 bg-muted animate-pulse rounded-lg" />
        </div>
      
    )
  }

  if (!customer) {
    return (
      
        <div className="text-center py-12">
          <p className="text-muted-foreground">Customer not found</p>
          <Button onClick={() => router.push("/customers")} className="mt-4">
            Back to Customers
          </Button>
        </div>
      
    )
  }

  const totalJobValue = jobs.reduce((sum, job) => sum + (job.estimated_value || 0), 0)

  // Session 79: Extract site intelligence from customer metadata
  const siteIntel = (customer.metadata?.site_intel ?? null) as CustomerSiteIntel | null

  const handleEstimateSolarPotential = async () => {
    try {
      setEstimatingSolar(true)
      const response = await fetch(`/api/customers/${customerId}/site-intel`, {
        method: "POST",
        credentials: "include",
      })

      if (!response.ok) {
        let errorMessage = "Failed to estimate solar potential"
        try {
          const errorBody = await response.json()
          if (errorBody?.error) {
            errorMessage = errorBody.error as string
          }
        } catch {
          // ignore JSON parse errors
        }
        toast.error(errorMessage)
      } else {
        toast.success("Solar potential estimated successfully")
        await queryClient.invalidateQueries({ queryKey: ["customers", customerId] })
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to estimate solar potential")
    } finally {
      setEstimatingSolar(false)
    }
  }

  return (
    <>
      <ErrorBoundary>
        <div className="space-y-6">
          {/* Header - Mobile optimized */}
          <div className="flex flex-col gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/customers")}
              className="gap-2 h-9 w-fit -ml-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Customers</span>
            </Button>
            <div className="space-y-2">
              <div>
                <h1 className="text-xl md:text-3xl font-display font-bold mb-2">{customer.name}</h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
                  {customer.email && (
                    <a
                      href={`mailto:${customer.email}`}
                      className="flex items-center gap-1 text-sm hover:text-primary transition-colors truncate max-w-[250px]"
                    >
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">{customer.email}</span>
                    </a>
                  )}
                  {customer.phone && (
                    <>
                      <span className="hidden sm:inline text-sm">•</span>
                      <a
                        href={`tel:${customer.phone}`}
                        className="flex items-center gap-1 text-sm hover:text-primary transition-colors"
                      >
                        <Phone className="h-3 w-3 shrink-0" />
                        {customer.phone}
                      </a>
                    </>
                  )}
                  {customer.postcode && (
                    <>
                      <span className="hidden sm:inline text-sm">•</span>
                      <span className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {customer.postcode}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            {/* Action buttons - scrollable on mobile */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-3 px-3 md:mx-0 md:px-0 md:pb-0" data-testid="customer-quick-actions">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 h-9 shrink-0"
                disabled={!customer.phone || deviceState !== "ready" || callState !== "none"}
                title={
                  !customer.phone
                    ? "No phone number"
                    : deviceState !== "ready"
                    ? "Call system connecting…"
                    : callState !== "none"
                    ? "Call in progress"
                    : `Call ${customer.name}`
                }
                onClick={() => {
                  if (customer.phone) {
                    startOutboundCall(customer.phone, customer.name, customerId)
                    router.push("/communications")
                  }
                }}
                data-testid="customer-call-button"
              >
                <Phone className="h-4 w-4" />
                <span className="hidden sm:inline">Call</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 h-9 shrink-0"
                onClick={() => setLogCallDialogOpen(true)}
                data-testid="customer-log-call-button"
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Log</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 h-9 shrink-0"
                onClick={() => router.push(`/communications?customer_id=${customerId}`)}
                data-testid="customer-send-message-button"
              >
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Message</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 h-9 shrink-0"
                onClick={() => setReviewInviteDialogOpen(true)}
                data-testid="customer-send-review-button"
              >
                <Star className="h-4 w-4" />
                <span className="hidden sm:inline">Review</span>
              </Button>
              <Button
                variant="default"
                size="sm"
                className="gap-2 h-9 shrink-0"
                onClick={() => setJobCreateDialogOpen(true)}
                data-testid="customer-new-job-button"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New Job</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 h-9 shrink-0"
                onClick={() => setCustomerEditDialogOpen(true)}
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteCustomer}
                disabled={deleteCustomer.isPending}
              >
                {deleteCustomer.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>

          {/* Customer Edit Dialog */}
          <CustomerFormDialog
            open={customerEditDialogOpen}
            onOpenChange={setCustomerEditDialogOpen}
            mode="edit"
            customer={customer}
          />

          {/* Job Create Dialog */}
          <JobFormDialog
            open={jobCreateDialogOpen}
            onOpenChange={setJobCreateDialogOpen}
            mode="create"
            defaultCustomerId={customerId}
          />

          {/* Log Call Dialog */}
          <Dialog open={logCallDialogOpen} onOpenChange={setLogCallDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log Call</DialogTitle>
                <DialogDescription>
                  Record notes about your call or interaction with {customer.name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="note">Note</Label>
                  <Textarea
                    id="note"
                    placeholder="Enter your call notes here..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    rows={6}
                    data-testid="customer-log-call-textarea"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setLogCallDialogOpen(false)
                    setNoteText("")
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleLogCall}
                  disabled={createNote.isPending || !noteText.trim()}
                  data-testid="customer-log-call-save"
                >
                  {createNote.isPending ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-1">Total Jobs</div>
                <div className="text-2xl font-display font-bold">{jobs.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-1">Total Value</div>
                <div className="text-2xl font-display font-bold text-primary">
                  £{(totalJobValue / 1000).toFixed(1)}k
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-1">Appointments</div>
                <div className="text-2xl font-display font-bold">{appointments.length}</div>
              </CardContent>
            </Card>
            {/* Session 107: Reviews Summary */}
            <ReviewsSummaryCard customerId={customerId} className="md:col-span-1" />
          </div>

          {/* Main Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="jobs">Jobs ({jobs.length})</TabsTrigger>
              <TabsTrigger value="communications" data-testid="customer-communications-tab">
                <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                Comms
              </TabsTrigger>
              <TabsTrigger value="activity" data-testid="customer-activity-tab">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Contact Details */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {customer.email && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Mail className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Email</div>
                          <a
                            href={`mailto:${customer.email}`}
                            className="font-medium hover:text-primary transition-colors"
                          >
                            {customer.email}
                          </a>
                        </div>
                      </div>
                    )}

                    {customer.phone && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-secondary/10">
                          <Phone className="h-4 w-4 text-secondary" />
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Phone</div>
                          <a
                            href={`tel:${customer.phone}`}
                            className="font-medium hover:text-primary transition-colors"
                          >
                            {customer.phone}
                          </a>
                        </div>
                      </div>
                    )}

                    {(customer.address_line_1 || customer.postcode) && (
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-success/10">
                          <MapPin className="h-4 w-4 text-success" />
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Address</div>
                          <div className="space-y-0.5">
                            {customer.address_line_1 && (
                              <div className="font-medium">{customer.address_line_1}</div>
                            )}
                            {customer.address_line_2 && (
                              <div className="font-medium">{customer.address_line_2}</div>
                            )}
                            {customer.city && <div className="font-medium">{customer.city}</div>}
                            {customer.postcode && (
                              <div className="font-medium">{customer.postcode}</div>
                            )}
                          </div>
                          {/* SOLAR-SPECIFIC: Estimate solar potential button hidden */}
                        </div>
                      </div>
                    )}

                    {/* Session 74 - Property map */}
                    {/* Session 80 - Updated to use accurate coordinates from Solar API */}
                    {(() => {
                      const mapsEmbedUrl = buildGoogleMapsEmbedUrlFromCustomer(
                        customer,
                        solarVisualizationData?.center || null
                      )
                      if (!mapsEmbedUrl) return null
                      return (
                        <div className="rounded-lg border border-border overflow-hidden bg-muted/20">
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
                                    customer.address_line_1,
                                    customer.city,
                                    customer.postcode
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
                          {/* SOLAR-SPECIFIC: Solar potential & irradiance stats hidden */}

                          {/* SOLAR-SPECIFIC: Solar analysis stats, view solar button, and InteractiveSolarMap all hidden */}
                          <div className="aspect-video w-full bg-muted relative">
                            <iframe
                              src={mapsEmbedUrl}
                              className="h-full w-full border-0"
                              loading="lazy"
                              referrerPolicy="no-referrer-when-downgrade"
                              title="Property location map"
                            />
                          </div>
                        </div>
                      )
                    })()}

                    {customer.notes && (
                      <div className="pt-4 border-t">
                        <div className="text-sm text-muted-foreground mb-2">Notes</div>
                        <p className="text-sm">{customer.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle>Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Customer Since</span>
                      <span className="text-sm font-medium">
                        {new Date(customer.created_at).toLocaleDateString("en-GB", {
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    {customer.source_id && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Source</span>
                        <Badge variant="outline" className="text-xs">
                          {customer.source_id}
                        </Badge>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Active Jobs</span>
                      <span className="text-sm font-semibold text-primary">{jobs.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Value</span>
                      <span className="text-sm font-semibold">
                        £{(totalJobValue / 1000).toFixed(1)}k
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Client Records */}
                {jobs.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileText className="h-4 w-4 text-teal-400" />
                        Projects
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 pt-0">
                      {jobs.map((job) => (
                        <Link
                          key={job.id}
                          href={`/installations/${job.id}`}
                          className="flex items-center justify-between py-1.5 text-sm hover:text-foreground text-muted-foreground transition-colors group"
                        >
                          <span className="font-medium text-foreground">{job.job_number}</span>
                          <span className="text-xs group-hover:text-teal-400 transition-colors">
                            Files →
                          </span>
                        </Link>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="jobs" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Jobs for {customer.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {jobs.length} {jobs.length === 1 ? "job" : "jobs"}
                  </p>
                </div>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Job
                </Button>
              </div>

              {jobsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : jobs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {jobs.map((job) => {
                    const daysInStage = Math.floor(
                      (new Date().getTime() - new Date(job.stage_changed_at).getTime()) /
                        (1000 * 60 * 60 * 24)
                    )
                    return (
                      <Link key={job.id} href={`/jobs/${job.id}`}>
                        <Card className="hover:shadow-lg transition-all cursor-pointer h-full">
                          <CardContent className="pt-6 space-y-3">
                            <div className="flex items-start justify-between">
                              <Badge variant="secondary">{job.current_stage?.name}</Badge>
                              {job.tags?.includes("HOT") && (
                                <Badge variant="destructive" className="text-xs">
                                  🔥 HOT
                                </Badge>
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-sm font-mono">
                                {job.job_number}
                              </div>
                              <div className="text-2xl font-display font-bold text-primary mt-1">
                                £{job.estimated_value ? (job.estimated_value / 1000).toFixed(1) : 0}k
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground pt-2 border-t">
                              {daysInStage}d in current stage
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center text-muted-foreground">
                      <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="mb-4">No jobs yet</p>
                      <Button size="sm" className="gap-2">
                        <Plus className="h-4 w-4" />
                        Create First Job
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="communications">
              <Card>
                <CardHeader>
                  <CardTitle>Communications</CardTitle>
                  <CardDescription>
                    SMS, email, and call history with {customer.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CustomerCommunicationsTab customerId={customerId} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>Activity Timeline</CardTitle>
                  <CardDescription>
                    Unified view of jobs, communications, and appointments
                  </CardDescription>
                </CardHeader>
                <CardContent data-testid="customer-timeline">
                  {timelineLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                      ))}
                    </div>
                  ) : (() => {
                    // Build unified activity items
                    type ActivityItem =
                      | { timestamp: string; type: "timeline"; data: typeof timeline[number] }
                      | { timestamp: string; type: "appointment"; data: typeof appointments[number] }
                      | { timestamp: string; type: "call_recording"; data: typeof callRecordings[number] }

                    const activityItems: ActivityItem[] = []

                    // Add timeline items
                    timeline.forEach((item) => {
                      activityItems.push({
                        timestamp: item.timestamp,
                        type: "timeline",
                        data: item,
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
                          <p>No activity yet for this customer</p>
                        </div>
                      )
                    }

                    return (
                      <div className="space-y-4">
                        {activityItems.map((item, idx) => {
                          let icon = <FileText className="h-4 w-4" />
                          let iconBg = "bg-muted"

                          if (item.type === "timeline") {
                            if (item.data.type === "job") {
                              icon = <Briefcase className="h-4 w-4 text-primary" />
                              iconBg = "bg-primary/10"
                            } else if (item.data.type === "message_thread") {
                              icon = <MessageSquare className="h-4 w-4 text-blue-400" />
                              iconBg = "bg-blue-500/15"
                            } else if (item.data.type === "appointment") {
                              icon = <Calendar className="h-4 w-4 text-secondary" />
                              iconBg = "bg-secondary/10"
                            } else if (item.data.type === "customer_note") {
                              icon = <FileText className="h-4 w-4 text-green-400" />
                              iconBg = "bg-green-500/15"
                            }
                          } else if (item.type === "appointment") {
                            icon = <Calendar className="h-4 w-4 text-secondary" />
                            iconBg = "bg-secondary/10"
                          } else if (item.type === "call_recording") {
                            icon = <Phone className="h-4 w-4 text-blue-500" />
                            iconBg = "bg-blue-500/10"
                          }

                          return (
                            <div
                              key={`${item.type}-${idx}`}
                              className="flex gap-4 p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                              data-testid="customer-timeline-item"
                            >
                              <div className="mt-1">
                                <div className={`p-2 rounded-lg ${iconBg}`}>{icon}</div>
                              </div>
                              <div className="flex-1">
                                {item.type === "timeline" && (
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                      <div className="font-medium mb-1">{item.data.title}</div>
                                      {item.data.description && (
                                        <div className="text-sm text-muted-foreground mb-2">
                                          {item.data.description}
                                        </div>
                                      )}
                                      {item.data.metadata && (
                                        <div className="flex flex-wrap gap-2 text-xs">
                                          {item.data.type === "job" && (
                                            <>
                                              {item.data.metadata.stage && (
                                                <Badge variant="secondary" className="text-xs">
                                                  {item.data.metadata.stage as string}
                                                </Badge>
                                              )}
                                              {item.data.metadata.estimated_value && (
                                                <span className="font-semibold text-primary">
                                                  £
                                                  {(
                                                    (item.data.metadata.estimated_value as number) / 1000
                                                  ).toFixed(1)}
                                                  k
                                                </span>
                                              )}
                                              {/* SOLAR-SPECIFIC: system_size_kwp hidden */}
                                            </>
                                          )}
                                          {item.data.type === "message_thread" && item.data.metadata.channel ? (
                                            <Badge variant="outline" className="text-xs">
                                              {item.data.metadata.channel as string}
                                            </Badge>
                                          ) : null}
                                          {item.data.type === "appointment" && (
                                            <>
                                              {item.data.metadata.location && (
                                                <div className="flex items-center gap-1 text-muted-foreground">
                                                  <MapPin className="h-3 w-3" />
                                                  {item.data.metadata.location as string}
                                                </div>
                                              )}
                                            </>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                                      <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatDate(item.timestamp)}
                                      </div>
                                    </div>
                                  </div>
                                )}
                                {item.type === "appointment" && (
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                      <div className="font-medium mb-1">
                                        Appointment: {item.data.title || "Scheduled appointment"}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {formatDate(item.timestamp)}
                                        {item.data.location && ` • ${item.data.location}`}
                                      </div>
                                    </div>
                                  </div>
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
                          )
                        })}
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </ErrorBoundary>

      {/* SOLAR-SPECIFIC: Solar Visualization Modal hidden */}

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
        customerId={customerId}
        customerName={customer?.name}
        customerEmail={customer?.email || undefined}
        customerPhone={customer?.phone || undefined}
      />
    </>
  )
}
