import { createAdminClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { UnifiedCommunicationItem } from '@/lib/api/types'

// GET /api/communications/customers/[id]/conversation - Get unified conversation for a customer
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Use admin client to bypass RLS - middleware already handles auth
    const supabase = createAdminClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    const { id: customerId } = await params

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 })
    }

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID required' }, { status: 400 })
    }

    const searchParams = request.nextUrl.searchParams
    const channel = searchParams.get('channel')
    const limit = parseInt(searchParams.get('limit') || '50')
    const before = searchParams.get('before') // cursor for pagination

    // Get customer info
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, name, email, phone')
      .eq('id', customerId)
      .eq('tenant_id', tenantId)
      .single()

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Get all threads for this customer
    const { data: threads, error: threadsError } = await supabase
      .from('message_threads')
      .select('id, channel, subject')
      .eq('tenant_id', tenantId)
      .eq('customer_id', customerId)

    if (threadsError) {
      console.error('Error fetching threads:', threadsError)
      return NextResponse.json({ error: threadsError.message }, { status: 500 })
    }

    const threadIds = threads?.map(t => t.id) || []
    const threadLookup = new Map((threads || []).map(t => [t.id, t]))

    // Get messages from all threads (simple query without join)
    let messagesQuery = supabase
      .from('messages')
      .select('id, thread_id, channel, direction, created_at, body, status, sender, recipient, media')
      .eq('tenant_id', tenantId)
      .in('thread_id', threadIds.length > 0 ? threadIds : ['00000000-0000-0000-0000-000000000000'])
      .order('created_at', { ascending: false })
      .limit(limit)

    if (before) {
      messagesQuery = messagesQuery.lt('created_at', before)
    }

    if (channel && channel !== 'call') {
      messagesQuery = messagesQuery.eq('channel', channel)
    }

    const { data: messages, error: messagesError } = await messagesQuery

    if (messagesError) {
      console.error('Error fetching messages:', messagesError)
      return NextResponse.json({ error: messagesError.message }, { status: 500 })
    }

    // Get synced emails for this customer (Gmail/Outlook OAuth)
    let syncedEmails: Array<{
      id: string
      provider: string
      from_email: string
      from_name: string | null
      to_emails: string[]
      subject: string
      body_text: string | null
      body_html: string | null
      direction: string | null
      is_read: boolean
      is_sent: boolean
      received_at: string | null
      sent_at: string | null
      created_at: string
    }> = []

    if (channel === 'email' || !channel) {
      try {
        let emailsQuery = supabase
          .from('email_threads_synced')
          .select('id, provider, from_email, from_name, to_emails, subject, body_text, body_html, direction, is_read, is_sent, received_at, sent_at, created_at')
          .eq('tenant_id', tenantId)
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (before) {
          emailsQuery = emailsQuery.lt('created_at', before)
        }

        const { data: emailsData } = await emailsQuery
        syncedEmails = emailsData || []
      } catch {
        // Don't fail if email_threads_synced table doesn't exist yet
      }
    }

    // Get call recordings for this customer (optional)
    let calls: Array<{
      id: string
      direction: string | null
      started_at: string | null
      created_at: string
      summary: string | null
      transcript: string | null
      action_items: unknown
      duration_seconds: number | null
      provider: string | null
      audio_url: string | null
      provider_meeting_url: string | null
    }> = []

    if (channel === 'call' || !channel) {
      try {
        let callsQuery = supabase
          .from('call_recordings')
          .select('id, direction, started_at, created_at, summary, transcript, action_items, duration_seconds, provider, audio_url, provider_meeting_url')
          .eq('tenant_id', tenantId)
          .eq('customer_id', customerId)
          .order('started_at', { ascending: false, nullsFirst: false })
          .limit(limit)

        if (before) {
          callsQuery = callsQuery.lt('started_at', before)
        }

        const { data: callsData } = await callsQuery
        calls = callsData || []
      } catch {
        // Don't fail if calls table has issues
      }
    }

    // Transform and merge into unified items
    const items: UnifiedCommunicationItem[] = []

    // Add messages
    for (const msg of messages || []) {
      const thread = threadLookup.get(msg.thread_id)
      items.push({
        id: msg.id,
        type: (msg.channel || thread?.channel || 'sms') as 'sms' | 'email' | 'whatsapp',
        direction: msg.direction as 'inbound' | 'outbound',
        timestamp: msg.created_at,
        body: msg.body || '',
        preview: (msg.body || '').substring(0, 150),
        subject: thread?.subject || undefined,
        status: msg.status as 'queued' | 'sent' | 'delivered' | 'failed' | undefined,
        media: msg.media || undefined,
      })
    }

    // Add synced emails (Gmail/Outlook OAuth)
    for (const email of syncedEmails) {
      const emailBody = email.body_text || email.body_html?.replace(/<[^>]*>/g, '') || ''
      items.push({
        id: email.id,
        type: 'email',
        direction: (email.direction as 'inbound' | 'outbound') || (email.is_sent ? 'outbound' : 'inbound'),
        timestamp: email.sent_at || email.received_at || email.created_at,
        body: emailBody,
        body_html: email.body_html || undefined,
        from_email: email.from_email || undefined,
        preview: emailBody.substring(0, 150),
        subject: email.subject || undefined,
      })
    }

    // Add call recordings
    for (const call of calls) {
      items.push({
        id: call.id,
        type: 'call',
        direction: (call.direction as 'inbound' | 'outbound') || 'outbound',
        timestamp: call.started_at || call.created_at,
        body: call.summary || 'Call recording',
        preview: call.summary ? call.summary.substring(0, 150) : 'Call recording',
        call_recording: {
          id: call.id,
          direction: call.direction || 'outbound',
          duration_seconds: call.duration_seconds || 0,
          provider: call.provider || 'unknown',
          summary: call.summary,
          has_transcript: !!call.transcript,
          action_items_count: Array.isArray(call.action_items) ? call.action_items.length : 0,
          audio_url: call.audio_url,
          provider_meeting_url: call.provider_meeting_url,
        },
      })
    }

    // Sort by timestamp descending
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Apply limit after merge
    const limitedItems = items.slice(0, limit)
    const oldestTimestamp = limitedItems.length > 0 ? limitedItems[limitedItems.length - 1].timestamp : null

    return NextResponse.json({
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      },
      items: limitedItems,
      pagination: {
        limit,
        has_more: items.length > limit,
        next_cursor: oldestTimestamp,
      },
    })
  } catch (error) {
    console.error('Error in GET /api/communications/customers/[id]/conversation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
