/**
 * Gmail Integration - OAuth2 & API Helpers
 *
 * Ported from CL-BOS-DEC25/lib/integrations/gmail.ts for the Cold Lava BOS
 * multi-tenant application. Uses the googleapis package to handle OAuth2
 * authentication, message fetching/sending, watch subscriptions, and
 * signature retrieval.
 */

import { google } from 'googleapis'
import { getAppBaseUrl } from '@/lib/utils/get-app-url'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GmailTokens {
  access_token: string
  refresh_token?: string
  expiry_date: number
  token_type: string
}

export interface GmailMessage {
  id: string
  threadId: string
  labelIds?: string[]
  snippet: string
  payload: {
    headers: Array<{ name: string; value: string }>
    body?: { size: number; data?: string }
    parts?: GmailMessagePart[]
  }
  internalDate: string
  historyId?: string
}

interface GmailMessagePart {
  partId?: string
  mimeType: string
  filename?: string
  headers?: Array<{ name: string; value: string }>
  body?: { size: number; data?: string; attachmentId?: string }
  parts?: GmailMessagePart[]
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.settings.basic',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
]

// ---------------------------------------------------------------------------
// OAuth2 Client
// ---------------------------------------------------------------------------

/**
 * Create a configured Google OAuth2 client using environment variables.
 */
export function createOAuth2Client() {
  const appUrl = getAppBaseUrl()
  const redirectUri = `${appUrl}/api/integrations/gmail/callback`

  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID?.trim(),
    process.env.GOOGLE_CLIENT_SECRET?.trim(),
    redirectUri,
  )
}

// ---------------------------------------------------------------------------
// Auth Flow
// ---------------------------------------------------------------------------

/**
 * Generate the Google consent screen URL for Gmail OAuth.
 */
export function getGmailAuthUrl(): string {
  const oauth2Client = createOAuth2Client()

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: GMAIL_SCOPES,
  })
}

/**
 * Exchange an authorisation code for access & refresh tokens.
 */
export async function exchangeCodeForGmailTokens(code: string): Promise<GmailTokens> {
  const oauth2Client = createOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)

  return {
    access_token: tokens.access_token!,
    refresh_token: tokens.refresh_token ?? undefined,
    expiry_date: tokens.expiry_date ?? Date.now() + 3600 * 1000,
    token_type: tokens.token_type ?? 'Bearer',
  }
}

/**
 * Refresh an expired access token using the stored refresh token.
 */
export async function refreshGmailToken(refreshToken: string): Promise<GmailTokens> {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ refresh_token: refreshToken })

  const { credentials } = await oauth2Client.refreshAccessToken()

  return {
    access_token: credentials.access_token!,
    refresh_token: credentials.refresh_token ?? refreshToken,
    expiry_date: credentials.expiry_date ?? Date.now() + 3600 * 1000,
    token_type: credentials.token_type ?? 'Bearer',
  }
}

// ---------------------------------------------------------------------------
// User Profile
// ---------------------------------------------------------------------------

/**
 * Fetch the authenticated user's Gmail profile (email address, etc.).
 */
export async function getGmailUserProfile(accessToken: string) {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
  const { data } = await gmail.users.getProfile({ userId: 'me' })

  return {
    emailAddress: data.emailAddress,
    messagesTotal: data.messagesTotal,
    threadsTotal: data.threadsTotal,
    historyId: data.historyId,
  }
}

// ---------------------------------------------------------------------------
// Messages — List
// ---------------------------------------------------------------------------

interface FetchMessagesOptions {
  maxResults?: number
  pageToken?: string
  q?: string
  labelIds?: string[]
}

/**
 * List Gmail messages matching the given criteria. Returns message stubs
 * (id + threadId) along with a pagination token.
 */
export async function fetchGmailMessages(
  accessToken: string,
  options: FetchMessagesOptions = {},
): Promise<{ messages: Array<{ id: string; threadId: string }>; nextPageToken?: string }> {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  const { data } = await gmail.users.messages.list({
    userId: 'me',
    maxResults: options.maxResults ?? 20,
    pageToken: options.pageToken,
    q: options.q,
    labelIds: options.labelIds,
  })

  return {
    messages: (data.messages ?? []).map((m) => ({
      id: m.id!,
      threadId: m.threadId!,
    })),
    nextPageToken: data.nextPageToken ?? undefined,
  }
}

// ---------------------------------------------------------------------------
// Messages — Get
// ---------------------------------------------------------------------------

/**
 * Fetch a single Gmail message with full payload.
 */
export async function fetchGmailMessage(
  accessToken: string,
  messageId: string,
): Promise<GmailMessage> {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  const { data } = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  })

  return data as unknown as GmailMessage
}

// ---------------------------------------------------------------------------
// Messages — Send
// ---------------------------------------------------------------------------

