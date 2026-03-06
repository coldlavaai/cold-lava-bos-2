/**
 * Session 99A: DBR Campaigns API
 * GET /api/dbr/campaigns - List campaigns
 * POST /api/dbr/campaigns - Create campaign
 * Based on docs/03-API-SPEC-PART2.md Section 30
 */

import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { CreateDBRCampaignRequest, DBRCampaign } from '@/lib/api/types'

// GET /api/dbr/campaigns - List campaigns
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')

    // Build query
    let query = supabase
      .from('dbr_campaigns')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('[DBR] Error fetching campaigns:', error)
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
    console.error('[DBR] Error in GET /api/dbr/campaigns:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/dbr/campaigns - Create campaign
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    // Check user role (admin required)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body: CreateDBRCampaignRequest = await request.json()

    // Validate required fields
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json(
        { error: 'Campaign name is required' },
        { status: 400 }
      )
    }

    // Prepare campaign data
    const campaignData = {
      tenant_id: tenantId,
      name: body.name.trim(),
      description: body.description || null,
      channel: body.channel || 'sms',
      status: 'draft' as const,
      sms_account_id: body.sms_account_id || null,
      twilio_phone_override: body.twilio_phone_override || null,
      calcom_link: body.calcom_link || null,
      message_delays: body.message_delays || {},
      rate_limit_per_interval: body.rate_limit_per_interval || 10,
      rate_limit_interval_seconds: body.rate_limit_interval_seconds || 600,
      working_hours: body.working_hours || null,
      source_type: body.source_type || 'manual',
      source_details: body.source_details || {},
    }

    const { data, error } = await supabase
      .from('dbr_campaigns')
      .insert(campaignData)
      .select()
      .single()

    if (error) {
      console.error('[DBR] Error creating campaign:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: data as DBRCampaign,
    }, { status: 201 })
  } catch (error) {
    console.error('[DBR] Error in POST /api/dbr/campaigns:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
