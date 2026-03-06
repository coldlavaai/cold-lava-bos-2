import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders, getUserIdFromHeaders } from '@/lib/supabase/tenant-context'
import { fetchOutlookMessages, refreshOutlookToken } from '@/lib/integrations/outlook'
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

    // Get Outlook integration
    const { data: integration, error: integrationError } = await supabase
      .from('email_integrations')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .in('provider', ['outlook', 'office365'])
      .eq('is_active', true)
      .single()

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: 'Outlook integration not found' },
        { status: 404 }
      )
    }

    // Token refresh
    let accessToken = integration.access_token
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

    const syncFromDate = integration.sync_from_date
      ? new Date(integration.sync_from_date)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    // Fetch received and sent emails
    const { messages: receivedMessages } = await fetchOutlookMessages(accessToken, {
      top: maxResults,
      filter: `receivedDateTime ge ${syncFromDate.toISOString()}`,
      orderBy: 'receivedDateTime desc',
    })

    const { messages: sentMessages } = await fetchOutlookMessages(accessToken, {
      top: maxResults,
      folder: 'sentitems',
      orderBy: 'sentDateTime desc',
    })

    const filteredSentMessages = sentMessages.filter(msg =>
      msg.sentDateTime && new Date(msg.sentDateTime) >= syncFromDate
    )

    const messages = [...receivedMessages, ...filteredSentMessages]
    console.log(`Fetched ${messages.length} messages from Outlook`)

    let syncedCount = 0
    let errors = 0

    for (const message of messages) {
      try {
        const isSent = message.from.emailAddress.address.toLowerCase() === integration.email_address.toLowerCase()
        const emailToMatch = isSent
          ? (message.toRecipients[0]?.emailAddress?.address || message.from.emailAddress.address)
          : message.from.emailAddress.address

        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('tenant_id', tenantId)
          .ilike('email', emailToMatch)
          .single()

        // Check for existing
        let { data: existingEmail } = await supabase
          .from('email_threads_synced')
          .select('id, provider_message_id')
          .eq('tenant_id', tenantId)
          .eq('provider_message_id', message.id)
          .single()

        // Check for placeholder
        if (!existingEmail && isSent && message.sentDateTime) {
          const sentTime = new Date(message.sentDateTime)
          const { data: placeholder } = await supabase
            .from('email_threads_synced')
            .select('id, provider_message_id')
            .eq('integration_id', integration.id)
            .eq('subject', message.subject)
            .like('provider_message_id', 'sent-%')
            .gte('sent_at', new Date(sentTime.getTime() - 60000).toISOString())
            .lte('sent_at', new Date(sentTime.getTime() + 60000).toISOString())
            .single()

          if (placeholder) existingEmail = placeholder
        }

        if (existingEmail) {
          if (existingEmail.provider_message_id?.startsWith('sent-')) {
            await supabase
              .from('email_threads_synced')
              .update({
                provider_message_id: message.id,
                provider_thread_id: message.conversationId || message.id,
                is_read: message.isRead,
              })
              .eq('id', existingEmail.id)
          }
        } else {
          const { error: insertError } = await supabase
            .from('email_threads_synced')
            .insert({
              tenant_id: tenantId,
              integration_id: integration.id,
              provider: 'outlook',
              provider_message_id: message.id,
              provider_thread_id: message.conversationId || message.id,
              customer_id: customer?.id || null,
              from_email: message.from.emailAddress.address,
              from_name: message.from.emailAddress.name || null,
              to_emails: message.toRecipients.map((r: { emailAddress: { address: string } }) => r.emailAddress.address),
              cc_emails: message.ccRecipients?.length
                ? message.ccRecipients.map((r: { emailAddress: { address: string } }) => r.emailAddress.address)
                : [],
              subject: message.subject,
              body_text: message.bodyPreview || null,
              body_html: message.body.contentType === 'html' ? message.body.content : null,
              direction: isSent ? 'outbound' : 'inbound',
              received_at: isSent ? null : message.receivedDateTime,
              sent_at: isSent ? message.sentDateTime : null,
              is_read: message.isRead,
              is_sent: isSent,
            })

          if (insertError) {
            console.error('Error inserting email:', insertError)
            errors++
          } else {
            syncedCount++
          }
        }
      } catch (error) {
        console.error('Error processing message:', error)
        errors++
      }
    }

    // Update last sync time
    await supabase
      .from('email_integrations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', integration.id)

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      total: messages.length,
      errors,
    })
  } catch (error: unknown) {
    console.error('Error syncing Outlook emails:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync emails' },
      { status: 500 }
    )
  }
}
