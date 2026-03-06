import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { sendSmsDirect, sendWhatsAppDirect } from '@/lib/services/messaging.service'

// POST /api/messages/send - Queue outbound message
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
    if (!body.channel || !body.recipient || !body.body) {
      return NextResponse.json(
        { error: 'Missing required fields: channel, recipient, body' },
        { status: 400 }
      )
    }

    // Validate channel
    if (!['email', 'sms', 'whatsapp'].includes(body.channel)) {
      return NextResponse.json(
        { error: 'Invalid channel. Must be email, sms, or whatsapp' },
        { status: 400 }
      )
    }

    // Get or create thread
    let threadId = body.thread_id

    if (!threadId && body.customer_id) {
      // Try to find existing thread for this customer and channel
      const { data: existingThread } = await supabase
        .from('message_threads')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('customer_id', body.customer_id)
        .eq('channel', body.channel)
        .maybeSingle()

      if (existingThread) {
        threadId = existingThread.id
      } else {
        // Create new thread
        const { data: newThread, error: threadError } = await supabase
          .from('message_threads')
          .insert({
            tenant_id: tenantId,
            customer_id: body.customer_id,
            channel: body.channel,
            subject: body.subject || null,
            last_message_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (threadError) {
          console.error('Error creating thread:', threadError)
          return NextResponse.json(
            { error: threadError.message },
            { status: 500 }
          )
        }

        threadId = newThread.id
      }
    }

    // Create message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        tenant_id: tenantId,
        thread_id: threadId || null,
        direction: 'outbound',
        channel: body.channel,
        sender: body.sender || null,
        recipient: body.recipient,
        body: body.body,
        status: 'queued', // Will be picked up by Trigger.dev
        created_by: userId,
      })
      .select(`
        *,
        thread:message_threads(id, customer_id, channel, subject),
        creator:users!messages_created_by_fkey(id, name, email)
      `)
      .single()

    if (messageError) {
      console.error('Error creating message:', messageError)
      return NextResponse.json(
        { error: messageError.message },
        { status: 500 }
      )
    }

    // Send message directly based on channel
    if (body.channel === 'sms') {
      const result = await sendSmsDirect({
        tenantId,
        to: body.recipient,
        body: body.body,
        messageId: message.id,
      })

      if (!result.success) {
        console.error('SMS send failed:', result.error)
      }
    }

    if (body.channel === 'whatsapp') {
      const result = await sendWhatsAppDirect({
        tenantId,
        to: body.recipient,
        body: body.body,
        messageId: message.id,
      })

      if (!result.success) {
        console.error('WhatsApp send failed:', result.error)
      }
    }

    // Update thread's last_message_at
    if (threadId) {
      await supabase
        .from('message_threads')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', threadId)
    }

    return NextResponse.json({ data: message }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/messages/send:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
