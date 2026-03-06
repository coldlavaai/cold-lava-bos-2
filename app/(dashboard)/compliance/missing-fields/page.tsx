"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ComplianceStatusBadge } from "@/components/ui/compliance-status-badge"
import { Edit, AlertCircle, CheckCircle2, ExternalLink } from "lucide-react"
import { useJobsMissingComplianceFields } from "@/lib/api/hooks"

export default function MissingFieldsPage() {
  const router = useRouter()
  const { data: missingFieldsJobs, isLoading, error } = useJobsMissingComplianceFields()

  // Handle migration not applied
  if (error) {
    return (
      
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold gradient-text-solar">
              Missing Fields Report
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Jobs requiring compliance data entry
            </p>
          </div>

          <Card className="border-warning">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-warning">
                <AlertCircle className="h-5 w-5" />
                Report Unavailable
              </CardTitle>
              <CardDescription>
                The missing fields report is not available yet. Session 58 migration is pending.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This report displays jobs with incomplete compliance data from the database.
                Contact your administrator to apply the Session 58 migration.
              </p>
            </CardContent>
          </Card>
        </div>
      
    )
  }

  // Handle no data (view returned empty or null)
  if (!missingFieldsJobs && !isLoading) {
    return (
      
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold gradient-text-solar">
              Missing Fields Report
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Jobs requiring compliance data entry
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                No Data Available
              </CardTitle>
              <CardDescription>
                No compliance data found for your tenant.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Create some jobs to see missing fields data.
              </p>
            </CardContent>
          </Card>
        </div>
      
    )
  }

  const jobCount = missingFieldsJobs?.length || 0

  return (
    
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold gradient-text-solar">
              Missing Fields Report
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Jobs requiring compliance data entry
            </p>
          </div>
          {jobCount > 0 && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/jobs?compliance_status=not_started" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                View in Jobs Board
              </Link>
            </Button>
          )}
        </div>

        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Incomplete Jobs Summary
            </CardTitle>
            <CardDescription>
              {jobCount === 0 ? (
                <span className="text-success font-semibold">All jobs have complete compliance data!</span>
              ) : (
                <span>{jobCount} job{jobCount !== 1 ? 's' : ''} need compliance data</span>
              )}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Jobs Table */}
        <Card data-testid="missing-fields-table">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold">Jobs with Missing Fields</h2>
            <p className="text-sm text-muted-foreground">
              Click &ldquo;Edit&rdquo; to complete missing compliance information
            </p>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading missing fields data...
            </div>
          ) : jobCount === 0 ? (
            <div className="p-8 text-center">
              <div className="flex flex-col items-center gap-2">
                <CheckCircle2 className="h-12 w-12 text-success" />
                <div className="text-success font-semibold text-lg">
                  All Jobs Complete!
                </div>
                <p className="text-sm text-muted-foreground">
                  There are no jobs with missing compliance fields at this time.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Compliance Status</TableHead>
                    <TableHead>Missing Critical Fields</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {missingFieldsJobs?.map((job) => (
                    <TableRow key={job.id} data-testid="missing-fields-row">
                      <TableCell className="font-mono text-sm">
                        {job.job_number}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{job.customer_name || "Unknown"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{job.stage_name || "No stage"}</div>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/jobs?compliance_status=${job.compliance_status}`}
                          className="inline-block hover:opacity-75 transition-opacity"
                          data-testid="compliance-status-link"
                        >
                          <ComplianceStatusBadge status={job.compliance_status} />
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm max-w-md">
                          {job.missing_critical_fields.length > 0 ? (
                            <>
                              {job.missing_critical_fields.slice(0, 3).join(", ")}
                              {job.missing_critical_fields.length > 3 && (
                                <span className="text-muted-foreground">
                                  {" "}+{job.missing_critical_fields.length - 3} more
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground italic">None</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {job.missing_critical_count} of {job.critical_fields_total} fields missing
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          onClick={() => router.push(`/jobs/${job.id}?tab=compliance`)}
                          data-testid="edit-job-button"
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    
  )
}
