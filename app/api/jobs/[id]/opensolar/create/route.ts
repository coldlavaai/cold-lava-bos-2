import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { openSolarClient } from '@/lib/opensolar/client'
import type { OpenSolarProjectSummary } from '@/lib/api/types'

/**
 * POST /api/jobs/:id/opensolar/create
 *
 * Creates a new OpenSolar project for a BOS job.
 * Only allowed when job has no existing project_id.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context - check cookies' },
        { status: 400 }
      )
    }

    // Fetch job with customer data
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select(`
        id,
        job_number,
        metadata,
        estimated_value,
        system_size_kwp,
        customer:customers (
          id,
          name,
          email,
          address_line_1,
          address_line_2,
          city,
          postcode
        )
      `)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Check if project already exists
    const metadata = job.metadata as Record<string, unknown> | null
    const opensolarMeta = metadata?.opensolar as { project_id?: string } | undefined

    if (opensolarMeta?.project_id) {
      return NextResponse.json(
        { error: 'Job already has an OpenSolar project linked' },
        { status: 400 }
      )
    }

    // Build address string
    const customer = Array.isArray(job.customer) ? job.customer[0] : job.customer
    const addressParts = [
      customer?.address_line_1,
      customer?.address_line_2,
      customer?.city,
      customer?.postcode,
    ].filter(Boolean)
    const address = addressParts.join(', ')

    // Create project in OpenSolar
    try {
      const openSolarProject = await openSolarClient.createProject({
        name: `${job.job_number} - ${customer?.name || 'Unnamed Customer'}`,
        address: address || undefined,
        customer_name: customer?.name,
        customer_email: customer?.email || undefined,
        system_size_kw: job.system_size_kwp || undefined,
        estimated_price: job.estimated_value || undefined,
      })

      // Update job metadata with new project details
      const updatedMetadata = {
        ...metadata,
        opensolar: {
          project_id: openSolarProject.id,
          project_url: `https://app.opensolar.com/projects/${openSolarProject.id}`,
        },
      }

      const { error: updateError } = await supabase
        .from('jobs')
        .update({ metadata: updatedMetadata })
        .eq('id', id)
        .eq('tenant_id', tenantId)

      if (updateError) {
        console.error('Failed to update job metadata:', updateError)
        return NextResponse.json(
          { error: 'Failed to link OpenSolar project to job' },
          { status: 500 }
        )
      }

      // Return normalized summary
      const summary: OpenSolarProjectSummary = {
        project_id: openSolarProject.id,
        project_name: openSolarProject.name,
        status: openSolarProject.status,
        system_size_kwp: openSolarProject.system_size_kw,
        total_price: openSolarProject.total_price,
        currency: openSolarProject.currency || 'GBP',
        last_updated_at: openSolarProject.updated_at,
        primary_proposal_url: `https://app.opensolar.com/projects/${openSolarProject.id}`,
      }

      return NextResponse.json({ data: summary })
    } catch (error) {
      console.error('OpenSolar API error:', error)
      return NextResponse.json(
        { error: 'Failed to create OpenSolar project' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in /api/jobs/:id/opensolar/create:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
