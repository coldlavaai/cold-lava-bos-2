import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/integrations/status
 * Check which integrations are configured for the current tenant
 * Returns a simple status object for each integration type
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    // Check integration_connections table for configured integrations
    const { data: connections, error } = await supabase
      .from('integration_connections')
      .select('integration_type, is_active, credentials')
      .eq('tenant_id', tenantId)

    if (error) {
      console.error('Error fetching integration status:', error)
      return NextResponse.json(
        { error: 'Failed to fetch integration status' },
        { status: 500 }
      )
    }

    // Build status object
    const status: Record<string, { configured: boolean; active: boolean }> = {
      email: { configured: false, active: false },
      sms: { configured: false, active: false },
      whatsapp: { configured: false, active: false },
    }

    for (const conn of connections || []) {
      const integrationType = conn.integration_type?.toLowerCase()

      // Map integration_type to status key
      let statusKey: string | null = null
      if (integrationType === 'sendgrid' || integrationType === 'gmail' || integrationType === 'outlook' || integrationType === 'smtp') {
        statusKey = 'email'
      } else if (integrationType === 'twilio') {
        statusKey = 'sms' // Twilio handles both SMS and WhatsApp
      }

      if (statusKey && status[statusKey]) {
        status[statusKey] = {
          configured: true,
          active: conn.is_active ?? false,
        }
      }

      // Check if Twilio has WhatsApp number configured
      if (integrationType === 'twilio') {
        const creds = conn.credentials as { whatsapp_number?: string | null }
        if (creds?.whatsapp_number) {
          status.whatsapp = {
            configured: true,
            active: conn.is_active ?? false,
          }
        }
      }
    }

    // Also check legacy sms_accounts table for backwards compatibility
    const { data: smsAccounts } = await supabase
      .from('sms_accounts')
      .select('id, is_default')
      .eq('tenant_id', tenantId)
      .eq('is_default', true)
      .limit(1)

    if (smsAccounts && smsAccounts.length > 0 && !status.sms.configured) {
      status.sms = { configured: true, active: true }
    }

    // Check legacy email_accounts table
    const { data: emailAccounts } = await supabase
      .from('email_accounts')
      .select('id, is_default')
      .eq('tenant_id', tenantId)
      .eq('is_default', true)
      .limit(1)

    if (emailAccounts && emailAccounts.length > 0 && !status.email.configured) {
      status.email = { configured: true, active: true }
    }

    return NextResponse.json({
      data: status,
      message: 'Integration status retrieved successfully',
    })
  } catch (error) {
    console.error('Error in GET /api/integrations/status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
