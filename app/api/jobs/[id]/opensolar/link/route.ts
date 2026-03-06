import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { openSolarClient, type OpenSolarProposal } from '@/lib/opensolar/client'
import type { OpenSolarProjectSummary } from '@/lib/api/types'

/**
 * POST /api/jobs/:id/opensolar/link
 *
 * Links an existing OpenSolar project to a BOS job.
 * Validates that the project exists before linking.
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

    // Parse request body
    const body = await request.json()
    const { project_id, project_url } = body

    if (!project_id) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      )
    }

    // Fetch job
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

    // Validate that OpenSolar project exists
    try {
      const projectExists = await openSolarClient.projectExists(project_id)

      if (!projectExists) {
        return NextResponse.json(
          { error: 'OpenSolar project not found' },
          { status: 404 }
        )
      }

      // Fetch project details
      const openSolarProject = await openSolarClient.getProject(project_id)

      // Update job metadata
      const metadata = job.metadata as Record<string, unknown> | null
      const updatedMetadata = {
        ...metadata,
        opensolar: {
          project_id,
          project_url: project_url || `https://app.opensolar.com/projects/${project_id}`,
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

      // Fetch proposals
      let proposals: OpenSolarProposal[] = []
      try {
        proposals = await openSolarClient.getProposalsForProject(project_id)
      } catch (error) {
        console.warn('Failed to fetch proposals:', error)
      }

      const primaryProposal = proposals.find(p => p.status === 'sent' || p.status === 'active') || proposals[0]

      // Return normalized summary
      const summary: OpenSolarProjectSummary = {
        project_id: openSolarProject.id,
        project_name: openSolarProject.name,
        status: openSolarProject.status,
        system_size_kwp: openSolarProject.system_size_kw,
        total_price: openSolarProject.total_price || primaryProposal?.total_price,
        currency: openSolarProject.currency || primaryProposal?.currency || 'GBP',
        last_updated_at: openSolarProject.updated_at,
        primary_proposal_url: primaryProposal?.proposal_url || updatedMetadata.opensolar.project_url,
        primary_proposal_pdf_url: primaryProposal?.pdf_url,
      }

      return NextResponse.json({ data: summary })
    } catch (error) {
      console.error('OpenSolar API error:', error)
      return NextResponse.json(
        { error: 'Failed to validate or fetch OpenSolar project' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in /api/jobs/:id/opensolar/link:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
