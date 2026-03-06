import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { sendTransactionalEmail } from '@/lib/services/email.service'
import { sendSmsDirect } from '@/lib/services/messaging.service'

// POST /api/threads/:id/messages - Send a message in thread
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

    // Get current user ID
    const { data: { user: authUser } } = await supabase.auth.getUser()
    const authUserId = authUser?.id || null

    // Verify the thread belongs to this tenant and get necessary fields
    const { data: thread, error: threadError } = await supabase
      .from('message_threads')
      .select('id, tenant_id, customer_id, channel, subject')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()

    if (threadError) {
      console.error('Error fetching thread:', threadError)
      return NextResponse.json(
        { error: threadError.code === 'PGRST116' ? 'Thread not found' : threadError.message },
        { status: threadError.code === 'PGRST116' ? 404 : 500 }
      )
    }

    // Get request body
    const body = await request.json()
    const { body: messageBody } = body

    if (!messageBody || typeof messageBody !== 'string') {
      return NextResponse.json(
        { error: 'Message body is required' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()

    // Handle email channel - requires customer email and SendGrid sending
    if (thread.channel === 'email') {
      // Fetch customer email
      if (!thread.customer_id) {
        return NextResponse.json(
          { error: 'Email thread must have a customer' },
          { status: 400 }
        )
      }

      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('email, name')
        .eq('id', thread.customer_id)
        .single()

      if (customerError || !customer) {
        console.error('Error fetching customer:', customerError)
        return NextResponse.json(
          { error: 'Customer not found' },
          { status: 404 }
        )
      }

      if (!customer.email) {
        return NextResponse.json(
          { error: 'Customer does not have an email address' },
          { status: 400 }
        )
      }

      // Determine from address and subject
      const fromAddress = process.env.EMAIL_FROM_ADDRESS || 'noreply@example.com'
      const fromName = process.env.EMAIL_FROM_NAME || 'Cold Lava'
      const subject = thread.subject || `Message from ${fromName}`

      // Simple HTML wrapper for text body
      const htmlBody = `<div style="font-family: sans-serif; white-space: pre-wrap;">${messageBody.replace(/\n/g, '<br>')}</div>`

      // Insert message with status 'queued' initially
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
          tenant_id: tenantId,
          thread_id: id,
          direction: 'outbound',
          channel: 'email',
          sender: fromAddress,
          recipient: customer.email,
          body: messageBody,
          status: 'queued',
          created_by: authUserId,
        })
        .select('id, tenant_id, thread_id, direction, channel, sender, recipient, body, status, created_at')
        .single()

      if (messageError) {
        console.error('Error creating message:', messageError)
        return NextResponse.json(
          { error: messageError.message },
          { status: 500 }
        )
      }

      // Send email via SendGrid
      const emailResult = await sendTransactionalEmail({
        tenantId,
        to: customer.email,
        from: fromAddress,
        fromName: fromName,
        subject: subject,
        textBody: messageBody,
        htmlBody: htmlBody,
        threadId: id,
        messageId: message.id,
      })

      // Update message based on send result
      if (emailResult.success) {
        const { error: updateError } = await supabase
          .from('messages')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            provider: 'sendgrid',
            provider_message_id: emailResult.providerMessageId,
            provider_status: 'accepted',
          })
          .eq('id', message.id)
          .eq('tenant_id', tenantId)

        if (updateError) {
          console.error('Error updating message after send:', updateError)
        }

        // Update thread's last_message_at and mark as unread
        await supabase
          .from('message_threads')
          .update({
            last_message_at: new Date().toISOString(),
            is_read: false,
          })
          .eq('tenant_id', tenantId)
          .eq('id', id)

        // Return updated message data
        return NextResponse.json({
          data: {
            ...message,
            status: 'sent',
            sent_at: new Date().toISOString(),
            provider: 'sendgrid',
            provider_message_id: emailResult.providerMessageId,
            provider_status: 'accepted',
          },
        })
      } else {
        // Email send failed - update message status
        const { error: updateError } = await supabase
          .from('messages')
          .update({
            status: 'failed',
            failed_at: new Date().toISOString(),
            failure_reason: emailResult.error || 'Unknown error',
            provider: 'sendgrid',
            provider_status: 'error',
          })
          .eq('id', message.id)
          .eq('tenant_id', tenantId)

        if (updateError) {
          console.error('Error updating message after failure:', updateError)
        }

        return NextResponse.json(
          { error: emailResult.error || 'Failed to send email' },
          { status: 502 }
        )
      }
    } else if (thread.channel === 'sms') {
      // Handle SMS channel - requires customer phone and Twilio sending
      if (!thread.customer_id) {
        return NextResponse.json(
          { error: 'SMS thread must have a customer' },
          { status: 400 }
        )
      }

      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('phone')
        .eq('id', thread.customer_id)
        .single()

      if (customerError || !customer) {
        console.error('Error fetching customer:', customerError)
        return NextResponse.json(
          { error: 'Customer not found' },
          { status: 404 }
        )
      }

      if (!customer.phone) {
        return NextResponse.json(
          { error: 'Customer does not have a phone number' },
          { status: 400 }
        )
      }

      // Insert message with status 'queued' initially
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
          tenant_id: tenantId,
          thread_id: id,
          direction: 'outbound',
          channel: 'sms',
          recipient: customer.phone,
          body: messageBody,
          status: 'queued',
          created_by: authUserId,
        })
        .select('id, tenant_id, thread_id, direction, channel, recipient, body, status, created_at')
        .single()

      if (messageError) {
        console.error('Error creating message:', messageError)
        return NextResponse.json(
          { error: messageError.message },
          { status: 500 }
        )
      }

      // Send SMS directly via Twilio
      const smsResult = await sendSmsDirect({
        tenantId,
        to: customer.phone,
        body: messageBody,
        messageId: message.id,
      })

      if (!smsResult.success) {
        return NextResponse.json(
          { error: smsResult.error || 'Failed to send SMS' },
          { status: 502 }
        )
      }

      // Update thread's last_message_at and mark as unread
      await supabase
        .from('message_threads')
        .update({
          last_message_at: now,
          is_read: false,
        })
        .eq('tenant_id', tenantId)
        .eq('id', id)

      return NextResponse.json({ data: message })
    } else {
      // Non-SMS, non-email channels - keep existing behavior (DB insert only)
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
          tenant_id: tenantId,
          thread_id: id,
          direction: 'outbound',
          channel: thread.channel,
          body: messageBody,
          status: 'queued',
          created_by: authUserId,
        })
        .select('id, tenant_id, thread_id, direction, channel, body, status, created_at')
        .single()

      if (messageError) {
        console.error('Error creating message:', messageError)
        return NextResponse.json(
          { error: messageError.message },
          { status: 500 }
        )
      }

      // Update thread's last_message_at and mark as unread
      await supabase
        .from('message_threads')
        .update({
          last_message_at: now,
          is_read: false,
        })
        .eq('tenant_id', tenantId)
        .eq('id', id)

      return NextResponse.json({ data: message })
    }
  } catch (error) {
    console.error('Error in POST /api/threads/:id/messages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
