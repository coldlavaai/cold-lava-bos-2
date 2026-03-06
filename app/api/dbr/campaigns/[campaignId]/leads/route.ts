/**
 * Session 99A: DBR Leads API
 * GET /api/dbr/campaigns/[campaignId]/leads - List leads for a campaign
 * Based on docs/03-API-SPEC-PART2.md Section 30.4
 */

import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
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

    // Verify campaign exists and belongs to tenant
    const { data: campaign, error: campaignError } = await supabase
      .from('dbr_campaigns')
      .select('id')
      .eq('id', campaignId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const messageStage = searchParams.get('message_stage')
    const contactStatus = searchParams.get('contact_status')
    const hasReplied = searchParams.get('has_replied')
    const manualMode = searchParams.get('manual_mode')
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortDir = searchParams.get('sortDir') || 'desc'

    // Build query
    let query = supabase
      .from('dbr_campaign_customers')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('campaign_id', campaignId)
      .is('deleted_at', null)

    // Apply filters
    if (messageStage) {
      query = query.eq('message_stage', messageStage)
    }

    if (contactStatus) {
      query = query.eq('contact_status', contactStatus)
    }

    if (hasReplied === 'true') {
      query = query.not('first_reply_at', 'is', null)
    } else if (hasReplied === 'false') {
      query = query.is('first_reply_at', null)
    }

    if (manualMode === 'true') {
      query = query.eq('manual_mode', true)
    } else if (manualMode === 'false') {
      query = query.eq('manual_mode', false)
    }

    // Apply sorting
    const ascending = sortDir === 'asc'
    query = query.order(sortBy, { ascending })

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('[DBR] Error fetching leads:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: data || [],
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
    console.error('[DBR] Error in GET /api/dbr/campaigns/:campaignId/leads:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
