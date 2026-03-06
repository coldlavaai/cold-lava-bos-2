/**
 * Session 105: Analytics v1 - Tenant Overview
 * GET /api/analytics/tenant/overview
 *
 * Returns aggregated tenant metrics for the last 30 days from
 * analytics.tenant_daily_stats table.
 */

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { getTenantIdFromHeaders } from "@/lib/supabase/tenant-context"

export interface TenantAnalyticsOverview {
  date_range: {
    start: string // ISO date
    end: string // ISO date
  }
  customers: {
    total: number
    new_last_30_days: number
  }
  jobs: {
    total: number
    new_last_30_days: number
    jobs_completed_last_30_days: number
    pipeline_value_pence: number
    won_value_pence_last_30_days: number
  }
  communications: {
    emails_sent_last_30_days: number
    sms_sent_last_30_days: number
  }
}

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantIdFromHeaders(request.headers)

    if (!tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use admin client for analytics queries to bypass RLS
    // Analytics tables don't have user-facing RLS policies yet
    const supabase = createAdminClient()

    // Calculate date range (last 30 days)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)

    const startDateStr = startDate.toISOString().split("T")[0]
    const endDateStr = endDate.toISOString().split("T")[0]

    // Fetch analytics data for last 30 days
    // Note: tenant_daily_stats is in the analytics schema, not public
    const { data: stats, error } = await supabase
      .schema("analytics")
      .from("tenant_daily_stats")
      .select("*")
      .eq("tenant_id", tenantId)
      .gte("date", startDateStr)
      .lte("date", endDateStr)
      .order("date", { ascending: false })

    if (error) {
      console.error("[Analytics API] Error fetching tenant stats:", error)
      return NextResponse.json(
        { error: "Failed to fetch analytics data" },
        { status: 500 }
      )
    }

    // If no data exists in analytics table, fall back to live counts
    if (!stats || stats.length === 0) {
      // Query live data from source tables
      const [customersResult, jobsResult] = await Promise.all([
        supabase.from("customers").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
        supabase.from("jobs").select("id, estimated_value, current_stage_id", { count: "exact" }).eq("tenant_id", tenantId),
      ])

      const totalCustomers = customersResult.count || 0
      const totalJobs = jobsResult.count || 0
      const jobs = jobsResult.data || []
      const pipelineValue = jobs.reduce((sum, job) => sum + ((job.estimated_value || 0) * 100), 0) // Convert to pence

      return NextResponse.json({
        date_range: {
          start: startDateStr,
          end: endDateStr,
        },
        customers: {
          total: totalCustomers,
          new_last_30_days: 0,
        },
        jobs: {
          total: totalJobs,
          new_last_30_days: 0,
          jobs_completed_last_30_days: 0,
          pipeline_value_pence: pipelineValue,
          won_value_pence_last_30_days: 0,
        },
        communications: {
          emails_sent_last_30_days: 0,
          sms_sent_last_30_days: 0,
        },
      } as TenantAnalyticsOverview)
    }

    // Always get live totals for accuracy (analytics table may be stale)
    const [customersResult, jobsResult] = await Promise.all([
      supabase.from("customers").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
      supabase.from("jobs").select("id, estimated_value", { count: "exact" }).eq("tenant_id", tenantId),
    ])

    const liveCustomerCount = customersResult.count || 0
    const liveJobCount = jobsResult.count || 0
    const liveJobs = jobsResult.data || []
    const livePipelineValue = liveJobs.reduce((sum, job) => sum + ((job.estimated_value || 0) * 100), 0)

    // Sum up incremental metrics from analytics table
    const newCustomers = stats.reduce((sum, day) => sum + (day.new_customers || 0), 0)
    const newJobs = stats.reduce((sum, day) => sum + (day.new_jobs || 0), 0)
    const jobsCompleted = stats.reduce((sum, day) => sum + (day.jobs_completed || 0), 0)
    const wonValue = stats.reduce((sum, day) => sum + (day.won_value_pence || 0), 0)
    const emailsSent = stats.reduce((sum, day) => sum + (day.emails_sent || 0), 0)
    const smsSent = stats.reduce((sum, day) => sum + (day.sms_sent || 0), 0)

    const overview: TenantAnalyticsOverview = {
      date_range: {
        start: startDateStr,
        end: endDateStr,
      },
      customers: {
        total: liveCustomerCount, // Always use live count
        new_last_30_days: newCustomers,
      },
      jobs: {
        total: liveJobCount, // Always use live count
        new_last_30_days: newJobs,
        jobs_completed_last_30_days: jobsCompleted,
        pipeline_value_pence: livePipelineValue, // Always use live value
        won_value_pence_last_30_days: wonValue,
      },
      communications: {
        emails_sent_last_30_days: emailsSent,
        sms_sent_last_30_days: smsSent,
      },
    }

    return NextResponse.json(overview)
  } catch (error) {
    console.error("[Analytics API] Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
