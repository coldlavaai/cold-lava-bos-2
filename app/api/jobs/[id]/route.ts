import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders, getUserIdFromHeaders, getUserRoleFromHeaders } from '@/lib/supabase/tenant-context'
import { canViewAllJobs } from '@/lib/auth/permissions'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/jobs/:id - Get job by ID with related data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('[GET /api/jobs/:id] Request received for job:', id)

    const supabase = await createClient()
    console.log('[GET /api/jobs/:id] Supabase client created')

    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    const currentUserId = await getUserIdFromHeaders(headersList)
    const currentUserRole = await getUserRoleFromHeaders(headersList)

    console.log('[GET /api/jobs/:id] Context:', {
      tenantId,
      currentUserId,
      currentUserRole
    })

    if (!tenantId) {
      console.log('[GET /api/jobs/:id] No tenant ID - returning 400')
      return NextResponse.json(
        { error: 'No tenant context - check cookies' },
        { status: 400 }
      )
    }

    if (!currentUserId) {
      return NextResponse.json(
        { error: 'No user context' },
        { status: 400 }
      )
    }

    console.log('[GET /api/jobs/:id] Starting query:', { jobId: id, tenantId })

    // Fetch job data without joins to avoid PostgREST complexity
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    console.log('[GET /api/jobs/:id] Job query result:', {
      jobId: id,
      hasData: !!job,
      hasError: !!jobError,
      errorMessage: jobError?.message
    })

    if (jobError) {
      console.error('[GET /api/jobs/:id] Error fetching job:', {
        jobId: id,
        tenantId,
        error: jobError.message,
        code: jobError.code,
        details: jobError.details,
        hint: jobError.hint
      })
      return NextResponse.json(
        { error: jobError.message || 'Failed to fetch job' },
        { status: 500 }
      )
    }

    if (!job) {
      console.log('[GET /api/jobs/:id] No data found for job')
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Session 73 - Per-User Pipelines & Permissions
    // Non-admins can only view their own jobs
    const canSeeAllJobs = canViewAllJobs(currentUserRole)
    if (!canSeeAllJobs && job.assigned_to !== currentUserId) {
      console.log('[GET /api/jobs/:id] Non-admin user attempting to view job owned by another user', {
        currentUserId,
        jobAssignedTo: job.assigned_to,
      })
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Fetch related data separately to avoid complex joins
    const { data: customer } = await supabase
      .from('customers')
      .select('id, name, email, phone, address_line_1, address_line_2, city, postcode')
      .eq('id', job.customer_id)
      .maybeSingle()

    const { data: currentStage } = await supabase
      .from('job_stages')
      .select('id, name, color, stage_type')
      .eq('id', job.current_stage_id)
      .maybeSingle()

    // Combine the data
    const data = {
      ...job,
      customer,
      current_stage: currentStage
    }

    console.log('[GET /api/jobs/:id] Returning success response with related data')
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in GET /api/jobs/:id:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/jobs/:id - Update job
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    const currentUserId = await getUserIdFromHeaders(headersList)
    const currentUserRole = await getUserRoleFromHeaders(headersList)
    const { id } = await params

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    if (!currentUserId) {
      return NextResponse.json(
        { error: 'No user context' },
        { status: 400 }
      )
    }

    // Session 73 - Check if user has permission to access this job
    const { data: existingJob } = await supabase
      .from('jobs')
      .select('assigned_to')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (!existingJob) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    const canSeeAllJobs = canViewAllJobs(currentUserRole)
    if (!canSeeAllJobs && existingJob.assigned_to !== currentUserId) {
      console.log('[PATCH /api/jobs/:id] Non-admin user attempting to update job owned by another user', {
        currentUserId,
        jobAssignedTo: existingJob.assigned_to,
      })
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    const body = await request.json()

    // Build update object
    const updates: Record<string, unknown> = {}

    if (body.current_stage_id !== undefined) updates.current_stage_id = body.current_stage_id
    if (body.assigned_to !== undefined) updates.assigned_to = body.assigned_to
    if (body.estimated_value !== undefined) updates.estimated_value = body.estimated_value
    if (body.system_size_kwp !== undefined) updates.system_size_kwp = body.system_size_kwp
    if (body.source !== undefined) updates.source = body.source
    if (body.tags !== undefined) updates.tags = body.tags
    if (body.notes !== undefined) updates.notes = body.notes
    if (body.metadata !== undefined) updates.metadata = body.metadata
    // Sales pipeline fields
    if (body.region !== undefined) updates.region = body.region
    if (body.lead_type !== undefined) updates.lead_type = body.lead_type
    if (body.vertical !== undefined) updates.vertical = body.vertical
    if (body.decision_maker_name !== undefined) updates.decision_maker_name = body.decision_maker_name
    if (body.decision_maker_title !== undefined) updates.decision_maker_title = body.decision_maker_title
    if (body.decision_maker_linkedin !== undefined) updates.decision_maker_linkedin = body.decision_maker_linkedin
    if (body.decision_maker_phone !== undefined) updates.decision_maker_phone = body.decision_maker_phone
    if (body.decision_maker_email !== undefined) updates.decision_maker_email = body.decision_maker_email
    if (body.company_employee_count !== undefined) updates.company_employee_count = body.company_employee_count
    if (body.company_revenue !== undefined) updates.company_revenue = body.company_revenue
    if (body.company_locations !== undefined) updates.company_locations = body.company_locations
    if (body.pain_points !== undefined) updates.pain_points = body.pain_points
    if (body.call_brief !== undefined) updates.call_brief = body.call_brief
    if (body.estimated_deal_value !== undefined) updates.estimated_deal_value = body.estimated_deal_value
    if (body.sales_approach !== undefined) updates.sales_approach = body.sales_approach

    // Update job
    const { data, error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        )
      }

      console.error('Error updating job:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in PATCH /api/jobs/:id:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/jobs/:id - Delete job
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    const currentUserId = await getUserIdFromHeaders(headersList)
    const currentUserRole = await getUserRoleFromHeaders(headersList)
    const { id } = await params

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    if (!currentUserId) {
      return NextResponse.json(
        { error: 'No user context' },
        { status: 400 }
      )
    }

    // Session 73 - Check if user has permission to access this job
    const { data: existingJob } = await supabase
      .from('jobs')
      .select('assigned_to')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (!existingJob) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    const canSeeAllJobs = canViewAllJobs(currentUserRole)
    if (!canSeeAllJobs && existingJob.assigned_to !== currentUserId) {
      console.log('[DELETE /api/jobs/:id] Non-admin user attempting to delete job owned by another user', {
        currentUserId,
        jobAssignedTo: existingJob.assigned_to,
      })
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      console.error('Error deleting job:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Job deleted successfully' })
  } catch (error) {
    console.error('Error in DELETE /api/jobs/:id:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
