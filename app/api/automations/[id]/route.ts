import { createAdminClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/automations/:id - Get single automation
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createAdminClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    const { id } = await params

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('automations')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Automation not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching automation:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in GET /api/automations/:id:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/automations/:id - Update automation
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createAdminClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    const { id } = await params

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    const body = await request.json()

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (body.name !== undefined) updates.name = body.name
    if (body.description !== undefined) updates.description = body.description
    if (body.is_active !== undefined) updates.is_active = body.is_active
    if (body.trigger_module !== undefined) updates.trigger_module = body.trigger_module
    if (body.trigger_event !== undefined) updates.trigger_event = body.trigger_event
    if (body.trigger_conditions !== undefined) updates.trigger_conditions = body.trigger_conditions
    if (body.actions !== undefined) updates.actions = body.actions
    if (body.schedule_type !== undefined) updates.schedule_type = body.schedule_type
    if (body.schedule_config !== undefined) updates.schedule_config = body.schedule_config

    const { data, error } = await supabase
      .from('automations')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Automation not found' },
          { status: 404 }
        )
      }
      console.error('Error updating automation:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in PUT /api/automations/:id:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/automations/:id - Delete automation
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createAdminClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    const { id } = await params

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('automations')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      console.error('Error deleting automation:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error in DELETE /api/automations/:id:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
