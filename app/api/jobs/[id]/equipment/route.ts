import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders, getUserIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/jobs/[id]/equipment
 * List all equipment assigned to a job
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    const { id: jobId } = await params

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('job_equipment_assignments')
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
      .eq('tenant_id', tenantId)
      .eq('job_id', jobId)
      .is('deleted_at', null)
      .order('category')
      .order('created_at')

    if (error) {
      console.error('[/api/jobs/[id]/equipment] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[/api/jobs/[id]/equipment] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/jobs/[id]/equipment
 * Add equipment to a job
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    const userId = await getUserIdFromHeaders(headersList)
    const { id: jobId } = await params

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 })
    }

    const body = await request.json()
    const {
      equipment_catalogue_id,
      custom_manufacturer,
      custom_model,
      custom_category,
      custom_specifications,
      quantity = 1,
      location,
      unit_cost_pence,
      unit_price_pence,
      internal_notes,
    } = body

    // If using catalogue equipment, fetch the details
    let manufacturer_name: string
    let model_name: string
    let category: string

    if (equipment_catalogue_id) {
      const { data: equipment, error: eqError } = await supabase
        .from('equipment_catalogue')
        .select('manufacturer_name, model, model_variant, category')
        .eq('id', equipment_catalogue_id)
        .single()

      if (eqError || !equipment) {
        return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
      }

      manufacturer_name = equipment.manufacturer_name
      model_name = equipment.model_variant 
        ? `${equipment.model} ${equipment.model_variant}` 
        : equipment.model
      category = equipment.category
    } else if (custom_manufacturer && custom_model && custom_category) {
      manufacturer_name = custom_manufacturer
      model_name = custom_model
      category = custom_category
    } else {
      return NextResponse.json(
        { error: 'Either equipment_catalogue_id or custom equipment details required' },
        { status: 400 }
      )
    }

    // Insert the assignment
    const { data, error } = await supabase
      .from('job_equipment_assignments')
      .insert({
        tenant_id: tenantId,
        job_id: jobId,
        equipment_catalogue_id,
        custom_manufacturer,
        custom_model,
        custom_category,
        custom_specifications,
        manufacturer_name,
        model_name,
        category,
        quantity,
        location,
        unit_cost_pence,
        unit_price_pence,
        internal_notes,
        status: 'planned',
        created_by: userId,
        updated_by: userId,
      })
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
      console.error('[/api/jobs/[id]/equipment] POST Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('[/api/jobs/[id]/equipment] POST Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