interface SendEmailParams {
  to: string
  from?: string
  subject: string
  text?: string
  html?: string
  cc?: string
  bcc?: string
  inReplyTo?: string
  references?: string
  attachments?: Array<{
    filename: string
    mimeType: string
    /** Base-64 encoded content */
    content: string
  }>
}

/**
 * Send an email via the Gmail API. Supports plain text, HTML, and
 * file attachments (multipart/mixed).
 */
export async function sendGmailEmail(
  accessToken: string,
  email: SendEmailParams,
): Promise<void> {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  const raw = buildRawEmail(email)

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  })
}

/**
 * Build a base64url-encoded RFC 2822 message suitable for the Gmail API.
 */
function buildRawEmail(email: SendEmailParams): string {
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`
  const hasAttachments = email.attachments && email.attachments.length > 0

  const headers: string[] = [
    `To: ${email.to}`,
    `Subject: ${email.subject}`,
  ]

  if (email.from) headers.push(`From: ${email.from}`)
  if (email.cc) headers.push(`Cc: ${email.cc}`)
  if (email.bcc) headers.push(`Bcc: ${email.bcc}`)
  if (email.inReplyTo) headers.push(`In-Reply-To: ${email.inReplyTo}`)
  if (email.references) headers.push(`References: ${email.references}`)
  headers.push('MIME-Version: 1.0')

  if (hasAttachments) {
    // multipart/mixed wrapping multipart/alternative + attachments
    headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`)

    const altBoundary = `alt_${boundary}`
    const parts: string[] = []

    // Text/HTML alternative part
    parts.push(`--${boundary}`)
    parts.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`)
    parts.push('')

    if (email.text) {
      parts.push(`--${altBoundary}`)
      parts.push('Content-Type: text/plain; charset="UTF-8"')
      parts.push('')
      parts.push(email.text)
    }

    if (email.html) {
      parts.push(`--${altBoundary}`)
      parts.push('Content-Type: text/html; charset="UTF-8"')
      parts.push('')
      parts.push(email.html)
    }

    parts.push(`--${altBoundary}--`)

    // Attachment parts
    for (const att of email.attachments!) {
      parts.push(`--${boundary}`)
      parts.push(
        `Content-Type: ${att.mimeType}; name="${att.filename}"`,
      )
      parts.push('Content-Transfer-Encoding: base64')
      parts.push(
        `Content-Disposition: attachment; filename="${att.filename}"`,
      )
      parts.push('')
      parts.push(att.content)
    }

    parts.push(`--${boundary}--`)

    const raw = headers.join('\r\n') + '\r\n\r\n' + parts.join('\r\n')
    return toBase64Url(raw)
  }

  // No attachments — simple multipart/alternative or single-part
  if (email.html && email.text) {
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`)

    const parts = [
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      '',
      email.text,
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      '',
      email.html,
      `--${boundary}--`,
    ]

    const raw = headers.join('\r\n') + '\r\n\r\n' + parts.join('\r\n')
    return toBase64Url(raw)
  }

  if (email.html) {
    headers.push('Content-Type: text/html; charset="UTF-8"')
    const raw = headers.join('\r\n') + '\r\n\r\n' + email.html
    return toBase64Url(raw)
  }

  headers.push('Content-Type: text/plain; charset="UTF-8"')
  const raw = headers.join('\r\n') + '\r\n\r\n' + (email.text ?? '')
  return toBase64Url(raw)
}

function toBase64Url(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

// ---------------------------------------------------------------------------
// Messages — Read/Unread
// ---------------------------------------------------------------------------

/**
 * Mark a Gmail message as read or unread by modifying its labels.
 */
export async function markGmailMessageAsRead(
  accessToken: string,
  messageId: string,
  isRead: boolean,
): Promise<void> {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: isRead
      ? { removeLabelIds: ['UNREAD'] }
      : { addLabelIds: ['UNREAD'] },
  })
}

// ---------------------------------------------------------------------------
// Header Parsing
// ---------------------------------------------------------------------------

/**
 * Extract common headers from a Gmail message payload.
 */
export function parseGmailHeaders(message: GmailMessage) {
  const headers = message.payload?.headers ?? []

  function getHeader(name: string): string | undefined {
    const header = headers.find(
      (h) => h.name.toLowerCase() === name.toLowerCase(),
    )
    return header?.value
  }

  return {
    from: getHeader('From'),
    to: getHeader('To'),
    cc: getHeader('Cc'),
    bcc: getHeader('Bcc'),
    subject: getHeader('Subject'),
    date: getHeader('Date'),
    messageId: getHeader('Message-ID') || getHeader('Message-Id'),
  }
}

// ---------------------------------------------------------------------------
// Body Extraction
// ---------------------------------------------------------------------------

