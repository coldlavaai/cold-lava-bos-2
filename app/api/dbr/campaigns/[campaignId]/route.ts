/**
 * Session 99C: DBR Campaign Update API
 * PATCH /api/dbr/campaigns/[campaignId] - Update campaign (primarily for status control)
 */

import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

interface UpdateCampaignRequest {
  status?: 'draft' | 'running' | 'paused' | 'completed' | 'archived'
  name?: string
  description?: string | null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { campaignId } = await params
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    const body: UpdateCampaignRequest = await request.json()

    // Verify campaign exists and belongs to tenant
    const { data: campaign, error: fetchError } = await supabase
      .from('dbr_campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single()

    if (fetchError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {}

    if (body.status !== undefined) {
      updateData.status = body.status

      // Update last_run_at when starting
      if (body.status === 'running') {
        updateData.last_run_at = new Date().toISOString()
      }
    }

    if (body.name !== undefined) {
      updateData.name = body.name
    }

    if (body.description !== undefined) {
      updateData.description = body.description
    }

    // Perform update
    const { data, error } = await supabase
      .from('dbr_campaigns')
      .update(updateData)
      .eq('id', campaignId)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      console.error('[DBR] Error updating campaign:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[DBR] Error in PATCH /api/dbr/campaigns/:id:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
