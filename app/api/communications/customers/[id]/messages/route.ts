import { createAdminClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { sendSmsDirect, sendEmailDirect, sendWhatsAppDirect } from '@/lib/services/messaging.service'

// POST /api/communications/customers/[id]/messages - Send message to a customer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createAdminClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    const userId = headersList.get('x-user-id')
    const { id: customerId } = await params

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 })
    }

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID required' }, { status: 400 })
    }

    const body = await request.json()
    const { channel, body: messageBody, subject } = body

    // Validate required fields
    if (!channel || !messageBody) {
      return NextResponse.json(
        { error: 'Missing required fields: channel, body' },
        { status: 400 }
      )
    }

    // Validate channel
    if (!['sms', 'email', 'whatsapp'].includes(channel)) {
      return NextResponse.json(
        { error: 'Invalid channel. Must be sms, email, or whatsapp' },
        { status: 400 }
      )
    }

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

    // Determine recipient based on channel
    let recipient: string | null = null
    if (channel === 'sms' || channel === 'whatsapp') {
      recipient = customer.phone
      if (!recipient) {
        return NextResponse.json(
          { error: 'Customer has no phone number for SMS/WhatsApp' },
          { status: 400 }
        )
      }
    } else if (channel === 'email') {
      recipient = customer.email
      if (!recipient) {
        return NextResponse.json(
          { error: 'Customer has no email address' },
          { status: 400 }
        )
      }
    }

    // Find or create thread for this customer + channel
    let { data: thread } = await supabase
      .from('message_threads')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('customer_id', customerId)
      .eq('channel', channel)
      .maybeSingle()

    if (!thread) {
      const { data: newThread, error: createError } = await supabase
        .from('message_threads')
        .insert({
          tenant_id: tenantId,
          customer_id: customerId,
          channel,
          subject: subject || null,
          last_message_at: new Date().toISOString(),
          is_read: true, // Outbound messages start as read
        })
        .select()
        .single()

      if (createError || !newThread) {
        console.error('Error creating thread:', createError)
        return NextResponse.json({ error: createError?.message || 'Failed to create thread' }, { status: 500 })
      }
      thread = newThread
    }

    // At this point thread is guaranteed to exist
    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 500 })
    }
    const threadId = thread.id

    // Create message record
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        tenant_id: tenantId,
        thread_id: threadId,
        direction: 'outbound',
        channel,
        recipient,
        body: messageBody,
        status: 'queued',
        created_by: userId,
      })
      .select()
      .single()

    if (messageError) {
      console.error('Error creating message:', messageError)
      return NextResponse.json({ error: messageError.message }, { status: 500 })
    }

    // Update thread's last_message_at
    await supabase
      .from('message_threads')
      .update({ 
        last_message_at: new Date().toISOString(),
        subject: subject || undefined,
      })
      .eq('id', threadId)

    // Send message directly based on channel
    let sendResult: { success: boolean; error?: string }

    if (channel === 'sms') {
      sendResult = await sendSmsDirect({
        tenantId,
        to: recipient!,
        body: messageBody,
        messageId: message.id,
      })
    } else if (channel === 'whatsapp') {
      sendResult = await sendWhatsAppDirect({
        tenantId,
        to: recipient!,
        body: messageBody,
        messageId: message.id,
      })
    } else {
      sendResult = await sendEmailDirect({
        tenantId,
        to: recipient!,
        subject: subject || 'Message from Cold Lava',
        body: messageBody,
        messageId: message.id,
      })
    }

    if (!sendResult.success) {
      return NextResponse.json(
        { error: sendResult.error || 'Failed to send message', data: message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: message }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/communications/customers/[id]/messages:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
