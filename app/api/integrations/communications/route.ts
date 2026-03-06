import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { resolveEmailCredentials, resolveSmsCredentials } from '@/lib/services/integrations.service'

/**
 * GET /api/integrations/communications
 * Returns the status of communications providers (SendGrid email, Twilio SMS)
 * for the current tenant.
 *
 * Updated in Session 89 to check tenant-specific integrations first,
 * then fall back to environment variables.
 */
export async function GET() {
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
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    // Resolve email credentials (integration_connections > env vars)
    const emailCreds = await resolveEmailCredentials(tenantId)
    const sendgridConfigured = !!emailCreds

    // Resolve SMS credentials (integration_connections > env vars)
    const smsCreds = await resolveSmsCredentials(tenantId)
    const twilioConfigured = !!smsCreds

    // Return provider statuses (wrapped in data field for API client)
    return NextResponse.json({
      data: {
        communications: {
          email: {
            provider: 'sendgrid',
            name: 'SendGrid',
            channel: 'email',
            configured: sendgridConfigured,
            details: {
              fromEmail: emailCreds?.fromEmail || null,
              fromName: emailCreds?.fromName || null,
            },
          },
          sms: {
            provider: 'twilio',
            name: 'Twilio',
            channel: 'sms',
            configured: twilioConfigured,
            details: {
              phoneNumber: smsCreds?.phoneNumber || null,
            },
          },
        },
      },
    })
  } catch (error) {
    console.error('Error in GET /api/integrations/communications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
