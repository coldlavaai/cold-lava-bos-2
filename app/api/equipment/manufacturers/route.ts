import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/equipment/manufacturers
 * List all manufacturers (platform-level, no tenant filter)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { searchParams } = new URL(request.url)
    const categories = searchParams.get('categories')?.split(',').filter(Boolean)
    const featuredOnly = searchParams.get('featured') === 'true'

    let query = supabase
      .from('manufacturers')
      .select('*')
      .eq('is_active', true)
      .order('is_featured', { ascending: false })
      .order('display_name', { ascending: true })

    if (categories && categories.length > 0) {
      query = query.overlaps('categories', categories)
    }

    if (featuredOnly) {
      query = query.eq('is_featured', true)
    }

    const { data, error } = await query

    if (error) {
      console.error('[/api/equipment/manufacturers] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[/api/equipment/manufacturers] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
