import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import { phoneVariations } from '@/lib/integrations/twilio'

/**
 * POST /api/webhooks/twilio/inbound - Handle incoming SMS/WhatsApp messages
 *
 * Webhook URL: https://cold-lava-bos-app.vercel.app/api/webhooks/twilio/inbound
 *
 * Performance: We respond to Twilio immediately with empty TwiML.
 * Media attachments are stored as Twilio URLs (not downloaded) to avoid
 * blocking the response and triggering Twilio's 60-second retry cycle.
 * A separate proxy endpoint serves media with Twilio auth on demand.
 */

// Empty TwiML response — tells Twilio we received the message with no auto-reply
const TWIML_OK = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'
const TWIML_HEADERS = { 'Content-Type': 'text/xml' }

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await request.text()
    const params = new URLSearchParams(body)

    // Verify Twilio signature
    const twilioSignature = request.headers.get('x-twilio-signature')
    const url = request.url

    if (twilioSignature && process.env.TWILIO_AUTH_TOKEN) {
      const isValid = twilio.validateRequest(
        process.env.TWILIO_AUTH_TOKEN,
        twilioSignature,
        url,
        Object.fromEntries(params)
      )
      if (!isValid) {
        console.warn('[Twilio Inbound] Signature validation failed — allowing through (debug mode)')
      }
    }

    // Extract message fields
    const messageSid = params.get('MessageSid')
    const from = params.get('From') // "+447xxx" or "whatsapp:+447xxx"
    const to = params.get('To')
    const messageBody = params.get('Body') || ''
    const numMedia = parseInt(params.get('NumMedia') || '0', 10)

    if (!messageSid || !from) {
      return new Response(TWIML_OK, { headers: TWIML_HEADERS })
    }

    if (!messageBody && numMedia === 0) {
      return new Response(TWIML_OK, { headers: TWIML_HEADERS })
    }

    const isWhatsApp = from.startsWith('whatsapp:')
    const channel = isWhatsApp ? 'whatsapp' : 'sms'
    const normalizedFrom = isWhatsApp ? from.replace('whatsapp:', '') : from

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Find customer by phone number
    const variations = phoneVariations(normalizedFrom)
    const orFilter = variations.map(p => `phone.eq.${p}`).join(',')

    const { data: customer } = await supabase
      .from('customers')
      .select('id, tenant_id, name')
      .or(orFilter)
      .limit(1)
      .single()

    if (!customer) {
      console.log('[Twilio Inbound] Customer not found for phone:', normalizedFrom)
      return new Response(TWIML_OK, { headers: TWIML_HEADERS })
    }

    // Find or create message thread
    let { data: thread } = await supabase
      .from('message_threads')
      .select('id')
      .eq('customer_id', customer.id)
      .eq('tenant_id', customer.tenant_id)
      .eq('channel', channel)
      .single()

    if (!thread) {
      const { data: newThread, error: threadError } = await supabase
        .from('message_threads')
        .insert({
          tenant_id: customer.tenant_id,
          customer_id: customer.id,
          channel,
          subject: `${channel.toUpperCase()} with ${customer.name || 'Customer'}`,
          is_read: false,
        })
        .select('id')
        .single()

      if (threadError) {
        console.error('[Twilio Inbound] Failed to create thread:', threadError)
        return new Response(TWIML_OK, { headers: TWIML_HEADERS })
      }
      thread = newThread
    }

    // Build media array — store Twilio URLs directly, no download at webhook time.
    // Media is served via /api/media/twilio proxy which adds auth on demand.
    const mediaArray: Array<{
      url: string
      content_type: string
      filename: string
      twilio_url: string
    }> = []

    for (let i = 0; i < numMedia; i++) {
      const mediaUrl = params.get(`MediaUrl${i}`)
      const mediaContentType = params.get(`MediaContentType${i}`)
      if (!mediaUrl || !mediaContentType) continue

      const fileExt = mediaContentType.split('/')[1]?.split(';')[0] || 'bin'
      const filename = `${messageSid}_${i}.${fileExt}`

      mediaArray.push({
        url: `/api/media/twilio?url=${encodeURIComponent(mediaUrl)}`,
        content_type: mediaContentType,
        filename,
        twilio_url: mediaUrl,
      })
    }

    // Clean body text
    let cleanBody = messageBody
    if (numMedia > 0 && cleanBody) {
      const trimmed = cleanBody.trim()
      if (trimmed.startsWith('http') || trimmed.startsWith('MM') || (trimmed.length > 30 && !trimmed.includes(' '))) {
        cleanBody = ''
      }
    }

    // Store message and update thread in parallel
    const [{ error: messageError }] = await Promise.all([
      supabase.from('messages').insert({
        tenant_id: customer.tenant_id,
        thread_id: thread!.id,
        direction: 'inbound',
        channel,
        sender: normalizedFrom,
        recipient: to,
        body: cleanBody,
        external_id: messageSid,
        status: 'delivered',
        media: mediaArray.length > 0 ? mediaArray : null,
      }),
      supabase.from('message_threads').update({
        last_message_at: new Date().toISOString(),
        is_read: false,
      }).eq('id', thread!.id),
    ])

    if (messageError) {
      console.error('[Twilio Inbound] Failed to store message:', messageError)
    } else {
      console.log(`[Twilio Inbound] Stored message for ${customer.name} in ${Date.now() - startTime}ms`)
    }

    return new Response(TWIML_OK, { headers: TWIML_HEADERS })
  } catch (error) {
    console.error('[Twilio Inbound] Error:', error)
    // Always return valid TwiML to avoid Twilio retry cycle
    return new Response(TWIML_OK, { headers: TWIML_HEADERS })
  }
}
