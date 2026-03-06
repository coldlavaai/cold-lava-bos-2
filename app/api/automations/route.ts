import { createAdminClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders, getUserIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/automations - List all automations for the tenant
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const triggerModule = searchParams.get('module')
    const active = searchParams.get('active')

    let query = supabase
      .from('automations')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (triggerModule) {
      query = query.eq('trigger_module', triggerModule)
    }

    if (active !== null && active !== undefined && active !== '') {
      query = query.eq('is_active', active === 'true')
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching automations:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: data || [],
      meta: { total: count || 0 },
    })
  } catch (error) {
    console.error('Error in GET /api/automations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/automations - Create a new automation
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    const userId = await getUserIdFromHeaders(headersList)

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Validate required fields
    if (!body.name || !body.trigger_module || !body.trigger_event) {
      return NextResponse.json(
        { error: 'Missing required fields: name, trigger_module, trigger_event' },
        { status: 400 }
      )
    }

    const validModules = ['jobs', 'customers', 'appointments', 'call_recordings']
    if (!validModules.includes(body.trigger_module)) {
      return NextResponse.json(
        { error: `Invalid trigger_module. Must be one of: ${validModules.join(', ')}` },
        { status: 400 }
      )
    }

    const validEvents = ['create', 'update', 'stage_change', 'field_change', 'time_based']
    if (!validEvents.includes(body.trigger_event)) {
      return NextResponse.json(
        { error: `Invalid trigger_event. Must be one of: ${validEvents.join(', ')}` },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('automations')
      .insert({
        tenant_id: tenantId,
        name: body.name,
        description: body.description || null,
        is_active: body.is_active ?? true,
        trigger_module: body.trigger_module,
        trigger_event: body.trigger_event,
        trigger_conditions: body.trigger_conditions || {},
        actions: body.actions || [],
        schedule_type: body.schedule_type || null,
        schedule_config: body.schedule_config || null,
        created_by: userId,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating automation:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/automations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
