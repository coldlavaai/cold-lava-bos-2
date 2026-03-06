import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/webhooks/sendgrid/inbound - Handle incoming emails via SendGrid Inbound Parse
 * 
 * SendGrid Configuration:
 * 1. Go to Settings → Inbound Parse
 * 2. Add a receiving domain (e.g., reply.yourdomain.com)
 * 3. Set the webhook URL to: https://cold-lava-bos-app.vercel.app/api/webhooks/sendgrid/inbound
 * 4. Configure your MX records to point to mx.sendgrid.net
 * 
 * Emails to: anything@reply.yourdomain.com will be forwarded here
 */
export async function POST(request: NextRequest) {
  try {
    // SendGrid sends as multipart/form-data
    const formData = await request.formData()
    
    const from = formData.get('from') as string
    const to = formData.get('to') as string
    const subject = formData.get('subject') as string
    const text = formData.get('text') as string
    const html = formData.get('html') as string
    const envelope = formData.get('envelope') as string
    
    // Parse envelope for actual sender
    let senderEmail = from
    if (envelope) {
      try {
        const env = JSON.parse(envelope)
        senderEmail = env.from || from
      } catch {
        // Use from header
      }
    }
    
    // Extract email address from "Name <email@domain.com>" format
    const emailMatch = senderEmail.match(/<(.+?)>/) || [null, senderEmail]
    const normalizedFrom = emailMatch[1]?.toLowerCase() || senderEmail.toLowerCase()

    console.log('[SendGrid Inbound] Email received:', {
      from: normalizedFrom,
      to,
      subject: subject?.substring(0, 50),
    })

    if (!normalizedFrom || !text) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Find customer by email
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, tenant_id, name, first_name, last_name')
      .eq('email', normalizedFrom)
      .limit(1)
      .single()

    if (customerError || !customer) {
      console.log('[SendGrid Inbound] Customer not found for email:', normalizedFrom)
      // Acknowledge but don't store
      return NextResponse.json({ success: true, message: 'No matching customer' })
    }

    const customerName = customer.name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Customer'

    // Find or create message thread for this customer + email channel
    let { data: thread } = await supabase
      .from('message_threads')
      .select('id')
      .eq('customer_id', customer.id)
      .eq('tenant_id', customer.tenant_id)
      .eq('channel', 'email')
      .single()

    if (!thread) {
      // Create new thread
      const { data: newThread, error: threadError } = await supabase
        .from('message_threads')
        .insert({
          tenant_id: customer.tenant_id,
          customer_id: customer.id,
          channel: 'email',
          subject: subject || `Email from ${customerName}`,
          is_read: false,
        })
        .select('id')
        .single()

      if (threadError) {
        console.error('[SendGrid Inbound] Failed to create thread:', threadError)
        return NextResponse.json({ error: 'Failed to create thread' }, { status: 500 })
      }
      thread = newThread
    }

    // Store the inbound email
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        tenant_id: customer.tenant_id,
        thread_id: thread.id,
        direction: 'inbound',
        channel: 'email',
        sender: normalizedFrom,
        recipient: to,
        body: text || html || '', // Prefer text, fall back to HTML
        status: 'delivered',
      })

    if (messageError) {
      console.error('[SendGrid Inbound] Failed to store message:', messageError)
      return NextResponse.json({ error: 'Failed to store message' }, { status: 500 })
    }

    // Update thread with latest message timestamp and mark as unread
    await supabase
      .from('message_threads')
      .update({
        last_message_at: new Date().toISOString(),
        is_read: false,
        subject: subject || undefined, // Update subject if provided
      })
      .eq('id', thread.id)

    console.log('[SendGrid Inbound] Email stored successfully for customer:', customerName)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[SendGrid Inbound] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
