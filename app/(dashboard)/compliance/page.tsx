"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Eye, AlertCircle } from "lucide-react"
import { useJobs } from "@/lib/api/hooks"
import type { Job } from "@/lib/api/types"

// Helper to get missing compliance fields
function getMissingFields(job: Job): string[] {
  const missing: string[] = []

  if (!job.site_supply_type) missing.push("Supply Type")
  if (!job.export_capacity_kw) missing.push("Export Capacity")
  if (job.dno_required && !job.dno_reference) missing.push("Approval Reference")
  if (!job.installer_name) missing.push("Assigned Agent")
  if (!job.installer_mcs_number) missing.push("Certification Number")
  if (!job.inverter_model) missing.push("Service Type")
  if (!job.panel_model) missing.push("Package Type")
  if (!job.mounting_system) missing.push("Delivery Method")

  return missing
}

// Helper to map database compliance_status to display format (Session 58)
function mapDbStatusToDisplay(status: 'ready' | 'in_progress' | 'not_started' | 'dno_pending', job: Job): { badge: 'complete' | 'partial' | 'incomplete'; filledCount: number; totalCount: number } {
  // For database status, we can't easily compute filled count without the fields
  // So we'll use approximate values based on status
  const totalCount = 8

  switch (status) {
    case 'ready':
      return { badge: 'complete', filledCount: 8, totalCount } // All fields complete
    case 'dno_pending':
      return { badge: 'partial', filledCount: 7, totalCount } // All except DNO reference
    case 'in_progress':
      // Fall back to actual calculation for partial progress
      return calculateComplianceStatus(job)
    case 'not_started':
      return { badge: 'incomplete', filledCount: 0, totalCount } // No fields
  }
}

// Calculate compliance status (fallback for pre-Session 58)
function calculateComplianceStatus(job: Job): { badge: 'complete' | 'partial' | 'incomplete'; filledCount: number; totalCount: number } {
  const complianceFields = [
    job.site_supply_type,
    job.export_capacity_kw,
    // FIXED: Treat NULL dno_required as "not required" (same as false)
    (job.dno_required ?? false) ? job.dno_reference : true,
    job.installer_name,
    job.installer_mcs_number,
    job.inverter_model,
    job.panel_model,
    job.mounting_system,
  ]

  const filled = complianceFields.filter(f => f).length
  const total = complianceFields.length

  if (filled === 0) return { badge: 'incomplete', filledCount: filled, totalCount: total }
  if (filled === total) return { badge: 'complete', filledCount: filled, totalCount: total }
  return { badge: 'partial', filledCount: filled, totalCount: total }
}

export default function ComplianceReportPage() {
  const router = useRouter()
  const { data: jobsResponse, isLoading } = useJobs({ limit: 1000 }) // Get all jobs

  const jobs = React.useMemo(() => jobsResponse?.data || [], [jobsResponse?.data])

  // Filter to only show jobs with incomplete compliance
  const incompleteJobs = React.useMemo(() => {
    return jobs.filter(job => {
      // Prefer database-generated compliance_status if available (Session 58 migration)
      const status = job.compliance_status
        ? mapDbStatusToDisplay(job.compliance_status, job)
        : calculateComplianceStatus(job)
      return status.badge !== 'complete'
    }).sort((a, b) => {
      // Sort by most incomplete first
      const statusA = a.compliance_status
        ? mapDbStatusToDisplay(a.compliance_status, a)
        : calculateComplianceStatus(a)
      const statusB = b.compliance_status
        ? mapDbStatusToDisplay(b.compliance_status, b)
        : calculateComplianceStatus(b)
      return statusA.filledCount - statusB.filledCount
    })
  }, [jobs])

  // Calculate summary metrics
  const totalJobs = jobs.length
  const completeCount = jobs.filter(j => {
    const status = j.compliance_status
      ? mapDbStatusToDisplay(j.compliance_status, j)
      : calculateComplianceStatus(j)
    return status.badge === 'complete'
  }).length
  const incompleteCount = incompleteJobs.length
  const dnoRequiredCount = jobs.filter(j => j.dno_required && !j.dno_reference).length

  return (
    
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold gradient-text-solar">
              Compliance Report
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Jobs with incomplete compliance data
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total Jobs</div>
            <div className="text-3xl font-bold mt-1">{totalJobs}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Complete</div>
            <div className="text-3xl font-bold text-green-400 mt-1">
              {completeCount}
              <span className="text-sm text-muted-foreground ml-2">
                ({totalJobs > 0 ? Math.round((completeCount / totalJobs) * 100) : 0}%)
              </span>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Needs Attention</div>
            <div className="text-3xl font-bold text-amber-400 mt-1">
              {incompleteCount}
              <span className="text-sm text-muted-foreground ml-2">
                ({totalJobs > 0 ? Math.round((incompleteCount / totalJobs) * 100) : 0}%)
              </span>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Approval Pending</div>
            <div className="text-3xl font-bold text-red-400 mt-1">{dnoRequiredCount}</div>
          </Card>
        </div>

        {/* Jobs Table */}
        <Card>
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold">Incomplete Jobs</h2>
            <p className="text-sm text-muted-foreground">
              {incompleteCount} job{incompleteCount !== 1 ? 's' : ''} need{incompleteCount === 1 ? 's' : ''} compliance data
            </p>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading jobs...
            </div>
          ) : incompleteJobs.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-green-400 font-semibold mb-2">
                ✅ All jobs have complete compliance data!
              </div>
              <p className="text-sm text-muted-foreground">
                There are no jobs requiring attention at this time.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Missing Fields</TableHead>
                    <TableHead className="text-center">Approval Due</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incompleteJobs.map((job) => {
                    const missingFields = getMissingFields(job)
                    // Prefer database-generated compliance_status if available (Session 58 migration)
                    const status = job.compliance_status
                      ? mapDbStatusToDisplay(job.compliance_status, job)
                      : calculateComplianceStatus(job)
                    const isDnoPending = job.dno_required && !job.dno_reference

                    return (
                      <TableRow key={job.id} data-testid="compliance-report-row">
                        <TableCell className="font-mono text-sm">
                          {job.job_number}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{job.customer?.name || "Unknown"}</div>
                          <div className="text-xs text-muted-foreground">
                            {job.customer?.postcode || "No postcode"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              status.badge === 'partial' ? 'warning' : 'destructive'
                            }
                          >
                            {status.filledCount}/{status.totalCount} Complete
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm max-w-xs">
                            {missingFields.slice(0, 3).join(", ")}
                            {missingFields.length > 3 && (
                              <span className="text-muted-foreground">
                                {" "}+{missingFields.length - 3} more
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {isDnoPending && (
                            <Badge variant="destructive" className="gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Yes
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1"
                            onClick={() => router.push(`/jobs/${job.id}?tab=compliance`)}
                          >
                            <Eye className="h-4 w-4" />
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    
  )
}
