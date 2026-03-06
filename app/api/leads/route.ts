import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { CreateLeadSchema } from '@/lib/api/validation'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ZodError } from 'zod'
import { triggerWebhooks } from '@/lib/webhooks/webhook'

/**
 * POST /api/leads - External API endpoint for lead ingestion
 * Session 61 - Phase API-1
 *
 * Upserts a customer by email and creates a new job in the "New Lead" stage.
 * This endpoint is designed for external integrations (webhooks, imports, etc.)
 */

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

// Helper to get "New Lead" stage ID for tenant
async function getLeadStageId(supabase: SupabaseClient, tenantId: string): Promise<string> {
  const { data, error } = await supabase
    .from('job_stages')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('stage_type', 'lead')
    .order('position', { ascending: true })
    .limit(1)
    .single()

  if (error || !data) {
    console.error('Error fetching lead stage:', error)
    throw new Error('No lead stage found for tenant. Please ensure job stages are configured.')
  }

  return data.id
}

// Helper to upsert customer by email
async function upsertCustomer(
  supabase: SupabaseClient,
  tenantId: string,
  customerData: {
    name: string
    email: string
    phone?: string | null
    address_line_1?: string | null
    address_line_2?: string | null
    city?: string | null
    postcode?: string | null
    notes?: string | null
  },
  userId: string | null
): Promise<string> {
  // First, try to find existing customer by email
  const { data: existingCustomer, error: findError } = await supabase
    .from('customers')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('email', customerData.email)
    .maybeSingle()

  if (findError) {
    console.error('Error finding customer:', findError)
    throw new Error('Failed to check for existing customer')
  }

  // If customer exists, update and return ID
  if (existingCustomer) {
    const { error: updateError } = await supabase
      .from('customers')
      .update({
        name: customerData.name,
        phone: customerData.phone,
        address_line_1: customerData.address_line_1,
        address_line_2: customerData.address_line_2,
        city: customerData.city,
        postcode: customerData.postcode,
        notes: customerData.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingCustomer.id)

    if (updateError) {
      console.error('Error updating customer:', updateError)
      throw new Error('Failed to update existing customer')
    }

    return existingCustomer.id
  }

  // Otherwise, create new customer
  const { data: newCustomer, error: insertError } = await supabase
    .from('customers')
    .insert({
      tenant_id: tenantId,
      name: customerData.name,
      email: customerData.email,
      phone: customerData.phone,
      address_line_1: customerData.address_line_1,
      address_line_2: customerData.address_line_2,
      city: customerData.city,
      postcode: customerData.postcode,
      notes: customerData.notes,
      created_by: userId,
    })
    .select('id')
    .single()

  if (insertError || !newCustomer) {
    console.error('Error creating customer:', insertError)
    throw new Error('Failed to create new customer')
  }

  return newCustomer.id
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    // Get user ID (may be null for API key auth in future)
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || headersList.get('x-user-id')

    console.log('[POST /api/leads] Request received', {
      tenantId,
      userId,
      hasAuth: !!user,
    })

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
      validatedData = CreateLeadSchema.parse(rawBody)
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

    // 1. Upsert customer by email
    const customerId = await upsertCustomer(
      supabase,
      tenantId,
      validatedData.customer,
      userId
    )

    // 2. Get lead stage ID
    const leadStageId = await getLeadStageId(supabase, tenantId)

    // 3. Generate job number
    const jobNumber = await generateJobNumber(supabase, tenantId)

    // 4. Build metadata object for OpenSolar integration (Session 64 - Phase 1)
    const metadata: Record<string, unknown> = {}
    if (validatedData.opensolar_project_id || validatedData.opensolar_project_url) {
      metadata.opensolar = {
        project_id: validatedData.opensolar_project_id || null,
        project_url: validatedData.opensolar_project_url || null,
      }
    }

    // 5. Create job in lead stage
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        tenant_id: tenantId,
        job_number: jobNumber,
        customer_id: customerId,
        current_stage_id: leadStageId,
        assigned_to: validatedData.assigned_to || null,
        estimated_value: validatedData.estimated_value || null,
        system_size_kwp: validatedData.system_size_kwp || null,
        source: validatedData.source || 'api',
        tags: validatedData.tags || [],
        notes: validatedData.notes || null,
        // OpenSolar integration metadata (Session 64 - Phase 1)
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
      })
      .select(`
        *,
        customer:customers(id, name, email, phone, postcode),
        current_stage:job_stages(id, name, color, stage_type)
      `)
      .single()

    if (jobError || !job) {
      console.error('Error creating job:', jobError)
      return NextResponse.json(
        { error: jobError?.message || 'Failed to create job' },
        { status: 500 }
      )
    }

    console.log('[POST /api/leads] Lead created successfully', {
      jobId: job.id,
      customerId,
      jobNumber,
    })

    // Trigger webhooks (Session 63 - Phase API-3)
    triggerWebhooks(tenantId, 'lead.created', {
      lead_id: job.id,
      job_number: jobNumber,
      customer_id: customerId,
      customer_email: validatedData.customer.email,
      customer_name: validatedData.customer.name,
      estimated_value: validatedData.estimated_value,
      created_at: new Date().toISOString()
    }).catch(err => console.error('[POST /api/leads] Webhook error:', err))

    return NextResponse.json({
      data: {
        job,
        customer_id: customerId,
        upserted: true, // Always true for this endpoint (may have created or updated customer)
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/leads:', error)

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
