import { Client } from '@microsoft/microsoft-graph-client'

// Strips real newlines AND literal \n sequences that can appear in Vercel env vars
function sanitizeEnvVar(val: string | undefined): string {
  return (val ?? '').trim().replace(/\\n/g, '').replace(/\\r/g, '').replace(/[\n\r]/g, '')
}

export interface OutlookTokens {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}

export interface OutlookMessage {
  id: string
  conversationId: string
  subject: string
  bodyPreview: string
  body: {
    contentType: string
    content: string
  }
  from: {
    emailAddress: {
      name: string
      address: string
    }
  }
  toRecipients: Array<{
    emailAddress: {
      name: string
      address: string
    }
  }>
  ccRecipients?: Array<{
    emailAddress: {
      name: string
      address: string
    }
  }>
  receivedDateTime: string
  sentDateTime?: string
  isRead: boolean
  hasAttachments: boolean
  attachments?: Array<{ name: string; contentType: string; contentBytes: string }>
}

/**
 * Get Microsoft Graph authorization URL
 */
export function getOutlookAuthUrl(redirectUri: string): string {
  const clientId = sanitizeEnvVar(process.env.MICROSOFT_CLIENT_ID)
  if (!clientId) {
    throw new Error('MICROSOFT_CLIENT_ID is not set')
  }

  const scopes = [
    'offline_access',
    'Mail.ReadWrite',
    'Mail.Send',
    'User.Read',
  ]

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    response_mode: 'query',
    scope: scopes.join(' '),
    prompt: 'consent',
  })

  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<OutlookTokens> {
  const clientId = sanitizeEnvVar(process.env.MICROSOFT_CLIENT_ID)
  const clientSecret = sanitizeEnvVar(process.env.MICROSOFT_CLIENT_SECRET)

  if (!clientId || !clientSecret) {
    throw new Error('Microsoft OAuth credentials not configured')
  }

  const tokenEndpoint = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  })

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to exchange code for tokens: ${error}`)
  }

  return await response.json()
}

/**
 * Refresh access token
 */
export async function refreshOutlookToken(refreshToken: string): Promise<OutlookTokens> {
  const clientId = sanitizeEnvVar(process.env.MICROSOFT_CLIENT_ID)
  const clientSecret = sanitizeEnvVar(process.env.MICROSOFT_CLIENT_SECRET)

  if (!clientId || !clientSecret) {
    throw new Error('Microsoft OAuth credentials not configured')
  }

  const tokenEndpoint = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to refresh token: ${error}`)
  }

  return await response.json()
}

/**
 * Create Microsoft Graph client
 */
export function createGraphClient(accessToken: string): Client {
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken)
    },
  })
}

/**
 * Get user profile
 */
export async function getOutlookUserProfile(accessToken: string) {
  const client = createGraphClient(accessToken)

  return await client.api('/me').select('id,displayName,mail,userPrincipalName').get()
}

/**
 * Fetch messages from Outlook
 */
export async function fetchOutlookMessages(
  accessToken: string,
  options: {
    top?: number
    skip?: number
    filter?: string
    orderBy?: string
    folder?: string
  } = {}
): Promise<{ messages: OutlookMessage[]; nextLink?: string }> {
  const client = createGraphClient(accessToken)

  const { top = 50, skip = 0, filter, orderBy = 'receivedDateTime desc', folder } = options

  const apiPath = folder ? `/me/mailFolders/${folder}/messages` : '/me/messages'

  let request = client
    .api(apiPath)
    .top(top)
    .skip(skip)
    .orderby(orderBy)
    .select(
      'id,conversationId,subject,bodyPreview,body,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,isRead,hasAttachments'
    )

  if (filter) {
    request = request.filter(filter)
  }

  const response = await request.get()

  return {
    messages: response.value,
    nextLink: response['@odata.nextLink'],
  }
}

/**
 * Fetch a single message with attachments
 */
export async function fetchOutlookMessage(
  accessToken: string,
  messageId: string
): Promise<OutlookMessage> {
  const client = createGraphClient(accessToken)

  const message = await client
    .api(`/me/messages/${messageId}`)
    .expand('attachments')
    .get()

  return message
}

