import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/appointments/:id - Get appointment by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
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
      .from('appointments')
      .select(`
        *,
        type:appointment_types(id, name, duration_minutes, color),
        job:jobs(id, job_number, customer_id),
        customer:customers(id, name, email, phone, address_line_1, city, postcode),
        assignee:users!appointments_assigned_to_fkey(id, name, email),
        creator:users!appointments_created_by_fkey(id, name, email)
      `)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Appointment not found' },
          { status: 404 }
        )
      }

      console.error('Error fetching appointment:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in GET /api/appointments/:id:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/appointments/:id - Update appointment
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
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

    // Build update object
    const updates: Record<string, unknown> = {}

    if (body.title !== undefined) updates.title = body.title
    if (body.type_id !== undefined) updates.type_id = body.type_id
    if (body.start_time !== undefined) updates.start_time = body.start_time
    if (body.end_time !== undefined) updates.end_time = body.end_time
    if (body.location !== undefined) updates.location = body.location
    if (body.job_id !== undefined) updates.job_id = body.job_id
    if (body.customer_id !== undefined) updates.customer_id = body.customer_id
    if (body.assigned_to !== undefined) updates.assigned_to = body.assigned_to
    if (body.notes !== undefined) updates.notes = body.notes
    if (body.status !== undefined) updates.status = body.status

    const { data, error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Appointment not found' },
          { status: 404 }
        )
      }

      console.error('Error updating appointment:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in PATCH /api/appointments/:id:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/appointments/:id - Cancel appointment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    const { id } = await params

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    // Mark as cancelled instead of hard delete
    const { data, error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Appointment not found' },
          { status: 404 }
        )
      }

      console.error('Error cancelling appointment:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Appointment cancelled successfully',
      data
    })
  } catch (error) {
    console.error('Error in DELETE /api/appointments/:id:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
