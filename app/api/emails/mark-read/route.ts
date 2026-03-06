import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { markGmailMessageAsRead, refreshGmailToken } from '@/lib/integrations/gmail'
import { markOutlookMessageAsRead, refreshOutlookToken } from '@/lib/integrations/outlook'
import { headers } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const body = await request.json()
    const { emailId, isRead = true } = body

    if (!emailId) {
      return NextResponse.json({ error: 'Email ID is required' }, { status: 400 })
    }

    // Get email thread with integration details
    const { data: emailThread, error: emailError } = await supabase
      .from('email_threads_synced')
      .select('*, integration:email_integrations(*)')
      .eq('id', emailId)
      .eq('tenant_id', tenantId)
      .single()

    if (emailError || !emailThread) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 })
    }

    // Update in database
    const { error: updateError } = await supabase
      .from('email_threads_synced')
      .update({ is_read: isRead })
      .eq('id', emailId)
      .eq('tenant_id', tenantId)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update read status' }, { status: 500 })
    }

    // Sync read status with email provider
    const integration = emailThread.integration as Record<string, string> | null
    if (integration && emailThread.provider_message_id && !emailThread.provider_message_id.startsWith('sent-')) {
      try {
        let accessToken = integration.access_token

        if (emailThread.provider === 'gmail') {
          if (new Date(integration.token_expires_at) <= new Date()) {
            const tokens = await refreshGmailToken(integration.refresh_token)
            await supabase
              .from('email_integrations')
              .update({
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token || integration.refresh_token,
                token_expires_at: new Date(tokens.expiry_date).toISOString(),
              })
              .eq('id', integration.id)
            accessToken = tokens.access_token
          }
          await markGmailMessageAsRead(accessToken, emailThread.provider_message_id, isRead)
        } else if (emailThread.provider === 'outlook' || emailThread.provider === 'office365') {
          if (new Date(integration.token_expires_at) <= new Date()) {
            const tokens = await refreshOutlookToken(integration.refresh_token)
            await supabase
              .from('email_integrations')
              .update({
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token || integration.refresh_token,
                token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
              })
              .eq('id', integration.id)
            accessToken = tokens.access_token
          }
          await markOutlookMessageAsRead(accessToken, emailThread.provider_message_id, isRead)
        }
      } catch (providerError) {
        console.error('Error syncing read status with provider:', providerError)
        return NextResponse.json({
          success: true,
          warning: 'Updated in database but failed to sync with email provider',
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Email marked as ${isRead ? 'read' : 'unread'}`,
    })
  } catch (error: unknown) {
    console.error('Error marking email as read:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to mark email as read' },
      { status: 500 }
    )
  }
}
