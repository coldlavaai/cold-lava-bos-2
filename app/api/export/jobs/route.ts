import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/export/jobs - Export jobs in JSON or CSV format
 * Session 62 - Phase API-2
 *
 * Query parameters:
 * - format: 'json' (default) | 'csv'
 * - stage: Optional stage_id filter
 * - search: Optional search filter
 */

type JobExportRow = {
  job_number?: string
  customer?: { email?: string; name?: string; id?: string; phone?: string; postcode?: string } | { email?: string; name?: string; id?: string; phone?: string; postcode?: string }[] | null
  current_stage?: { name?: string; id?: string; stage_type?: string } | { name?: string; id?: string; stage_type?: string }[] | null
  estimated_value?: number | null
  system_size_kwp?: number | null
  source?: string | null
  notes?: string | null
  tags?: string[] | null
  created_at?: string
  id?: string
  site_supply_type?: string | null
  export_capacity_kw?: number | null
  dno_required?: boolean | null
  dno_reference?: string | null
  installer_name?: string | null
  installer_mcs_number?: string | null
  inverter_model?: string | null
  panel_model?: string | null
  mounting_system?: string | null
}

// Helper to convert jobs to CSV
function convertToCSV(jobs: JobExportRow[]): string {
  if (jobs.length === 0) {
    return 'job_number,customer_email,customer_name,stage,estimated_value,source,notes,created_at\n'
  }

  // CSV headers
  const headers = [
    'job_number',
    'customer_email',
    'customer_name',
    'stage',
    'estimated_value',
    'source',
    'notes',
    'created_at'
  ]
  const csvRows = [headers.join(',')]

  // CSV data rows
  for (const job of jobs) {
    // Handle customer and stage which might be arrays or single objects
    const customer = Array.isArray(job.customer) ? job.customer[0] : job.customer
    const stage = Array.isArray(job.current_stage) ? job.current_stage[0] : job.current_stage

    const row = [
      job.job_number || '',
      customer?.email || '',
      customer?.name || '',
      stage?.name || '',
      job.estimated_value || '',
      job.source || '',
      job.notes || '',
      job.created_at || '',
    ].map(value => {
      // Escape quotes and wrap in quotes if contains comma or quote
      const escaped = String(value).replace(/"/g, '""')
      return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')
        ? `"${escaped}"`
        : escaped
    })
    csvRows.push(row.join(','))
  }

  return csvRows.join('\n')
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    console.log('[GET /api/export/jobs] Request received', { tenantId })

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'
    const stage = searchParams.get('stage')
    const search = searchParams.get('search')

    // Build query - fetch all jobs (no pagination for export)
    let query = supabase
      .from('jobs')
      .select(`
        id,
        job_number,
        estimated_value,
        system_size_kwp,
        source,
        notes,
        tags,
        created_at,
        customer:customers(id, name, email, phone, postcode),
        current_stage:job_stages(id, name, stage_type),
        site_supply_type,
        export_capacity_kw,
        dno_required,
        dno_reference,
        installer_name,
        installer_mcs_number,
        inverter_model,
        panel_model,
        mounting_system
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    // Apply filters
    if (stage) {
      query = query.eq('current_stage_id', stage)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching jobs for export:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // Client-side search filter (if needed)
    let filteredData = data || []
    if (search) {
      const searchLower = search.toLowerCase()
      filteredData = filteredData.filter((job) => {
        const matchesJob =
          job.job_number.toLowerCase().includes(searchLower) ||
          (job.notes && job.notes.toLowerCase().includes(searchLower))

        // Handle customer which might be array or single object
        const customer = Array.isArray(job.customer) ? job.customer[0] : job.customer
        const matchesCustomer =
          (customer?.name && customer.name.toLowerCase().includes(searchLower)) ||
          (customer?.email && customer.email.toLowerCase().includes(searchLower))
        return matchesJob || matchesCustomer
      })
    }

    console.log('[GET /api/export/jobs] Fetched jobs', {
      count: filteredData.length,
      format,
    })

    // Return based on format
    if (format === 'csv') {
      const csv = convertToCSV(filteredData)
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="jobs-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    // Default: JSON format
    return NextResponse.json({
      data: filteredData,
      meta: {
        total: filteredData.length,
        exportedAt: new Date().toISOString(),
      },
    })

  } catch (error) {
    console.error('Error in GET /api/export/jobs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
