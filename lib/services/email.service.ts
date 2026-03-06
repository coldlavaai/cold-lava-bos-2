/**
 * Email Service (Session 83)
 *
 * Provides email sending functionality starting with SendGrid as the initial provider.
 * Designed to be provider-agnostic for future Gmail/Outlook/SMTP integrations.
 *
 * Session 89B: Updated to use tenant-specific integrations via resolveEmailCredentials
 * Enterprise Readiness: Added retry logic with exponential backoff for SendGrid API calls
 */

import { resolveEmailCredentials } from '@/lib/services/integrations.service'
import { retryWithBackoff, isRetryableHttpStatus } from '@/lib/utils/retry'

export interface SendEmailInput {
  tenantId: string
  to: string
  from: string
  fromName?: string
  subject: string
  textBody: string
  htmlBody?: string
  threadId?: string
  messageId?: string
}

export interface SendEmailResult {
  success: boolean
  providerMessageId?: string
  error?: string
}

/**
 * Send a transactional email via SendGrid
 */
export async function sendTransactionalEmail(
  input: SendEmailInput
): Promise<SendEmailResult> {
  const { tenantId, to, from, fromName, subject, textBody, htmlBody, messageId } = input

  // Resolve email credentials (tenant integration or env fallback)
  const credentials = await resolveEmailCredentials(tenantId)

  if (!credentials) {
    console.error('[EmailService] Email integration not configured', {
      tenantId,
      messageId,
    })
    return {
      success: false,
      error: 'Email integration not configured. Please configure SendGrid in Settings → Integrations.',
    }
  }

  const { apiKey, fromEmail: configuredFrom, fromName: configuredFromName } = credentials

  // Validate input
  if (!to || !subject || !textBody) {
    console.error('[EmailService] Missing required fields', {
      tenantId,
      messageId,
      hasTo: !!to,
      hasSubject: !!subject,
      hasTextBody: !!textBody,
    })
    return {
      success: false,
      error: 'Missing required email fields',
    }
  }

  // Prepare SendGrid payload
  const payload = {
    personalizations: [
      {
        to: [{ email: to }],
        subject: subject,
      },
    ],
    from: {
      email: from || configuredFrom,
      name: fromName || configuredFromName || '',
    },
    content: [
      {
        type: 'text/plain',
        value: textBody,
      },
    ],
  }

  // Add HTML content if provided
  if (htmlBody) {
    payload.content.push({
      type: 'text/html',
      value: htmlBody,
    })
  }

  console.log('[EmailService] Sending email via SendGrid', {
    tenantId,
    to,
    from: from || configuredFrom,
    subject,
    messageId,
  })

  try {
    // Wrap SendGrid API call with retry logic (exponential backoff + jitter)
    // Retries on network errors and 5xx server errors, NOT on 4xx client errors
    const response = await retryWithBackoff(
      async () => {
        const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        // If response is a retryable error, throw to trigger retry
        if (!res.ok && isRetryableHttpStatus(res.status)) {
          const errorText = await res.text()
          const error = new Error(`SendGrid error: ${res.status} ${res.statusText}`) as Error & {
            status: number
            statusText: string
            responseText: string
          }
          error.status = res.status
          error.statusText = res.statusText
          error.responseText = errorText
          throw error
        }

        return res
      },
      {
        maxAttempts: 3,
        initialDelay: 1000,
        shouldRetry: (error) => {
          // Retry on network errors (TypeError from fetch)
          if (error instanceof TypeError) return true

          // Retry on HTTP errors with retryable status codes (429, 500+)
          if (error instanceof Error && 'status' in error) {
            return isRetryableHttpStatus((error as Error & { status: number }).status)
          }

          return false
        },
        onRetry: (error, attempt, delay) => {
          console.log(`[EmailService] Retrying SendGrid request (attempt ${attempt}/3) after ${delay}ms`, {
            tenantId,
            messageId,
            error: error instanceof Error ? error.message : String(error),
          })
        },
      }
    )

    // Handle non-retryable errors (4xx client errors)
    if (!response.ok) {
      const errorText = await response.text()
      console.error('[EmailService] SendGrid API error (non-retryable)', {
        tenantId,
        messageId,
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      })

      return {
        success: false,
        error: `SendGrid error: ${response.status} ${response.statusText}`,
      }
    }

    // SendGrid returns 202 Accepted on success
    // The X-Message-Id header contains the message ID
    const sendGridMessageId = response.headers.get('X-Message-Id')

    console.log('[EmailService] Email sent successfully via SendGrid', {
      tenantId,
      to,
      messageId,
      providerMessageId: sendGridMessageId,
    })

    return {
      success: true,
      providerMessageId: sendGridMessageId || undefined,
    }
  } catch (error) {
    console.error('[EmailService] Error calling SendGrid API', {
      tenantId,
      messageId,
      error: error instanceof Error ? error.message : String(error),
    })

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error sending email',
    }
  }
}

/**
 * Singleton instance getter (for future use with multiple providers)
 */
class EmailService {
  async sendTransactional(input: SendEmailInput): Promise<SendEmailResult> {
    return sendTransactionalEmail(input)
  }
}

let emailServiceInstance: EmailService | null = null

export function getEmailService(): EmailService {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailService()
  }
  return emailServiceInstance
}
