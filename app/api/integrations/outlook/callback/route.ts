import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders, getUserIdFromHeaders } from '@/lib/supabase/tenant-context'
import { exchangeCodeForTokens, getOutlookUserProfile } from '@/lib/integrations/outlook'
import { getAppBaseUrl } from '@/lib/utils/get-app-url'
import { headers } from 'next/headers'

export async function GET(request: NextRequest) {
  const baseUrl = getAppBaseUrl()

  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(
        `${baseUrl}/settings?tab=integrations&error=outlook_auth_failed`
      )
    }

    if (!code) {
      return NextResponse.redirect(
        `${baseUrl}/settings?tab=integrations&error=no_code`
      )
    }

    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    const userId = await getUserIdFromHeaders(headersList)

    if (!tenantId || !userId) {
      return NextResponse.redirect(
        `${baseUrl}/login?error=not_authenticated`
      )
    }

    // Exchange code for tokens
    const redirectUri = `${baseUrl}/api/integrations/outlook/callback`
    const tokens = await exchangeCodeForTokens(code, redirectUri)
    const profile = await getOutlookUserProfile(tokens.access_token)

    const supabase = createAdminClient()

    // Deactivate other email integrations for this user
    await supabase
      .from('email_integrations')
      .update({ is_active: false })
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .in('provider', ['gmail'])

    const expiresAt = new Date()
    expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expires_in)

    // Store or update integration
    const { error: dbError } = await supabase
      .from('email_integrations')
      .upsert(
        {
          tenant_id: tenantId,
          user_id: userId,
          provider: 'outlook',
          email_address: profile.mail || profile.userPrincipalName,
          display_name: profile.displayName,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: expiresAt.toISOString(),
          provider_user_id: profile.id,
          is_active: true,
          last_sync_at: null,
          sync_from_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          onConflict: 'tenant_id,provider,email_address',
        }
      )

    if (dbError) {
      console.error('Error saving Outlook integration:', dbError)
      return NextResponse.redirect(
        `${baseUrl}/settings?tab=integrations&error=save_failed`
      )
    }

    return NextResponse.redirect(
      `${baseUrl}/oauth-success?provider=Outlook`
    )
  } catch (error) {
    console.error('Error in Outlook OAuth callback:', error)
    return NextResponse.redirect(
      `${baseUrl}/settings?tab=integrations&error=callback_failed`
    )
  }
}
