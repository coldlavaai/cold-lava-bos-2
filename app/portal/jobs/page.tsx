/**
 * Session 102: Customer Portal - Jobs List Page
 * Shows all jobs for the authenticated customer
 */

// Force dynamic rendering - portal pages use cookies for session validation
export const dynamic = 'force-dynamic'

import * as React from "react"
import { redirect } from "next/navigation"
import { getPortalSession } from "@/lib/portal/session"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Briefcase, ChevronRight, MapPin, Calendar } from "lucide-react"
import Link from "next/link"

export default async function PortalJobsListPage() {
  // Validate session
  const sessionData = await getPortalSession()

  if (!sessionData) {
    redirect("/portal/invalid-link")
  }

  const { customer, session } = sessionData

  // Fetch all customer's jobs
  const supabase = await createClient()

  const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select(`
      id,
      job_number,
      site_address,
      status,
      created_at,
      updated_at,
      expected_completion_date
    `)
    .eq("customer_id", customer.id)
    .eq("tenant_id", session.tenant_id)
    .order("created_at", { ascending: false })

  if (jobsError) {
    console.error("[Portal Jobs] Error fetching jobs:", jobsError)
  }

  const jobsCount = jobs?.length || 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Briefcase className="h-8 w-8" />
          Your Projects
        </h1>
        <p className="text-muted-foreground mt-1">
          {jobsCount === 0
            ? "No projects yet"
            : `${jobsCount} project${jobsCount !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Jobs List */}
      {jobsCount === 0 ? (
        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            <Briefcase className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-semibold mb-2">No Projects Yet</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Your project manager will create projects as work begins.
              Check back here to track progress.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {jobs?.map((job) => {
            const createdDate = new Date(job.created_at)
            const expectedCompletionDate = job.expected_completion_date
              ? new Date(job.expected_completion_date)
              : null

            return (
              <Link key={job.id} href={`/portal/jobs/${job.id}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl">
                          {job.job_number}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1.5 mt-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {job.site_address}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-medium capitalize">
                          {job.status.replace("_", " ")}
                        </span>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      {/* SOLAR-SPECIFIC: system size hidden for Cold Lava */}
                      <div>
                        <p className="text-muted-foreground">Started</p>
                        <p className="font-medium flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {createdDate.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      {expectedCompletionDate && (
                        <div>
                          <p className="text-muted-foreground">Expected Completion</p>
                          <p className="font-medium flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            {expectedCompletionDate.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
