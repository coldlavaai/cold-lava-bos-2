import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

// GET /api/job-stages - List job stages for kanban columns
export async function GET() {
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

    // Get all active job stages ordered by position
    const { data, error } = await supabase
      .from('job_stages')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('position', { ascending: true })

    if (error) {
      console.error('Error fetching job stages:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Error in GET /api/job-stages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
