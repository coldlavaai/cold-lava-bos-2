import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/webhooks/sendgrid - SendGrid delivery events callback
export async function POST(request: NextRequest) {
  try {
    const events = await request.json()

    // SendGrid sends an array of events
    if (!Array.isArray(events)) {
      return NextResponse.json(
        { error: 'Invalid payload format' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Process each event
    for (const event of events) {
      const messageId = event.sg_message_id || event['smtp-id']
      const eventType = event.event

      if (!messageId || !eventType) {
        continue
      }

      // Map SendGrid event to our status
      let status: string | null = null
      let deliveredAt: string | null = null

      switch (eventType) {
        case 'delivered':
          status = 'delivered'
          deliveredAt = new Date(event.timestamp * 1000).toISOString()
          break
        case 'bounce':
        case 'dropped':
        case 'deferred':
          status = 'failed'
          break
        case 'processed':
          status = 'sent'
          break
        // Other events like 'open', 'click', 'spamreport', 'unsubscribe' can be logged but don't change status
        default:
          // Log the event but don't update status
          console.log(`SendGrid event ${eventType} for message ${messageId}`)
      }

      if (status) {
        const updateData: Record<string, unknown> = {
          status,
        }

        if (deliveredAt) {
          updateData.delivered_at = deliveredAt
        }

        await supabase
          .from('messages')
          .update(updateData)
          .eq('external_id', messageId)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error processing SendGrid webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
