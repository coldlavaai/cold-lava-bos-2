import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { generateQuotePDF } from '@/lib/pdf/quote-pdf'

// GET /api/quotes/:id/pdf - Download quote as PDF
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

    // Fetch quote with all necessary expanded data
    const { data: quote, error } = await supabase
      .from('quotes')
      .select(`
        *,
        line_items:quote_line_items(id, description, quantity, unit_price, total_price, position),
        job:jobs(
          id,
          job_number,
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
        )
      `)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Quote not found' },
          { status: 404 }
        )
      }

      console.error('Error fetching quote for PDF:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // Get tenant name for PDF header
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenantId)
      .single()

    const tenantName = tenant?.name || 'Cold Lava'

    // Generate PDF
    const pdfBuffer = await generateQuotePDF(quote, tenantName)

    // Return PDF with appropriate headers
    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${quote.quote_number}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Error in GET /api/quotes/:id/pdf:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
