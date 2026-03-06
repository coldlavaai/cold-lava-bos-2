import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { exchangeOtterOAuthCode, getOtterUser } from '@/lib/services/otter-api.service'
import { upsertIntegrationConnection } from '@/lib/services/integrations.service'

/**
 * GET /api/integrations/otter/oauth/callback
 * OAuth callback for Otter - receives authorization code and exchanges for tokens
 * Session 94: Otter OAuth integration
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth error
    if (error) {
      console.error('[Otter OAuth] Authorization error:', error)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_API_URL || request.nextUrl.origin}/settings/integrations?otter_error=${encodeURIComponent(error)}`
      )
    }

    // Validate parameters
    if (!code || !state) {
      console.error('[Otter OAuth] Missing code or state')
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_API_URL || request.nextUrl.origin}/settings/integrations?otter_error=invalid_callback`
      )
    }

    // Decode and validate state
    let stateData: { tenant_id: string; user_id: string; timestamp: number }
    try {
      const decoded = Buffer.from(state, 'base64url').toString('utf-8')
      stateData = JSON.parse(decoded)
    } catch (e) {
      console.error('[Otter OAuth] Invalid state:', e)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_API_URL || request.nextUrl.origin}/settings/integrations?otter_error=invalid_state`
      )
    }

    // Check state timestamp (prevent replay attacks - 10 min expiry)
    if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
      console.error('[Otter OAuth] Expired state')
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_API_URL || request.nextUrl.origin}/settings/integrations?otter_error=expired_state`
      )
    }

    const { tenant_id: tenantId, user_id: userId } = stateData

    // Build redirect URI
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || request.nextUrl.origin
    const redirectUri = `${baseUrl}/api/integrations/otter/oauth/callback`

    // Exchange authorization code for access token
    const tokens = await exchangeOtterOAuthCode(code, redirectUri)

    // Get user info from Otter
    let otterUser
    try {
      otterUser = await getOtterUser(tokens.access_token)
    } catch (error) {
      console.error('[Otter OAuth] Failed to get user info:', error)
      // Continue anyway - we have tokens
    }

    // Store tokens in integration_connections
    const credentials = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_type: tokens.token_type,
      scope: tokens.scope,
      otter_user_id: otterUser?.user_id,
      otter_email: otterUser?.email,
      otter_name: otterUser?.name,
    }

    // Calculate expiry timestamp
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Store in database
    const supabase = await createClient()

    // First, get or create the integration connection
    const integration = await upsertIntegrationConnection(
      tenantId,
      'otter',
      credentials,
      userId
    )

    if (!integration) {
      console.error('[Otter OAuth] Failed to store integration')
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_API_URL || request.nextUrl.origin}/settings/integrations?otter_error=storage_failed`
      )
    }

    // Update OAuth-specific fields
    await supabase
      .from('integration_connections')
      .update({
        oauth_access_token: tokens.access_token,
        oauth_refresh_token: tokens.refresh_token,
        oauth_expires_at: expiresAt,
        oauth_scopes: tokens.scope.split(' '),
        last_verified_at: new Date().toISOString(),
        last_error: null,
      })
      .eq('id', integration.id)

    console.log('[Otter OAuth] Successfully connected Otter account:', {
      tenant_id: tenantId,
      otter_user: otterUser?.email,
    })

    // Redirect back to settings with success
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_API_URL || request.nextUrl.origin}/settings/integrations?otter_success=true`
    )
  } catch (error) {
    console.error('Error in GET /api/integrations/otter/oauth/callback:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_API_URL || request.nextUrl.origin}/settings/integrations?otter_error=${encodeURIComponent(error instanceof Error ? error.message : 'unknown')}`
    )
  }
}
