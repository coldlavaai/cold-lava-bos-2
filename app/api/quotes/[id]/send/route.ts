import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/quotes/:id/send - Mark quote as sent
export async function POST(
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

    // Update quote status to sent
    const { data, error } = await supabase
      .from('quotes')
      .update({ status: 'sent' })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select(`
        *,
        line_items:quote_line_items(id, description, quantity, unit_price, total_price, position),
        job:jobs(id, job_number, customer_id),
        creator:users!quotes_created_by_fkey(id, name, email)
      `)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Quote not found' },
          { status: 404 }
        )
      }

      console.error('Error marking quote as sent:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Quote marked as sent successfully',
      data
    })
  } catch (error) {
    console.error('Error in POST /api/quotes/:id/send:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
