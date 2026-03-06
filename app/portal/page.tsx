/**
 * Session 102: Customer Portal - Overview Page
 * Read-only dashboard showing customer info, jobs summary, and appointments
 */

// Force dynamic rendering - portal pages use cookies for session validation
export const dynamic = 'force-dynamic'

import * as React from "react"
import { redirect } from "next/navigation"
import { getPortalSession } from "@/lib/portal/session"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { User, Briefcase, Calendar, MapPin, Mail, Phone, ChevronRight } from "lucide-react"
import Link from "next/link"

export default async function PortalOverviewPage() {
  // Validate session (required by middleware, but we need the data)
  const sessionData = await getPortalSession()

  if (!sessionData) {
    redirect("/portal/invalid-link")
  }

  const { customer, session } = sessionData

  // Fetch customer's jobs
  const supabase = await createClient()

  const { data: jobs, error: _jobsError } = await supabase
    .from("jobs")
    .select("id, job_number, site_address, status, created_at")
    .eq("customer_id", customer.id)
    .eq("tenant_id", session.tenant_id)
    .order("created_at", { ascending: false })

  const jobsCount = jobs?.length || 0

  // Count jobs by status
  const statusCounts = jobs?.reduce((acc, job) => {
    acc[job.status] = (acc[job.status] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  // Fetch upcoming appointments
  const { data: appointments, error: _appointmentsError } = await supabase
    .from("appointments")
    .select("id, title, scheduled_start, scheduled_end, status, job:jobs(job_number, site_address)")
    .eq("customer_id", customer.id)
    .eq("tenant_id", session.tenant_id)
    .gte("scheduled_start", new Date().toISOString())
    .order("scheduled_start", { ascending: true })
    .limit(5)

  type AppointmentWithJob = {
    id: string
    title: string
    scheduled_start: string
    scheduled_end: string
    status: string
    job: { job_number: string; site_address: string } | null
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold">
          Welcome, {customer.first_name}!
        </h1>
        <p className="text-muted-foreground mt-1">
          View your project details and appointments
        </p>
      </div>

      {/* Customer Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Your Information
          </CardTitle>
          <CardDescription>Contact details and address</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Name</p>
              <p className="text-base">
                {customer.first_name} {customer.last_name}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {customer.email}
              </p>
            </div>
            {customer.phone && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Phone</p>
                <p className="text-base flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {customer.phone}
                </p>
              </div>
            )}
            {customer.address_line_1 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Address</p>
                <p className="text-base flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span>
                    {customer.address_line_1}
                    {customer.address_line_2 && <>, {customer.address_line_2}</>}
                    <br />
                    {customer.city && <>{customer.city}, </>}
                    {customer.state && <>{customer.state} </>}
                    {customer.postal_code}
                  </span>
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Jobs Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Your Projects
              </CardTitle>
              <CardDescription>
                {jobsCount === 0
                  ? "No projects yet"
                  : `${jobsCount} project${jobsCount !== 1 ? "s" : ""} total`}
              </CardDescription>
            </div>
            {jobsCount > 0 && (
              <Link href="/portal/jobs">
                <Button variant="outline" size="sm">
                  View All
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {jobsCount === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No projects have been created yet. Your installer will create
              projects as work begins.
            </p>
          ) : (
            <div className="space-y-4">
              {/* Status Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(statusCounts).map(([status, count]) => (
                  <div
                    key={status}
                    className="p-3 rounded-lg border border-border bg-muted/30"
                  >
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {status.replace("_", " ")}
                    </p>
                  </div>
                ))}
              </div>

              {/* Recent Jobs */}
              <div>
                <h4 className="text-sm font-medium mb-2">Recent Projects</h4>
                <div className="space-y-2">
                  {jobs?.slice(0, 3).map((job) => (
                    <Link
                      key={job.id}
                      href={`/portal/jobs/${job.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <p className="font-medium">{job.job_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {job.site_address}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary capitalize">
                          {job.status.replace("_", " ")}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Appointments Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Appointments
          </CardTitle>
          <CardDescription>Scheduled visits and projects</CardDescription>
        </CardHeader>
        <CardContent>
          {!appointments || appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No upcoming appointments scheduled
            </p>
          ) : (
            <div className="space-y-3">
              {(appointments as unknown as AppointmentWithJob[])?.map((appointment) => {
                const startDate = new Date(appointment.scheduled_start)
                const endDate = new Date(appointment.scheduled_end)

                return (
                  <div
                    key={appointment.id}
                    className="p-3 rounded-lg border border-border bg-muted/30"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium">{appointment.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {startDate.toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {startDate.toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}{" "}
                          -{" "}
                          {endDate.toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                        {appointment.job && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Project: {appointment.job.job_number}
                          </p>
                        )}
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary capitalize">
                        {appointment.status}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
