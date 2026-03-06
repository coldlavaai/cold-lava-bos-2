import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

// Helper function to generate quote numbers
async function generateQuoteNumber(supabase: SupabaseClient, tenantId: string): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `QUOTE-${year}-`

  const { data } = await supabase
    .from('quotes')
    .select('quote_number')
    .eq('tenant_id', tenantId)
    .like('quote_number', `${prefix}%`)
    .order('created_at', { ascending: false })
    .limit(1)

  if (data && data.length > 0) {
    const lastNumber = parseInt(data[0].quote_number.split('-').pop() || '0')
    const nextNumber = (lastNumber + 1).toString().padStart(4, '0')
    return `${prefix}${nextNumber}`
  }

  return `${prefix}0001`
}

// GET /api/quotes - List quotes with filters
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
    const job_id = searchParams.get('job_id')
    const status = searchParams.get('status')

    // Build query
    let query = supabase
      .from('quotes')
      .select(`
        *,
        job:jobs(id, job_number, customer_id),
        creator:users!quotes_created_by_fkey(id, name, email)
      `, { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    // Apply filters
    if (job_id) {
      query = query.eq('job_id', job_id)
    }

    if (status) {
      query = query.eq('status', status)
    }

    // Apply pagination
    const rangeFrom = (page - 1) * limit
    const rangeTo = rangeFrom + limit - 1
    query = query.range(rangeFrom, rangeTo)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching quotes:', error)
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
    console.error('Error in GET /api/quotes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/quotes - Create new quote
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
    if (!body.job_id) {
      return NextResponse.json(
        { error: 'Missing required field: job_id' },
        { status: 400 }
      )
    }

    // Generate quote number
    const quoteNumber = await generateQuoteNumber(supabase, tenantId)

    // Create quote
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        tenant_id: tenantId,
        job_id: body.job_id,
        quote_number: quoteNumber,
        status: 'draft',
        total_amount: body.total_amount || null,
        valid_until: body.valid_until || null,
        created_by: userId,
      })
      .select()
      .single()

    if (quoteError) {
      console.error('Error creating quote:', quoteError)
      return NextResponse.json(
        { error: quoteError.message },
        { status: 500 }
      )
    }

    // Create line items if provided
    if (body.line_items && Array.isArray(body.line_items) && body.line_items.length > 0) {
      const lineItemsToInsert = body.line_items.map((item: { description: string; quantity: number; unit_price: number; total_price?: number }, index: number) => ({
        quote_id: quote.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price || (item.quantity * item.unit_price),
        position: index,
      }))

      const { error: lineItemsError } = await supabase
        .from('quote_line_items')
        .insert(lineItemsToInsert)

      if (lineItemsError) {
        console.error('Error creating line items:', lineItemsError)
        // Quote is created but line items failed - consider rolling back or returning partial success
        return NextResponse.json(
          { error: 'Quote created but line items failed', data: quote },
          { status: 500 }
        )
      }
    }

    // Fetch complete quote with line items
    const { data: completeQuote } = await supabase
      .from('quotes')
      .select(`
        *,
        line_items:quote_line_items(id, description, quantity, unit_price, total_price, position),
        job:jobs(id, job_number, customer_id),
        creator:users!quotes_created_by_fkey(id, name, email)
      `)
      .eq('id', quote.id)
      .single()

    return NextResponse.json({ data: completeQuote }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/quotes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
