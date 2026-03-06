import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ equipmentId: string }>
}

/**
 * POST /api/equipment/preferences/[equipmentId]/favourite
 * Toggle favourite status for equipment
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    const { equipmentId } = await params

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 })
    }

    const body = await request.json()
    const { is_favourite } = body

    // Upsert the preference
    const { data, error } = await supabase
      .from('tenant_equipment_preferences')
      .upsert(
        {
          tenant_id: tenantId,
          equipment_id: equipmentId,
          is_favourite: is_favourite,
        },
        {
          onConflict: 'tenant_id,equipment_id',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single()

    if (error) {
      console.error('[/api/equipment/preferences/favourite] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[/api/equipment/preferences/favourite] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
