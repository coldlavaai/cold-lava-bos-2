/**
 * Session 102: Customer Portal - Job Detail Page
 * Shows detailed information about a specific job
 */

// Force dynamic rendering - portal pages use cookies for session validation
export const dynamic = 'force-dynamic'

import * as React from "react"
import { redirect, notFound } from "next/navigation"
import { getPortalSession } from "@/lib/portal/session"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  MapPin,
  Calendar,
  Clock,
  FileText,
  ChevronLeft,
  CheckCircle2,
  
} from "lucide-react"
import Link from "next/link"

interface JobDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function PortalJobDetailPage({ params }: JobDetailPageProps) {
  const resolvedParams = await params
  const jobId = resolvedParams.id

  // Validate session
  const sessionData = await getPortalSession()

  if (!sessionData) {
    redirect("/portal/invalid-link")
  }

  const { customer, session } = sessionData

  // Fetch job details
  const supabase = await createClient()

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select(`
      id,
      job_number,
      site_address,
      status,
      system_size_kw,
      panel_count,
      panel_model,
      inverter_model,
      estimated_annual_production_kwh,
      expected_completion_date,
      notes,
      created_at,
      updated_at,
      opensolar_project_id,
      opensolar_project_url
    `)
    .eq("id", jobId)
    .eq("customer_id", customer.id)
    .eq("tenant_id", session.tenant_id)
    .single()

  if (jobError || !job) {
    notFound()
  }

  // Fetch appointments for this job
  const { data: appointments, error: _appointmentsError } = await supabase
    .from("appointments")
    .select("id, title, scheduled_start, scheduled_end, status, notes")
    .eq("job_id", job.id)
    .eq("tenant_id", session.tenant_id)
    .order("scheduled_start", { ascending: true })

  // Fetch timeline events for this job
  const { data: timelineEvents, error: _timelineError } = await supabase
    .from("job_timeline_events")
    .select("id, event_type, event_date, description, created_at")
    .eq("job_id", job.id)
    .eq("tenant_id", session.tenant_id)
    .order("event_date", { ascending: false })

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/portal/jobs">
        <Button variant="ghost" size="sm">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Projects
        </Button>
      </Link>

      {/* Job Header */}
      <div>
        <h1 className="text-3xl font-bold">{job.job_number}</h1>
        <p className="text-muted-foreground mt-1 flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          {job.site_address}
        </p>
        <div className="mt-3">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary font-medium text-sm capitalize">
            {job.status.replace("_", " ")}
          </span>
        </div>
      </div>

      {/* Project Details */}
      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
          <CardDescription>Key information about your project</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {job.expected_completion_date && (
              <div>
                <p className="text-sm text-muted-foreground">Expected Completion</p>
                <p className="text-lg font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date(job.expected_completion_date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Appointments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Appointments
          </CardTitle>
          <CardDescription>Scheduled visits and appointments</CardDescription>
        </CardHeader>
        <CardContent>
          {!appointments || appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No appointments scheduled for this project
            </p>
          ) : (
            <div className="space-y-3">
              {appointments.map((appointment) => {
                const startDate = new Date(appointment.scheduled_start)
                const endDate = new Date(appointment.scheduled_end)
                const isPast = startDate < new Date()

                return (
                  <div
                    key={appointment.id}
                    className="p-4 rounded-lg border border-border bg-muted/30"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium">{appointment.title}</p>
                        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {startDate.toLocaleDateString("en-US", {
                              weekday: "long",
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>
                            {startDate.toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            })}{" "}
                            -{" "}
                            {endDate.toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {appointment.notes && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {appointment.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`text-xs px-2 py-1 rounded-full capitalize ${
                            isPast
                              ? "bg-muted text-muted-foreground"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {appointment.status}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      {timelineEvents && timelineEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Project Timeline</CardTitle>
            <CardDescription>Key milestones and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {timelineEvents.map((event, index) => {
                const eventDate = new Date(event.event_date)
                const isLast = index === timelineEvents.length - 1

                return (
                  <div key={event.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      {!isLast && (
                        <div className="w-0.5 h-full bg-border mt-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="font-medium capitalize">
                        {event.event_type.replace("_", " ")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {eventDate.toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                      {event.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {event.description}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Notes */}
      {job.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{job.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
