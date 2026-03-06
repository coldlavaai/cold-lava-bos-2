import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { upsertIntegrationConnection } from '@/lib/services/integrations.service'
import type { ConfigureOtterRequest } from '@/lib/api/types'

/**
 * POST /api/integrations/otter/configure
 * Configure Otter.ai integration for the current tenant
 * Session 93: Otter webhook integration endpoint
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

    // Parse and validate request body
    const body: ConfigureOtterRequest = await request.json()

    if (!body.webhookSecret || typeof body.webhookSecret !== 'string' || body.webhookSecret.trim().length === 0) {
      return NextResponse.json(
        { error: 'Webhook secret is required' },
        { status: 400 }
      )
    }

    // Store credentials in integration_connections
    const credentials = {
      webhook_secret: body.webhookSecret.trim(),
    }

    const integration = await upsertIntegrationConnection(
      tenantId,
      'otter',
      credentials,
      user.id
    )

    if (!integration) {
      return NextResponse.json(
        { error: 'Failed to save Otter integration' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: {
        success: true,
        message: 'Otter integration configured successfully',
        integration: {
          id: integration.id,
          type: 'otter',
          configured: true,
        },
      },
    })
  } catch (error) {
    console.error('Error in POST /api/integrations/otter/configure:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
