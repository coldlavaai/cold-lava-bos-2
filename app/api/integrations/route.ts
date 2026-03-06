import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import {
  resolveEmailCredentials,
  resolveSmsCredentials,
  resolveOpenSolarCredentials,
  resolveStripeCredentials,
  resolveXeroCredentials,
  resolveQuickBooksCredentials,
  getIntegrationConnection,
} from '@/lib/services/integrations.service'
import type { GetIntegrationsResponse } from '@/lib/api/types'

/**
 * GET /api/integrations
 * Returns the status of all integrations for the current tenant.
 * Session 90: Unified endpoint for all integration types.
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

    // Resolve all integration credentials — each wrapped individually so one failure doesn't break the whole page
    const [
      emailCreds, smsCreds, openSolarCreds, stripeCreds, xeroCreds, quickBooksCreds,
      emailIntegration, smsIntegration, openSolarIntegration, stripeIntegration,
      googleCalendarIntegration, otterIntegration, xeroIntegration, quickBooksIntegration,
    ] = await Promise.all([
      resolveEmailCredentials(tenantId).catch(e => { console.error('[integrations] emailCreds error:', e); return null }),
      resolveSmsCredentials(tenantId).catch(e => { console.error('[integrations] smsCreds error:', e); return null }),
      resolveOpenSolarCredentials(tenantId).catch(e => { console.error('[integrations] openSolarCreds error:', e); return null }),
      resolveStripeCredentials(tenantId).catch(e => { console.error('[integrations] stripeCreds error:', e); return null }),
      resolveXeroCredentials(tenantId).catch(e => { console.error('[integrations] xeroCreds error:', e); return null }),
      resolveQuickBooksCredentials(tenantId).catch(e => { console.error('[integrations] quickBooksCreds error:', e); return null }),
      getIntegrationConnection(tenantId, 'sendgrid').catch(() => null),
      getIntegrationConnection(tenantId, 'twilio').catch(() => null),
      getIntegrationConnection(tenantId, 'opensolar').catch(() => null),
      getIntegrationConnection(tenantId, 'stripe').catch(() => null),
      getIntegrationConnection(tenantId, 'google_calendar').catch(() => null),
      getIntegrationConnection(tenantId, 'otter').catch(() => null),
      getIntegrationConnection(tenantId, 'xero').catch(() => null),
      getIntegrationConnection(tenantId, 'quickbooks').catch(() => null),
    ])

    // Build response with grouped integrations
    const response: GetIntegrationsResponse = {
      categories: {
        communications: {
          email: {
            integration_type: 'sendgrid',
            name: 'SendGrid',
            description: 'Email provider for transactional emails',
            category: 'communications',
            configured: !!emailCreds,
            is_active: emailIntegration?.is_active ?? true,
            last_verified_at: emailIntegration?.last_verified_at ?? null,
            last_error: emailIntegration?.last_error ?? null,
            details: {
              fromEmail: emailCreds?.fromEmail ?? null,
              fromName: emailCreds?.fromName ?? null,
            },
          },
          sms: {
            integration_type: 'twilio',
            name: 'Twilio',
            description: 'SMS & WhatsApp messaging',
            category: 'communications',
            configured: !!smsCreds,
            is_active: smsIntegration?.is_active ?? true,
            last_verified_at: smsIntegration?.last_verified_at ?? null,
            last_error: smsIntegration?.last_error ?? null,
            details: {
              accountSid: smsCreds?.accountSid ?? null,
              phoneNumber: smsCreds?.phoneNumber ?? null,
              whatsappNumber: smsCreds?.whatsappNumber ?? null,
            },
          },
        },
        // SOLAR-SPECIFIC: hidden for Cold Lava
        solar: {
          opensolar: {
            integration_type: 'opensolar',
            name: 'OpenSolar',
            description: 'Solar design proposals and project management',
            category: 'solar',
            configured: !!openSolarCreds,
            is_active: openSolarIntegration?.is_active ?? true,
            last_verified_at: openSolarIntegration?.last_verified_at ?? null,
            last_error: openSolarIntegration?.last_error ?? null,
            details: {
              organizationId: openSolarCreds?.organizationId ?? null,
              defaultProjectId: openSolarCreds?.defaultProjectId ?? null,
            },
          },
        },
        payments: {
          stripe: {
            integration_type: 'stripe',
            name: 'Stripe',
            description: 'Payment processing',
            category: 'payments',
            configured: !!stripeCreds,
            is_active: stripeIntegration?.is_active ?? true,
            last_verified_at: stripeIntegration?.last_verified_at ?? null,
            last_error: stripeIntegration?.last_error ?? null,
            details: {
              publishableKey: stripeCreds?.publishableKey ? '••••••' : null,
              mode: stripeCreds?.publishableKey?.startsWith('pk_test_') ? 'test' : 'live',
            },
          },
        },
        accounting: {
          xero: {
            integration_type: 'xero',
            name: 'Xero',
            description: 'Sync invoices and contacts with Xero accounting',
            category: 'accounting',
            configured: !!xeroCreds,
            is_active: xeroIntegration?.is_active ?? false,
            last_verified_at: xeroIntegration?.last_verified_at ?? null,
            last_error: xeroIntegration?.last_error ?? null,
            details: {
              xeroTenantName: xeroCreds?.xeroTenantName ?? null,
              xeroTenantId: xeroCreds?.xeroTenantId ?? null,
            },
          },
          quickbooks: {
            integration_type: 'quickbooks',
            name: 'QuickBooks',
            description: 'Sync invoices and contacts with QuickBooks accounting',
            category: 'accounting',
            configured: !!quickBooksCreds,
            is_active: quickBooksIntegration?.is_active ?? false,
            last_verified_at: quickBooksIntegration?.last_verified_at ?? null,
            last_error: quickBooksIntegration?.last_error ?? null,
            details: {
              companyName: quickBooksCreds?.companyName ?? null,
              realmId: quickBooksCreds?.realmId ?? null,
            },
          },
        },
        calendar: {
          google_calendar: {
            integration_type: 'google_calendar',
            name: 'Google Calendar',
            description: 'Appointment and calendar sync',
            category: 'calendar',
            configured: !!googleCalendarIntegration,
            is_active: googleCalendarIntegration?.is_active ?? false,
            last_verified_at: googleCalendarIntegration?.last_verified_at ?? null,
            last_error: 'OAuth integration coming soon',
            details: {
              calendarId: (googleCalendarIntegration?.credentials as Record<string, unknown>)?.calendar_id as string | null ?? null,
            },
          },
        },
        transcription: {
          otter: {
            integration_type: 'otter',
            name: 'Otter.ai',
            description: 'Call recordings, transcriptions, and AI-generated summaries',
            category: 'transcription',
            configured: !!otterIntegration,
            is_active: otterIntegration?.is_active ?? false,
            last_verified_at: otterIntegration?.last_verified_at ?? null,
            last_error: otterIntegration?.last_error ?? null,
            details: {
              webhookUrl: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/webhooks/otter`,
              hasOAuth: !!(otterIntegration?.oauth_access_token),
              otter_email: (otterIntegration?.credentials as Record<string, unknown>)?.otter_email as string | null ?? null,
              otter_name: (otterIntegration?.credentials as Record<string, unknown>)?.otter_name as string | null ?? null,
            },
          },
        },
      },
    }

    return NextResponse.json({ data: response })
  } catch (error) {
    console.error('Error in GET /api/integrations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
