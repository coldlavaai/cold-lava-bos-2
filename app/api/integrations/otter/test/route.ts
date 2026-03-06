import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getIntegrationConnection } from '@/lib/services/integrations.service'
import { decryptCredentials } from '@/lib/security/credentials-encryption'
import type { TestIntegrationResponse } from '@/lib/api/types'

/**
 * POST /api/integrations/otter/test
 * Test Otter integration configuration (webhook secret is set)
 * Session 93: Otter test endpoint
 */
export async function POST(_request: NextRequest) {
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

    // Get Otter integration
    const integration = await getIntegrationConnection(tenantId, 'otter')

    if (!integration) {
      return NextResponse.json({
        data: {
          success: false,
          message: 'Otter integration not configured',
        } as TestIntegrationResponse,
      })
    }

    // Decrypt and verify credentials
    const credentials = decryptCredentials(integration.credentials)

    // Check webhook secret
    const hasWebhookSecret = !!(credentials?.webhook_secret && typeof credentials.webhook_secret === 'string')

    // Check OAuth
    const hasOAuth = !!(integration.oauth_access_token && integration.oauth_refresh_token)

    if (!hasWebhookSecret && !hasOAuth) {
      return NextResponse.json({
        data: {
          success: false,
          message: 'Neither webhook secret nor OAuth connection found. Please configure at least one.',
        } as TestIntegrationResponse,
      })
    }

    // Build status message
    const features: string[] = []
    if (hasOAuth) {
      features.push('OAuth connected')
      if (credentials?.otter_email) {
        features.push(`as ${credentials.otter_email}`)
      }
    }
    if (hasWebhookSecret) {
      features.push('Webhook configured')
    }

    const message = `Otter integration active: ${features.join(', ')}`

    // Update last_verified_at
    await supabase
      .from('integration_connections')
      .update({
        last_verified_at: new Date().toISOString(),
        last_error: null,
      })
      .eq('id', integration.id)

    return NextResponse.json({
      data: {
        success: true,
        message,
        details: {
          webhookUrl: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/webhooks/otter`,
          secretConfigured: hasWebhookSecret,
          oauthConnected: hasOAuth,
          otterEmail: credentials?.otter_email as string | undefined,
        },
      } as TestIntegrationResponse,
    })
  } catch (error) {
    console.error('Error in POST /api/integrations/otter/test:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
