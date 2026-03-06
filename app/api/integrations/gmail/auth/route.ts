import { NextRequest, NextResponse } from 'next/server'
import { getGmailAuthUrl } from '@/lib/integrations/gmail'
import { getAppBaseUrl } from '@/lib/utils/get-app-url'

export async function GET(request: NextRequest) {
  try {
    const authUrl = getGmailAuthUrl()
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Error initiating Gmail OAuth:', error)
    const baseUrl = getAppBaseUrl()
    return NextResponse.redirect(`${baseUrl}/settings/integrations?error=oauth_config`)
  }
}
