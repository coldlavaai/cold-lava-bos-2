/**
 * Messaging Service - Direct Twilio/SendGrid Calls
 * 
 * Replaces Trigger.dev background tasks with direct API calls.
 * Twilio/SendGrid respond in <1 second, so no background processing needed.
 */

import twilio from 'twilio'
import sgMail from '@sendgrid/mail'
import { createClient } from '@supabase/supabase-js'
import { resolveSmsCredentials, resolveEmailCredentials } from './integrations.service'

// Initialize Supabase with service role for server-side operations
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface SendResult {
  success: boolean
  messageId?: string
  error?: string
}

// ============================================
// SMS
// ============================================

export interface SendSmsParams {
  tenantId: string
  to: string
  body: string
  messageId?: string
  from?: string
}

/**
 * Send SMS directly via Twilio
 */
export async function sendSmsDirect(params: SendSmsParams): Promise<SendResult> {
  const { tenantId, to, body, messageId, from } = params
  const supabase = getSupabaseAdmin()

  try {
    const credentials = await resolveSmsCredentials(tenantId)
    
    if (!credentials) {
      const error = 'SMS integration not configured. Please configure Twilio in Settings → Integrations.'
      if (messageId) {
        await updateMessageStatus(supabase, messageId, tenantId, 'failed', error)
      }
      return { success: false, error }
    }

    const { accountSid, authToken, phoneNumber } = credentials
    const fromNumber = from || phoneNumber

    if (!fromNumber) {
      const error = 'No SMS from number configured'
      if (messageId) {
        await updateMessageStatus(supabase, messageId, tenantId, 'failed', error)
      }
      return { success: false, error }
    }

    const twilioClient = twilio(accountSid, authToken)
    
    const message = await twilioClient.messages.create({
      body,
      from: fromNumber,
      to,
    })

    if (messageId) {
      await supabase
        .from('messages')
        .update({
          status: 'sent',
          external_id: message.sid,
          sent_at: new Date().toISOString(),
        })
        .eq('id', messageId)
        .eq('tenant_id', tenantId)
    }

    return { success: true, messageId: message.sid }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to send SMS'
    console.error('SMS send error:', error)
    
    if (messageId) {
      await updateMessageStatus(supabase, messageId, tenantId, 'failed', errorMessage)
    }

    return { success: false, error: errorMessage }
  }
}

// ============================================
// WhatsApp
// ============================================

export interface SendWhatsAppParams {
  tenantId: string
  to: string
  body: string
  messageId?: string
}

/**
 * Send WhatsApp message directly via Twilio
 */
export async function sendWhatsAppDirect(params: SendWhatsAppParams): Promise<SendResult> {
  const { tenantId, to, body, messageId } = params
  const supabase = getSupabaseAdmin()

  try {
    console.log('[WhatsApp] Attempting to send message:', { tenantId, to: to.substring(0, 8) + '...', bodyLength: body.length })

    const credentials = await resolveSmsCredentials(tenantId)

    if (!credentials) {
      const error = 'Twilio integration not configured. Please configure Twilio in Settings → Integrations.'
      console.error('[WhatsApp] No credentials found')
      if (messageId) {
        await updateMessageStatus(supabase, messageId, tenantId, 'failed', error)
      }
      return { success: false, error }
    }

    const { accountSid, authToken, whatsappNumber } = credentials
    console.log('[WhatsApp] Credentials found:', {
      accountSid: accountSid.substring(0, 8) + '...',
      hasAuthToken: !!authToken,
      whatsappNumber: whatsappNumber || 'NOT SET'
    })

    if (!whatsappNumber) {
      const error = 'WhatsApp number not configured. Add your Twilio WhatsApp number in Settings → Integrations.'
      console.error('[WhatsApp] WhatsApp number not configured in integration')
      if (messageId) {
        await updateMessageStatus(supabase, messageId, tenantId, 'failed', error)
      }
      return { success: false, error }
    }

    const twilioClient = twilio(accountSid, authToken)

    // Format numbers for WhatsApp (Twilio requires "whatsapp:" prefix)
    const fromWhatsApp = whatsappNumber.startsWith('whatsapp:')
      ? whatsappNumber
      : `whatsapp:${whatsappNumber}`

    const toWhatsApp = to.startsWith('whatsapp:')
      ? to
      : `whatsapp:${to}`

    console.log('[WhatsApp] Formatted numbers:', { from: fromWhatsApp, to: toWhatsApp })

    const message = await twilioClient.messages.create({
      body,
      from: fromWhatsApp,
      to: toWhatsApp,
    })

    console.log('[WhatsApp] Twilio API response:', {
      sid: message.sid,
      status: message.status,
      errorCode: message.errorCode,
      errorMessage: message.errorMessage
    })

    if (messageId) {
      await supabase
        .from('messages')
        .update({
          status: 'sent',
          external_id: message.sid,
          sent_at: new Date().toISOString(),
        })
        .eq('id', messageId)
        .eq('tenant_id', tenantId)
    }

    return { success: true, messageId: message.sid }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to send WhatsApp'
    console.error('WhatsApp send error:', error)
    
    if (messageId) {
      await updateMessageStatus(supabase, messageId, tenantId, 'failed', errorMessage)
    }

    return { success: false, error: errorMessage }
  }
}

