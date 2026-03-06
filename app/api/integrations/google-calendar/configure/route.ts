import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/integrations/google-calendar/configure
 * Google Calendar uses OAuth - redirect to OAuth flow instead
 * Session 91: OAuth implementation complete
 */
export async function POST(_request: NextRequest) {
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

    // For Google Calendar, configuration happens via OAuth flow
    // Client should redirect to /api/integrations/google-calendar/oauth/start
    return NextResponse.json(
      {
        error: 'Use OAuth flow for Google Calendar',
        message: 'Google Calendar uses OAuth 2.0 authentication. Please use the "Connect" button to start the OAuth flow.',
        oauthUrl: '/api/integrations/google-calendar/oauth/start',
      },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error in POST /api/integrations/google-calendar/configure:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
