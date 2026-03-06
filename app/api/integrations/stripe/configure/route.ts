import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { upsertIntegrationConnection } from '@/lib/services/integrations.service'
import type { ConfigureStripeRequest } from '@/lib/api/types'

/**
 * POST /api/integrations/stripe/configure
 * Configure Stripe integration for the current tenant
 * Session 90: Stripe integration endpoint (stub - basic validation only)
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
    const body: ConfigureStripeRequest = await request.json()

    if (!body.publishableKey || !body.secretKey) {
      return NextResponse.json(
        { error: 'Publishable key and secret key are required' },
        { status: 400 }
      )
    }

    // Basic format validation
    const isTestMode = body.publishableKey.startsWith('pk_test_') && body.secretKey.startsWith('sk_test_')
    const isLiveMode = body.publishableKey.startsWith('pk_live_') && body.secretKey.startsWith('sk_live_')

    if (!isTestMode && !isLiveMode) {
      return NextResponse.json(
        { error: 'Invalid Stripe key format. Keys must start with pk_test_/sk_test_ or pk_live_/sk_live_' },
        { status: 400 }
      )
    }

    // Store credentials in integration_connections
    const credentials = {
      publishable_key: body.publishableKey,
      secret_key: body.secretKey,
      webhook_secret: body.webhookSecret || null,
      mode: isTestMode ? 'test' : 'live',
    }

    const integration = await upsertIntegrationConnection(
      tenantId,
      'stripe',
      credentials,
      user.id
    )

    if (!integration) {
      return NextResponse.json(
        { error: 'Failed to save Stripe integration' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: {
        success: true,
        message: `Stripe integration configured successfully (${isTestMode ? 'test' : 'live'} mode)`,
        warning: isTestMode ? null : 'Live mode keys detected. Ensure you have proper security measures in place.',
        integration: {
          id: integration.id,
          type: 'stripe',
          configured: true,
          mode: isTestMode ? 'test' : 'live',
        },
      },
    })
  } catch (error) {
    console.error('Error in POST /api/integrations/stripe/configure:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