// ============================================
// Email
// ============================================

export interface SendEmailParams {
  tenantId: string
  to: string
  subject: string
  body: string
  html?: string
  messageId?: string
  from?: string
}

/**
 * Send email directly via SendGrid
 */
export async function sendEmailDirect(params: SendEmailParams): Promise<SendResult> {
  const { tenantId, to, subject, body, html, messageId, from } = params
  const supabase = getSupabaseAdmin()

  try {
    const credentials = await resolveEmailCredentials(tenantId)
    
    if (!credentials) {
      const error = 'Email integration not configured. Please configure SendGrid in Settings → Integrations.'
      if (messageId) {
        await updateMessageStatus(supabase, messageId, tenantId, 'failed', error)
      }
      return { success: false, error }
    }

    sgMail.setApiKey(credentials.apiKey)

    const [response] = await sgMail.send({
      to,
      from: from || credentials.fromEmail,
      subject: subject || '(No subject)',
      text: body,
      html: html || body,
    })

    const externalId = response.headers['x-message-id']

    if (messageId) {
      await supabase
        .from('messages')
        .update({
          status: 'sent',
          external_id: externalId || response.toString(),
          sent_at: new Date().toISOString(),
        })
        .eq('id', messageId)
        .eq('tenant_id', tenantId)
    }

    return { success: true, messageId: externalId }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to send email'
    console.error('Email send error:', error)
    
    if (messageId) {
      await updateMessageStatus(supabase, messageId, tenantId, 'failed', errorMessage)
    }

    return { success: false, error: errorMessage }
  }
}

// ============================================
// System Emails (Invites, etc.)
// ============================================

export interface SendInviteEmailParams {
  to: string
  invitedByName?: string
  tenantName: string
  role: string
  inviteUrl: string
}

/**
 * Send user invite email (uses system SendGrid key)
 */
export async function sendInviteEmailDirect(params: SendInviteEmailParams): Promise<SendResult> {
  const { to, invitedByName, tenantName, role, inviteUrl } = params

  const apiKey = process.env.SENDGRID_API_KEY
  if (!apiKey) {
    return { success: false, error: 'SENDGRID_API_KEY not configured' }
  }

  sgMail.setApiKey(apiKey)

  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@solarbos.co.uk'
  const fromName = 'Cold Lava BOS'

  const subject = `You've been invited to join ${tenantName} on Cold Lava BOS`

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #06b6d4; margin: 0;">☀️ Cold Lava BOS</h1>
        </div>
        
        <h2 style="color: #1a1a1a;">You've been invited!</h2>
        
        <p>
          ${invitedByName ? `<strong>${invitedByName}</strong> has invited you` : "You've been invited"} 
          to join <strong>${tenantName}</strong> on Cold Lava BOS as a <strong>${role}</strong>.
        </p>
        
        <p>Cold Lava BOS is the UK's leading business operating system for businesses. Manage jobs, customers, quotes, compliance, and more – all in one place.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteUrl}" 
             style="display: inline-block; background-color: #06b6d4; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Accept Invitation
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          Or copy this link: <a href="${inviteUrl}" style="color: #06b6d4;">${inviteUrl}</a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="color: #666; font-size: 12px; text-align: center;">
          This email was sent by Cold Lava BOS. If you didn't expect this invitation, you can safely ignore it.
        </p>
      </body>
    </html>
  `

  try {
    const [response] = await sgMail.send({
      to,
      from: { email: fromEmail, name: fromName },
      subject,
      html,
    })

    return { 
      success: true, 
      messageId: response.headers['x-message-id'] 
    }
  } catch (error) {
    console.error('Invite email error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send invite email' 
    }
  }
}

// ============================================
// Helpers
// ============================================

async function updateMessageStatus(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  messageId: string,
  tenantId: string,
  status: 'sent' | 'failed',
  failureReason?: string
) {
  const update: Record<string, unknown> = { status }
  
  if (status === 'failed' && failureReason) {
    update.failed_at = new Date().toISOString()
    update.failure_reason = failureReason
  }
  
  await supabase
    .from('messages')
    .update(update)
    .eq('id', messageId)
    .eq('tenant_id', tenantId)
}
