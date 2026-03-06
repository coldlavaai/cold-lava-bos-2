import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getIntegrationConnection } from '@/lib/services/integrations.service'
import { revokeOtterAccess } from '@/lib/services/otter-api.service'

/**
 * POST /api/integrations/otter/disconnect
 * Disconnect Otter OAuth integration and revoke access
 * Session 94: Otter OAuth integration
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

    // Get integration
    const integration = await getIntegrationConnection(tenantId, 'otter')

    if (!integration) {
      return NextResponse.json({
        data: {
          success: true,
          message: 'No Otter integration to disconnect',
        },
      })
    }

    // Try to revoke access with Otter (best effort)
    if (integration.oauth_access_token) {
      try {
        await revokeOtterAccess(integration.oauth_access_token)
      } catch (error) {
        console.warn('[Otter Disconnect] Failed to revoke access with Otter:', error)
        // Continue anyway - we'll delete our records
      }
    }

    // Delete integration record
    const { error } = await supabase
      .from('integration_connections')
      .delete()
      .eq('id', integration.id)

    if (error) {
      console.error('[Otter Disconnect] Failed to delete integration:', error)
      return NextResponse.json(
        { error: 'Failed to disconnect Otter integration' },
        { status: 500 }
      )
    }

    console.log('[Otter Disconnect] Successfully disconnected:', {
      tenant_id: tenantId,
      integration_id: integration.id,
    })

    return NextResponse.json({
      data: {
        success: true,
        message: 'Otter integration disconnected successfully',
      },
    })
  } catch (error) {
    console.error('Error in POST /api/integrations/otter/disconnect:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
