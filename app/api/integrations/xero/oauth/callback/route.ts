import { NextRequest, NextResponse } from 'next/server'
import { upsertIntegrationConnection } from '@/lib/services/integrations.service'

/**
 * GET /api/integrations/xero/oauth/callback
 * Handles Xero OAuth callback
 * Session 109: Xero Integration
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      console.error('[Xero OAuth] Error from Xero:', error)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/settings/integrations?error=oauth_denied`
      )
    }

    if (!code || !state) {
      console.error('[Xero OAuth] Missing code or state parameter')
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/settings/integrations?error=oauth_invalid`
      )
    }

    // Decode state to get tenant context
    let tenantId: string
    let userId: string
    try {
      const decoded = JSON.parse(
        Buffer.from(state, 'base64url').toString('utf-8')
      )
      tenantId = decoded.tenantId
      userId = decoded.userId
    } catch (err) {
      console.error('[Xero OAuth] Failed to decode state:', err)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/settings/integrations?error=oauth_invalid_state`
      )
    }

    // Exchange authorization code for tokens
    const clientId = process.env.XERO_CLIENT_ID
    const clientSecret = process.env.XERO_CLIENT_SECRET
    const redirectUri = process.env.XERO_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/integrations/xero/oauth/callback`

    if (!clientId || !clientSecret) {
      console.error('[Xero OAuth] Missing OAuth configuration')
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/settings/integrations?error=oauth_config`
      )
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}))
      console.error('[Xero OAuth] Token exchange failed:', errorData)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/settings/integrations?error=oauth_token_exchange`
      )
    }

    const tokens = await tokenResponse.json() as {
      access_token: string
      refresh_token?: string
      expires_in: number
      token_type: string
      scope: string
    }

    // Get connected Xero tenants (organizations)
    const tenantsResponse = await fetch('https://api.xero.com/connections', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
      },
    })

    let xeroTenantId: string | null = null
    let xeroTenantName: string | null = null

    if (tenantsResponse.ok) {
      const connections = await tenantsResponse.json() as Array<{
        tenantId: string
        tenantName: string
        tenantType: string
      }>
      
      // Use the first organization (most common case)
      if (connections.length > 0) {
        xeroTenantId = connections[0].tenantId
        xeroTenantName = connections[0].tenantName
      }
    }

    // Calculate token expiration time
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Store tokens in integration_connections
    const credentials = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      token_type: tokens.token_type,
      scope: tokens.scope,
      xero_tenant_id: xeroTenantId,
      xero_tenant_name: xeroTenantName,
    }

    const integration = await upsertIntegrationConnection(
      tenantId,
      'xero',
      credentials,
      userId
    )

    if (!integration) {
      console.error('[Xero OAuth] Failed to store integration')
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/settings/integrations?error=oauth_storage`
      )
    }

    console.log('[Xero OAuth] Successfully connected Xero for tenant:', tenantId)

    // Redirect back to settings with success message
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/settings/integrations?success=xero_connected`
    )
  } catch (error) {
    console.error('Error in GET /api/integrations/xero/oauth/callback:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/settings/integrations?error=oauth_error`
    )
  }
}
