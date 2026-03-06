import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders, getUserIdFromHeaders } from '@/lib/supabase/tenant-context'
import {
  fetchGmailMessages,
  fetchGmailMessage,
  refreshGmailToken,
  parseGmailHeaders,
  extractGmailBody,
} from '@/lib/integrations/gmail'
import { headers } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    const userId = await getUserIdFromHeaders(headersList)

    if (!tenantId || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const body = await request.json()
    const { maxResults = 200 } = body

    // Get Gmail integration
    const { data: integration, error: integrationError } = await supabase
      .from('email_integrations')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .eq('provider', 'gmail')
      .eq('is_active', true)
      .single()

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: 'Gmail integration not found. Please connect your Gmail account first.' },
        { status: 404 }
      )
    }

    // Check if token needs refresh
    let accessToken = integration.access_token
    const tokenExpiresAt = new Date(integration.token_expires_at)

    if (tokenExpiresAt <= new Date()) {
      console.log('Gmail token expired, refreshing...')
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

    // Fetch messages with retry on auth failure
    console.log(`Fetching up to ${maxResults} messages from Gmail...`)
    let messages: Array<{ id: string; threadId: string }>
    let retried = false

    try {
      const result = await fetchGmailMessages(accessToken, {
        maxResults,
        labelIds: ['INBOX'],
      })
      messages = result.messages
    } catch (error: unknown) {
      const err = error as { message?: string; code?: number }
      const isAuthError = err.message?.includes('invalid_grant') ||
                          err.message?.includes('invalid_token') ||
                          err.message?.includes('Invalid Credentials') ||
                          err.code === 401

      if (isAuthError && !retried) {
        console.log('Gmail API auth error, forcing token refresh...')
        retried = true
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
        const result = await fetchGmailMessages(accessToken, {
          maxResults,
          labelIds: ['INBOX'],
        })
        messages = result.messages
      } else {
        throw error
      }
    }

    console.log(`Fetched ${messages.length} messages from Gmail`)

    let newCount = 0
    let updatedCount = 0
    let skippedCount = 0

    for (const messageStub of messages) {
      // Fetch full message details (stubs only have id + threadId)
      const message = await fetchGmailMessage(accessToken, messageStub.id)
      const msgHeaders = parseGmailHeaders(message)
      const { text, html } = extractGmailBody(message)
      const messageDate = new Date(parseInt(message.internalDate))

      const isSent = message.labelIds?.includes('SENT') || false
      const isRead = !message.labelIds?.includes('UNREAD')

      // Match to customer by email
      const emailToCheck = isSent ? msgHeaders.to : msgHeaders.from
      if (!emailToCheck) {
        skippedCount++
        continue
      }
      const emailAddress = emailToCheck.match(/<(.+?)>/)?.[1] || emailToCheck

      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('tenant_id', tenantId)
        .ilike('email', emailAddress)
        .single()

      if (!customer) {
        skippedCount++
        continue
      }

      // Check for existing thread
      let { data: existingThread } = await supabase
        .from('email_threads_synced')
        .select('id, provider_message_id')
        .eq('tenant_id', tenantId)
        .eq('provider_message_id', message.id)
        .single()

      // Check for placeholder (sent-*) if this is a sent email
      if (!existingThread && isSent) {
        const sentTime = new Date(parseInt(message.internalDate))
        const timeWindowStart = new Date(sentTime.getTime() - 60000)
        const timeWindowEnd = new Date(sentTime.getTime() + 60000)

        const { data: placeholderThread } = await supabase
          .from('email_threads_synced')
          .select('id, provider_message_id')
          .eq('integration_id', integration.id)
          .eq('subject', msgHeaders.subject)
          .like('provider_message_id', 'sent-%')
          .gte('sent_at', timeWindowStart.toISOString())
          .lte('sent_at', timeWindowEnd.toISOString())
          .single()

        if (placeholderThread) {
          existingThread = placeholderThread
        }
      }

      if (existingThread) {
        const updateData: Record<string, unknown> = { is_read: isRead }
        if (customer?.id) updateData.customer_id = customer.id
        if (existingThread.provider_message_id?.startsWith('sent-')) {
          updateData.provider_message_id = message.id
          updateData.provider_thread_id = message.threadId
        }
        await supabase
          .from('email_threads_synced')
          .update(updateData)
          .eq('id', existingThread.id)
        updatedCount++
      } else {
        const fromField = msgHeaders.from || ''
        const toField = msgHeaders.to || ''
        await supabase.from('email_threads_synced').insert({
          tenant_id: tenantId,
          integration_id: integration.id,
          customer_id: customer?.id || null,
          provider: 'gmail',
          provider_message_id: message.id,
          provider_thread_id: message.threadId,
          from_email: fromField.match(/<(.+?)>/)?.[1] || fromField,
          from_name: fromField.replace(/<.+?>/, '').trim(),
          to_emails: [toField.match(/<(.+?)>/)?.[1] || toField],
          cc_emails: msgHeaders.cc ? [msgHeaders.cc] : [],
          subject: msgHeaders.subject,
          body_text: text || null,
          body_html: html || null,
          direction: isSent ? 'outbound' : 'inbound',
          is_read: isRead,
          is_sent: isSent,
          sent_at: isSent ? messageDate.toISOString() : null,
          received_at: !isSent ? messageDate.toISOString() : null,
        })
        newCount++
      }
    }

    // Update last_sync_at
    await supabase
      .from('email_integrations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', integration.id)

    return NextResponse.json({
      success: true,
      message: `Sync complete: ${newCount} new, ${updatedCount} updated, ${skippedCount} skipped`,
      newCount,
      updatedCount,
      skippedCount,
      totalProcessed: messages.length,
    })
  } catch (error: unknown) {
    console.error('Error syncing Gmail inbox:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync Gmail inbox' },
      { status: 500 }
    )
  }
}
