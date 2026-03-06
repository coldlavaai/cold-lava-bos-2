import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { BulkImportJobsSchema } from '@/lib/api/validation'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ZodError } from 'zod'

/**
 * POST /api/import/jobs - Bulk import jobs
 * Session 62 - Phase API-2
 *
 * Accepts an array of jobs and creates them.
 * Returns a summary with successes, errors, and statistics.
 */

// Helper to generate job number using database function
async function generateJobNumber(supabase: SupabaseClient, tenantId: string): Promise<string> {
  const { data, error } = await supabase.rpc('generate_job_number', {
    p_tenant_id: tenantId
  })

  if (error) {
    throw new Error(`Failed to generate job number: ${error.message}`)
  }

  return data
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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    console.log('[POST /api/import/jobs] Request received', { tenantId })

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
      validatedData = BulkImportJobsSchema.parse(rawBody)
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

    console.log('[POST /api/import/jobs] Processing jobs', {
      count: validatedData.jobs.length,
    })

    // Get default stage ID once for efficiency
    const defaultStageId = await getDefaultJobStageId(supabase, tenantId)

    // Process each job
    const results = {
      total: validatedData.jobs.length,
      created: 0,
      errors: [] as Array<{ row: number; customer_id: string; error: string }>,
    }

    for (let i = 0; i < validatedData.jobs.length; i++) {
      const jobData = validatedData.jobs[i]
      try {
        // Verify customer exists and belongs to tenant
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .select('id')
          .eq('id', jobData.customer_id)
          .eq('tenant_id', tenantId)
          .maybeSingle()

        if (customerError || !customer) {
          throw new Error(`Customer not found or does not belong to this tenant`)
        }

        // Get stage ID (use provided or default)
        const stageId = jobData.current_stage_id || defaultStageId

        if (!stageId) {
          throw new Error('No stage ID provided and no default stage found')
        }

        // Generate job number
        const jobNumber = await generateJobNumber(supabase, tenantId)

        // Build metadata object for OpenSolar integration (Session 64 - Phase 1)
        const metadata: Record<string, unknown> = {}
        if (jobData.opensolar_project_id || jobData.opensolar_project_url) {
          metadata.opensolar = {
            project_id: jobData.opensolar_project_id || null,
            project_url: jobData.opensolar_project_url || null,
          }
        }

        // Create job
        const { error: insertError } = await supabase
          .from('jobs')
          .insert({
            tenant_id: tenantId,
            job_number: jobNumber,
            customer_id: jobData.customer_id,
            current_stage_id: stageId,
            assigned_to: jobData.assigned_to || null,
            estimated_value: jobData.estimated_value || null,
            system_size_kwp: jobData.system_size_kwp || null,
            source: jobData.source || 'api',
            tags: jobData.tags || [],
            notes: jobData.notes || null,
            // Compliance fields
            site_supply_type: jobData.site_supply_type || null,
            export_capacity_kw: jobData.export_capacity_kw || null,
            dno_required: jobData.dno_required || null,
            dno_reference: jobData.dno_reference || null,
            installer_name: jobData.installer_name || null,
            installer_mcs_number: jobData.installer_mcs_number || null,
            inverter_model: jobData.inverter_model || null,
            panel_model: jobData.panel_model || null,
            mounting_system: jobData.mounting_system || null,
            // OpenSolar integration metadata (Session 64 - Phase 1)
            metadata: Object.keys(metadata).length > 0 ? metadata : null,
          })

        if (insertError) {
          throw new Error(`Failed to create job: ${insertError.message}`)
        }

        results.created++
      } catch (error) {
        console.error(`Error processing job at row ${i}:`, error)
        results.errors.push({
          row: i + 1,
          customer_id: jobData.customer_id,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    console.log('[POST /api/import/jobs] Import completed', results)

    return NextResponse.json({
      success: results.errors.length === 0,
      data: results,
      message: `Import completed: ${results.created} created, ${results.errors.length} errors`,
    }, { status: 200 })

  } catch (error) {
    console.error('Error in POST /api/import/jobs:', error)

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
