import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/integrations/quickbooks/oauth/start
 * Initiates QuickBooks OAuth flow
 * Session 109: QuickBooks Integration
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/login?error=unauthorized`
      )
    }

    // Get tenant ID
    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()

    if (!tenantUser) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/settings/integrations?error=no_tenant`
      )
    }

    const clientId = process.env.QUICKBOOKS_CLIENT_ID
    const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/integrations/quickbooks/oauth/callback`

    if (!clientId) {
      console.error('[QuickBooks OAuth] Missing QUICKBOOKS_CLIENT_ID')
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/settings/integrations?error=oauth_config`
      )
    }

    // Encode state with tenant and user context
    const state = Buffer.from(
      JSON.stringify({
        tenantId: tenantUser.tenant_id,
        userId: user.id,
        timestamp: Date.now(),
      })
    ).toString('base64url')

    // QuickBooks OAuth scopes for accounting
    const scopes = [
      'com.intuit.quickbooks.accounting',
    ].join(' ')

    // Build authorization URL (QuickBooks uses Intuit's OAuth)
    // Use sandbox for development, production for live
    const _isProduction = process.env.QUICKBOOKS_ENVIRONMENT === 'production'
    const authUrl = new URL('https://appcenter.intuit.com/connect/oauth2')
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('scope', scopes)
    authUrl.searchParams.set('state', state)

    return NextResponse.redirect(authUrl.toString())
  } catch (error) {
    console.error('[QuickBooks OAuth] Error starting OAuth:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/settings/integrations?error=oauth_error`
    )
  }
}
