import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { refreshQuickBooksToken } from '@/lib/services/integrations.service'

/**
 * POST /api/integrations/quickbooks/test
 * Tests the QuickBooks integration by fetching company info
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

    // Get valid access token (refreshes if needed)
    const credentials = await refreshQuickBooksToken(tenantId, user.id)

    if (!credentials) {
      return NextResponse.json({
        success: false,
        message: 'QuickBooks not connected or token refresh failed. Please reconnect.',
      })
    }

    // Test connection by fetching company info
    const isProduction = process.env.QUICKBOOKS_ENVIRONMENT === 'production'
    const baseUrl = isProduction 
      ? 'https://quickbooks.api.intuit.com'
      : 'https://sandbox-quickbooks.api.intuit.com'

    const response = await fetch(
      `${baseUrl}/v3/company/${credentials.realmId}/companyinfo/${credentials.realmId}`,
      {
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`,
          'Accept': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[QuickBooks Test] API error:', response.status, errorText)
      
      // Update last_error in database
      await supabase
        .from('integration_connections')
        .update({
          last_error: `API test failed: ${response.status}`,
          last_verified_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId)
        .eq('integration_type', 'quickbooks')

      return NextResponse.json({
        success: false,
        message: `QuickBooks API returned error: ${response.status}`,
      })
    }

    const data = await response.json()
    const companyName = data.CompanyInfo?.CompanyName || 'Unknown Company'

    // Update last_verified_at in database
    await supabase
      .from('integration_connections')
      .update({
        last_verified_at: new Date().toISOString(),
        last_error: null,
      })
      .eq('tenant_id', tenantId)
      .eq('integration_type', 'quickbooks')

    return NextResponse.json({
      success: true,
      message: `Successfully connected to QuickBooks: ${companyName}`,
      details: {
        companyName,
        realmId: credentials.realmId,
      },
    })
  } catch (error) {
    console.error('Error in POST /api/integrations/quickbooks/test:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
