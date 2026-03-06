import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getOtterOAuthUrl } from '@/lib/services/otter-api.service'

/**
 * GET /api/integrations/otter/oauth/start
 * Start Otter OAuth flow - redirects user to Otter authorization page
 * Session 94: Otter OAuth integration
 */
export async function GET(request: NextRequest) {
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

    // Build redirect URI
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || request.nextUrl.origin
    const redirectUri = `${baseUrl}/api/integrations/otter/oauth/callback`

    // State contains tenant ID for security
    const state = Buffer.from(JSON.stringify({
      tenant_id: tenantId,
      user_id: user.id,
      timestamp: Date.now(),
    })).toString('base64url')

    // Get Otter OAuth URL
    const authUrl = getOtterOAuthUrl(state, redirectUri)

    // Redirect user to Otter
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Error in GET /api/integrations/otter/oauth/start:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start OAuth flow' },
      { status: 500 }
    )
  }
}
