import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { upsertIntegrationConnection } from '@/lib/services/integrations.service'
import type { ConfigureEmailIntegrationRequest } from '@/lib/api/types'

/**
 * POST /api/integrations/communications/email
 * Configure SendGrid email integration for the current tenant
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
    const body = await request.json() as ConfigureEmailIntegrationRequest

    // Validate required fields
    if (!body.apiKey || !body.fromEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: apiKey, fromEmail' },
        { status: 400 }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.fromEmail)) {
      return NextResponse.json(
        { error: 'Invalid email address format' },
        { status: 400 }
      )
    }

    // Store credentials in integration_connections
    // Note: In production, consider encrypting the API key
    const credentials = {
      api_key: body.apiKey,
      from_email: body.fromEmail,
      from_name: body.fromName || null,
    }

    const integration = await upsertIntegrationConnection(
      tenantId,
      'sendgrid',
      credentials,
      user.id
    )

    if (!integration) {
      return NextResponse.json(
        { error: 'Failed to save integration' },
        { status: 500 }
      )
    }

    // Return sanitized response (no API key)
    return NextResponse.json({
      success: true,
      message: 'SendGrid integration configured successfully',
      integration: {
        id: integration.id,
        integration_type: integration.integration_type,
        configured: true,
        details: {
          fromEmail: body.fromEmail,
          fromName: body.fromName || null,
        },
      },
    })
  } catch (error) {
    console.error('Error in POST /api/integrations/communications/email:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
