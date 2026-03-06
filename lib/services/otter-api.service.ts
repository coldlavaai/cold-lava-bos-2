/**
 * Session 94: Otter.ai API Service
 * Service layer for interacting with Otter.ai API
 * Handles OAuth, token refresh, and API calls
 *
 * Enterprise Readiness: Added retry logic with exponential backoff for all API calls
 */

import type {
  OtterTokenResponse,
  OtterUser,
  OtterSpeech,
  OtterSpeechesListResponse,
  OtterMeeting,
  CreateOtterMeetingRequest,
  ScheduleBotRequest,
  OtterApiError,
} from './otter-api.types'
import { retryWithBackoff, isRetryableHttpStatus } from '@/lib/utils/retry'

// Otter API base URL (update when actual API URL is known)
const OTTER_API_BASE = process.env.OTTER_API_BASE_URL || 'https://otter.ai/api/v1'
const OTTER_OAUTH_BASE = process.env.OTTER_OAUTH_BASE_URL || 'https://otter.ai/oauth'

/**
 * Get OAuth authorization URL for user to connect their Otter account
 */
export function getOtterOAuthUrl(state: string, redirectUri: string): string {
  const clientId = process.env.OTTER_CLIENT_ID

  if (!clientId) {
    throw new Error('OTTER_CLIENT_ID not configured in environment')
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'read write bot_schedule', // Adjust scopes as needed
    state,
  })

  return `${OTTER_OAUTH_BASE}/authorize?${params.toString()}`
}

/**
 * Exchange OAuth authorization code for access token
 */
export async function exchangeOtterOAuthCode(
  code: string,
  redirectUri: string
): Promise<OtterTokenResponse> {
  const clientId = process.env.OTTER_CLIENT_ID
  const clientSecret = process.env.OTTER_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('OTTER_CLIENT_ID or OTTER_CLIENT_SECRET not configured')
  }

  return retryWithBackoff(
    async () => {
      const response = await fetch(`${OTTER_OAUTH_BASE}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      })

      if (!response.ok) {
        const error = await response.json() as OtterApiError
        const oauthError = new Error(`Otter OAuth error: ${error.error_description || error.error}`) as Error & {
          status: number
        }
        oauthError.status = response.status
        throw oauthError
      }

      return response.json()
    },
    {
      maxAttempts: 3,
      initialDelay: 1000,
      shouldRetry: (error) => {
        if (error instanceof TypeError) return true
        if (error instanceof Error && 'status' in error) {
          // Don't retry 4xx errors in OAuth (bad code, invalid credentials, etc.)
          const status = (error as Error & { status: number }).status
          if (status >= 400 && status < 500) return false
          return isRetryableHttpStatus(status)
        }
        return false
      },
      onRetry: (error, attempt, delay) => {
        console.log(`[OtterOAuth] Retrying token exchange (attempt ${attempt}/3) after ${delay}ms`)
      },
    }
  )
}

/**
 * Refresh Otter access token using refresh token
 */
export async function refreshOtterAccessToken(
  refreshToken: string
): Promise<OtterTokenResponse> {
  const clientId = process.env.OTTER_CLIENT_ID
  const clientSecret = process.env.OTTER_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('OTTER_CLIENT_ID or OTTER_CLIENT_SECRET not configured')
  }

  return retryWithBackoff(
    async () => {
      const response = await fetch(`${OTTER_OAUTH_BASE}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      })

      if (!response.ok) {
        const error = await response.json() as OtterApiError
        const refreshError = new Error(`Otter token refresh error: ${error.error_description || error.error}`) as Error & {
          status: number
        }
        refreshError.status = response.status
        throw refreshError
      }

      return response.json()
    },
    {
      maxAttempts: 3,
      initialDelay: 1000,
      shouldRetry: (error) => {
        if (error instanceof TypeError) return true
        if (error instanceof Error && 'status' in error) {
          // Don't retry 4xx errors (invalid refresh token, etc.)
          const status = (error as Error & { status: number }).status
          if (status >= 400 && status < 500) return false
          return isRetryableHttpStatus(status)
        }
        return false
      },
      onRetry: (error, attempt, delay) => {
        console.log(`[OtterOAuth] Retrying token refresh (attempt ${attempt}/3) after ${delay}ms`)
      },
    }
  )
}

