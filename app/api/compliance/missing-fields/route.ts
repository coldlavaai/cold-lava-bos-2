import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/compliance/missing-fields - Get jobs with missing compliance fields
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    console.log('[/api/compliance/missing-fields] Request received', { tenantId })

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    // Query the jobs_missing_compliance_fields view (Session 58)
    const { data, error } = await supabase
      .from('jobs_missing_compliance_fields')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('compliance_status', { ascending: true }) // not_started > in_progress > dno_pending
      .order('missing_critical_count', { ascending: false }) // most missing first

    console.log('[/api/compliance/missing-fields] Query result', {
      count: data?.length || 0,
      hasError: !!error,
      errorMessage: error?.message,
    })

    if (error) {
      // If view doesn't exist yet (migration not applied), return 404
      if (error.code === '42P01') {
        console.info('[/api/compliance/missing-fields] View does not exist - migration pending')
        return NextResponse.json(
          { error: 'Compliance missing fields view not available. Migration pending.' },
          { status: 404 }
        )
      }

      console.error('Error fetching missing compliance fields:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // Return empty array if no incomplete jobs
    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Error in GET /api/compliance/missing-fields:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
