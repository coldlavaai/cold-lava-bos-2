import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders, getUserIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string; assignmentId: string }>
}

/**
 * PATCH /api/jobs/[id]/equipment/[assignmentId]
 * Update an equipment assignment
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    const userId = await getUserIdFromHeaders(headersList)
    const { id: jobId, assignmentId } = await params

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 })
    }

    const body = await request.json()
    const allowedFields = [
      'quantity',
      'location',
      'orientation',
      'tilt_degrees',
      'azimuth_degrees',
      'unit_cost_pence',
      'unit_price_pence',
      'margin_percent',
      'string_number',
      'mppt_input',
      'panels_in_string',
      'string_voc_v',
      'string_vmp_v',
      'serial_numbers',
      'status',
      'supplier_code',
      'supplier_order_reference',
      'ordered_at',
      'expected_delivery_date',
      'delivered_at',
      'installed_at',
      'warranty_registered',
      'warranty_registration_date',
      'warranty_registration_reference',
      'warranty_expiry_date',
      'internal_notes',
      'customer_facing_notes',
    ]

    // Filter to allowed fields only
    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field]
      }
    }

    updates.updated_by = userId
    updates.version = supabase.rpc('increment_version') // Optimistic locking

    const { data, error } = await supabase
      .from('job_equipment_assignments')
      .update(updates)
      .eq('id', assignmentId)
      .eq('tenant_id', tenantId)
      .eq('job_id', jobId)
      .is('deleted_at', null)
      .select(`
        *,
        equipment:equipment_catalogue(
          *,
          panel_specs(*),
          inverter_specs(*),
          battery_specs(*),
          mounting_specs(*),
          ev_charger_specs(*)
        )
      `)
      .single()

    if (error) {
      console.error('[/api/jobs/[id]/equipment/[assignmentId]] PATCH Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[/api/jobs/[id]/equipment/[assignmentId]] PATCH Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/jobs/[id]/equipment/[assignmentId]
 * Soft delete an equipment assignment
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    const { id: jobId, assignmentId } = await params

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 })
    }

    // Soft delete
    const { error } = await supabase
      .from('job_equipment_assignments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', assignmentId)
      .eq('tenant_id', tenantId)
      .eq('job_id', jobId)
      .is('deleted_at', null)

    if (error) {
      console.error('[/api/jobs/[id]/equipment/[assignmentId]] DELETE Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('[/api/jobs/[id]/equipment/[assignmentId]] DELETE Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
