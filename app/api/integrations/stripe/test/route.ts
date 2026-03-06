import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { resolveStripeCredentials } from '@/lib/services/integrations.service'
import type { TestIntegrationResponse } from '@/lib/api/types'

/**
 * POST /api/integrations/stripe/test
 * Test Stripe connection using stored credentials
 * Session 90: Stripe test endpoint (stub - basic validation)
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

    // Resolve Stripe credentials
    const credentials = await resolveStripeCredentials(tenantId)

    if (!credentials) {
      return NextResponse.json({
        data: {
          success: false,
          message: 'Stripe integration not configured',
        } as TestIntegrationResponse,
      })
    }

    // Test connection by calling Stripe API (retrieve account)
    try {
      const response = await fetch('https://api.stripe.com/v1/account', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${credentials.secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('[Stripe Test] API error:', {
          status: response.status,
          error: errorData,
        })

        // Update last_error
        await supabase
          .from('integration_connections')
          .update({
            last_error: `Stripe API error: ${response.status}`,
          })
          .eq('tenant_id', tenantId)
          .eq('integration_type', 'stripe')

        return NextResponse.json({
          data: {
            success: false,
            message: `Stripe API error: ${response.status} ${response.statusText}`,
          } as TestIntegrationResponse,
        })
      }

      const data = await response.json()

      // Update last_verified_at
      await supabase
        .from('integration_connections')
        .update({
          last_verified_at: new Date().toISOString(),
          last_error: null,
        })
        .eq('tenant_id', tenantId)
        .eq('integration_type', 'stripe')

      const isTestMode = credentials.publishableKey.startsWith('pk_test_')

      return NextResponse.json({
        data: {
          success: true,
          message: `Successfully connected to Stripe (${isTestMode ? 'test' : 'live'} mode)`,
          details: {
            accountId: data.id,
            businessName: data.business_profile?.name || 'Unknown',
            mode: isTestMode ? 'test' : 'live',
          },
        } as TestIntegrationResponse,
      })
    } catch (apiError) {
      console.error('[Stripe Test] Connection error:', apiError)

      // Update last_error
      await supabase
        .from('integration_connections')
        .update({
          last_error: apiError instanceof Error ? apiError.message : 'Connection failed',
        })
        .eq('tenant_id', tenantId)
        .eq('integration_type', 'stripe')

      return NextResponse.json({
        data: {
          success: false,
          message: apiError instanceof Error ? apiError.message : 'Failed to connect to Stripe',
        } as TestIntegrationResponse,
      })
    }
  } catch (error) {
    console.error('Error in POST /api/integrations/stripe/test:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
