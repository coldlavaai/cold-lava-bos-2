"use client"

/**
 * Session 106: Analytics Detail View
 *
 * Comprehensive analytics page showing:
 * - Overview metrics (customers, jobs, pipeline)
 * - Jobs & Pipeline details
 * - Communications volume
 * - DBR campaign performance (conditional)
 *
 * Uses Analytics v1 APIs from Session 105
 */

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MetricCard } from "@/components/ui/metric-card"
import { Badge } from "@/components/ui/badge"
import {
  TrendingUp,
  Users,
  Briefcase,
  CheckCircle2,
  Mail,
  MessageSquare,
  Phone,
  Activity,
  DollarSign,
  Target,
} from "lucide-react"
import { useTenantAnalyticsOverview, useDBRAnalyticsOverview } from "@/lib/api/hooks"

export default function AnalyticsPage() {
  const { data: analytics, isLoading: analyticsLoading, error: analyticsError } = useTenantAnalyticsOverview()
  const { data: dbrAnalytics, isLoading: dbrAnalyticsLoading } = useDBRAnalyticsOverview()

  // Format currency in pence to £XXk
  const formatCurrency = (pence: number) => {
    const pounds = pence / 100
    if (pounds >= 1000) {
      return `£${(pounds / 1000).toFixed(1)}k`
    }
    return `£${pounds.toFixed(0)}`
  }

  // Format date range
  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    return `${startDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} - ${endDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
  }

  // Show loading skeleton
  if (analyticsLoading) {
    return (
      
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <h1 className="text-lg md:text-xl font-display font-bold gradient-text-solar">Analytics</h1>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      
    )
  }

  // Show error state
  if (analyticsError || !analytics) {
    return (
      
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <h1 className="text-lg md:text-xl font-display font-bold gradient-text-solar">Analytics</h1>
          </div>
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Failed to load analytics data. Please try again later.
              </p>
            </CardContent>
          </Card>
        </div>
      
    )
  }

  // Determine if DBR is enabled (campaigns exist)
  const hasDbrCampaigns = dbrAnalytics && dbrAnalytics.total_campaigns > 0

  return (
    
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div>
            <h1 className="text-lg md:text-xl font-display font-bold gradient-text-solar">Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Business performance overview for {formatDateRange(analytics.date_range.start, analytics.date_range.end)}
            </p>
          </div>
        </div>

        {/* Overview Section - Headline KPIs */}
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Overview
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              title="Total Customers"
              value={analytics.customers.total}
              subtitle={`+${analytics.customers.new_last_30_days} new (30d)`}
              icon={<Users className="h-4 w-4" />}
              variant="primary"
            />
            <MetricCard
              title="Total Jobs"
              value={analytics.jobs.total}
              subtitle={`+${analytics.jobs.new_last_30_days} new (30d)`}
              icon={<Briefcase className="h-4 w-4" />}
              variant="secondary"
            />
            <MetricCard
              title="Pipeline Value"
              value={formatCurrency(analytics.jobs.pipeline_value_pence)}
              subtitle="Current total"
              icon={<DollarSign className="h-4 w-4" />}
              variant="success"
            />
            <MetricCard
              title="Jobs Completed"
              value={analytics.jobs.jobs_completed_last_30_days}
              subtitle="Last 30 days"
              icon={<CheckCircle2 className="h-4 w-4" />}
              variant="warning"
            />
          </div>
        </section>

        {/* Jobs & Pipeline Section */}
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Jobs &amp; Pipeline
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Total Jobs</CardTitle>
                <CardDescription>Active jobs in pipeline</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{analytics.jobs.total}</span>
                  <Badge variant="outline" className="text-xs">
                    +{analytics.jobs.new_last_30_days} new
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Jobs Completed</CardTitle>
                <CardDescription>Last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{analytics.jobs.jobs_completed_last_30_days}</span>
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Pipeline Value</CardTitle>
                <CardDescription>Current total value</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">
                    {formatCurrency(analytics.jobs.pipeline_value_pence)}
                  </span>
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Won Value</CardTitle>
                <CardDescription>Last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">
                    {formatCurrency(analytics.jobs.won_value_pence_last_30_days)}
                  </span>
                  <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">
                    Won
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Communications Section */}
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Communications
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Emails Sent
                </CardTitle>
                <CardDescription>Last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">
                    {analytics.communications.emails_sent_last_30_days}
                  </span>
                  <span className="text-sm text-muted-foreground">messages</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  SMS Sent
                </CardTitle>
                <CardDescription>Last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">
                    {analytics.communications.sms_sent_last_30_days}
                  </span>
                  <span className="text-sm text-muted-foreground">messages</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Total communications summary */}
          <Card className="mt-3">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Communications (30 days)</p>
                  <p className="text-2xl font-bold mt-1">
                    {analytics.communications.emails_sent_last_30_days +
                      analytics.communications.sms_sent_last_30_days}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* DBR Section (Conditional) */}
        {hasDbrCampaigns ? (
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              DBR Campaign Performance
            </h2>
            {dbrAnalyticsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Campaigns</CardTitle>
                    <CardDescription>Active vs total</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold">{dbrAnalytics.active_campaigns}</span>
                      <span className="text-sm text-muted-foreground">
                        / {dbrAnalytics.total_campaigns} total
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Reply Rate</CardTitle>
                    <CardDescription>Contact engagement</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold">{dbrAnalytics.reply_rate.toFixed(1)}%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {dbrAnalytics.replied_contacts} of {dbrAnalytics.total_contacts} contacts replied
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Calls Booked</CardTitle>
                    <CardDescription>Last 7 days</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold">
                        {dbrAnalytics.calls_booked_last_7_days}
                      </span>
                      <Phone className="h-5 w-5 text-success" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </section>
        ) : (
          // DBR not enabled placeholder
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  DBR Campaign Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  No DBR campaigns found. Create your first campaign to see performance metrics here.
                </p>
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    
  )
}