/**
 * Send email via Outlook
 */
export async function sendOutlookEmail(
  accessToken: string,
  email: {
    to: string[]
    cc?: string[]
    bcc?: string[]
    subject: string
    body: string
    bodyType?: 'Text' | 'HTML'
    attachments?: Array<{
      name: string
      contentType: string
      contentBytes: string // base64 encoded
    }>
  }
): Promise<void> {
  const client = createGraphClient(accessToken)

  const message: Record<string, unknown> = {
    subject: email.subject,
    body: {
      contentType: email.bodyType || 'HTML',
      content: email.body,
    },
    toRecipients: email.to.map((address) => ({
      emailAddress: { address },
    })),
    ccRecipients: email.cc?.map((address) => ({
      emailAddress: { address },
    })),
    bccRecipients: email.bcc?.map((address) => ({
      emailAddress: { address },
    })),
  }

  if (email.attachments && email.attachments.length > 0) {
    message.attachments = email.attachments.map((att) => ({
      '@odata.type': '#microsoft.graph.fileAttachment',
      name: att.name,
      contentType: att.contentType,
      contentBytes: att.contentBytes,
    }))
  }

  await client.api('/me/sendMail').post({
    message,
    saveToSentItems: true,
  })
}

/**
 * Mark message as read/unread
 */
export async function markOutlookMessageAsRead(
  accessToken: string,
  messageId: string,
  isRead: boolean = true
): Promise<void> {
  const client = createGraphClient(accessToken)

  await client.api(`/me/messages/${messageId}`).patch({
    isRead,
  })
}

/**
 * Get delta changes for efficient syncing
 */
export async function getOutlookMessagesDelta(
  accessToken: string,
  deltaLink?: string
): Promise<{
  messages: OutlookMessage[]
  deltaLink: string
  nextLink?: string
}> {
  const client = createGraphClient(accessToken)

  let request

  if (deltaLink) {
    request = client.api(deltaLink)
  } else {
    request = client
      .api('/me/messages/delta')
      .select(
        'id,conversationId,subject,bodyPreview,body,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,isRead,hasAttachments'
      )
  }

  const response = await request.get()

  return {
    messages: response.value,
    deltaLink: response['@odata.deltaLink'],
    nextLink: response['@odata.nextLink'],
  }
}

/**
 * Fetch email signature from Outlook
 * Attempts mailbox settings first, then falls back to extracting from sent messages
 */
export async function fetchOutlookSignature(accessToken: string): Promise<{
  html: string
  text: string
} | null> {
  const client = createGraphClient(accessToken)

  try {
    const settings = await client.api('/me/mailboxSettings').get()

    if (settings?.automaticRepliesSetting?.externalReplyMessage) {
      return {
        html: settings.automaticRepliesSetting.externalReplyMessage || '',
        text: settings.automaticRepliesSetting.externalReplyMessage?.replace(/<[^>]*>/g, '') || '',
      }
    }

    // Fallback: extract signature from recent sent messages
    const sentMessages = await fetchOutlookMessages(accessToken, {
      top: 5,
      filter: "isDraft eq false and sender/emailAddress/address eq 'me'",
    })

    if (sentMessages.messages.length === 0) {
      return null
    }

    const firstMessage = sentMessages.messages[0]
    const body = firstMessage.body.content

    const extractSignature = (content: string): string => {
      const separators = [
        '\n-- \n',
        '\n--\n',
        '<div class="signature"',
        '<div id="Signature"',
      ]

      for (const sep of separators) {
        const index = content.indexOf(sep)
        if (index !== -1) {
          return content.substring(index + sep.length)
        }
      }

      return ''
    }

    const htmlSignature = extractSignature(body)
    const textSignature = htmlSignature.replace(/<[^>]*>/g, '')

    if (!htmlSignature) {
      return null
    }

    return {
      html: htmlSignature,
      text: textSignature,
    }
  } catch (error) {
    console.error('Error fetching Outlook signature:', error)
    return null
  }
}
