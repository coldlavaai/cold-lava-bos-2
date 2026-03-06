import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/quotes/:id - Get quote by ID with line items
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

    const { data, error } = await supabase
      .from('quotes')
      .select(`
        *,
        line_items:quote_line_items(id, description, quantity, unit_price, total_price, position),
        job:jobs(id, job_number, customer_id),
        creator:users!quotes_created_by_fkey(id, name, email)
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

      console.error('Error fetching quote:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in GET /api/quotes/:id:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/quotes/:id - Update quote
export async function PATCH(
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

    const body = await request.json()

    // Build update object for quote
    const updates: Record<string, unknown> = {}

    if (body.status !== undefined) updates.status = body.status
    if (body.total_amount !== undefined) updates.total_amount = body.total_amount
    if (body.valid_until !== undefined) updates.valid_until = body.valid_until

    // Update quote
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (quoteError) {
      if (quoteError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Quote not found' },
          { status: 404 }
        )
      }

      console.error('Error updating quote:', quoteError)
      return NextResponse.json(
        { error: quoteError.message },
        { status: 500 }
      )
    }

    // Update line items if provided
    if (body.line_items && Array.isArray(body.line_items)) {
      // Delete existing line items
      await supabase
        .from('quote_line_items')
        .delete()
        .eq('quote_id', id)

      // Insert new line items
      if (body.line_items.length > 0) {
        const lineItemsToInsert = body.line_items.map((item: { description: string; quantity: number; unit_price: number; total_price?: number }, index: number) => ({
          quote_id: id,
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
          console.error('Error updating line items:', lineItemsError)
          return NextResponse.json(
            { error: 'Quote updated but line items failed', data: quote },
            { status: 500 }
          )
        }
      }
    }

    // Fetch complete updated quote
    const { data: completeQuote } = await supabase
      .from('quotes')
      .select(`
        *,
        line_items:quote_line_items(id, description, quantity, unit_price, total_price, position),
        job:jobs(id, job_number, customer_id),
        creator:users!quotes_created_by_fkey(id, name, email)
      `)
      .eq('id', id)
      .single()

    return NextResponse.json({ data: completeQuote })
  } catch (error) {
    console.error('Error in PATCH /api/quotes/:id:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
