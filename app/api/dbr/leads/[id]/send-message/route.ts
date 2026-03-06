/**
 * Session 99A: DBR Manual Message Send API
 * POST /api/dbr/leads/[id]/send-message - Send manual DBR message (SMS)
 * Based on docs/03-API-SPEC-PART2.md Section 30.6
 */

import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { sendSmsDirect } from '@/lib/services/messaging.service'
import type { SendDBRLeadMessageRequest, SendDBRLeadMessageResponse } from '@/lib/api/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params
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

    const body: SendDBRLeadMessageRequest = await request.json()

    // Validate required fields
    if (!body.body || body.body.trim() === '') {
      return NextResponse.json(
        { error: 'Message body is required' },
        { status: 400 }
      )
    }

    // Fetch lead with campaign info
    const { data: lead, error: leadError } = await supabase
      .from('dbr_campaign_customers')
      .select(`
        *,
        campaign:dbr_campaigns(id, channel, twilio_phone_override, sms_account_id)
      `)
      .eq('id', leadId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single()

    if (leadError || !lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    // For now, only SMS is supported (email/WhatsApp to come later)
    const channel = 'sms'

    // Get or create message thread for this customer
    let threadId = null

    if (lead.customer_id) {
      // Try to find existing thread for this customer and channel
      const { data: existingThread } = await supabase
        .from('message_threads')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('customer_id', lead.customer_id)
        .eq('channel', channel)
        .maybeSingle()

      if (existingThread) {
        threadId = existingThread.id
      } else {
        // Create new thread
        const { data: newThread, error: threadError } = await supabase
          .from('message_threads')
          .insert({
            tenant_id: tenantId,
            customer_id: lead.customer_id,
            channel,
            subject: `DBR: ${lead.campaign.name || 'Campaign'}`,
            last_message_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (threadError) {
          console.error('[DBR] Error creating thread:', threadError)
          return NextResponse.json(
            { error: threadError.message },
            { status: 500 }
          )
        }

        threadId = newThread.id
      }
    }

    // Create message with DBR tracking
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        tenant_id: tenantId,
        thread_id: threadId,
        direction: 'outbound',
        channel,
        recipient: lead.phone,
        body: body.body.trim(),
        status: 'queued',
        created_by: userId,
        // DBR-specific tracking
        dbr_campaign_id: lead.campaign_id,
        dbr_campaign_customer_id: lead.id,
      })
      .select()
      .single()

    if (messageError) {
      console.error('[DBR] Error creating message:', messageError)
      return NextResponse.json(
        { error: messageError.message },
        { status: 500 }
      )
    }

    // Send SMS directly via Twilio
    const smsResult = await sendSmsDirect({
      tenantId,
      to: lead.phone,
      body: body.body.trim(),
      messageId: message.id,
    })

    if (!smsResult.success) {
      return NextResponse.json(
        { error: smsResult.error || 'Failed to send message' },
        { status: 500 }
      )
    }

    // Update thread's last_message_at
    if (threadId) {
      await supabase
        .from('message_threads')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', threadId)
    }

    // Update lead's message stage to In_conversation (manual send indicates active conversation)
    await supabase
      .from('dbr_campaign_customers')
      .update({
        message_stage: 'In_conversation',
        latest_reply: body.body.trim().substring(0, 500), // Store snippet
      })
      .eq('id', leadId)
      .eq('tenant_id', tenantId)

    const response: SendDBRLeadMessageResponse = {
      message_id: message.id,
      sent_at: message.created_at,
    }

    return NextResponse.json({ data: response }, { status: 201 })
  } catch (error) {
    console.error('[DBR] Error in POST /api/dbr/leads/:id/send-message:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
