import { NextRequest, NextResponse } from 'next/server'
import { upsertIntegrationConnection } from '@/lib/services/integrations.service'

/**
 * GET /api/integrations/quickbooks/oauth/callback
 * Handles QuickBooks OAuth callback
 * Session 109: QuickBooks Integration
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const realmId = searchParams.get('realmId') // QuickBooks company ID
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      console.error('[QuickBooks OAuth] Error from QuickBooks:', error)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/settings/integrations?error=oauth_denied`
      )
    }

    if (!code || !state) {
      console.error('[QuickBooks OAuth] Missing code or state parameter')
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
      console.error('[QuickBooks OAuth] Failed to decode state:', err)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/settings/integrations?error=oauth_invalid_state`
      )
    }

    // Exchange authorization code for tokens
    const clientId = process.env.QUICKBOOKS_CLIENT_ID
    const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET
    const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/integrations/quickbooks/oauth/callback`

    if (!clientId || !clientSecret) {
      console.error('[QuickBooks OAuth] Missing OAuth configuration')
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/settings/integrations?error=oauth_config`
      )
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}))
      console.error('[QuickBooks OAuth] Token exchange failed:', errorData)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/settings/integrations?error=oauth_token_exchange`
      )
    }

    const tokens = await tokenResponse.json() as {
      access_token: string
      refresh_token?: string
      expires_in: number
      token_type: string
      x_refresh_token_expires_in?: number
    }

    // Get company info to display the company name
    let companyName: string | null = null
    if (realmId) {
      const isProduction = process.env.QUICKBOOKS_ENVIRONMENT === 'production'
      const baseUrl = isProduction 
        ? 'https://quickbooks.api.intuit.com'
        : 'https://sandbox-quickbooks.api.intuit.com'
      
      const companyResponse = await fetch(
        `${baseUrl}/v3/company/${realmId}/companyinfo/${realmId}`,
        {
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`,
            'Accept': 'application/json',
          },
        }
      )

      if (companyResponse.ok) {
        const companyData = await companyResponse.json()
        companyName = companyData.CompanyInfo?.CompanyName || null
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
      realm_id: realmId,
      company_name: companyName,
      refresh_token_expires_at: tokens.x_refresh_token_expires_in
        ? new Date(Date.now() + tokens.x_refresh_token_expires_in * 1000).toISOString()
        : null,
    }

    const integration = await upsertIntegrationConnection(
      tenantId,
      'quickbooks',
      credentials,
      userId
    )

    if (!integration) {
      console.error('[QuickBooks OAuth] Failed to store integration')
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/settings/integrations?error=oauth_storage`
      )
    }

    console.log('[QuickBooks OAuth] Successfully connected QuickBooks for tenant:', tenantId)

    // Redirect back to settings with success message
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/settings/integrations?success=quickbooks_connected`
    )
  } catch (error) {
    console.error('Error in GET /api/integrations/quickbooks/oauth/callback:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/settings/integrations?error=oauth_error`
    )
  }
}
