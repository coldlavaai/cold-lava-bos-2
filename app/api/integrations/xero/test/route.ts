import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { refreshXeroToken } from '@/lib/services/integrations.service'

/**
 * POST /api/integrations/xero/test
 * Tests the Xero integration by fetching organization info
 * Session 109: Xero Integration
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

    // Get valid access token (refreshes if needed)
    const credentials = await refreshXeroToken(tenantId, user.id)

    if (!credentials) {
      return NextResponse.json({
        success: false,
        message: 'Xero not connected or token refresh failed. Please reconnect.',
      })
    }

    // Test connection by fetching organization info
    const response = await fetch('https://api.xero.com/api.xro/2.0/Organisation', {
      headers: {
        'Authorization': `Bearer ${credentials.accessToken}`,
        'Xero-Tenant-Id': credentials.xeroTenantId || '',
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Xero Test] API error:', response.status, errorText)
      
      // Update last_error in database
      await supabase
        .from('integration_connections')
        .update({
          last_error: `API test failed: ${response.status}`,
          last_verified_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId)
        .eq('integration_type', 'xero')

      return NextResponse.json({
        success: false,
        message: `Xero API returned error: ${response.status}`,
      })
    }

    const data = await response.json()
    const orgName = data.Organisations?.[0]?.Name || 'Unknown Organization'

    // Update last_verified_at in database
    await supabase
      .from('integration_connections')
      .update({
        last_verified_at: new Date().toISOString(),
        last_error: null,
      })
      .eq('tenant_id', tenantId)
      .eq('integration_type', 'xero')

    return NextResponse.json({
      success: true,
      message: `Successfully connected to Xero organization: ${orgName}`,
      details: {
        organizationName: orgName,
        xeroTenantId: credentials.xeroTenantId,
      },
    })
  } catch (error) {
    console.error('Error in POST /api/integrations/xero/test:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
