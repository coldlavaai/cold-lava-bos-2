import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders, getUserIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/call-logs?job_id=...&next_action_date=today
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('job_id')
    const nextActionDate = searchParams.get('next_action_date')
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = supabase
      .from('call_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('call_date', { ascending: false })
      .limit(limit)

    if (jobId) {
      query = query.eq('job_id', jobId)
    }

    if (nextActionDate === 'today') {
      const today = new Date().toISOString().split('T')[0]
      query = query.eq('next_action_date', today)
    } else if (nextActionDate) {
      query = query.eq('next_action_date', nextActionDate)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching call logs:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Error in GET /api/call-logs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/call-logs
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    const userId = await getUserIdFromHeaders(headersList)

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 })
    }

    const body = await request.json()
    const { job_id, call_date, duration_minutes, outcome, notes, next_action_date, next_action_description } = body

    if (!job_id) {
      return NextResponse.json({ error: 'job_id is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('call_logs')
      .insert({
        job_id,
        tenant_id: tenantId,
        call_date: call_date || new Date().toISOString(),
        duration_minutes: duration_minutes || null,
        outcome: outcome || null,
        notes: notes || null,
        next_action_date: next_action_date || null,
        next_action_description: next_action_description || null,
        created_by: userId || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating call log:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/call-logs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
