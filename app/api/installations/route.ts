/**
 * Session 109: Installations API
 * GET /api/installations
 * 
 * List installations as a façade over jobs in installation-related stages.
 * Powers the Installations page without a separate installations table.
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface InstallationSummary {
  id: string
  job_number: string
  customer_id: string
  customer_name: string
  status: 'in_progress' | 'completed'
  current_stage_name: string
  installation_address: string | null
  installation_postcode: string | null
  installation_scheduled_date: string | null
  installation_completed_date: string | null
  system_size_kwp: number | null
  mcs_status: string | null
  dno_status: string | null
  assigned_to_name: string | null
}

interface JobRecord {
  id: string
  job_number: string
  customer_id: string
  installation_address: string | null
  installation_postcode: string | null
  installation_scheduled_date: string | null
  installation_completed_date: string | null
  system_size_kwp: number | null
  mcs_submission_status: string | null
  dno_application_status: string | null
  current_stage_id: string | null
  customers: { name: string }[]
  job_stages: { name: string; stage_type: string }[]
  users: { name: string }[]
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") // 'in_progress' | 'completed'
    const installedAfter = searchParams.get("installed_after")
    const installedBefore = searchParams.get("installed_before")
    const sortField = searchParams.get("sort") || "installation_scheduled_date"
    const sortOrder = searchParams.get("order") || "desc"

    const offset = (page - 1) * limit

    // Build query - join jobs with customers, stages, and users
    let query = supabase
      .from("jobs")
      .select(`
        id,
        job_number,
        customer_id,
        customers!inner(name),
        current_stage_id,
        job_stages!inner(name, stage_type),
        installation_address,
        installation_postcode,
        installation_scheduled_date,
        installation_completed_date,
        system_size_kwp,
        mcs_submission_status,
        dno_application_status,
        assigned_to,
        users:assigned_to(name)
      `, { count: "exact" })

    // Filter to jobs that have installation dates set (scheduled or completed)
    // The inner join on job_stages ensures only jobs with stages are returned
    query = query.or(
      `installation_scheduled_date.not.is.null,installation_completed_date.not.is.null`
    )

    // Status filter
    if (status === "completed") {
      query = query.not("installation_completed_date", "is", null)
    } else if (status === "in_progress") {
      query = query.is("installation_completed_date", null)
        .not("installation_scheduled_date", "is", null)
    }

    // Date range filters
    if (installedAfter) {
      query = query.gte("installation_completed_date", installedAfter)
    }
    if (installedBefore) {
      query = query.lte("installation_completed_date", installedBefore)
    }

    // Search filter
    if (search) {
      query = query.or(
        `job_number.ilike.%${search}%,customers.name.ilike.%${search}%,installation_postcode.ilike.%${search}%`
      )
    }

    // Sorting
    const ascending = sortOrder === "asc"
    query = query.order(sortField, { ascending, nullsFirst: false })

    // Pagination
    query = query.range(offset, offset + limit - 1)

    const { data: jobs, error, count } = await query

    if (error) {
      console.error("[Installations API] Query error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform to InstallationSummary format
    const installations: InstallationSummary[] = (jobs || []).map((job: JobRecord) => ({
      id: job.id,
      job_number: job.job_number,
      customer_id: job.customer_id,
      customer_name: job.customers?.[0]?.name || "Unknown",
      status: job.installation_completed_date ? "completed" : "in_progress",
      current_stage_name: job.job_stages?.[0]?.name || "Unknown",
      installation_address: job.installation_address,
      installation_postcode: job.installation_postcode,
      installation_scheduled_date: job.installation_scheduled_date,
      installation_completed_date: job.installation_completed_date,
      system_size_kwp: job.system_size_kwp,
      mcs_status: job.mcs_submission_status,
      dno_status: job.dno_application_status,
      assigned_to_name: job.users?.[0]?.name || null,
    }))

    return NextResponse.json({
      data: installations,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error("[Installations API] Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
