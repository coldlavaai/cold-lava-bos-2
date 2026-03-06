/**
 * Session 99A: DBR Lead Update API
 * PATCH /api/dbr/leads/[id] - Update lead
 * Based on docs/03-API-SPEC-PART2.md Section 30.5
 */

import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { UpdateDBRLeadRequest, DBRLead } from '@/lib/api/types'

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
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    const body: UpdateDBRLeadRequest = await request.json()

    // Version is required for optimistic locking
    if (typeof body.version !== 'number') {
      return NextResponse.json(
        { error: 'Version field is required for optimistic locking' },
        { status: 400 }
      )
    }

    // Fetch current lead to verify tenant ownership and version
    const { data: currentLead, error: fetchError } = await supabase
      .from('dbr_campaign_customers')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single()

    if (fetchError || !currentLead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    // Check version for optimistic locking
    if (currentLead.version !== body.version) {
      return NextResponse.json(
        {
          error: 'Version conflict. Lead has been updated by another user.',
          currentVersion: currentLead.version,
        },
        { status: 409 }
      )
    }

    // Prepare update data (only allowed fields)
    const updateData: Partial<DBRLead> = {
      version: body.version + 1, // Increment version
    }

    if (body.contact_status !== undefined) {
      updateData.contact_status = body.contact_status
    }

    if (body.manual_mode !== undefined) {
      updateData.manual_mode = body.manual_mode
    }

    if (body.outcome !== undefined) {
      updateData.outcome = body.outcome
      if (body.outcome !== null) {
        updateData.moved_to_history_at = new Date().toISOString()
      }
    }

    if (body.outcome_reason !== undefined) {
      updateData.outcome_reason = body.outcome_reason
    }

    if (body.outcome_notes !== undefined) {
      updateData.outcome_notes = body.outcome_notes
    }

    if (body.priority_score !== undefined) {
      if (body.priority_score < 0 || body.priority_score > 100) {
        return NextResponse.json(
          { error: 'Priority score must be between 0 and 100' },
          { status: 400 }
        )
      }
      updateData.priority_score = body.priority_score
      updateData.priority_updated_at = new Date().toISOString()
    }

    if (body.call_prep_notes !== undefined) {
      updateData.call_prep_notes = body.call_prep_notes
    }

    // Perform update
    const { data, error } = await supabase
      .from('dbr_campaign_customers')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('version', body.version) // Double-check version in WHERE clause
      .select()
      .single()

    if (error) {
      console.error('[DBR] Error updating lead:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      // Version conflict - another update happened between fetch and update
      return NextResponse.json(
        { error: 'Version conflict. Please refresh and try again.' },
        { status: 409 }
      )
    }

    return NextResponse.json({
      data: data as DBRLead,
    })
  } catch (error) {
    console.error('[DBR] Error in PATCH /api/dbr/leads/:id:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
