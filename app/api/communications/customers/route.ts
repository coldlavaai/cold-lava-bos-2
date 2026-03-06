import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/communications/customers - List customers with communication activity
export async function GET(request: NextRequest) {
  try {
    // Use admin client to bypass RLS - middleware already handles auth
    // and we explicitly filter by tenant_id in all queries
    const supabase = createAdminClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 })
    }

    const searchParams = request.nextUrl.searchParams
    const channel = searchParams.get('channel')
    const unreadOnly = searchParams.get('unread_only') === 'true'
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get message threads with customer data (separate queries for RLS friendliness)
    const { data: threads, error: threadsError } = await supabase
      .from('message_threads')
      .select('id, customer_id, channel, is_read, last_message_at, subject')
      .eq('tenant_id', tenantId)
      .not('customer_id', 'is', null)
      .order('last_message_at', { ascending: false })

    if (threadsError) {
      console.error('[Communications API] Error fetching threads:', threadsError)
      return NextResponse.json({ error: threadsError.message }, { status: 500 })
    }

    if (!threads || threads.length === 0) {
      return NextResponse.json({
        data: [],
        meta: { pagination: { total: 0, limit, offset, has_more: false } },
      })
    }

    // Get unique customer IDs from threads
    const customerIds = [...new Set(threads.map(t => t.customer_id).filter(Boolean))]

    // Fetch customers
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id, name, email, phone')
      .in('id', customerIds)

    if (customersError) {
      console.error('[Communications API] Error fetching customers:', customersError)
      return NextResponse.json({ error: customersError.message }, { status: 500 })
    }

    const customerLookup = new Map((customers || []).map(c => [c.id, c]))

    // Get latest message for each thread (single query, not N+1)
    const threadIds = threads.map(t => t.id)
    const { data: latestMessages } = await supabase
      .from('messages')
      .select('thread_id, body, channel, created_at, direction')
      .in('thread_id', threadIds)
      .order('created_at', { ascending: false })

    // Build a map: thread_id -> latest message
    const latestMessageByThread = new Map<string, { body: string | null; created_at: string }>()
    for (const msg of latestMessages || []) {
      if (!latestMessageByThread.has(msg.thread_id)) {
        latestMessageByThread.set(msg.thread_id, { body: msg.body, created_at: msg.created_at })
      }
    }

    // Get call recordings for customers (optional — don't fail if table missing)
    const callCustomerIds: Set<string> = new Set()
    const callsByCustomer = new Map<string, { time: string; summary: string | null }>()
    try {
      const { data: calls } = await supabase
        .from('call_recordings')
        .select('customer_id, started_at, created_at, summary')
        .eq('tenant_id', tenantId)
        .not('customer_id', 'is', null)
        .order('started_at', { ascending: false, nullsFirst: false })

      for (const call of calls || []) {
        if (call.customer_id) {
          callCustomerIds.add(call.customer_id)
          if (!callsByCustomer.has(call.customer_id)) {
            callsByCustomer.set(call.customer_id, {
              time: call.started_at || call.created_at,
              summary: call.summary,
            })
          }
        }
      }
    } catch {
      // Ignore call_recordings errors
    }

    // Aggregate by customer
    const customerMap = new Map<string, {
      customer_id: string
      customer_name: string
      customer_email: string | null
      customer_phone: string | null
      last_activity_at: string
      last_activity_type: 'sms' | 'email' | 'whatsapp' | 'call'
      last_activity_preview: string
      unread_sms_count: number
      unread_email_count: number
      unread_whatsapp_count: number
      total_unread_count: number
      has_sms: boolean
      has_email: boolean
      has_whatsapp: boolean
      has_calls: boolean
    }>()

    for (const thread of threads) {
      const customer = customerLookup.get(thread.customer_id)
      if (!customer) continue

      let existing = customerMap.get(customer.id)
      if (!existing) {
        existing = {
          customer_id: customer.id,
          customer_name: customer.name || 'Unknown',
          customer_email: customer.email,
          customer_phone: customer.phone,
          last_activity_at: thread.last_message_at || new Date().toISOString(),
          last_activity_type: thread.channel as 'sms' | 'email' | 'whatsapp',
          last_activity_preview: '',
          unread_sms_count: 0,
          unread_email_count: 0,
          unread_whatsapp_count: 0,
          total_unread_count: 0,
          has_sms: false,
          has_email: false,
          has_whatsapp: false,
          has_calls: callCustomerIds.has(customer.id),
        }
        customerMap.set(customer.id, existing)
      }

      // Update channel flags
      if (thread.channel === 'sms') existing.has_sms = true
      if (thread.channel === 'email') existing.has_email = true
      if (thread.channel === 'whatsapp') existing.has_whatsapp = true

      // Update unread counts
      if (!thread.is_read) {
        if (thread.channel === 'sms') existing.unread_sms_count++
        if (thread.channel === 'email') existing.unread_email_count++
        if (thread.channel === 'whatsapp') existing.unread_whatsapp_count++
        existing.total_unread_count++
      }

      // Update last activity if more recent
      if (thread.last_message_at && thread.last_message_at > existing.last_activity_at) {
        existing.last_activity_at = thread.last_message_at
        existing.last_activity_type = thread.channel as 'sms' | 'email' | 'whatsapp'
      }

      // Get message preview from the latest message map
      const latestMsg = latestMessageByThread.get(thread.id)
      if (latestMsg?.body && !existing.last_activity_preview) {
        existing.last_activity_preview = latestMsg.body.substring(0, 100)
      }
      // Update preview if this thread is more recent
      if (latestMsg?.body && thread.last_message_at === existing.last_activity_at) {
        existing.last_activity_preview = latestMsg.body.substring(0, 100)
      }
    }

    // Add customers that only have call recordings (no message threads)
    for (const callCustId of callCustomerIds) {
      if (!customerMap.has(callCustId)) {
        const customer = customerLookup.get(callCustId)
        // Customer might not be in lookup if they only have calls
        if (!customer) {
          const { data: callCustomer } = await supabase
            .from('customers')
            .select('id, name, email, phone')
            .eq('id', callCustId)
            .single()
          if (!callCustomer) continue

          const callData = callsByCustomer.get(callCustId)
          customerMap.set(callCustId, {
            customer_id: callCustomer.id,
            customer_name: callCustomer.name || 'Unknown',
            customer_email: callCustomer.email,
            customer_phone: callCustomer.phone,
            last_activity_at: callData?.time || new Date().toISOString(),
            last_activity_type: 'call',
            last_activity_preview: callData?.summary || 'Call recording',
            unread_sms_count: 0,
            unread_email_count: 0,
            unread_whatsapp_count: 0,
            total_unread_count: 0,
            has_sms: false,
            has_email: false,
            has_whatsapp: false,
            has_calls: true,
          })
        } else {
          const callData = callsByCustomer.get(callCustId)
          customerMap.set(callCustId, {
            customer_id: customer.id,
            customer_name: customer.name || 'Unknown',
            customer_email: customer.email,
            customer_phone: customer.phone,
            last_activity_at: callData?.time || new Date().toISOString(),
            last_activity_type: 'call',
            last_activity_preview: callData?.summary || 'Call recording',
            unread_sms_count: 0,
            unread_email_count: 0,
            unread_whatsapp_count: 0,
            total_unread_count: 0,
            has_sms: false,
            has_email: false,
            has_whatsapp: false,
            has_calls: true,
          })
        }
      }
    }

    // Convert to array and apply filters
    let results = Array.from(customerMap.values())

    // Apply channel filter
    if (channel) {
      results = results.filter(c => {
        if (channel === 'sms') return c.has_sms
        if (channel === 'email') return c.has_email
        if (channel === 'whatsapp') return c.has_whatsapp
        if (channel === 'call') return c.has_calls
        return true
      })
    }

    // Apply unread filter
    if (unreadOnly) {
      results = results.filter(c => c.total_unread_count > 0)
    }

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase()
      results = results.filter(c =>
        c.customer_name.toLowerCase().includes(searchLower) ||
        c.customer_email?.toLowerCase().includes(searchLower) ||
        c.customer_phone?.includes(search)
      )
    }

    // Sort by last activity
    results.sort((a, b) => new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime())

    // Apply pagination
    const total = results.length
    results = results.slice(offset, offset + limit)

    return NextResponse.json({
      data: results,
      meta: {
        pagination: {
          total,
          limit,
          offset,
          has_more: offset + limit < total,
        },
      },
    })
  } catch (error) {
    console.error('Error in GET /api/communications/customers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
