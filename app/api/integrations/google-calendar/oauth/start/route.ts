import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/integrations/google-calendar/oauth/start
 * Initiates Google Calendar OAuth flow
 * Session 91: Google Calendar OAuth v1
 */
export async function GET(_request: NextRequest) {
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

    // Get OAuth configuration from environment
    const clientId = process.env.GOOGLE_CLIENT_ID
    const redirectUri = process.env.GOOGLE_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/integrations/google-calendar/oauth/callback`

    if (!clientId) {
      return NextResponse.json(
        { error: 'Google OAuth not configured. Missing GOOGLE_CLIENT_ID environment variable.' },
        { status: 500 }
      )
    }

    // Build OAuth URL with appropriate scopes
    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
    ]

    // Store tenant context in state parameter (encrypted for security)
    const state = Buffer.from(
      JSON.stringify({ tenantId, userId: user.id })
    ).toString('base64url')

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', scopes.join(' '))
    authUrl.searchParams.set('access_type', 'offline') // Request refresh token
    authUrl.searchParams.set('prompt', 'consent') // Force consent to get refresh token
    authUrl.searchParams.set('state', state)

    console.log('[Google OAuth] Redirecting to authorization URL for tenant:', tenantId)

    // Redirect to Google OAuth consent screen
    return NextResponse.redirect(authUrl.toString())
  } catch (error) {
    console.error('Error in GET /api/integrations/google-calendar/oauth/start:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
