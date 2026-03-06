import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * POST /api/integrations/quickbooks/disconnect
 * Disconnects the QuickBooks integration by removing stored credentials
 * Session 109: QuickBooks Integration
 */
export async function POST() {
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

    // Delete or deactivate the integration
    const { error } = await supabase
      .from('integration_connections')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('integration_type', 'quickbooks')

    if (error) {
      console.error('[QuickBooks Disconnect] Database error:', error)
      return NextResponse.json(
        { success: false, message: 'Failed to disconnect QuickBooks' },
        { status: 500 }
      )
    }

    console.log('[QuickBooks Disconnect] Successfully disconnected for tenant:', tenantId)

    return NextResponse.json({
      success: true,
      message: 'QuickBooks disconnected successfully',
    })
  } catch (error) {
    console.error('Error in POST /api/integrations/quickbooks/disconnect:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
