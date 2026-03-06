import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/threads - List message threads for tenant
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    const { searchParams } = new URL(request.url)
    const channel = searchParams.get('channel') || undefined

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    // Query message threads
    let query = supabase
      .from('message_threads')
      .select('id, tenant_id, customer_id, channel, subject, last_message_at, is_read, created_at')
      .eq('tenant_id', tenantId)
      .order('last_message_at', { ascending: false, nullsFirst: false })

    if (channel) {
      query = query.eq('channel', channel)
    }

    const { data: threads, error } = await query

    if (error) {
      console.error('Error fetching threads:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // Get customer names for threads
    const customerIds = threads
      ?.filter(t => t.customer_id)
      .map(t => t.customer_id) || []

    let customerNames: Record<string, string> = {}
    if (customerIds.length > 0) {
      const { data: customers } = await supabase
        .from('customers')
        .select('id, name')
        .in('id', customerIds)

      if (customers) {
        customerNames = Object.fromEntries(
          customers.map(c => [c.id, c.name])
        )
      }
    }

    // Get the last message for each thread
    const threadIds = threads?.map(t => t.id) || []
    let lastMessages: Record<string, string> = {}

    if (threadIds.length > 0) {
      // Get the most recent message for each thread
      const { data: messages } = await supabase
        .from('messages')
        .select('thread_id, body, created_at')
        .eq('tenant_id', tenantId)
        .in('thread_id', threadIds)
        .order('created_at', { ascending: false })

      // Map to get last message per thread
      if (messages) {
        const messagesByThread: Record<string, typeof messages[0]> = {}
        messages.forEach(msg => {
          if (!messagesByThread[msg.thread_id]) {
            messagesByThread[msg.thread_id] = msg
          }
        })
        lastMessages = Object.fromEntries(
          Object.entries(messagesByThread).map(([id, msg]) => [id, msg.body])
        )
      }
    }

    // Map to frontend Thread format
    const mapped = threads?.map(thread => ({
      id: thread.id,
      tenant_id: thread.tenant_id,
      customer_id: thread.customer_id,
      customer_name: thread.customer_id ? (customerNames[thread.customer_id] || 'Unknown') : 'Unknown',
      channel: thread.channel,
      subject: thread.subject || '',
      last_message: lastMessages[thread.id] || '',
      last_message_at: thread.last_message_at || thread.created_at,
      is_read: thread.is_read,
      created_at: thread.created_at,
      updated_at: thread.last_message_at || thread.created_at,
    })) || []

    return NextResponse.json({ data: mapped })
  } catch (error) {
    console.error('Error in GET /api/threads:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