/**
 * Make authenticated API call to Otter with retry logic
 */
async function otterApiCall<T>(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${OTTER_API_BASE}${endpoint}`

  return retryWithBackoff(
    async () => {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          error: `HTTP ${response.status}`,
          error_description: response.statusText,
        })) as OtterApiError

        // Create error with status code for retry logic
        const apiError = new Error(`Otter API error: ${error.error_description || error.error}`) as Error & {
          status: number
          otterError: OtterApiError
        }
        apiError.status = response.status
        apiError.otterError = error

        throw apiError
      }

      return response.json()
    },
    {
      maxAttempts: 3,
      initialDelay: 1000,
      shouldRetry: (error) => {
        // Retry on network errors
        if (error instanceof TypeError) return true

        // Retry on retryable HTTP status codes (429, 500+)
        if (error instanceof Error && 'status' in error) {
          const status = (error as Error & { status: number }).status

          // Don't retry 401 Unauthorized (token expired - needs refresh, not retry)
          if (status === 401) return false

          return isRetryableHttpStatus(status)
        }

        return false
      },
      onRetry: (error, attempt, delay) => {
        console.log(`[OtterAPI] Retrying request to ${endpoint} (attempt ${attempt}/3) after ${delay}ms`, {
          error: error instanceof Error ? error.message : String(error),
        })
      },
    }
  )
}

/**
 * Get current user information
 */
export async function getOtterUser(accessToken: string): Promise<OtterUser> {
  return otterApiCall<OtterUser>('/user/me', accessToken)
}

/**
 * List user's speeches (recordings)
 */
export async function listOtterSpeeches(
  accessToken: string,
  options?: {
    page_size?: number
    offset?: number
    folder_id?: string
  }
): Promise<OtterSpeechesListResponse> {
  const params = new URLSearchParams()
  if (options?.page_size) params.set('page_size', options.page_size.toString())
  if (options?.offset) params.set('offset', options.offset.toString())
  if (options?.folder_id) params.set('folder_id', options.folder_id)

  const endpoint = `/speeches${params.toString() ? `?${params.toString()}` : ''}`
  return otterApiCall<OtterSpeechesListResponse>(endpoint, accessToken)
}

/**
 * Get a specific speech by ID
 */
export async function getOtterSpeech(
  accessToken: string,
  speechId: string
): Promise<OtterSpeech> {
  return otterApiCall<OtterSpeech>(`/speeches/${speechId}`, accessToken)
}

/**
 * Create a scheduled meeting for Otter bot to join
 */
export async function createOtterMeeting(
  accessToken: string,
  meeting: CreateOtterMeetingRequest
): Promise<OtterMeeting> {
  return otterApiCall<OtterMeeting>('/meetings', accessToken, {
    method: 'POST',
    body: JSON.stringify(meeting),
  })
}

/**
 * Schedule Otter bot to join a meeting
 */
export async function scheduleOtterBot(
  accessToken: string,
  request: ScheduleBotRequest
): Promise<{ success: boolean; meeting_id?: string }> {
  return otterApiCall('/bot/schedule', accessToken, {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

/**
 * Get meeting details
 */
export async function getOtterMeeting(
  accessToken: string,
  meetingId: string
): Promise<OtterMeeting> {
  return otterApiCall<OtterMeeting>(`/meetings/${meetingId}`, accessToken)
}

/**
 * Cancel scheduled Otter bot
 */
export async function cancelOtterBot(
  accessToken: string,
  meetingId: string
): Promise<{ success: boolean }> {
  return otterApiCall(`/meetings/${meetingId}/cancel`, accessToken, {
    method: 'POST',
  })
}

/**
 * Revoke Otter access (disconnect)
 */
export async function revokeOtterAccess(accessToken: string): Promise<void> {
  await otterApiCall('/oauth/revoke', accessToken, {
    method: 'POST',
  })
}
