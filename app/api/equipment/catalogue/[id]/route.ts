import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/equipment/catalogue/[id]
 * Get a single equipment item with full specs
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const { data, error } = await supabase
      .from('equipment_catalogue')
      .select(`
        *,
        manufacturer:manufacturers(*),
        panel_specs(*),
        inverter_specs(*),
        battery_specs(*),
        mounting_specs(*),
        ev_charger_specs(*)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
      }
      console.error('[/api/equipment/catalogue/[id]] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[/api/equipment/catalogue/[id]] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
