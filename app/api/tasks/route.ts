import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/tasks - List tasks with filters
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
    const status = searchParams.get('status') // 'pending' or 'completed'
    const assigned_to = searchParams.get('assigned_to')
    const due_date = searchParams.get('due_date')
    const linked_entity_type = searchParams.get('linked_entity_type')
    const linked_entity_id = searchParams.get('linked_entity_id')
    const view = searchParams.get('view') // 'today', 'week', or 'overdue'

    // Build query
    let query = supabase
      .from('tasks')
      .select(`
        *,
        assignee:users!tasks_assigned_to_fkey(id, name, email),
        creator:users!tasks_created_by_fkey(id, name, email)
      `, { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('due_date', { ascending: true, nullsFirst: false })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }

    if (assigned_to) {
      query = query.eq('assigned_to', assigned_to)
    }

    if (due_date) {
      query = query.eq('due_date', due_date)
    }

    if (linked_entity_type && linked_entity_id) {
      query = query.eq('linked_entity_type', linked_entity_type)
      query = query.eq('linked_entity_id', linked_entity_id)
    }

    // Apply view-based date filters
    if (view) {
      const now = new Date()
      const todayStr = now.toISOString().slice(0, 10) // 'YYYY-MM-DD'

      if (view === 'today') {
        query = query.eq('due_date', todayStr)
      } else if (view === 'overdue') {
        query = query.lt('due_date', todayStr).neq('status', 'completed')
      } else if (view === 'week') {
        const weekFromNow = new Date(now)
        weekFromNow.setDate(now.getDate() + 7)
        const weekStr = weekFromNow.toISOString().slice(0, 10)
        query = query.gte('due_date', todayStr).lte('due_date', weekStr)
      }
    }

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching tasks:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: data || [],
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
    console.error('Error in GET /api/tasks:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/tasks - Create new task
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
    if (!body.title) {
      return NextResponse.json(
        { error: 'Missing required field: title' },
        { status: 400 }
      )
    }

    // Create task
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        tenant_id: tenantId,
        title: body.title,
        description: body.description || null,
        due_date: body.due_date || null,
        due_time: body.due_time || null,
        priority: body.priority || 'medium',
        status: 'pending',
        assigned_to: body.assigned_to || null,
        linked_entity_type: body.linked_entity_type || null,
        linked_entity_id: body.linked_entity_id || null,
        created_by: userId,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating task:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/tasks:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
