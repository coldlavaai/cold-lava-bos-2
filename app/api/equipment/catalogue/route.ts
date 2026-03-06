import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/equipment/catalogue
 * List equipment from the platform catalogue with filtering
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const manufacturer_id = searchParams.get('manufacturer_id')
    const search = searchParams.get('search')
    const mcs_certified = searchParams.get('mcs_certified')
    const available_in_uk = searchParams.get('available_in_uk')
    const is_active = searchParams.get('is_active')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query with specs joins
    let query = supabase
      .from('equipment_catalogue')
      .select(`
        *,
        panel_specs(*),
        inverter_specs(*),
        battery_specs(*),
        mounting_specs(*),
        ev_charger_specs(*)
      `, { count: 'exact' })

    // Apply filters
    if (category) {
      query = query.eq('category', category)
    }

    if (manufacturer_id) {
      query = query.eq('manufacturer_id', manufacturer_id)
    }

    if (search) {
      // Use full-text search if available, otherwise ILIKE
      query = query.or(`model.ilike.%${search}%,manufacturer_name.ilike.%${search}%,sku.ilike.%${search}%`)
    }

    if (mcs_certified === 'true') {
      query = query.eq('mcs_certified', true)
    }

    if (available_in_uk !== 'false') {
      query = query.eq('available_in_uk', true)
    }

    if (is_active !== 'false') {
      query = query.eq('is_active', true)
    }

    // Apply pagination
    query = query
      .order('manufacturer_name', { ascending: true })
      .order('model', { ascending: true })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('[/api/equipment/catalogue] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data,
      meta: {
        pagination: {
          total: count || 0,
          limit,
          offset,
          totalPages: count ? Math.ceil(count / limit) : 0,
        }
      }
    })
  } catch (error) {
    console.error('[/api/equipment/catalogue] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
