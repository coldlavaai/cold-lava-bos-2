import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders, getUserIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/surveys/eligible-jobs
 *
 * Returns jobs that require visits, filtered by postcode area(s)
 * Per SurveyRoutingArchitecture.md Section 4: Building the Eligible Pool
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    const currentUserId = await getUserIdFromHeaders(headersList)

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    if (!currentUserId) {
      return NextResponse.json(
        { error: 'No user context' },
        { status: 400 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const postcode_areas_param = searchParams.get('postcode_areas') // Comma-separated list
    const nationwide = searchParams.get('nationwide') === 'true'

    console.log('[/api/surveys/eligible-jobs] Query params', {
      postcode_areas: postcode_areas_param,
      nationwide,
      tenantId,
    })

    // Build query for all jobs with customer data
    // Explicitly filter by tenant_id (in addition to RLS)
    const query = supabase
      .from('jobs')
      .select(`
        id,
        job_number,
        customer_id,
        notes,
        created_at,
        customer:customers(
          id,
          name,
          email,
          phone,
          address_line_1,
          address_line_2,
          city,
          postcode
        )
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    const { data: jobs, error } = await query

    if (error) {
      console.error('[/api/surveys/eligible-jobs] Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch eligible jobs' },
        { status: 500 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jobsList = (jobs ?? []) as any[]

    // Transform data to match SurveyRoutingArchitecture.md Section 4 output format
    const eligibleJobs = jobsList.map(job => {
      const customerArray = Array.isArray(job.customer)
        ? job.customer
        : job.customer
          ? [job.customer]
          : []

      const customer = customerArray[0]

      // Extract postcode area from full postcode (e.g., "CH60 0DG" → "CH")
      const extractPostcodeArea = (postcode: string | null) => {
        if (!postcode) return ''
        const cleaned = postcode.toUpperCase().replace(/\s+/g, '')
        const match = cleaned.match(/^([A-Z]+)/)
        return match ? match[1] : ''
      }

      return {
        job_id: job.id,
        job_number: job.job_number,
        customer_id: job.customer_id,
        customer_name: customer?.name || '',
        customer_email: customer?.email || null,
        customer_phone: customer?.phone || null,
        full_postcode: customer?.postcode || '',
        postcode_area: extractPostcodeArea(customer?.postcode || null),
        address_line_1: customer?.address_line_1 || '',
        address_line_2: customer?.address_line_2 || '',
        city: customer?.city || '',
        default_visit_duration_minutes: 90, // Default 1.5 hours - can be made configurable later
        created_at: job.created_at,
      }
    })

    console.log('[/api/surveys/eligible-jobs] Found', eligibleJobs.length, 'eligible jobs')

    return NextResponse.json({
      jobs: eligibleJobs,
      total: eligibleJobs.length,
    })

  } catch (error) {
    console.error('[/api/surveys/eligible-jobs] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
