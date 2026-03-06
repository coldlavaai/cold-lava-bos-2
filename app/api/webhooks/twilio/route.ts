import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'

// POST /api/webhooks/twilio - Twilio delivery status callback
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const params = new URLSearchParams(body)

    // Verify Twilio signature (security)
    const twilioSignature = request.headers.get('x-twilio-signature')
    const url = new URL(request.url).toString()

    if (twilioSignature && process.env.TWILIO_AUTH_TOKEN) {
      const isValid = twilio.validateRequest(
        process.env.TWILIO_AUTH_TOKEN,
        twilioSignature,
        url,
        Object.fromEntries(params)
      )

      if (!isValid) {
        console.error('Invalid Twilio signature')
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        )
      }
    }

    // Extract status information
    const messageSid = params.get('MessageSid')
    const messageStatus = params.get('MessageStatus')

    if (!messageSid || !messageStatus) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Map Twilio status to our status
    let status: string
    switch (messageStatus) {
      case 'delivered':
        status = 'delivered'
        break
      case 'sent':
        status = 'sent'
        break
      case 'failed':
      case 'undelivered':
        status = 'failed'
        break
      default:
        status = messageStatus
    }

    // Update message in database using service role (no tenant context needed from external webhook)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const updateData: Record<string, unknown> = {
      status,
    }

    if (status === 'delivered') {
      updateData.delivered_at = new Date().toISOString()
    }

    await supabase
      .from('messages')
      .update(updateData)
      .eq('external_id', messageSid)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error processing Twilio webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
