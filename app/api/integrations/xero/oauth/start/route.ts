import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/integrations/xero/oauth/start
 * Initiates Xero OAuth flow
 * Session 109: Xero Integration
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

    const clientId = process.env.XERO_CLIENT_ID
    const redirectUri = process.env.XERO_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/integrations/xero/oauth/callback`

    if (!clientId) {
      console.error('[Xero OAuth] Missing XERO_CLIENT_ID')
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

    // Xero OAuth scopes
    const scopes = [
      'openid',
      'profile',
      'email',
      'accounting.transactions',
      'accounting.contacts',
      'accounting.settings.read',
      'offline_access', // Required for refresh tokens
    ].join(' ')

    // Build authorization URL
    const authUrl = new URL('https://login.xero.com/identity/connect/authorize')
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('scope', scopes)
    authUrl.searchParams.set('state', state)

    return NextResponse.redirect(authUrl.toString())
  } catch (error) {
    console.error('[Xero OAuth] Error starting OAuth:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/settings/integrations?error=oauth_error`
    )
  }
}
