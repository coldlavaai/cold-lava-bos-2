import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/compliance/dashboard-summary - Get aggregate compliance metrics
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    console.log('[/api/compliance/dashboard-summary] Request received', { tenantId })

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    // Query the compliance_dashboard_summary view (Session 58)
    const { data, error } = await supabase
      .from('compliance_dashboard_summary')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle()

    console.log('[/api/compliance/dashboard-summary] Query result', {
      hasData: !!data,
      hasError: !!error,
      errorMessage: error?.message,
    })

    if (error) {
      // If view doesn't exist yet (migration not applied), return 404
      if (error.code === '42P01') {
        console.info('[/api/compliance/dashboard-summary] View does not exist - migration pending')
        return NextResponse.json(
          { error: 'Compliance dashboard view not available. Migration pending.' },
          { status: 404 }
        )
      }

      console.error('Error fetching compliance dashboard summary:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // If no data (no jobs for tenant), return empty summary
    if (!data) {
      console.log('[/api/compliance/dashboard-summary] No data found, returning empty summary')
      return NextResponse.json({
        data: {
          tenant_id: tenantId,
          total_jobs: 0,
          ready_count: 0,
          in_progress_count: 0,
          not_started_count: 0,
          dno_pending_count: 0,
          ready_percentage: 0,
          started_percentage: 0,
          dno_required_count: 0,
          dno_pending_submission: 0,
          dno_submitted_count: 0,
          avg_critical_fields_filled: 0,
          leads_count: 0,
          active_jobs_count: 0,
          completed_jobs_count: 0,
          cancelled_jobs_count: 0,
          non_lead_ready_count: 0,
          non_lead_total: 0,
          updated_last_week: 0,
          updated_last_month: 0,
        }
      })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in GET /api/compliance/dashboard-summary:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
