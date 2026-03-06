import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/appointments - List appointments with filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const from = searchParams.get('from') // Date range start
    const to = searchParams.get('to') // Date range end
    const assigned_to = searchParams.get('assigned_to')
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const job_id = searchParams.get('job_id')
    const customer_id = searchParams.get('customer_id')

    // Build query
    let query = supabase
      .from('appointments')
      .select(`
        *,
        type:appointment_types(id, name, duration_minutes, color),
        job:jobs(id, job_number, customer_id),
        customer:customers(id, name, email, phone),
        assignee:users!appointments_assigned_to_fkey(id, name, email),
        creator:users!appointments_created_by_fkey(id, name, email)
      `, { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('start_time', { ascending: true })

    // Apply filters
    if (from) {
      query = query.gte('start_time', from)
    }

    if (to) {
      query = query.lte('start_time', to)
    }

    if (assigned_to) {
      query = query.eq('assigned_to', assigned_to)
    }

    if (type) {
      query = query.eq('type_id', type)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (job_id) {
      query = query.eq('job_id', job_id)
    }

    if (customer_id) {
      query = query.eq('customer_id', customer_id)
    }

    // Apply pagination
    const rangeFrom = (page - 1) * limit
    const rangeTo = rangeFrom + limit - 1
    query = query.range(rangeFrom, rangeTo)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching appointments:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // Normalize type field and description for frontend consumption
    const normalized = (data || []).map((row) => ({
      ...row,
      appointment_type: row.type?.name ?? null,  // Flatten type object to string
      description: row.notes ?? row.description ?? null,  // Normalize notes -> description
    }))

    return NextResponse.json({
      data: normalized,
      meta: {
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      },
    })
  } catch (error) {
    console.error('Error in GET /api/appointments:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/appointments - Create new appointment
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    const userId = headersList.get('x-user-id')

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Validate required fields
    if (!body.title || !body.start_time || !body.end_time) {
      return NextResponse.json(
        { error: 'Missing required fields: title, start_time, end_time' },
        { status: 400 }
      )
    }

    // Resolve appointment type → type_id if provided as a label
    // Frontend sends `appointment_type` matching appointment_types.name
    let resolvedTypeId: string | null = body.type_id || null

    if (!resolvedTypeId && body.appointment_type) {
      const { data: typeRow, error: typeError } = await supabase
        .from('appointment_types')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .eq('name', body.appointment_type)
        .maybeSingle()

      if (typeError) {
        console.error('Error looking up appointment type:', typeError)
      }

      if (typeRow) {
        resolvedTypeId = typeRow.id as string
      }
    }

    // Create appointment (base row)
    const { data: inserted, error: insertError } = await supabase
      .from('appointments')
      .insert({
        tenant_id: tenantId,
        title: body.title,
        type_id: resolvedTypeId,
        start_time: body.start_time,
        end_time: body.end_time,
        location: body.location || null,
        job_id: body.job_id || null,
        customer_id: body.customer_id || null,
        assigned_to: body.assigned_to || null,
        notes: body.notes || null,
        status: 'scheduled',
        created_by: userId,
      })
      .select('id')
      .single()

    if (insertError || !inserted) {
      console.error('Error creating appointment:', insertError)
      return NextResponse.json(
        { error: insertError?.message || 'Failed to create appointment' },
        { status: 500 }
      )
    }

    // Re-fetch with the same shape as GET /api/appointments so the
    // response includes normalized appointment_type and expanded fields.
    const { data: fullRow, error: fetchError } = await supabase
      .from('appointments')
      .select(`
        *,
        type:appointment_types(id, name, duration_minutes, color),
        job:jobs(id, job_number, customer_id),
        customer:customers(id, name, email, phone),
        assignee:users!appointments_assigned_to_fkey(id, name, email),
        creator:users!appointments_created_by_fkey(id, name, email)
      `)
      .eq('id', inserted.id)
      .eq('tenant_id', tenantId)
      .single()

    if (fetchError || !fullRow) {
      console.error('Error fetching appointment after insert:', fetchError)
      // Fall back to a minimal response if the enriched fetch fails
      return NextResponse.json({ data: { id: inserted.id, title: body.title } }, { status: 201 })
    }

    const normalized = {
      ...fullRow,
      appointment_type: fullRow.type?.name ?? null,
      description: fullRow.notes ?? fullRow.description ?? null,
    }

    return NextResponse.json({ data: normalized }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/appointments:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
