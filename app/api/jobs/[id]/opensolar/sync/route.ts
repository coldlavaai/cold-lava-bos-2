import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { openSolarClient, type OpenSolarProposal } from '@/lib/opensolar/client'
import type { OpenSolarProjectSummary } from '@/lib/api/types'

/**
 * PATCH /api/jobs/:id/opensolar/sync
 *
 * Syncs a safe subset of job fields from BOS to OpenSolar.
 * Only updates: name, address, system_size_kw, estimated_price
 */
export async function PATCH(
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

    // Check if OpenSolar project is linked
    const metadata = job.metadata as Record<string, unknown> | null
    const opensolarMeta = metadata?.opensolar as { project_id?: string; project_url?: string } | undefined

    if (!opensolarMeta?.project_id) {
      return NextResponse.json(
        { error: 'No OpenSolar project linked to this job' },
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

    // Update OpenSolar project with safe subset of fields
    try {
      const updatedProject = await openSolarClient.updateProject(
        opensolarMeta.project_id,
        {
          name: `${job.job_number} - ${customer?.name || 'Unnamed Customer'}`,
          address: address || undefined,
          system_size_kw: job.system_size_kwp || undefined,
          estimated_price: job.estimated_value || undefined,
        }
      )

      // Fetch proposals
      let proposals: OpenSolarProposal[] = []
      try {
        proposals = await openSolarClient.getProposalsForProject(opensolarMeta.project_id)
      } catch (error) {
        console.warn('Failed to fetch proposals:', error)
      }

      const primaryProposal = proposals.find(p => p.status === 'sent' || p.status === 'active') || proposals[0]

      // Return normalized summary
      const summary: OpenSolarProjectSummary = {
        project_id: updatedProject.id,
        project_name: updatedProject.name,
        status: updatedProject.status,
        system_size_kwp: updatedProject.system_size_kw,
        total_price: updatedProject.total_price || primaryProposal?.total_price,
        currency: updatedProject.currency || primaryProposal?.currency || 'GBP',
        last_updated_at: updatedProject.updated_at,
        primary_proposal_url: primaryProposal?.proposal_url || opensolarMeta.project_url,
        primary_proposal_pdf_url: primaryProposal?.pdf_url,
      }

      return NextResponse.json({ data: summary })
    } catch (error) {
      console.error('OpenSolar API error:', error)
      return NextResponse.json(
        { error: 'Failed to sync to OpenSolar' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in /api/jobs/:id/opensolar/sync:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
