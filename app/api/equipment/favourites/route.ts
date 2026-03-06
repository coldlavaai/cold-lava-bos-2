import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/equipment/favourites
 * Get tenant's favourite equipment
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    // Get favourite equipment IDs for this tenant
    const { data: prefs, error: prefsError } = await supabase
      .from('tenant_equipment_preferences')
      .select('equipment_id')
      .eq('tenant_id', tenantId)
      .eq('is_favourite', true)

    if (prefsError) {
      console.error('[/api/equipment/favourites] Error fetching preferences:', prefsError)
      return NextResponse.json({ error: prefsError.message }, { status: 500 })
    }

    if (!prefs || prefs.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const equipmentIds = prefs.map(p => p.equipment_id)

    // Get the actual equipment with specs
    let equipmentQuery = supabase
      .from('equipment_catalogue')
      .select(`
        *,
        panel_specs(*),
        inverter_specs(*),
        battery_specs(*),
        mounting_specs(*),
        ev_charger_specs(*)
      `)
      .in('id', equipmentIds)
      .eq('is_active', true)

    if (category) {
      equipmentQuery = equipmentQuery.eq('category', category)
    }

    const { data, error } = await equipmentQuery

    if (error) {
      console.error('[/api/equipment/favourites] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[/api/equipment/favourites] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
