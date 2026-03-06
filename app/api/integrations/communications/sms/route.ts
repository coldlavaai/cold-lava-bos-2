import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { upsertIntegrationConnection } from '@/lib/services/integrations.service'
import { decryptCredentials } from '@/lib/security/credentials-encryption'
import type { ConfigureTwilioRequest } from '@/lib/api/types'

/**
 * GET /api/integrations/communications/sms
 * Fetch existing Twilio config for form prefill (excludes auth_token)
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

    // Fetch existing Twilio connection — use admin client to bypass RLS for server-side reads
    const adminClient = createAdminClient()
    const { data: connection } = await adminClient
      .from('integration_connections')
      .select('credentials, is_active')
      .eq('tenant_id', tenantId)
      .eq('integration_type', 'twilio')
      .single()

    if (!connection) {
      return NextResponse.json({
        configured: false,
      })
    }

    // Decrypt credentials first (they're encrypted in the database)
    const decrypted = decryptCredentials(connection.credentials as Record<string, unknown>)
    const creds = decrypted as {
      account_sid?: string
      phone_number?: string
      whatsapp_number?: string | null
      auth_token?: string
    }

    return NextResponse.json({
      configured: true,
      accountSid: creds.account_sid || null,
      phoneNumber: creds.phone_number || null,
      whatsappNumber: creds.whatsapp_number || null,
      isActive: connection.is_active ?? false,
      // DO NOT return auth_token
    })
  } catch (error) {
    console.error('Error in GET /api/integrations/communications/sms:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/integrations/communications/sms
 * Configure Twilio SMS integration for the current tenant
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
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json() as ConfigureTwilioRequest

    // Validate required fields
    if (!body.accountSid || !body.authToken || !body.phoneNumber) {
      return NextResponse.json(
        { error: 'Missing required fields: accountSid, authToken, phoneNumber' },
        { status: 400 }
      )
    }

    // Store credentials in integration_connections
    // Note: In production, consider encrypting sensitive values
    const credentials = {
      account_sid: body.accountSid,
      auth_token: body.authToken,
      phone_number: body.phoneNumber,
      whatsapp_number: body.whatsappNumber || null,
    }

    const integration = await upsertIntegrationConnection(
      tenantId,
      'twilio',
      credentials,
      user.id
    )

    if (!integration) {
      return NextResponse.json(
        { error: 'Failed to save integration' },
        { status: 500 }
      )
    }

    // Return sanitized response (no auth token)
    return NextResponse.json({
      success: true,
      message: 'Twilio integration configured successfully',
      integration: {
        id: integration.id,
        integration_type: integration.integration_type,
        configured: true,
        details: {
          phoneNumber: body.phoneNumber,
          whatsappNumber: body.whatsappNumber || null,
        },
      },
    })
  } catch (error) {
    console.error('Error in POST /api/integrations/communications/sms:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
