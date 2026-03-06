import { createClient as _createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { upsertIntegrationConnection } from '@/lib/services/integrations.service'

/**
 * GET /api/integrations/google-calendar/oauth/callback
 * Handles Google Calendar OAuth callback
 * Session 91: Google Calendar OAuth v1
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      console.error('[Google OAuth] Error from Google:', error)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/settings/integrations?error=oauth_denied`
      )
    }

    if (!code || !state) {
      console.error('[Google OAuth] Missing code or state parameter')
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
      console.error('[Google OAuth] Failed to decode state:', err)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/settings/integrations?error=oauth_invalid_state`
      )
    }

    // Exchange authorization code for tokens
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = process.env.GOOGLE_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/integrations/google-calendar/oauth/callback`

    if (!clientId || !clientSecret) {
      console.error('[Google OAuth] Missing OAuth configuration')
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/settings/integrations?error=oauth_config`
      )
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}))
      console.error('[Google OAuth] Token exchange failed:', errorData)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/settings/integrations?error=oauth_token_exchange`
      )
    }

    const tokens = await tokenResponse.json() as {
      access_token: string
      refresh_token?: string
      expires_in: number
      scope: string
      token_type: string
    }

    // Calculate token expiration time
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Store tokens in integration_connections
    // Tokens will be encrypted automatically by upsertIntegrationConnection
    const credentials = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      scopes: tokens.scope,
      token_type: tokens.token_type,
    }

    const integration = await upsertIntegrationConnection(
      tenantId,
      'google_calendar',
      credentials,
      userId
    )

    if (!integration) {
      console.error('[Google OAuth] Failed to store integration')
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/settings/integrations?error=oauth_storage`
      )
    }

    console.log('[Google OAuth] Successfully connected Google Calendar for tenant:', tenantId)

    // Redirect back to settings with success message
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/settings/integrations?success=google_calendar_connected`
    )
  } catch (error) {
    console.error('Error in GET /api/integrations/google-calendar/oauth/callback:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/settings/integrations?error=oauth_error`
    )
  }
}
