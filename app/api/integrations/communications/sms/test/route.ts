import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { resolveSmsCredentials } from '@/lib/services/integrations.service'
import type { TestSmsRequest } from '@/lib/api/types'
import twilio from 'twilio'
import { ensureE164 } from '@/lib/integrations/twilio'

/**
 * POST /api/integrations/communications/sms/test
 * Send a test SMS using the tenant's configured Twilio integration
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context. Please refresh the page and try again.' },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json() as TestSmsRequest

    // Get test phone number
    const toPhone = body.toPhone

    if (!toPhone) {
      return NextResponse.json(
        { error: 'No phone number specified for test SMS' },
        { status: 400 }
      )
    }

    // Normalize phone number to E.164 format
    const normalizedPhone = ensureE164(toPhone)

    // Resolve SMS credentials
    const creds = await resolveSmsCredentials(tenantId)

    if (!creds) {
      return NextResponse.json(
        { error: 'SMS integration not configured. Please save your Twilio credentials first.' },
        { status: 400 }
      )
    }

    console.log('[Test SMS] Sending to:', normalizedPhone, 'from:', creds.phoneNumber, 'tenant:', tenantId)

    // Send test SMS via Twilio
    const client = twilio(creds.accountSid, creds.authToken)

    const message = await client.messages.create({
      body: 'Test SMS from Cold Lava. If you received this, your Twilio integration is configured correctly! ☀️',
      from: ensureE164(creds.phoneNumber),
      to: normalizedPhone,
    })

    console.log('[Test SMS] Success, SID:', message.sid)

    return NextResponse.json({
      success: true,
      message: `Test SMS sent successfully to ${normalizedPhone}`,
    })
  } catch (error: unknown) {
    console.error('[Test SMS] Error:', error)

    // Handle Twilio-specific errors with clear messages
    if (error && typeof error === 'object' && 'message' in error) {
      const twilioError = error as { message: string; code?: number; status?: number }
      return NextResponse.json(
        {
          error: `Failed to send test SMS: ${twilioError.message}`,
          success: false,
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to send test SMS. Please check your Twilio configuration.',
        success: false,
      },
      { status: 500 }
    )
  }
}