/**
 * Recursively walk a Gmail message payload and extract the text and HTML
 * body content.
 */
export function extractGmailBody(message: GmailMessage): { text?: string; html?: string } {
  let text: string | undefined
  let html: string | undefined

  function decodePart(data?: string): string {
    if (!data) return ''
    // Gmail API returns base64url-encoded data
    return Buffer.from(data, 'base64url').toString('utf-8')
  }

  function walkParts(parts?: GmailMessagePart[]) {
    if (!parts) return

    for (const part of parts) {
      if (part.mimeType === 'text/plain' && part.body?.data && !text) {
        text = decodePart(part.body.data)
      } else if (part.mimeType === 'text/html' && part.body?.data && !html) {
        html = decodePart(part.body.data)
      }

      // Recurse into nested parts (multipart/alternative, multipart/mixed, etc.)
      if (part.parts) {
        walkParts(part.parts)
      }
    }
  }

  // Single-part message (body directly on payload)
  const payload = message.payload
  if (payload.body?.data) {
    const decoded = decodePart(payload.body.data)
    // Determine type from the top-level headers
    const contentType = payload.headers?.find(
      (h) => h.name.toLowerCase() === 'content-type',
    )?.value

    if (contentType?.includes('text/html')) {
      html = decoded
    } else {
      text = decoded
    }
  }

  // Multi-part message
  walkParts(payload.parts)

  return { text, html }
}

// ---------------------------------------------------------------------------
// Gmail Push Notifications (Watch)
// ---------------------------------------------------------------------------

/**
 * Set up a Gmail push notification watch on the user's mailbox.
 * Requires a Google Cloud Pub/Sub topic that Gmail can publish to.
 */
export async function setupGmailWatch(
  accessToken: string,
  topicName: string,
): Promise<{ historyId: string; expiration: string }> {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  const { data } = await gmail.users.watch({
    userId: 'me',
    requestBody: {
      topicName,
      labelIds: ['INBOX'],
    },
  })

  return {
    historyId: data.historyId!.toString(),
    expiration: data.expiration!.toString(),
  }
}

/**
 * Stop the active Gmail push notification watch for the user.
 */
export async function stopGmailWatch(accessToken: string): Promise<void> {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  await gmail.users.stop({ userId: 'me' })
}

// ---------------------------------------------------------------------------
// Gmail Signature
// ---------------------------------------------------------------------------

/**
 * Fetch the user's Gmail signature from their sendAs settings. Falls back
 * to extracting a signature from a recently sent message if the sendAs
 * settings do not contain one.
 */
export async function fetchGmailSignature(
  accessToken: string,
): Promise<{ html: string; text: string } | null> {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  // First try: sendAs settings
  try {
    const { data } = await gmail.users.settings.sendAs.list({ userId: 'me' })
    const sendAsEntries = data.sendAs ?? []

    // Prefer the default (isPrimary) account
    const primary = sendAsEntries.find((s) => s.isPrimary) ?? sendAsEntries[0]

    if (primary?.signature) {
      return {
        html: primary.signature,
        text: stripHtml(primary.signature),
      }
    }
  } catch (err) {
    console.warn('Failed to fetch sendAs settings for signature:', err)
  }

  // Fallback: look at a recently sent message for a signature block
  try {
    const { data: listData } = await gmail.users.messages.list({
      userId: 'me',
      q: 'in:sent',
      maxResults: 5,
    })

    const sentMessages = listData.messages ?? []

    for (const stub of sentMessages) {
      const { data: msg } = await gmail.users.messages.get({
        userId: 'me',
        id: stub.id!,
        format: 'full',
      })

      const fullMsg = msg as unknown as GmailMessage
      const { html } = extractGmailBody(fullMsg)

      if (html) {
        const signature = extractSignatureFromHtml(html)
        if (signature) {
          return {
            html: signature,
            text: stripHtml(signature),
          }
        }
      }
    }
  } catch (err) {
    console.warn('Failed to extract signature from sent messages:', err)
  }

  return null
}

/**
 * Attempt to extract a signature block from an HTML email body.
 * Gmail typically wraps signatures in a div with class "gmail_signature".
 */
function extractSignatureFromHtml(html: string): string | null {
  // Gmail wraps signatures in a specific class
  const signatureMatch = html.match(
    /<div[^>]*class="gmail_signature"[^>]*>([\s\S]*?)<\/div>/i,
  )

  if (signatureMatch) {
    return signatureMatch[0]
  }

  // Some clients use a double-dash separator
  const dashSepIndex = html.lastIndexOf('--<br')
  if (dashSepIndex !== -1) {
    return html.slice(dashSepIndex)
  }

  return null
}

/**
 * Naively strip HTML tags to produce plain text.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
