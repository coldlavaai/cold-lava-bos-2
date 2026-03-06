"use client"

import * as React from "react"
import Link from "next/link"
import { MetricCard } from "@/components/ui/metric-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useComplianceDashboardSummary } from "@/lib/api/hooks"
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  FileText,
  Zap,
  Users,
  Calendar,
  TrendingUp,
} from "lucide-react"

export default function ComplianceDashboardPage() {
  const { data: summary, isLoading, error } = useComplianceDashboardSummary()

  // Handle migration not applied
  if (error) {
    return (
      
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold gradient-text-solar">
              Compliance Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time compliance readiness metrics
            </p>
          </div>

          <Card className="border-warning">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-warning">
                <AlertCircle className="h-5 w-5" />
                Dashboard Unavailable
              </CardTitle>
              <CardDescription>
                The compliance dashboard is not available yet. Session 58 migration is pending.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This dashboard displays aggregate compliance metrics from the database.
                Contact your administrator to apply the Session 58 migration.
              </p>
            </CardContent>
          </Card>
        </div>
      
    )
  }

  // Handle no data (view returned null)
  if (!summary && !isLoading) {
    return (
      
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold gradient-text-solar">
              Compliance Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time compliance readiness metrics
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
                Create some jobs to see compliance metrics.
              </p>
            </CardContent>
          </Card>
        </div>
      
    )
  }

  const readyPercentage = summary?.ready_percentage || 0
  const startedPercentage = summary?.started_percentage || 0
  const dnoCompletionRate = summary?.dno_required_count
    ? Math.round(((summary.dno_submitted_count || 0) / summary.dno_required_count) * 100)
    : 0

  return (
    
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold gradient-text-solar">
            Compliance Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time compliance readiness metrics across all jobs
          </p>
        </div>

        {/* Overview Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="compliance-overview-metrics">
          <MetricCard
            title="Total Jobs"
            value={summary?.total_jobs || 0}
            subtitle="All jobs in system"
            icon={<FileText className="h-4 w-4" />}
            variant="default"
            loading={isLoading}
          />

          <MetricCard
            title="Ready for Submission"
            value={`${readyPercentage}%`}
            subtitle={`${summary?.ready_count || 0} jobs ready`}
            icon={<CheckCircle2 className="h-4 w-4" />}
            variant="success"
            loading={isLoading}
          />

          <MetricCard
            title="In Progress"
            value={summary?.in_progress_count || 0}
            subtitle={`${startedPercentage}% started`}
            icon={<Clock className="h-4 w-4" />}
            variant="warning"
            loading={isLoading}
          />

          <MetricCard
            title="Not Started"
            value={summary?.not_started_count || 0}
            subtitle="Need attention"
            icon={<XCircle className="h-4 w-4" />}
            variant="secondary"
            loading={isLoading}
          />
        </div>

        {/* Status Breakdown */}
        <Card data-testid="compliance-status-breakdown">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Compliance Status Breakdown
            </CardTitle>
            <CardDescription>
              Distribution of jobs across compliance tiers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                href="/jobs?compliance_status=ready"
                className="space-y-2 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                data-testid="compliance-link-ready"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-success">Ready</span>
                  <span className="text-2xl font-bold text-success">
                    {summary?.ready_count || 0}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  All critical fields complete
                </p>
              </Link>

              <Link
                href="/jobs?compliance_status=dno_pending"
                className="space-y-2 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                data-testid="compliance-link-dno-pending"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-warning">DNO Pending</span>
                  <span className="text-2xl font-bold text-warning">
                    {summary?.dno_pending_count || 0}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Awaiting DNO reference
                </p>
              </Link>

              <Link
                href="/jobs?compliance_status=in_progress"
                className="space-y-2 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                data-testid="compliance-link-in-progress"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">In Progress</span>
                  <span className="text-2xl font-bold">
                    {summary?.in_progress_count || 0}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Partial completion
                </p>
              </Link>

              <Link
                href="/jobs?compliance_status=not_started"
                className="space-y-2 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                data-testid="compliance-link-not-started"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Not Started</span>
                  <span className="text-2xl font-bold text-muted-foreground">
                    {summary?.not_started_count || 0}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  No data entered
                </p>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* DNO Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card data-testid="compliance-dno-stats">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                DNO Notification Status
              </CardTitle>
              <CardDescription>
                Distribution Network Operator submission tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Requiring DNO</span>
                  <span className="text-2xl font-bold">
                    {summary?.dno_required_count || 0}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-success">Submitted</span>
                  <span className="text-xl font-bold text-success">
                    {summary?.dno_submitted_count || 0}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-warning">Pending Submission</span>
                  <span className="text-xl font-bold text-warning">
                    {summary?.dno_pending_submission || 0}
                  </span>
                </div>

                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Completion Rate</span>
                    <span className="text-xl font-bold text-primary">
                      {dnoCompletionRate}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stage Breakdown */}
          <Card data-testid="compliance-stage-breakdown">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Jobs by Stage
              </CardTitle>
              <CardDescription>
                Distribution across pipeline stages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Leads</span>
                  <span className="text-2xl font-bold">
                    {summary?.leads_count || 0}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Active Jobs</span>
                  <span className="text-xl font-bold text-primary">
                    {summary?.active_jobs_count || 0}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-success">Completed</span>
                  <span className="text-xl font-bold text-success">
                    {summary?.completed_jobs_count || 0}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Cancelled</span>
                  <span className="text-xl font-bold text-muted-foreground">
                    {summary?.cancelled_jobs_count || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            title="Avg Fields Completed"
            value={summary?.avg_critical_fields_filled?.toFixed(1) || '0.0'}
            subtitle="Out of 5-6 critical fields"
            icon={<FileText className="h-4 w-4" />}
            variant="primary"
            loading={isLoading}
          />

          <MetricCard
            title="Active Jobs Ready"
            value={summary?.non_lead_ready_count || 0}
            subtitle={`Of ${summary?.non_lead_total || 0} active jobs`}
            icon={<CheckCircle2 className="h-4 w-4" />}
            variant="success"
            loading={isLoading}
          />

          <MetricCard
            title="Updated This Week"
            value={summary?.updated_last_week || 0}
            subtitle={`${summary?.updated_last_month || 0} this month`}
            icon={<Calendar className="h-4 w-4" />}
            variant="default"
            loading={isLoading}
          />
        </div>
      </div>
    
  )
}
