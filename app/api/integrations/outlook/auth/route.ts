import { NextRequest, NextResponse } from 'next/server'
import { getOutlookAuthUrl } from '@/lib/integrations/outlook'
import { getAppBaseUrl } from '@/lib/utils/get-app-url'

export async function GET(_request: NextRequest) {
  try {
    const baseUrl = getAppBaseUrl()
    const redirectUri = `${baseUrl}/api/integrations/outlook/callback`

    const authUrl = getOutlookAuthUrl(redirectUri)

    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Error initiating Outlook OAuth:', error)
    const baseUrl = getAppBaseUrl()
    return NextResponse.redirect(`${baseUrl}/settings/integrations?error=oauth_config`)
  }
}
