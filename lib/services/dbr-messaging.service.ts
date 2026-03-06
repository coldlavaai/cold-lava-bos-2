/**
 * Session 99C: DBR Messaging Service
 * Shared service for sending DBR messages (manual and automated)
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { sendSmsDirect } from './messaging.service'

export interface SendDBRMessageParams {
  supabase: SupabaseClient
  tenantId: string
  leadId: string
  campaignId: string
  customerId: string
  customerName: string | null
  phone: string
  body: string
  messageStage: 'M1_sent' | 'M2_sent' | 'M3_sent' | 'In_conversation'
  userId?: string | null
}

export interface SendDBRMessageResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send a DBR SMS message (manual or automated)
 * Creates message record, triggers SMS send, updates lead stage
 */
export async function sendDBRMessage(
  params: SendDBRMessageParams
): Promise<SendDBRMessageResult> {
  const {
    supabase,
    tenantId,
    leadId,
    campaignId,
    customerId,
    customerName,
    phone,
    body,
    messageStage,
    userId = null,
  } = params

  const channel = 'sms'

  try {
    // Get or create message thread for this customer
    let threadId: string | null = null

    if (customerId) {
      // Try to find existing thread
      const { data: existingThread } = await supabase
        .from('message_threads')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('customer_id', customerId)
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
            customer_id: customerId,
            channel,
            subject: `DBR: ${customerName || 'Campaign'}`,
            last_message_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (threadError) {
          console.error('[DBR] Error creating thread:', threadError)
          return { success: false, error: threadError.message }
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
        recipient: phone,
        body: body.trim(),
        status: 'queued',
        created_by: userId,
        // DBR-specific tracking
        dbr_campaign_id: campaignId,
        dbr_campaign_customer_id: leadId,
      })
      .select()
      .single()

    if (messageError || !message) {
      console.error('[DBR] Error creating message:', messageError)
      return { success: false, error: messageError?.message || 'Failed to create message' }
    }

    // Send SMS directly via Twilio
    const smsResult = await sendSmsDirect({
      tenantId,
      to: phone,
      body: body.trim(),
      messageId: message.id,
    })

    if (!smsResult.success) {
      return {
        success: false,
        error: smsResult.error || 'Failed to send SMS',
      }
    }

    // Update thread's last_message_at
    if (threadId) {
      await supabase
        .from('message_threads')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', threadId)
    }

    // Update lead's message stage
    const updateData: Record<string, unknown> = {
      message_stage: messageStage,
    }

    // Set the appropriate timestamp based on the stage
    const now = new Date().toISOString()
    if (messageStage === 'M1_sent') {
      updateData.m1_sent_at = now
    } else if (messageStage === 'M2_sent') {
      updateData.m2_sent_at = now
    } else if (messageStage === 'M3_sent') {
      updateData.m3_sent_at = now
    }

    // For manual sends (In_conversation), also store the message snippet
    if (messageStage === 'In_conversation') {
      updateData.latest_reply = body.trim().substring(0, 500)
    }

    await supabase
      .from('dbr_campaign_customers')
      .update(updateData)
      .eq('id', leadId)
      .eq('tenant_id', tenantId)

    return {
      success: true,
      messageId: message.id,
    }
  } catch (error) {
    console.error('[DBR] Error in sendDBRMessage:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get default message template for a given stage
 * In the future, this could pull from a templates table
 */
export function getDefaultMessageTemplate(
  stage: 'M1' | 'M2' | 'M3',
  customerName?: string | null
): string {
  const name = customerName || 'there'

  switch (stage) {
    case 'M1':
      return `Hi ${name}, this is a quick follow-up about your solar panel inquiry. Are you still interested in getting a free quote? Reply YES if you'd like us to reach out.`
    case 'M2':
      return `Hi ${name}, just checking in again about solar panels for your property. We have some great financing options available. Would you like to schedule a quick call?`
    case 'M3':
      return `Hi ${name}, this is our final follow-up about solar panels. If you're interested, please let us know - we'd love to help you save on energy costs!`
  }
}
