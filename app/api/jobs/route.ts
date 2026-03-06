import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders, getUserIdFromHeaders, getUserRoleFromHeaders } from '@/lib/supabase/tenant-context'
import { CreateJobSchema } from '@/lib/api/validation'
import { canViewAllJobs } from '@/lib/auth/permissions'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ZodError } from 'zod'
import { triggerWebhooks } from '@/lib/webhooks/webhook'

// Helper to generate job number using database function
async function generateJobNumber(supabase: SupabaseClient, tenantId: string): Promise<string> {
  const { data, error } = await supabase.rpc('generate_job_number', {
    p_tenant_id: tenantId
  })

  if (error) {
    console.error('Error generating job number:', error)
    throw new Error('Failed to generate job number')
  }

  return data
}

// GET /api/jobs - List jobs with pagination and filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    const currentUserId = await getUserIdFromHeaders(headersList)
    const currentUserRole = await getUserRoleFromHeaders(headersList)

    // DEBUG: Log auth and tenant context
    const { data: { user } } = await supabase.auth.getUser()
    console.log('[/api/jobs] DEBUG context', {
      tenantId,
      userId: user?.id,
      currentUserId,
      currentUserRole,
      hasAuth: !!user,
      headerTenantId: headersList.get('x-tenant-id'),
      headerUserId: headersList.get('x-user-id'),
    })

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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search')
    const stage = searchParams.get('stage')
    const stage_ids_param = searchParams.get('stage_ids')
    const requested_assigned_to = searchParams.get('assigned_to')
    const customer_id = searchParams.get('customer_id')
    const pipeline_id = searchParams.get('pipeline_id')
    const compliance_status = searchParams.get('compliance_status')

    // Session 73 - Per-User Pipelines & Permissions
    // Enforce role-based job visibility:
    // - Non-admins can only see their own jobs
    // - Admins can see all jobs or filter by specific user
    const canSeeAllJobs = canViewAllJobs(currentUserRole)
    let assigned_to: string | undefined

    if (!canSeeAllJobs) {
      // Non-admin: force filter to current user only
      assigned_to = currentUserId
      if (requested_assigned_to && requested_assigned_to !== currentUserId) {
        console.log('[/api/jobs] Non-admin user attempting to view other user jobs', {
          currentUserId,
          requested_assigned_to,
        })
      }
    } else {
      // Admin: allow requested filter or no filter (all jobs)
      assigned_to = requested_assigned_to || undefined
    }

    // Parse stage_ids if provided (comma-separated string)
    const stage_ids = stage_ids_param ? stage_ids_param.split(',').filter(Boolean) : undefined

    // Build query
    let query = supabase
      .from('jobs')
      .select(`
        *,
        customer:customers(id, name, email, phone, postcode, city),
        current_stage:job_stages(id, name, color, stage_type),
        assignee:users!jobs_assigned_to_fkey(id, name, email)
      `, { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    // Apply search filter
    // Note: We DON'T apply search at database level because it would exclude jobs
    // that match by customer name (which is in a joined table).
    // Instead, we fetch all jobs and filter client-side below to include
    // matches in job_number, notes, customer name, and customer postcode.

    // Apply stage filters
    // Support both single stage (legacy) and multi-stage filtering
    if (stage_ids && stage_ids.length > 0) {
      query = query.in('current_stage_id', stage_ids)
    } else if (stage) {
      query = query.eq('current_stage_id', stage)
    }

    if (assigned_to) {
      query = query.eq('assigned_to', assigned_to)
    }

    if (customer_id) {
      query = query.eq('customer_id', customer_id)
    }

    // Filter by pipeline
    if (pipeline_id) {
      query = query.eq('pipeline_id', pipeline_id)
    }

    // Apply compliance status filter (Session 60 - Phase 4)
    if (compliance_status) {
      query = query.eq('compliance_status', compliance_status)
    }

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    // DEBUG: Log query result
    console.log('[/api/jobs] DEBUG query result', {
      dataCount: data?.length || 0,
      totalCount: count,
      hasError: !!error,
      error: error ? { message: error.message, code: error.code } : null,
    })

    if (error) {
      console.error('Error fetching jobs:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // Client-side filter by job fields and customer name/postcode if search is provided
    // (since Supabase .or() doesn't work across joined tables)
    let filteredData = data || []
    if (search) {
      const searchLower = search.toLowerCase()
      filteredData = filteredData.filter((job) => {
        const matchesJob =
          job.job_number.toLowerCase().includes(searchLower) ||
          (job.notes && job.notes.toLowerCase().includes(searchLower)) ||
          (job.site_address && job.site_address.toLowerCase().includes(searchLower)) ||
          (job.installation_postcode && job.installation_postcode.toLowerCase().includes(searchLower))
        const matchesCustomer =
          (job.customer?.name && job.customer.name.toLowerCase().includes(searchLower)) ||
          (job.customer?.postcode && job.customer.postcode.toLowerCase().includes(searchLower)) ||
          (job.customer?.city && job.customer.city.toLowerCase().includes(searchLower))
        const matchesTags =
          Array.isArray(job.tags) && job.tags.some((tag: string) => tag.toLowerCase().includes(searchLower))
        return matchesJob || matchesCustomer || matchesTags
      })
    }

    return NextResponse.json({
      data: filteredData,
      meta: {
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      },
    })
  } catch (error) {
    console.error('Error in GET /api/jobs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper to get default in_progress stage ID for tenant
async function getDefaultJobStageId(supabase: SupabaseClient, tenantId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('job_stages')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('stage_type', 'in_progress')
    .order('position', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Error fetching default job stage:', error)
    return null
  }

  return data?.id || null
}

// POST /api/jobs - Create new job
// Session 61 - Phase API-1: Enhanced with typed validation and compliance fields support
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    console.log('[POST /api/jobs] Request received', { tenantId })

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    // Parse and validate request body
    const rawBody = await request.json()

    let validatedData
    try {
      validatedData = CreateJobSchema.parse(rawBody)
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: error.errors.map(e => ({
              path: e.path.join('.'),
              message: e.message,
            }))
          },
          { status: 400 }
        )
      }
      throw error
    }

    // Verify customer exists and belongs to tenant
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('id', validatedData.customer_id)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Customer not found or does not belong to this tenant' },
        { status: 404 }
      )
    }

    // Get stage ID (use provided or default to first in_progress stage)
    let stageId = validatedData.current_stage_id
    if (!stageId) {
      stageId = await getDefaultJobStageId(supabase, tenantId)
    }

    // Auto-generate job number
    const job_number = await generateJobNumber(supabase, tenantId)

    // Build metadata object for OpenSolar integration (Session 64 - Phase 1)
    const metadata: Record<string, unknown> = {}
    if (validatedData.opensolar_project_id || validatedData.opensolar_project_url) {
      metadata.opensolar = {
        project_id: validatedData.opensolar_project_id || null,
        project_url: validatedData.opensolar_project_url || null,
      }
    }

    // Create job with all fields including compliance
    // Note: we include metadata when the column exists, but fall back gracefully
    // if the target database does not yet have the metadata column (for older
    // environments). This avoids hard failures in partially-migrated envs.
    const baseJobInsert: Record<string, unknown> = {
      tenant_id: tenantId,
      job_number,
      customer_id: validatedData.customer_id,
      current_stage_id: stageId,
      assigned_to: validatedData.assigned_to || null,
      estimated_value: validatedData.estimated_value || null,
      system_size_kwp: validatedData.system_size_kwp || null,
      source: validatedData.source || 'api',
      tags: validatedData.tags || [],
      notes: validatedData.notes || null,
      // Compliance fields (Session 61 - Phase API-1)
      site_supply_type: validatedData.site_supply_type || null,
      export_capacity_kw: validatedData.export_capacity_kw || null,
      dno_required: validatedData.dno_required || null,
      dno_reference: validatedData.dno_reference || null,
      installer_name: validatedData.installer_name || null,
      installer_mcs_number: validatedData.installer_mcs_number || null,
      inverter_model: validatedData.inverter_model || null,
      panel_model: validatedData.panel_model || null,
      mounting_system: validatedData.mounting_system || null,
    }

    // Only include metadata when we actually have something to store.
    if (Object.keys(metadata).length > 0) {
      baseJobInsert.metadata = metadata
    }

    let data
    let error

    ;({ data, error } = await supabase
      .from('jobs')
      .insert(baseJobInsert)
      .select(`
        *,
        customer:customers(id, name, email, phone, postcode, city),
        current_stage:job_stages(id, name, color, stage_type),
        assignee:users!jobs_assigned_to_fkey(id, name, email)
      `)
      .single())

    // Backwards-compatibility: if the insert fails because the target database
    // does not have a `metadata` column yet, retry without that field. This
    // allows older environments (e.g. where migrations haven't been applied)
    // to continue working instead of failing all job creation.
    if (
      error &&
      typeof error.message === 'string' &&
      error.message.toLowerCase().includes('metadata') &&
      error.message.toLowerCase().includes('jobs')
    ) {
      console.warn('[POST /api/jobs] Insert failed due to missing metadata column, retrying without metadata', {
        code: error.code,
        message: error.message,
      })

      const { metadata: _omit, ...jobWithoutMetadata } = baseJobInsert

      ;({ data, error } = await supabase
        .from('jobs')
        .insert(jobWithoutMetadata)
        .select(`
          *,
          customer:customers(id, name, email, phone, postcode, city),
          current_stage:job_stages(id, name, color, stage_type),
          assignee:users!jobs_assigned_to_fkey(id, name, email)
        `)
        .single())
    }

    if (error) {
      console.error('Error creating job:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log('[POST /api/jobs] Job created successfully', {
      jobId: data.id,
      jobNumber: data.job_number,
    })

    // Trigger webhooks (Session 63 - Phase API-3)
    triggerWebhooks(tenantId, 'job.created', {
      job_id: data.id,
      job_number: data.job_number,
      customer_id: data.customer_id,
      estimated_value: data.estimated_value,
      system_size_kwp: data.system_size_kwp,
      created_at: new Date().toISOString()
    }).catch(err => console.error('[POST /api/jobs] Webhook error:', err))

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/jobs:', error)

    // Return structured error for known issues
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
