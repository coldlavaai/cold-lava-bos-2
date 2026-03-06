import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/export/customers - Export customers in JSON or CSV format
 * Session 62 - Phase API-2
 *
 * Query parameters:
 * - format: 'json' (default) | 'csv'
 * - search: Optional search filter
 */

type CustomerExportRow = {
  name?: string
  email?: string
  phone?: string | null
  address_line_1?: string | null
  address_line_2?: string | null
  city?: string | null
  postcode?: string | null
  notes?: string | null
}

// Helper to convert customers to CSV
function convertToCSV(customers: CustomerExportRow[]): string {
  if (customers.length === 0) {
    return 'name,email,phone,address_line_1,address_line_2,city,postcode,notes\n'
  }

  // CSV headers
  const headers = ['name', 'email', 'phone', 'address_line_1', 'address_line_2', 'city', 'postcode', 'notes'] as const
  const csvRows = [headers.join(',')]

  // CSV data rows
  for (const customer of customers) {
    const row = headers.map(field => {
      const value = customer[field as keyof CustomerExportRow] || ''
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

    console.log('[GET /api/export/customers] Request received', { tenantId })

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'
    const search = searchParams.get('search')

    // Build query - fetch all customers (no pagination for export)
    let query = supabase
      .from('customers')
      .select('id, name, email, phone, address_line_1, address_line_2, city, postcode, notes, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    // Apply search filter if provided
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching customers for export:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log('[GET /api/export/customers] Fetched customers', {
      count: data?.length || 0,
      format,
    })

    // Return based on format
    if (format === 'csv') {
      const csv = convertToCSV(data || [])
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="customers-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    // Default: JSON format
    return NextResponse.json({
      data: data || [],
      meta: {
        total: data?.length || 0,
        exportedAt: new Date().toISOString(),
      },
    })

  } catch (error) {
    console.error('Error in GET /api/export/customers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
