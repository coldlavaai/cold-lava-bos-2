import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/threads/:id - Get single thread
export async function GET(
  _request: Request,
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

    // Get the thread
    const { data: thread, error } = await supabase
      .from('message_threads')
      .select('id, tenant_id, customer_id, channel, subject, last_message_at, is_read, created_at')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching thread:', error)
      return NextResponse.json(
        { error: error.message },
        { status: error.code === 'PGRST116' ? 404 : 500 }
      )
    }

    // Get customer name if customer_id exists
    let customerName = 'Unknown'
    if (thread.customer_id) {
      const { data: customer } = await supabase
        .from('customers')
        .select('name')
        .eq('id', thread.customer_id)
        .single()
      if (customer) {
        customerName = customer.name
      }
    }

    // Get the last message for this thread
    const { data: lastMessage } = await supabase
      .from('messages')
      .select('body')
      .eq('tenant_id', tenantId)
      .eq('thread_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Map to frontend Thread format
    const mapped = {
      id: thread.id,
      tenant_id: thread.tenant_id,
      customer_id: thread.customer_id,
      customer_name: customerName,
      channel: thread.channel,
      subject: thread.subject || '',
      last_message: lastMessage?.body || '',
      last_message_at: thread.last_message_at || thread.created_at,
      is_read: thread.is_read,
      created_at: thread.created_at,
      updated_at: thread.last_message_at || thread.created_at,
    }

    return NextResponse.json({ data: mapped })
  } catch (error) {
    console.error('Error in GET /api/threads/:id:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/threads/:id - Update thread properties (e.g., mark as read)
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
    const { is_read } = body

    if (typeof is_read !== 'boolean') {
      return NextResponse.json(
        { error: 'is_read must be a boolean' },
        { status: 400 }
      )
    }

    // Update the thread
    const { error: updateError } = await supabase
      .from('message_threads')
      .update({ is_read })
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (updateError) {
      console.error('Error updating thread:', updateError)
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in PATCH /api/threads/:id:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
