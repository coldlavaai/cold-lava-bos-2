import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { openSolarClient, type OpenSolarProposal } from '@/lib/opensolar/client'
import type { OpenSolarProjectSummary } from '@/lib/api/types'

/**
 * GET /api/jobs/:id/opensolar
 *
 * Fetches OpenSolar project summary for a job.
 * Returns null if no project_id is linked.
 */
export async function GET(
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

    // Fetch job with tenant isolation
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, metadata')
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
      return NextResponse.json({ data: null })
    }

    // Fetch project from OpenSolar API
    try {
      const project = await openSolarClient.getProject(opensolarMeta.project_id)

      // Fetch proposals if available
      let proposals: OpenSolarProposal[] = []
      try {
        proposals = await openSolarClient.getProposalsForProject(opensolarMeta.project_id)
      } catch (error) {
        console.warn('Failed to fetch proposals, continuing without them:', error)
      }

      // Find primary proposal (first active/sent proposal, or first proposal)
      const primaryProposal = proposals.find(p => p.status === 'sent' || p.status === 'active') || proposals[0]

      // Normalize to BOS-friendly format
      const summary: OpenSolarProjectSummary = {
        project_id: project.id,
        project_name: project.name,
        status: project.status,
        system_size_kwp: project.system_size_kw,
        total_price: project.total_price || primaryProposal?.total_price,
        currency: project.currency || primaryProposal?.currency || 'GBP',
        last_updated_at: project.updated_at,
        primary_proposal_url: primaryProposal?.proposal_url || opensolarMeta.project_url,
        primary_proposal_pdf_url: primaryProposal?.pdf_url,
      }

      return NextResponse.json({ data: summary })
    } catch (error) {
      console.error('OpenSolar API error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch OpenSolar project data' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in /api/jobs/:id/opensolar:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
